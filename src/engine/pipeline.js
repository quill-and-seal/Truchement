// Pipeline : cache → gabarits de règles → modèle neuronal.
//
// - Cache : phrases déjà traduites (rempli au fil de l'eau, aucune entrée écrite à la main).
// - Gabarits : phrases de règles formulaires, reconstruites par algorithme.
// - Modèle neuronal : tout le reste (prose, noms, fragments).
//
// `nmt` est une fonction async (textes: string[]) => string[] fournie par
// l'appelant : le worker transformers.js dans Foundry, un faux modèle en test.

import { matchPattern, splitSuffix } from "./patterns.js";
import { lookupGlossary } from "./glossary.js";
import { feetText, metersText } from "./units.js";

export const CACHE = new Map();

// Éléments à ne jamais traduire : balises HTML, liens @UUID[...]{...},
// références &Reference[...]{...} et jets en ligne [[/attack]], [[/damage …]].
const PROTECTED = /(<[^>]+>|[@&]\w+\[[^\]]*\](?:\{[^}]*\})?|\[\[[^\]]*\]\](?:\{[^}]*\})?)/;
const isProtected = (s) => s.startsWith("<") || s.startsWith("@") || s.startsWith("&") || s.startsWith("[[");

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+(?=[A-Z])/);
}

// Le modèle traduit "20-foot" en "20 pieds" : on ajoute l'équivalent en petit.
// Ignore les distances déjà annotées (dans un span truchement-alt).
export function annotateUnits(text) {
  return text
    // "ft." : le point n'est gardé que s'il termine la phrase.
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:pieds?|ft\b(\.?))(?!\s*<span class="truchement-alt">)/g, (m, n, dot, o, str) => {
      const end = dot && /^\s*$|^\s+[A-ZÀ-Ý]/.test(str.slice(o + m.length)) ? "." : "";
      return feetText(n.replace(",", ".")) + end;
    })
    .replace(/(\d+(?:[.,]\d+)?)\s*mètres?(?!\s*<span class="truchement-alt">)/g, (_, n) => metersText(n));
}

// Résout une phrase sans modèle (cache ou gabarit), ou renvoie null.
// Les gabarits passent avant le cache : une amélioration des gabarits
// remplace une ancienne traduction du modèle gardée en cache.
function resolveLocally(sentence) {
  const g = lookupGlossary(sentence);
  if (g) return { text: g, layer: "glossaire" };
  const pat = matchPattern(sentence);
  if (pat) return { text: pat.text, layer: `gabarit:${pat.id}` };
  if (CACHE.has(sentence)) return { text: CACHE.get(sentence), layer: "cache" };
  return null;
}

// Traduit une liste de segments : tout ce qui n'est pas résolu localement
// part au modèle en un seul lot.
export async function translateSegments(segments, { nmt, onError } = {}) {
  const results = segments.map((s) => resolveLocally(s.trim()));
  const pending = [];
  segments.forEach((s, i) => {
    if (!results[i]) pending.push(i);
  });

  if (pending.length && nmt) {
    const unique = [...new Set(pending.map((i) => segments[i].trim()))];
    const split = unique.map(splitSuffix);
    try {
      const out = await nmt(split.map((x) => x.body));
      const byText = new Map(
        unique.map((src, k) => {
          // Le modèle remet parfois un point final : on l'enlève avant de recoller la formule.
          let fr = out[k] ?? split[k].body;
          if (split[k].suffix) fr = fr.replace(/[.\s]+$/, "") + split[k].suffix;
          return [src, annotateUnits(fr)];
        }),
      );
      for (const [src, fr] of byText) CACHE.set(src, fr);
      for (const i of pending) results[i] = { text: byText.get(segments[i].trim()), layer: "neuronal" };
    } catch (err) {
      // Modèle indisponible : les gabarits restent appliqués, le reste en anglais.
      onError?.(err);
    }
  }

  return segments.map((s, i) => results[i] ?? { text: s.trim(), layer: "non traduit" });
}

// Traduit un fragment HTML : seuls les nœuds texte sont traduits.
export async function translateHtml(html, opts = {}) {
  const parts = html.split(PROTECTED);
  const slots = [];
  const sentences = [];

  parts.forEach((part, i) => {
    if (!part || !part.trim()) return;
    if (isProtected(part)) {
      // Jet en ligne ou lien avec libellé : on garde la commande, on traduit le libellé.
      const m = part.match(/^((?:\[\[[^\]]*\]\]|[@&]\w+\[[^\]]*\])\{)([^}]+)(\})$/);
      if (!m) return;
      slots.push({ i, lead: m[1], trail: m[3], from: sentences.length, n: 1 });
      sentences.push(m[2]);
      return;
    }
    const list = splitSentences(part.trim());
    slots.push({ i, lead: part.match(/^\s*/)[0], trail: part.match(/\s*$/)[0], from: sentences.length, n: list.length });
    sentences.push(...list);
  });

  const results = await translateSegments(sentences, opts);
  for (const { i, lead, trail, from, n } of slots) {
    parts[i] = lead + results.slice(from, from + n).map((r) => r.text).join(" ") + trail;
  }

  const report = sentences.map((source, k) => ({ source, ...results[k] }));
  return { html: parts.join(""), report };
}

// "Aberrant Spirit (Beholderkin)" : glossaire sur le nom entier, sinon chaque
// partie séparément (le modèle traduit mal les parenthèses).
export async function translateName(name, opts = {}) {
  const m = name.match(/^(.+?)\s*\((.+)\)$/);
  if (m && !lookupGlossary(name)) {
    const [a, b] = await translateSegments([m[1], m[2]], opts);
    if (a.layer === "non traduit" && b.layer === "non traduit") return null;
    return `${a.text} (${b.text})`;
  }
  const [r] = await translateSegments([name], opts);
  return r.layer === "non traduit" ? null : r.text;
}
