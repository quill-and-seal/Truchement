// Glossaire : correspondances fixes, prioritaires sur le modèle.
//
// - Corrections du MJ (Alt+clic dans Foundry, enregistrées dans le monde) ;
// - fichier data/glossaire.json livré avec le module :
//   « termes » (correspondance exacte, puis sans tenir compte de la casse)
//   et « formules » (libellés à variables : "Roll {ability} Saving Throw").

const TERMS = new Map();
const TERMS_CI = new Map();
const FRENCH_VALUES = new Set(); // traductions françaises connues (pour reconnaître un texte déjà en français)
const FORMULAS = []; // { re, fr, names }
const EXPRESSIONS = []; // { re, fr } — triées de la plus longue à la plus courte

let corrections = () => ({});
export function setCorrectionsProvider(fn) {
  corrections = fn;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function setGlossary(data = {}) {
  TERMS.clear();
  TERMS_CI.clear();
  FRENCH_VALUES.clear();
  FORMULAS.length = 0;
  EXPRESSIONS.length = 0;
  for (const [en, fr] of Object.entries(data.termes ?? {})) {
    if (typeof fr !== "string" || !fr) continue;
    TERMS.set(en, fr);
    TERMS_CI.set(en.toLowerCase(), fr);
    FRENCH_VALUES.add(fr.toLowerCase());
  }
  for (const [en, fr] of Object.entries(data.formules ?? {})) {
    const names = [];
    const src = escapeRe(en).replace(/\\\{(\w+)\\\}/g, (_, n) => (names.push(n), "(.+?)"));
    if (names.length) FORMULAS.push({ re: new RegExp(`^${src}$`, "i"), fr, names });
  }
  const expr = Object.entries(data.expressions ?? {}).filter(([, fr]) => typeof fr === "string" && fr);
  expr.sort((a, b) => b[0].length - a[0].length);
  for (const [en, fr] of expr) EXPRESSIONS.push({ re: new RegExp(`\\b${escapeRe(en)}\\b`, "gi"), fr });
}

// Vrai si le texte est une traduction française du glossaire (et pas aussi un terme anglais).
export function isKnownFrench(text) {
  const t = String(text ?? "").trim().toLowerCase();
  return FRENCH_VALUES.has(t) && !TERMS_CI.has(t);
}

export function glossarySize() {
  return { termes: TERMS.size, formules: FORMULAS.length, expressions: EXPRESSIONS.length };
}

// Dans une phrase, le français ne met la majuscule qu'en début de phrase
// (l'anglais 2024 en met aux termes de jeu : « regains Hit Points »).
function matchCase(offset, text, fr) {
  const start = /^\s*$/.test(text.slice(0, offset)) || /[.!?:]\s*$/.test(text.slice(0, offset));
  return (start ? fr[0].toUpperCase() : fr[0].toLowerCase()) + fr.slice(1);
}

// Remplace les expressions du glossaire par des marqueurs [T0], [T1]…
// Renvoie { masked, kept } ; kept[i] est la traduction à remettre.
export function maskExpressions(text) {
  const kept = [];
  let masked = text;
  for (const { re, fr } of EXPRESSIONS) {
    masked = masked.replace(re, (m, offset, str) => `[T${kept.push(matchCase(offset, str, fr)) - 1}]`);
  }
  return { masked, kept };
}

// Remet les traductions ; null si un marqueur a été perdu ou dupliqué par le modèle.
export function unmaskExpressions(text, kept) {
  for (let i = 0; i < kept.length; i++) {
    const n = text.split(`[T${i}]`).length - 1;
    if (n !== 1) return null;
  }
  return text.replace(/\[T(\d+)\]/g, (_, i) => kept[Number(i)]);
}

// Variante sans marqueur : le français est écrit directement dans la phrase anglaise.
export function inlineExpressions(text) {
  let out = text;
  for (const { re, fr } of EXPRESSIONS) out = out.replace(re, (m, offset, str) => matchCase(offset, str, fr));
  return out;
}

function lookupTerm(t) {
  const c = corrections()?.[t];
  if (c) return c;
  return TERMS.get(t) ?? TERMS_CI.get(t.toLowerCase()) ?? null;
}

// Traduction fixe d'un texte entier, ou null.
export function lookupGlossary(text) {
  const t = text?.trim();
  if (!t) return null;
  const direct = lookupTerm(t);
  if (direct) return direct;
  for (const { re, fr, names } of FORMULAS) {
    const m = t.match(re);
    if (!m) continue;
    return names.reduce((out, n, i) => out.replaceAll(`{${n}}`, lookupTerm(m[i + 1]) ?? m[i + 1]), fr);
  }
  return null;
}
