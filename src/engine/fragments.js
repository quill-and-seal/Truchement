// Couche « fragments » : quand aucune phrase entière n'est reconnue, on
// remplace les morceaux connus (blocs de stats, termes de règles).
// Le résultat peut rester partiellement en anglais, mais les termes de jeu
// sont en français.

import { DAMAGE_TYPES, ABILITIES } from "./glossary.js";
import { feetText } from "./units.js";

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const DAMAGE = Object.keys(DAMAGE_TYPES).join("|");
const ABILITY = Object.keys(ABILITIES).join("|");

function endDot(dot, end, str) {
  if (!dot) return "";
  const rest = str.slice(end);
  return /^\s*$|^\s+[A-ZÀ-Ý]/.test(rest) ? "." : "";
}

// Ordre : les plus spécifiques d'abord.
const RULES = [
  [/\bMelee or Ranged Attack Roll\b/gi, "Jet d'attaque au corps à corps ou à distance"],
  [/\bMelee Attack Roll\b/gi, "Jet d'attaque au corps à corps"],
  [/\bRanged Attack Roll\b/gi, "Jet d'attaque à distance"],
  [/\bMelee Weapon Attack\b/gi, "Attaque d'arme au corps à corps"],
  [/\bRanged Weapon Attack\b/gi, "Attaque d'arme à distance"],
  [/\bMelee Spell Attack\b/gi, "Attaque de sort au corps à corps"],
  [/\bRanged Spell Attack\b/gi, "Attaque de sort à distance"],
  [/\bBonus equals your spell attack modifier\b/gi, "Bonus égal à votre modificateur d'attaque des sorts"],
  [/\byour spell attack modifier\b/gi, "votre modificateur d'attaque des sorts"],
  [/\byour spell save DC\b/gi, "le DD de sauvegarde de vos sorts"],
  [/\bthe spell's level\b/gi, "le niveau du sort"],
  [/\bHit or Miss:/g, "Touché ou échec :"],
  [/\bHit:/g, "Touché :"],
  [/\bMiss:/g, "Échec :"],
  [/\bFailure:/g, "Échec :"],
  [/\bSuccess:/g, "Réussite :"],
  // "ft." : on garde le point seulement s'il termine la phrase.
  [/\b(?:range|Range) (\d+)\/(\d+) ft(\.?)/g, (m, a, b, dot, o, str) => `portée ${a}/${b} pieds${endDot(dot, o + m.length, str)}`],
  [/\b(?:range|Range) (\d+) ft(\.?)/g, (m, a, dot, o, str) => `portée ${feetText(a)}${endDot(dot, o + m.length, str)}`],
  [/\b(?:reach|Reach) (\d+) ft(\.?)/g, (m, a, dot, o, str) => `allonge ${feetText(a)}${endDot(dot, o + m.length, str)}`],
  [/\b(\d+) ft(\.?)/g, (m, a, dot, o, str) => `${feetText(a)}${endDot(dot, o + m.length, str)}`],
  [new RegExp(`\\b(${ABILITY}) Saving Throw\\b`, "gi"), (_, a) => `Jet de sauvegarde de ${ABILITIES[cap(a)]}`],
  [new RegExp(`\\b(${DAMAGE}) damage\\b`, "gi"), (_, t) => DAMAGE_TYPES[cap(t)]],
  [/\bplus\b/g, "+"],
  [/\bThe target\b/g, "La cible"],
  [/\bthe target\b/g, "la cible"],
  [/\bsaving throw\b/gi, "jet de sauvegarde"],
  [/\bHit Points\b/g, "points de vie"],
  [/\bbonus action\b/gi, "action bonus"],
  [/\bReaction\b/g, "Réaction"],
];

export function translateFragments(text) {
  let out = text;
  for (const [re, rep] of RULES) out = out.replace(re, rep);
  if (out === text) return null;
  // Typographie française : espace avant les deux-points.
  return out.replace(/([^\s]):(\s|$)/g, "$1 :$2").replace(/  :/g, " :");
}
