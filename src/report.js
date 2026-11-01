// Signalement d'un problème de traduction.
//
// Capture la fiche en FR puis en EN, et envoie le tout au relais Truchement,
// qui crée (ou complète) une issue dans le dépôt privé de signalements.
// Les MJ n'ont besoin ni de compte GitHub ni de jeton.

const ID = "truchement";

// Adresse du relais par défaut (modifiable dans les réglages).
export const REPORT_URL = "https://truchement.argannao.com";

const SCREENSHOT_LIB = "https://cdn.jsdelivr.net/npm/modern-screenshot@4.6.8/dist/index.mjs";
const SETTLE_MS = 1200; // le temps que la fiche se redessine et que l'interface soit traduite

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const FADE_MS = 500; // durée du fondu actif/inactif des fenêtres

// Remet la fiche au premier plan (fenêtre active) puis attend la fin du fondu.
async function focusSheet(app, delay = FADE_MS) {
  try {
    app.bringToFront?.();
    app.element?.focus?.({ preventScroll: true });
  } catch {
    /* sans conséquence */
  }
  if (delay) await wait(delay);
}
const t = (key) => game.i18n.localize(`TRUCHEMENT.${key}`);

let lib = null;
// --- Polices ---------------------------------------------------------------------
// Sans polices fournies, la bibliothèque de capture réinjecte le contenu des
// @import dans les feuilles de style de la page, ce qui bouleverse le thème de
// Foundry jusqu'au rechargement. On lui donne donc nous-mêmes les @font-face
// utilisées par la fiche, en data URL (lecture seule des feuilles de style).

const FONT_DATA = new Map(); // url → data URL

function* fontFaceRules(rules) {
  for (const rule of rules ?? []) {
    if (rule instanceof CSSFontFaceRule) yield rule;
    else if (rule instanceof CSSImportRule) {
      try {
        yield* fontFaceRules(rule.styleSheet?.cssRules);
      } catch {
        /* feuille d'une autre origine : ignorée */
      }
    } else if (rule.cssRules) yield* fontFaceRules(rule.cssRules);
  }
}

function usedFamilies(root) {
  const families = new Set();
  const add = (value) => {
    for (const f of String(value).split(",")) families.add(f.trim().replace(/^["']|["']$/g, "").toLowerCase());
  };
  for (const el of [root, ...root.querySelectorAll("*")]) {
    add(getComputedStyle(el).fontFamily);
    add(getComputedStyle(el, "::before").fontFamily);
    add(getComputedStyle(el, "::after").fontFamily);
  }
  return families;
}

async function toDataUrl(url) {
  if (!FONT_DATA.has(url)) {
    FONT_DATA.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.blob() : null))
        .then((blob) => blob && new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        }))
        .catch(() => null),
    );
  }
  return FONT_DATA.get(url);
}

async function fontCss(root) {
  const families = usedFamilies(root);
  const parts = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of fontFaceRules(rules)) {
      const style = rule.style;
      const family = style.getPropertyValue("font-family").trim().replace(/^["']|["']$/g, "");
      if (!families.has(family.toLowerCase())) continue;
      const src = style.getPropertyValue("src");
      // On préfère woff2, sinon la première source.
      const urls = [...src.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)(?:\s*format\(\s*["']?([\w-]+)["']?\s*\))?/g)];
      const pick = urls.find((m) => m[2] === "woff2") ?? urls[0];
      if (!pick) continue;
      const base = rule.parentStyleSheet?.href ?? document.baseURI;
      const data = await toDataUrl(new URL(pick[1], base).href);
      if (!data) continue;
      const extra = ["font-weight", "font-style", "font-stretch", "unicode-range"]
        .map((p) => style.getPropertyValue(p) && `${p}:${style.getPropertyValue(p)};`)
        .join("");
      parts.push(`@font-face{font-family:"${family}";src:url(${data})${pick[2] ? ` format("${pick[2]}")` : ""};${extra}font-display:block;}`);
    }
  }
  // Jamais vide : une chaîne vide relancerait la lecture des @import par la bibliothèque.
  return parts.join("\n") || "/* aucune police web */";
}

// La capture se fait sur une COPIE de la fenêtre, placée hors écran et ramenée
// en position 0,0 : la fenêtre affichée n'est jamais modifiée, et le rendu ne
// sort plus du cadre (les fenêtres Foundry sont positionnées par left/top).
async function screenshot(element) {
  lib ??= import(SCREENSHOT_LIB).catch((err) => {
    lib = null; // nouvel essai au prochain signalement
    throw err;
  });
  const { domToWebp } = await lib;

  const { width, height } = element.getBoundingClientRect();
  const holder = document.createElement("div");
  holder.style.cssText = `position:fixed;left:${-width - 200}px;top:0;width:${width}px;height:${height}px;overflow:hidden;pointer-events:none;`;
  const clone = element.cloneNode(true);
  clone.removeAttribute("id"); // pas de doublon d'identifiant dans la page
  clone.querySelectorAll(".truchement-report").forEach((n) => n.remove());
  Object.assign(clone.style, {
    position: "relative",
    left: "0",
    top: "0",
    margin: "0",
    transform: "none",
    width: `${width}px`,
    height: `${height}px`,
  });
  holder.append(clone);
  document.body.append(holder);
  try {
    const cssText = await fontCss(clone);
    return await domToWebp(clone, { quality: 0.85, scale: 1, width, height, font: { cssText } });
  } finally {
    holder.remove();
  }
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
    // La fenêtre de remarque a fait passer la fiche en arrière-plan : certaines
    // fiches (Tidy5e) l'affichent alors délavée. On la remet au premier plan et
    // on attend la fin du fondu avant chaque capture.
    await focusSheet(app);
    if (start === "none") {
      screenshots.en = await screenshot(app.element);
    } else {
      // Capture de l'état actuel, bascule, capture, puis retour à l'état de départ.
      screenshots[start] = await screenshot(app.element);
      await api.toggleDocument(doc);
      await wait(SETTLE_MS);
      await focusSheet(app);
      screenshots[start === "fr" ? "en" : "fr"] = await screenshot(app.element);
      await api.toggleDocument(doc);
    }
    await focusSheet(app, 0);
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
