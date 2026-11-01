// Dictionnaire de base : termes de jeu, avec genre (m/f) quand c'est un nom.
// Sert à trois choses : remplir les gabarits, traduire les noms, et protéger
// les termes avant d'envoyer une phrase au moteur neuronal.

export const ABILITIES = {
  Strength: "Force",
  Dexterity: "Dextérité",
  Constitution: "Constitution",
  Intelligence: "Intelligence",
  Wisdom: "Sagesse",
  Charisma: "Charisme",
};

// Forme complète, car l'ordre et la préposition varient en français.
export const DAMAGE_TYPES = {
  Acid: "dégâts d'acide",
  Bludgeoning: "dégâts contondants",
  Cold: "dégâts de froid",
  Fire: "dégâts de feu",
  Force: "dégâts de force",
  Lightning: "dégâts de foudre",
  Necrotic: "dégâts nécrotiques",
  Piercing: "dégâts perforants",
  Poison: "dégâts de poison",
  Psychic: "dégâts psychiques",
  Radiant: "dégâts radiants",
  Slashing: "dégâts tranchants",
  Thunder: "dégâts de tonnerre",
};

export const CONDITIONS = {
  Blinded: "aveuglé",
  Charmed: "charmé",
  Deafened: "assourdi",
  Exhaustion: "épuisement",
  Frightened: "effrayé",
  Grappled: "agrippé",
  Incapacitated: "neutralisé",
  Invisible: "invisible",
  Paralyzed: "paralysé",
  Petrified: "pétrifié",
  Poisoned: "empoisonné",
  Prone: "à terre",
  Restrained: "entravé",
  Stunned: "étourdi",
  Unconscious: "inconscient",
};

// Noms génériques : { fr, g } où g = genre.
export const NOUNS = {
  creature: { fr: "créature", g: "f" },
  target: { fr: "cible", g: "f" },
  object: { fr: "objet", g: "m" },
  dart: { fr: "fléchette", g: "f" },
  ray: { fr: "rayon", g: "m" },
  beam: { fr: "rayon", g: "m" },
  bolt: { fr: "trait", g: "m" },
  // Types de créatures
  aberration: { fr: "aberration", g: "f" },
  beast: { fr: "bête", g: "f" },
  celestial: { fr: "céleste", g: "m" },
  construct: { fr: "créature artificielle", g: "f" },
  dragon: { fr: "dragon", g: "m" },
  elemental: { fr: "élémentaire", g: "m" },
  fey: { fr: "fée", g: "f" },
  fiend: { fr: "fiélon", g: "m" },
  giant: { fr: "géant", g: "m" },
  humanoid: { fr: "humanoïde", g: "m" },
  monstrosity: { fr: "créature monstrueuse", g: "f" },
  ooze: { fr: "vase", g: "f" },
  plant: { fr: "plante", g: "f" },
  undead: { fr: "mort-vivant", g: "m" },
  // Formes de zone
  sphere: { fr: "sphère", g: "f" },
  cube: { fr: "cube", g: "m" },
  cylinder: { fr: "cylindre", g: "m" },
  cone: { fr: "cône", g: "m" },
  line: { fr: "ligne", g: "f" },
  emanation: { fr: "émanation", g: "f" },
};

// Expressions figées et termes à protéger (ordre : les plus longs d'abord).
export const TERMS = [
  ["spellcasting ability modifier", "modificateur de caractéristique d'incantation"],
  ["spell slot", "emplacement de sort"],
  ["saving throw", "jet de sauvegarde"],
  ["bonus action", "action bonus"],
  ["Hit Points", "points de vie"],
  ["Hit Point", "point de vie"],
  ["Armor Class", "classe d'armure"],
  ["at will", "à volonté"],
  ["Concentration", "concentration"],
  ["Reaction", "réaction"],
  ["advantage", "avantage"],
  ["disadvantage", "désavantage"],
];

// Noms propres : sorts, objets… (à vérifier contre la VF 2024)
export const NAMES = {
  Fireball: "Boule de feu",
  "Cure Wounds": "Soins",
  "Magic Missile": "Projectile magique",
  "Hold Person": "Immobilisation de personne",
};

export function article(noun, def = false) {
  if (def) return /^[aeéèêiîoôuyh]/i.test(noun.fr) ? "l'" : noun.g === "f" ? "la " : "le ";
  return noun.g === "f" ? "une " : "un ";
}

export function lookupNoun(en) {
  return NOUNS[en.toLowerCase()];
}
