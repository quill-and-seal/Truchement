// Détection de langue (français / anglais), sans dictionnaire de contenu :
// mots-outils de chaque langue, accents, et motifs d'orthographe typiques.
// Renvoie "fr", "en", ou null quand le texte ne permet pas de trancher.

const FR_WORDS = new Set(
  "le la les l de des du d un une et est sont en au aux à pour par sur sous dans avec sans qui que qu ne pas plus ou où ce cette ces son sa ses leur leurs il elle ils elles vous nous on se si mais comme lors chaque tout toute tous toutes peut doit être avoir fait jusqu".split(" "),
);
const EN_WORDS = new Set(
  "the of and to a an in is are you your on with for that it its by as at be or from this these each can has have if when which who into than then their they them his her not no all any one".split(" "),
);

// Motifs d'orthographe (utiles pour les textes courts : noms, libellés).
const FR_PATTERNS = [/[àâçéèêëîïôûùœ]/gi, /\b\w+(?:tion|eux|euse|aux|oir|ique|elle|ette|ée|és)\b/gi, /qu[ei]/gi, /\b(?:d|l|qu)['’]/gi];
const EN_PATTERNS = [/\b\w+(?:ing|ly|ness|ship|ward|ful)\b/gi, /th|wh|sh|ght|ck/gi, /w/gi, /\b\w+'s\b/gi];

function count(text, patterns) {
  return patterns.reduce((n, re) => n + (text.match(re)?.length ?? 0), 0);
}

export function detectLang(text) {
  const t = String(text ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[[^\]]*\]\]|[@&]\w+\[[^\]]*\]/g, " ")
    .trim();
  const words = t.toLowerCase().match(/[a-zàâçéèêëîïôûùœ']+/g) ?? [];
  if (!words.length) return null;

  let fr = 0;
  let en = 0;
  for (const w of words) {
    const base = w.replace(/['’].*$/, "");
    if (FR_WORDS.has(base)) fr += 2;
    if (EN_WORDS.has(base)) en += 2;
  }
  fr += count(t, FR_PATTERNS);
  en += count(t, EN_PATTERNS);

  // Il faut un écart net pour trancher, sinon on ne sait pas.
  if (fr >= en + 2 || (fr > 0 && en === 0)) return "fr";
  if (en >= fr + 2 || (en > 0 && fr === 0)) return "en";
  return null;
}

export const isFrench = (text) => detectLang(text) === "fr";
