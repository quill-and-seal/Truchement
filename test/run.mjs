// Banc d'essai : node test/run.mjs
// Textes de sorts au format du SRD 5.2 (CC-BY 4.0).
//
// Le vrai modèle tourne dans le navigateur (worker transformers.js). Ici on
// branche un faux modèle qui marque les phrases « [NMT] … » : on vérifie
// ce que les gabarits traitent seuls et ce qui part au modèle.

import { translateHtml, translateName, CACHE } from "../src/engine/pipeline.js";

let calls = 0;
const fakeNmt = async (texts) => {
  calls++;
  return texts.map((t) => `[NMT] ${t.replace(/(\d+)-foot/g, "$1 pieds")}`);
};
const OPTS = { nmt: fakeNmt };

const SPELLS = [
  {
    name: "Fireball",
    html:
      "<p>A bright streak flashes from you to a point you choose within range and then blossoms with a low roar into a fiery explosion. Each creature in a 20-foot-radius Sphere centered on that point makes a Dexterity saving throw. A target takes 8d6 Fire damage on a failed save or half as much damage on a successful one.</p>" +
      "<p>Flammable objects in the area that aren't being worn or carried start burning.</p>" +
      "<p><strong>Using a Higher-Level Spell Slot.</strong> The damage increases by 1d6 for each spell slot level above 3.</p>",
  },
  {
    name: "Cure Wounds",
    html:
      "<p>A creature you touch regains a number of Hit Points equal to 2d8 plus your spellcasting ability modifier.</p>" +
      "<p><strong>Using a Higher-Level Spell Slot.</strong> The healing increases by 2d8 for each spell slot level above 1.</p>",
  },
  {
    name: "Hold Person",
    html:
      "<p>Choose a Humanoid that you can see within range. The target must succeed on a Wisdom saving throw or have the Paralyzed condition for the duration. At the end of each of its turns, the target repeats the save, ending the spell on itself on a success.</p>",
  },
  {
    name: "Eye Ray",
    html: "<p><em>Ranged Attack Roll:</em> [[/attack extended]], range 150 ft. <em>Hit:</em> [[/damage 1d8+3 psychic]] Psychic damage.</p>",
  },
];

let total = 0;
let byRules = 0;

for (const spell of SPELLS) {
  const { html, report } = await translateHtml(spell.html, OPTS);
  console.log(`\n=== ${spell.name} → ${await translateName(spell.name, OPTS)} ===`);
  for (const r of report) {
    total++;
    if (r.layer.startsWith("gabarit")) byRules++;
    console.log(`  [${r.layer}] ${r.text}`);
  }
  console.log(`  HTML : ${html}`);
}

console.log(`\nGabarits : ${byRules}/${total} phrases, le reste part au modèle.`);

// Vérifications
const assert = (cond, msg) => {
  if (!cond) {
    console.error(`ÉCHEC : ${msg}`);
    process.exitCode = 1;
  }
};
const before = calls;
await translateHtml(SPELLS[0].html, OPTS);
assert(calls === before, "une phrase déjà traduite doit venir du cache");
const eye = await translateHtml(SPELLS[3].html, OPTS);
assert(eye.html.includes("[[/attack extended]]") && eye.html.includes("[[/damage 1d8+3 psychic]]"), "les jets en ligne restent intacts");
assert(eye.html.includes('150 pieds <span class="truchement-alt">'), "l'équivalent des distances est ajouté à la sortie du modèle");
const none = await translateHtml("<p>Plain text.</p>");
assert(none.report[0].layer === "non traduit", "sans modèle, le texte reste tel quel");
console.log(`Cache : ${CACHE.size} entrées. ${process.exitCode ? "" : "Toutes les vérifications passent."}`);

// Bloc de stats réel (Eye Ray importé par Plutonium)
const block = `<p><em>Ranged Attack Roll:</em> [[/attack]]{Bonus equals your spell attack modifier}, range 150 ft. <em>Hit:</em> [[/damage 1d8 + 3 + @item.level type=psychic]]{1d8 + 3 + the spell's level} Psychic damage.</p>`;
const br = await translateHtml(block, OPTS);
console.log(`\n=== Bloc de stats ===\n${br.html}`);
for (const r of br.report) console.log(`  [${r.layer}] ${r.source} → ${r.text}`);
assert(!br.report.some((r) => r.layer === "neuronal"), "le bloc de stats est entièrement couvert par les gabarits");
assert(br.html.includes("[[/attack]]{Bonus égal") && br.html.includes("@item.level type=psychic]]{1d8 + 3 + le niveau du sort}"), "les libellés des jets en ligne sont traduits, la commande reste intacte");
