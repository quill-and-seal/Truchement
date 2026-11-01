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

// Noms propres : sorts, objets… (noms de la VF 2014, à vérifier contre la VF 2024)
export const NAMES = {
  // Sorts
  Bless: "Bénédiction",
  "Burning Hands": "Mains brûlantes",
  Command: "Injonction",
  Counterspell: "Contresort",
  "Cure Wounds": "Soins",
  "Detect Magic": "Détection de la magie",
  "Eldritch Blast": "Décharge occulte",
  "Fire Bolt": "Trait de feu",
  Fireball: "Boule de feu",
  Guidance: "Assistance",
  "Guiding Bolt": "Éclair traçant",
  "Healing Word": "Mot de guérison",
  "Hold Person": "Immobilisation de personne",
  "Inflict Wounds": "Blessure",
  Light: "Lumière",
  "Lightning Bolt": "Éclair",
  "Mage Armor": "Armure de mage",
  "Mage Hand": "Main de mage",
  "Magic Missile": "Projectile magique",
  "Misty Step": "Foulée brumeuse",
  Prestidigitation: "Prestidigitation",
  "Sacred Flame": "Flamme sacrée",
  "Shield of Faith": "Bouclier de la foi",
  Sleep: "Sommeil",
  Thaumaturgy: "Thaumaturgie",
  Thunderwave: "Vague tonnante",
  // Armes
  Battleaxe: "Hache d'armes",
  Club: "Gourdin",
  Dagger: "Dague",
  Greataxe: "Hache à deux mains",
  Greatsword: "Épée à deux mains",
  "Hand Crossbow": "Arbalète de poing",
  Handaxe: "Hachette",
  "Heavy Crossbow": "Arbalète lourde",
  Javelin: "Javeline",
  "Light Crossbow": "Arbalète légère",
  "Light Hammer": "Marteau léger",
  Longbow: "Arc long",
  Longsword: "Épée longue",
  Mace: "Masse d'armes",
  Quarterstaff: "Bâton",
  Rapier: "Rapière",
  Scimitar: "Cimeterre",
  Shortbow: "Arc court",
  Shortsword: "Épée courte",
  Sling: "Fronde",
  Spear: "Lance",
  Warhammer: "Marteau de guerre",
  // Armures
  Breastplate: "Cuirasse",
  "Chain Mail": "Cotte de mailles",
  "Chain Shirt": "Chemise de mailles",
  "Half Plate Armor": "Demi-plate",
  "Hide Armor": "Armure de peau",
  "Leather Armor": "Armure de cuir",
  "Plate Armor": "Harnois",
  "Ring Mail": "Broigne",
  "Scale Mail": "Armure d'écailles",
  Shield: "Bouclier",
  "Studded Leather Armor": "Armure de cuir clouté",
  // Équipement
  Arrows: "Flèches",
  Backpack: "Sac à dos",
  Bedroll: "Sac de couchage",
  "Common Clothes": "Vêtements courants",
  "Crossbow Bolt": "Carreau d'arbalète",
  "Crossbow Bolts": "Carreaux d'arbalète",
  "Explorer's Pack": "Paquetage d'explorateur",
  "Healer's Kit": "Trousse de soins",
  "Hempen Rope (50 ft.)": "Corde en chanvre (50 pieds)",
  "Holy Symbol": "Symbole sacré",
  "Mess Kit": "Gamelle",
  "Potion of Healing": "Potion de soins",
  "Priest's Pack": "Paquetage d'ecclésiastique",
  Rations: "Rations",
  "Thieves' Tools": "Outils de voleur",
  Torch: "Torche",
  Waterskin: "Outre",
};

export function article(noun, def = false) {
  if (def) return /^[aeéèêiîoôuyh]/i.test(noun.fr) ? "l'" : noun.g === "f" ? "la " : "le ";
  return noun.g === "f" ? "une " : "un ";
}

export function lookupNoun(en) {
  return NOUNS[en.toLowerCase()];
}
