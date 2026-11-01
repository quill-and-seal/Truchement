// Banc d'essai : node test/run.mjs
// Textes de sorts au format du SRD 5.2 (CC-BY 4.0).

import { translateHtml, translateName } from "../src/engine/pipeline.js";

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
    name: "Magic Missile",
    html:
      "<p>You create three glowing darts of magical force. Each dart strikes a creature of your choice that you can see within range. A dart deals 1d4 + 1 Force damage to its target.</p>" +
      "<p><strong>Using a Higher-Level Spell Slot.</strong> The spell creates one more dart for each spell slot level above 1.</p>",
  },
  {
    name: "Hold Person",
    html:
      "<p>Choose a Humanoid that you can see within range. The target must succeed on a Wisdom saving throw or have the Paralyzed condition for the duration. At the end of each of its turns, the target repeats the save, ending the spell on itself on a success.</p>",
  },
];

let total = 0;
let covered = 0;

for (const spell of SPELLS) {
  const { html, report } = await translateHtml(spell.html);
  console.log(`\n=== ${spell.name} → ${translateName(spell.name) ?? "(nom inconnu)"} ===`);
  for (const r of report) {
    total++;
    const ok = r.layer !== "non traduit";
    if (ok) covered++;
    console.log(`${ok ? "✔" : "·"} [${r.layer}]`);
    console.log(`    ${ok ? r.text : r.masked}`);
  }
  console.log(`\n  HTML : ${html}`);
}

console.log(`\nCouverture sans moteur neuronal : ${covered}/${total} phrases (${Math.round((covered / total) * 100)} %)`);
