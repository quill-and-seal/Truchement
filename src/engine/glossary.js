// Glossaire : correspondances fixes, prioritaires sur le modèle.
//
// - Corrections du MJ (Alt+clic dans Foundry, enregistrées dans le monde) ;
// - fichier data/glossaire.json livré avec le module :
//   « termes » (correspondance exacte, puis sans tenir compte de la casse)
//   et « formules » (libellés à variables : "Roll {ability} Saving Throw").

const TERMS = new Map();
const TERMS_CI = new Map();
const FORMULAS = []; // { re, fr, names }

let corrections = () => ({});
export function setCorrectionsProvider(fn) {
  corrections = fn;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function setGlossary(data = {}) {
  TERMS.clear();
  TERMS_CI.clear();
  FORMULAS.length = 0;
  for (const [en, fr] of Object.entries(data.termes ?? {})) {
    if (typeof fr !== "string" || !fr) continue;
    TERMS.set(en, fr);
    TERMS_CI.set(en.toLowerCase(), fr);
  }
  for (const [en, fr] of Object.entries(data.formules ?? {})) {
    const names = [];
    const src = escapeRe(en).replace(/\\\{(\w+)\\\}/g, (_, n) => (names.push(n), "(.+?)"));
    if (names.length) FORMULAS.push({ re: new RegExp(`^${src}$`, "i"), fr, names });
  }
}

export function glossarySize() {
  return { termes: TERMS.size, formules: FORMULAS.length };
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
