// Vocabulaire des gabarits : uniquement les mots dont les gabarits de règles
// ont besoin pour reconstruire une phrase (caractéristiques, types de dégâts,
// états, genre des noms). Tout le reste passe par le modèle neuronal.

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

export function article(noun, def = false) {
  if (def) return /^[aeéèêiîoôuyh]/i.test(noun.fr) ? "l'" : noun.g === "f" ? "la " : "le ";
  return noun.g === "f" ? "une " : "un ";
}

export function lookupNoun(en) {
  return NOUNS[en.toLowerCase()];
}
