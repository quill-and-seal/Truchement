// Signalement d'un problème de traduction.
//
// Capture la fiche en FR puis en EN, et envoie le tout au relais Truchement,
// qui crée (ou complète) une issue dans le dépôt privé de signalements.
// Les MJ n'ont besoin ni de compte GitHub ni de jeton.

const ID = "truchement";

// Adresse du relais par défaut (modifiable dans les réglages).
export const REPORT_URL = "";

const SCREENSHOT_LIB = "https://cdn.jsdelivr.net/npm/modern-screenshot@4.6.8/dist/index.mjs";
const SETTLE_MS = 1200; // le temps que la fiche se redessine et que l'interface soit traduite

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t = (key) => game.i18n.localize(`TRUCHEMENT.${key}`);

let lib = null;
async function screenshot(element) {
  lib ??= import(SCREENSHOT_LIB).catch((err) => {
    lib = null; // nouvel essai au prochain signalement
    throw err;
  });
  const { domToWebp } = await lib;
  return domToWebp(element, {
    quality: 0.85,
    scale: 1,
    // Le badge et le bouton de signalement n'ont rien à faire sur la capture.
    filter: (node) => !(node.classList?.contains("truchement-report")),
  });
}

function sourceOf(doc) {
  const s = doc.system?.source;
  if (!s) return "";
  if (typeof s === "string") return s;
  return s.label || [s.book, s.page && `p. ${s.page}`].filter(Boolean).join(" ");
}

function descriptionPath(doc) {
  if (doc.documentName === "Item") return "system.description.value";
  if (doc.documentName === "Actor") return "system.details.biography.value";
  return null;
}

function texts(doc) {
  const f = doc.flags?.[ID] ?? {};
  const path = descriptionPath(doc);
  if (!path) return null;
  const en = foundry.utils.getProperty(f.original ?? {}, path) ?? (f.showing === "en" ? foundry.utils.getProperty(doc, path) : "");
  const fr = foundry.utils.getProperty(f.translation ?? {}, path) ?? (f.showing !== "en" ? foundry.utils.getProperty(doc, path) : "");
  return en || fr ? { en: en ?? "", fr: fr ?? "" } : null;
}

async function askNote() {
  const { DialogV2 } = foundry.applications.api;
  return DialogV2.prompt({
    window: { title: t("Report.Title") },
    content: `<p>${t("Report.Intro")}</p>
      <textarea name="note" rows="4" style="width:100%" placeholder="${t("Report.Placeholder")}"></textarea>`,
    ok: { label: t("Report.Send"), callback: (_e, button) => button.form.elements.note.value.trim() },
    rejectClose: false,
  });
}

// `api` : { stateOf, toggleDocument } fournis par main.js.
export async function reportDocument(app, doc, url, api) {
  if (!url) return ui.notifications.warn(t("Report.NoUrl"));
  const note = await askNote();
  if (note === null || note === undefined) return; // fenêtre fermée

  ui.notifications.info(t("Report.Capturing"));
  const screenshots = {};
  const start = api.stateOf(doc);
  try {
    if (start === "none") {
      screenshots.en = await screenshot(app.element);
    } else {
      // Capture de l'état actuel, bascule, capture, puis retour à l'état de départ.
      screenshots[start] = await screenshot(app.element);
      await api.toggleDocument(doc);
      await wait(SETTLE_MS);
      screenshots[start === "fr" ? "en" : "fr"] = await screenshot(app.element);
      await api.toggleDocument(doc);
    }
  } catch (err) {
    console.warn(`${ID} | capture impossible, signalement envoyé sans image`, err);
    if (api.stateOf(doc) !== start && start !== "none") await api.toggleDocument(doc).catch(() => {});
  }

  const f = doc.flags?.[ID] ?? {};
  const report = {
    name: f.original?.name ?? doc.name,
    nameFr: f.translation?.name ?? (start === "fr" ? doc.name : ""),
    type: doc.type ?? doc.documentName,
    documentName: doc.documentName,
    source: sourceOf(doc),
    versions: {
      module: game.modules.get(ID)?.version,
      core: game.version,
      system: `${game.system.id} ${game.system.version}`,
    },
    note,
    screenshots,
    texts: texts(doc),
  };

  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error ?? `HTTP ${res.status}`);
    ui.notifications.info(`${out.created ? t("Report.Created") : t("Report.Added")} #${out.number}`);
  } catch (err) {
    console.error(`${ID} | échec du signalement`, err);
    ui.notifications.error(`${t("Report.Failed")} : ${err.message}`);
  }
}
