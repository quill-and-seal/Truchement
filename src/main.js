// Point d'entrée Foundry : traduit les documents juste après leur création.
// Les hooks preCreate* sont synchrones, on traduit donc dans create* puis on
// met à jour le document (l'original est conservé dans les flags).

import { translateHtml, translateName } from "./engine/pipeline.js";

const ID = "truchement";
const t = (key) => game.i18n.localize(`TRUCHEMENT.${key}`);
const setting = (key) => game.settings.get(ID, key);

// --- Réglages -------------------------------------------------------------

Hooks.once("init", () => {
  game.settings.register(ID, "enabled", {
    name: "TRUCHEMENT.Settings.Enabled.Name",
    hint: "TRUCHEMENT.Settings.Enabled.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(ID, "onlyPlutonium", {
    name: "TRUCHEMENT.Settings.OnlyPlutonium.Name",
    hint: "TRUCHEMENT.Settings.OnlyPlutonium.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(ID, "showAltUnits", {
    name: "TRUCHEMENT.Settings.ShowAltUnits.Name",
    hint: "TRUCHEMENT.Settings.ShowAltUnits.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: applyAltUnitsClass,
  });
});

Hooks.once("ready", () => {
  applyAltUnitsClass(setting("showAltUnits"));
  game.modules.get(ID).api = { translateDocument, revertDocument, translateHtml };
});

function applyAltUnitsClass(show) {
  document.body.classList.toggle("truchement-hide-alt", !show);
}

// --- Détection ------------------------------------------------------------

function shouldTranslate(doc, userId) {
  if (userId !== game.user.id) return false; // un seul client traduit
  const skip = (why) => (console.log(`${ID} | « ${doc.name} » ignoré : ${why}`, doc.flags), false);
  if (!setting("enabled")) return skip("traduction désactivée");
  if (doc.getFlag(ID, "translated")) return skip("déjà traduit");
  if (setting("onlyPlutonium") && !doc.flags?.plutonium) return skip("pas de flags Plutonium");
  return true;
}

// --- Traduction d'un document ---------------------------------------------

// Champs HTML à traduire selon le type de document.
const HTML_FIELDS = {
  Item: ["system.description.value"],
  Actor: ["system.details.biography.value"],
};

async function translateFields(doc, fields) {
  const update = {};
  const original = {};

  const frName = translateName(doc.name);
  if (frName) {
    update.name = frName;
    original.name = doc.name;
  }

  for (const path of fields) {
    const html = foundry.utils.getProperty(doc, path);
    if (!html) continue;
    const { html: fr } = await translateHtml(html);
    if (fr !== html) {
      update[path] = fr;
      original[path] = html;
    }
  }

  if (!Object.keys(update).length) return null;
  update[`flags.${ID}`] = { translated: true, original };
  return update;
}

export async function translateDocument(doc) {
  if (doc.documentName === "Actor") return translateActor(doc);
  if (doc.documentName === "JournalEntry") return translateJournal(doc);
  const update = await translateFields(doc, HTML_FIELDS[doc.documentName] ?? []);
  if (update) await doc.update(update);
  console.log(`${ID} | « ${doc.name} » : ${update ? "traduit" : "rien à traduire"}`);
}

async function translateActor(actor) {
  const update = await translateFields(actor, HTML_FIELDS.Actor);
  if (update) await actor.update(update);

  // Objets embarqués (attaques, sorts, traits…) : créés avec l'acteur,
  // ils ne déclenchent pas createItem, on les traite ici.
  const items = [];
  for (const item of actor.items) {
    if (item.getFlag(ID, "translated")) continue;
    const u = await translateFields(item, HTML_FIELDS.Item);
    if (u) items.push({ _id: item.id, ...u });
  }
  if (items.length) await actor.updateEmbeddedDocuments("Item", items);
  console.log(`${ID} | acteur « ${actor.name} » : ${items.length}/${actor.items.size} objets traduits`);
}

async function translateJournal(entry) {
  const pages = [];
  for (const page of entry.pages) {
    if (page.type !== "text" || page.getFlag(ID, "translated")) continue;
    const u = await translateFields(page, ["text.content"]);
    if (u) pages.push({ _id: page.id, ...u });
  }
  if (pages.length) await entry.updateEmbeddedDocuments("JournalEntryPage", pages);
}

// Restaure le texte d'origine (anglais) conservé dans les flags.
export async function revertDocument(doc) {
  const original = doc.getFlag(ID, "original");
  if (!original) return;
  await doc.update(original);
  await doc.unsetFlag(ID, "translated");
  await doc.unsetFlag(ID, "original");
}

// --- Hooks de création ----------------------------------------------------

function onCreate(doc, _options, userId) {
  if (!shouldTranslate(doc, userId)) return;
  translateDocument(doc).catch((err) => {
    console.error(`${ID} | échec de traduction pour « ${doc.name} »`, err);
    ui.notifications.warn(`${t("Notify.Failed")} : ${doc.name}`);
  });
}

Hooks.on("createItem", (item, options, userId) => {
  // Un objet ajouté à un acteur existant passe ici ; un objet créé avec
  // son acteur est traité par translateActor.
  onCreate(item, options, userId);
});
Hooks.on("createActor", onCreate);
Hooks.on("createJournalEntry", onCreate);

// --- Bouton « Traduire » sur les fiches -----------------------------------
// Pour les documents déjà présents avant l'installation du module.

Hooks.on("getHeaderControlsApplicationV2", (app, controls) => {
  const doc = app.document;
  if (!game.user.isGM || !doc || !["Actor", "Item", "JournalEntry"].includes(doc.documentName)) return;
  controls.push({
    icon: "fa-solid fa-language",
    label: "TRUCHEMENT.Controls.Translate",
    action: "truchementTranslate",
    onClick: async () => {
      await translateDocument(doc);
      ui.notifications.info(`${t("Notify.Done")} : ${doc.name}`);
    },
  });
});
