// Gabarits : phrases formulaires reconnues par regex, reconstruites en français.
// Chaque gabarit renvoie la phrase traduite, ou null s'il ne sait pas faire
// (terme absent du dictionnaire) : la phrase passe alors à la couche suivante.

import { ABILITIES, DAMAGE_TYPES, CONDITIONS, lookupNoun, article } from "./vocabulary.js";
import { feetText, ordinal } from "./units.js";

const DICE = String.raw`(\d+d\d+(?:\s*[+\-−]\s*\d+)?)`;
const ABILITY = `(${Object.keys(ABILITIES).join("|")})`;
const DAMAGE = `(${Object.keys(DAMAGE_TYPES).join("|")})`;
const CONDITION = `(${Object.keys(CONDITIONS).join("|")})`;

const p = (src) => new RegExp(`^${src}$`, "i");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const dmg = (t) => DAMAGE_TYPES[cap(t.toLowerCase())];

export const PATTERNS = [
  {
    id: "area-save",
    re: p(String.raw`Each creature in an? (\d+)-foot-radius (\w+) centered on (that point|you|it) (?:makes|must make) an? ${ABILITY} saving throw\.`),
    build: ([, ft, shape, center, ab]) => {
      const s = lookupNoun(shape);
      if (!s) return null;
      const e = s.g === "f" ? "e" : "";
      const on = { "that point": "ce point", you: "vous", it: "celui-ci" }[center.toLowerCase()];
      return `Chaque créature située dans ${article(s)}${s.fr} de ${feetText(ft)} de rayon centré${e} sur ${on} effectue un jet de sauvegarde de ${ABILITIES[cap(ab.toLowerCase())]}.`;
    },
  },
  {
    id: "save-half",
    re: p(String.raw`An? (\w+) takes ${DICE} ${DAMAGE} damage on a failed save,? or half as much damage on a successful one\.`),
    build: ([, who, dice, type]) => {
      const n = lookupNoun(who);
      if (!n) return null;
      return `${cap(article(n))}${n.fr} subit ${dice} ${dmg(type)} en cas d'échec, ou la moitié de ces dégâts en cas de réussite.`;
    },
  },
  {
    id: "deals-damage",
    re: p(String.raw`An? (\w+) deals ${DICE} ${DAMAGE} damage to its target\.`),
    build: ([, who, dice, type]) => {
      const n = lookupNoun(who);
      if (!n) return null;
      return `${cap(article(n))}${n.fr} inflige ${dice} ${dmg(type)} à sa cible.`;
    },
  },
  {
    id: "upcast-increase",
    re: p(String.raw`The (damage|healing) increases by ${DICE} for each spell slot level above (\d+)\.`),
    build: ([, what, dice, lvl]) =>
      `${what.toLowerCase() === "damage" ? "Les dégâts" : "Les soins"} augmentent de ${dice} pour chaque niveau d'emplacement au-delà du ${ordinal(lvl)}.`,
  },
  {
    id: "upcast-more",
    re: p(String.raw`The spell creates one more (\w+) for each spell slot level above (\d+)\.`),
    build: ([, what, lvl]) => {
      const n = lookupNoun(what);
      if (!n) return null;
      const sup = "supplémentaire";
      return `Le sort crée ${article(n)}${n.fr} ${sup} pour chaque niveau d'emplacement au-delà du ${ordinal(lvl)}.`;
    },
  },
  {
    id: "heal-touch",
    re: p(String.raw`A creature you touch regains a number of Hit Points equal to ${DICE} plus your spellcasting ability modifier\.`),
    build: ([, dice]) =>
      `Une créature que vous touchez récupère un nombre de points de vie égal à ${dice} + votre modificateur de caractéristique d'incantation.`,
  },
  {
    id: "save-or-condition",
    re: p(String.raw`The target must succeed on an? ${ABILITY} saving throw or have the ${CONDITION} condition for the duration\.`),
    build: ([, ab, cond]) =>
      `La cible doit réussir un jet de sauvegarde de ${ABILITIES[cap(ab.toLowerCase())]} sous peine de subir l'état ${CONDITIONS[cap(cond.toLowerCase())]} pendant toute la durée du sort.`,
  },
  {
    id: "choose-visible",
    re: p(String.raw`Choose an? (\w+) that you can see within range\.`),
    build: ([, what]) => {
      const n = lookupNoun(what);
      if (!n) return null;
      return `Choisissez ${article(n)}${n.fr} que vous pouvez voir dans la portée du sort.`;
    },
  },

  // --- Blocs de stats : formules courtes, souvent isolées par la mise en forme
  // ou les jets en ligne. Le modèle les traduit mal sans contexte.
  {
    id: "attack-roll",
    re: p(String.raw`(Melee or Ranged|Melee|Ranged) Attack Roll\s*:?`),
    build: ([, kind]) =>
      `Jet d'attaque ${{ "melee or ranged": "au corps à corps ou à distance", melee: "au corps à corps", ranged: "à distance" }[kind.toLowerCase()]} :`,
  },
  {
    id: "attack-2014",
    re: p(String.raw`(Melee|Ranged) (Weapon|Spell) Attack\s*:?`),
    build: ([, kind, what]) =>
      `Attaque ${what.toLowerCase() === "weapon" ? "d'arme" : "de sort"} ${kind.toLowerCase() === "melee" ? "au corps à corps" : "à distance"} :`,
  },
  {
    id: "outcome-label",
    re: p(String.raw`(Hit or Miss|Hit|Miss|Failure or Success|Failure|Success|Trigger|Response)\s*:?`),
    build: ([, w]) =>
      `${{ "hit or miss": "Touché ou échec", hit: "Touché", miss: "Échec", "failure or success": "Échec ou réussite", failure: "Échec", success: "Réussite", trigger: "Déclencheur", response: "Réponse" }[w.toLowerCase()]} :`,
  },
  {
    id: "save-label",
    re: p(String.raw`${ABILITY} Saving Throw\s*:?`),
    build: ([, ab]) => `Jet de sauvegarde de ${ABILITIES[cap(ab.toLowerCase())]} :`,
  },
  {
    id: "range-reach",
    re: p(String.raw`(,?)\s*(range|reach) (\d+)(?:\/(\d+))? ft\.?(,?)`),
    build: ([, lead, kind, a, b, trail]) => {
      const word = kind.toLowerCase() === "range" ? "portée" : "allonge";
      const dist = b ? `${a}/${b} pieds` : feetText(a);
      return `${lead ? ", " : ""}${word} ${dist}${trail ? "," : "."}`;
    },
  },
  {
    id: "damage-typed",
    re: p(String.raw`(?:(\d+) \(${DICE}\) )?${DAMAGE} damage(\.?)`),
    build: ([, avg, dice, type, dot]) => `${avg ? `${avg} (${dice}) ` : ""}${dmg(type)}${dot}`,
  },
  {
    id: "spell-attack-bonus",
    re: p(String.raw`Bonus equals your spell attack modifier`),
    build: () => "Bonus égal à votre modificateur d'attaque des sorts",
  },
  {
    id: "spell-level-dice",
    re: p(String.raw`${DICE}((?:\s*\+\s*\d+)?)\s*\+\s*the spell's level`),
    build: ([, dice, plus]) => `${dice}${plus.replace(/\s+/g, " ")} + le niveau du sort`,
  },
];

// Formules de règles en fin de phrase : retirées avant le modèle, puis
// remises en français après sa traduction.
export const SUFFIXES = [
  { re: /\s*\((?:round(?:ed)?|rounding) down\)(\.?)\s*$/i, fr: "(arrondi à l'inférieur)" },
  { re: /\s*\((?:round(?:ed)?|rounding) up\)(\.?)\s*$/i, fr: "(arrondi au supérieur)" },
];

export function splitSuffix(sentence) {
  for (const { re, fr } of SUFFIXES) {
    const m = sentence.match(re);
    if (m) return { body: sentence.slice(0, m.index), suffix: ` ${fr}${m[1]}` };
  }
  return { body: sentence, suffix: "" };
}

export function matchPattern(sentence) {
  for (const pat of PATTERNS) {
    const m = sentence.match(pat.re);
    if (!m) continue;
    const out = pat.build(m);
    if (out) return { text: out, id: pat.id };
  }
  return null;
}
