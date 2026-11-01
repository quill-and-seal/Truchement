// Point d'entrée Foundry : traduit les documents juste après leur création.
// Les hooks preCreate* sont synchrones, on traduit donc dans create* puis on
// met à jour le document (l'original est conservé dans les flags).

import { translateHtml, translateName, CACHE } from "./engine/pipeline.js";
import { nmt, setCallbacks, loadCache, saveCache } from "./nmt/client.js";

const ID = "truchement";
const t = (key) => game.i18n.localize(`TRUCHEMENT.${key}`);
const setting = (key) => game.settings.get(ID, key);
let nmtWarned = false;
const OPTS = {
  nmt,
  onError: (err) => {
    console.error(`${ID} | modèle de traduction indisponible`, err);
    if (nmtWarned) return;
    nmtWarned = true;
    ui.notifications.warn(t("Notify.ModelError"));
  },
};

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
  loadCache(CACHE);

  // Premier usage : le modèle (~75 Mo) se télécharge, on prévient une fois.
  let warned = false;
  setCallbacks({
    progress: () => {
      if (warned) return;
      warned = true;
      ui.notifications.info(t("Notify.Downloading"));
    },
    ready: () => {
      if (warned) ui.notifications.info(t("Notify.Ready"));
    },
  });

  game.modules.get(ID).api = { translateDocument, toggleDocument, retranslateDocument, revertDocument, stateOf, translateHtml };
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

  const frName = await translateName(doc.name, OPTS);
  if (frName && frName !== doc.name) {
    update.name = frName;
    original.name = doc.name;
  }

  for (const path of fields) {
    const html = foundry.utils.getProperty(doc, path);
    if (!html) continue;
    const { html: fr } = await translateHtml(html, OPTS);
    if (fr !== html) {
      update[path] = fr;
      original[path] = html;
    }
  }

  if (!Object.keys(update).length) return null;
  // Les deux versions sont conservées pour pouvoir basculer de l'une à l'autre.
  const translation = { ...update };
  update[`flags.${ID}`] = { translated: true, showing: "fr", original, translation };
  return update;
}

// Renvoie le nombre de documents modifiés.
export async function translateDocument(doc) {
  try {
    return await translateDocumentInner(doc);
  } finally {
    saveCache(CACHE);
  }
}

async function translateDocumentInner(doc) {
  if (doc.documentName === "Actor") return translateActor(doc);
  if (doc.documentName === "JournalEntry") return translateJournal(doc);
  const update = await translateFields(doc, HTML_FIELDS[doc.documentName] ?? []);
  if (update) await doc.update(update);
  console.log(`${ID} | « ${doc.name} » : ${update ? "traduit" : "rien à traduire"}`);
  return update ? 1 : 0;
}

async function translateActor(actor) {
  const update = await translateFields(actor, HTML_FIELDS.Actor);
  if (update) await actor.update(update);
  let n = update ? 1 : 0;

  // Objets embarqués (attaques, sorts, traits…) : créés avec l'acteur,
  // ils ne déclenchent pas createItem, on les traite ici.
  const items = [];
  for (const item of actor.items) {
    if (item.getFlag(ID, "translated")) continue;
    const u = await translateFields(item, HTML_FIELDS.Item);
    if (u) items.push({ _id: item.id, ...u });
  }
  if (items.length) await actor.updateEmbeddedDocuments("Item", items);
  if (!update && items.length) await actor.setFlag(ID, "showing", "fr");
  console.log(`${ID} | acteur « ${actor.name} » : ${items.length}/${actor.items.size} objets traduits`);
  return n + items.length;
}

async function translateJournal(entry) {
  const pages = [];
  for (const page of entry.pages) {
    if (page.type !== "text" || page.getFlag(ID, "translated")) continue;
    const u = await translateFields(page, ["text.content"]);
    if (u) pages.push({ _id: page.id, ...u });
  }
  if (pages.length) {
    await entry.updateEmbeddedDocuments("JournalEntryPage", pages);
    await entry.setFlag(ID, "showing", "fr");
  }
  return pages.length;
}

// --- Bascule traduction / version d'origine -------------------------------

const TYPES = ["Actor", "Item", "JournalEntry"];

function childrenOf(doc) {
  if (doc.documentName === "Actor") return { name: "Item", docs: [...doc.items] };
  if (doc.documentName === "JournalEntry") return { name: "JournalEntryPage", docs: [...doc.pages] };
  return { name: null, docs: [] };
}

// "none" (jamais traduit), "fr" (traduction affichée) ou "en" (original affiché).
export function stateOf(doc) {
  const f = doc.flags?.[ID];
  const translated = f?.translated || childrenOf(doc).docs.some((c) => c.flags?.[ID]?.translated);
  if (!translated) return "none";
  return f?.showing ?? "fr";
}

// Valeurs actuelles des champs listés dans `original` (pour les documents
// traduits par une ancienne version, qui n'avaient pas gardé la traduction).
function capture(doc, original) {
  const out = {};
  for (const key of Object.keys(foundry.utils.flattenObject(original))) {
    foundry.utils.setProperty(out, key, foundry.utils.getProperty(doc, key));
  }
  return out;
}

