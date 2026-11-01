// Pipeline en couches : mémoire → gabarits → (glossaire + moteur neuronal).
// Chaque phrase descend les couches jusqu'à ce que l'une d'elles la traite.

import { TERMS, NAMES } from "./glossary.js";
import { matchPattern } from "./patterns.js";

// Couche 1 : mémoire de traduction (phrases déjà connues, exactes).
// En jeu, elle sera aussi alimentée par le cache des traductions passées.
export const MEMORY = new Map([
  ["Using a Higher-Level Spell Slot.", "Utilisation d'un emplacement de sort de niveau supérieur."],
  [
    "At the end of each of its turns, the target repeats the save, ending the spell on itself on a success.",
    "À la fin de chacun de ses tours, la cible refait le jet de sauvegarde et met fin au sort qui l'affecte en cas de réussite.",
  ],
]);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TERM_RES = TERMS.map(([en, fr]) => [new RegExp(`\\b${escapeRe(en)}\\b`, "gi"), fr]);

// Couche 3 : remplace les termes de jeu par des marqueurs ⟦n⟧.
export function protectTerms(text) {
  const kept = [];
  let out = text;
  for (const [re, fr] of TERM_RES) {
    out = out.replace(re, () => `⟦${kept.push(fr) - 1}⟧`);
  }
  return { text: out, kept };
}

export function restoreTerms(text, kept) {
  return text.replace(/⟦(\d+)⟧/g, (_, i) => kept[Number(i)]);
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+(?=[A-Z])/);
}

export async function translateSentence(sentence, { nmt } = {}) {
  const trimmed = sentence.trim();
  if (!trimmed) return { text: sentence, layer: "vide" };

  if (MEMORY.has(trimmed)) return { text: MEMORY.get(trimmed), layer: "mémoire" };

  const pat = matchPattern(trimmed);
  if (pat) return { text: pat.text, layer: `gabarit:${pat.id}` };

  // Couche 4 : moteur neuronal, avec termes protégés.
  const { text: masked, kept } = protectTerms(trimmed);
  if (nmt) {
    const raw = await nmt(masked);
    if (raw) return { text: restoreTerms(raw, kept), layer: "neuronal" };
  }
  return { text: trimmed, layer: "non traduit", masked };
}

// Traduit un fragment HTML : seuls les nœuds texte sont traduits,
// les balises et les liens @UUID[...]{...} restent intacts.
export async function translateHtml(html, opts = {}) {
  const parts = html.split(/(<[^>]+>|@\w+\[[^\]]*\](?:\{[^}]*\})?)/);
  const report = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part || part.startsWith("<") || part.startsWith("@") || !part.trim()) continue;
    const lead = part.match(/^\s*/)[0];
    const trail = part.match(/\s*$/)[0];
    const out = [];
    for (const s of splitSentences(part.trim())) {
      const r = await translateSentence(s, opts);
      report.push({ source: s, ...r });
      out.push(r.text);
    }
    parts[i] = lead + out.join(" ") + trail;
  }
  return { html: parts.join(""), report };
}

export function translateName(name) {
  return NAMES[name] ?? null;
}