function swapData(doc, target) {
  const f = doc.flags?.[ID];
  if (!f?.translated || !f.original) return null;
  if (target === "en") {
    const translation = f.translation ?? capture(doc, f.original);
    return { ...f.original, [`flags.${ID}.translation`]: translation, [`flags.${ID}.showing`]: "en" };
  }
  if (!f.translation) return null;
  return { ...f.translation, [`flags.${ID}.showing`]: "fr" };
}

// Bascule entre la traduction et la version d'origine (document + enfants).
export async function toggleDocument(doc) {
  const state = stateOf(doc);
  if (state === "none") return onTranslateClick(doc);
  const target = state === "fr" ? "en" : "fr";

  const children = childrenOf(doc);
  const updates = [];
  for (const child of children.docs) {
    const data = swapData(child, target);
    if (data) updates.push({ _id: child.id, ...data });
  }
  if (updates.length) await doc.updateEmbeddedDocuments(children.name, updates);
  await doc.update(swapData(doc, target) ?? { [`flags.${ID}.showing`]: target });
}

// Repart du texte d'origine et relance la traduction (après une amélioration
// des gabarits ou du modèle). Les marqueurs sont remis à false plutôt que
// supprimés, ce qui suffit à relancer la traduction.
export async function retranslateDocument(doc) {
  if (stateOf(doc) === "fr") await toggleDocument(doc);
  const reset = { [`flags.${ID}.translated`]: false, [`flags.${ID}.showing`]: null };
  const children = childrenOf(doc);
  const updates = children.docs.filter((c) => c.flags?.[ID]?.translated).map((c) => ({ _id: c.id, ...reset }));
  if (updates.length) await doc.updateEmbeddedDocuments(children.name, updates);
  await doc.update(reset);
  return onTranslateClick(doc);
}

// Compatibilité : revenir à l'original.
export async function revertDocument(doc) {
  if (stateOf(doc) === "fr") await toggleDocument(doc);
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

async function onTranslateClick(doc) {
  try {
    const n = await translateDocument(doc);
    if (n) ui.notifications.info(`${t("Notify.Done")} : ${doc.name} (${n})`);
    else ui.notifications.warn(`${t("Notify.Nothing")} : ${doc.name}`);
  } catch (err) {
    console.error(`${ID} | échec de traduction pour « ${doc.name} »`, err);
    ui.notifications.error(`${t("Notify.Failed")} : ${doc.name}`);
  }
}

Hooks.on("getHeaderControlsApplicationV2", (app, controls) => {
  const doc = app.document;
  if (!game.user.isGM || !doc || !["Actor", "Item", "JournalEntry"].includes(doc.documentName)) return;
  if (controls.some((c) => c.action === "truchementTranslate")) return;
  // Appelé avec this = application (actions) ou sans contexte (onClick).
  const handler = function () { return onTranslateClick(this?.document ?? doc); };
  // Les deux branchements : selon la version, Foundry passe par onClick
  // ou par la table des actions de l'application.
  app.options.actions ??= {};
  app.options.actions.truchementTranslate = handler;
  controls.push({
    icon: "fa-solid fa-language",
    label: "TRUCHEMENT.Controls.Translate",
    action: "truchementTranslate",
    onClick: handler,
  });
});

// --- Badge d'état dans l'en-tête des fiches -------------------------------
// Affiche l'état de Truchement ; un clic (MJ) bascule entre la traduction
// et la version d'origine, ou lance la traduction si rien n'est traduit.

const BADGE = {
  none: { icon: "fa-solid fa-language", label: "", tip: "Badge.None" },
  fr: { icon: "fa-solid fa-language", label: "FR", tip: "Badge.Fr" },
  en: { icon: "fa-solid fa-language", label: "EN", tip: "Badge.En" },
};

Hooks.on("renderApplicationV2", (app, element) => {
  const doc = app.document;
  if (!doc || !TYPES.includes(doc.documentName)) return;
  const header = element?.querySelector?.(".window-header");
  if (!header) return;
  header.querySelector(".truchement-badge")?.remove();

  const state = stateOf(doc);
  if (state === "none" && !game.user.isGM) return;
  const b = BADGE[state];

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `truchement-badge header-control state-${state}`;
  btn.dataset.tooltip = t(b.tip);
  btn.setAttribute("aria-label", t(b.tip));
  btn.innerHTML = `<i class="${b.icon}"></i>${b.label ? `<span>${b.label}</span>` : ""}`;
  btn.disabled = !game.user.isGM;

  // Empêche le déplacement de la fenêtre quand on clique sur le badge.
  btn.addEventListener("pointerdown", (ev) => ev.stopPropagation());
  btn.addEventListener("click", async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    btn.disabled = true;
    btn.classList.add("busy");
    try {
      // Maj+clic : retraduire depuis l'original.
      if (ev.shiftKey && state !== "none") await retranslateDocument(doc);
      else await toggleDocument(doc);
    } catch (err) {
      console.error(`${ID} | échec de la bascule pour « ${doc.name} »`, err);
      ui.notifications.error(`${t("Notify.Failed")} : ${doc.name}`);
    } finally {
      btn.disabled = false;
      btn.classList.remove("busy");
    }
  });

  const anchor = header.querySelector('[data-action="toggleControls"]') ?? header.querySelector('[data-action="close"]');
  if (anchor) anchor.before(btn);
  else header.append(btn);
});
