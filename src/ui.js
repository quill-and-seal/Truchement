// Traduction de l'interface affichée dans une fiche (libellés, onglets,
// infobulles…), quand le badge est sur FR. Rien n'est enregistré : seul
// l'affichage change, la fiche revient en anglais au rendu suivant en mode EN.
//
// Sources, dans l'ordre :
// 1. Les fichiers de langue français des modules installés (traductions
//    officielles du cœur de Foundry et du système), mis en correspondance
//    clé par clé avec les textes anglais chargés par Foundry.
// 2. Les gabarits et le modèle neuronal, pour ce qui n'est pas couvert.

import { translateSegments } from "./engine/pipeline.js";
import { lookupGlossary } from "./engine/glossary.js";

const ID = "truchement";

// Texte anglais → texte français (correspondance exacte).
const EXACT = new Map();
// Textes avec variables : { re, fr, names } — "{ability} Saving Throw".
const TEMPLATED = [];
// Tout texte déjà produit en français, pour ne jamais le retraduire.
const PRODUCED = new Set();
// Libellés d'interface anglais connus de Foundry (cœur, système, modules) :
// SEULS ces textes sont traduits dans l'interface. Le contenu de la fiche
// (noms, descriptions, textes saisis) n'y figure pas et n'est jamais touché ici.
const EN_VALUES = new Set();
const EN_TEMPLATES = []; // RegExp des libellés à variables

let ready = null;

function packageLanguageFiles() {
  const files = [];
  const add = (pkg, base) => {
    for (const l of pkg.languages ?? []) {
      if (l.lang !== "fr") continue;
      if (l.system && l.system !== game.system.id) continue;
      if (l.module && !game.modules.get(l.module)) continue;
      const path = /^(modules|systems|worlds)\//.test(l.path) ? l.path : `${base}/${l.path}`;
      files.push(path);
    }
  };
  add(game.system, `systems/${game.system.id}`);
  for (const m of game.modules) add(m, `modules/${m.id}`);
  return [...new Set(files)];
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Charge les fichiers de langue français et construit la correspondance.
export function loadInterfaceTranslations() {
  ready ??= (async () => {
    if (game.i18n.lang === "fr") return; // l'interface est déjà en français
    const english = foundry.utils.flattenObject(game.i18n.translations);
    for (const en of Object.values(english)) {
      if (typeof en !== "string" || !en.trim()) continue;
      if (!en.includes("{")) {
        EN_VALUES.add(en.trim());
        continue;
      }
      // Libellé à variables : retenu s'il a assez de texte fixe pour être reconnaissable.
      const fixed = en.replace(/\{\w+\}/g, "");
      if ((fixed.match(/[A-Za-z]/g) ?? []).length < 4) continue;
      const src = escapeRe(en.trim()).replace(/\\\{\w+\\\}/g, "(.+?)");
      EN_TEMPLATES.push(new RegExp(`^${src}$`));
    }
    const french = {};
    for (const path of packageLanguageFiles()) {
      try {
        const res = await fetch(foundry.utils.getRoute(path));
        if (res.ok) Object.assign(french, foundry.utils.flattenObject(await res.json()));
      } catch (err) {
        console.warn(`${ID} | fichier de langue illisible : ${path}`, err);
      }
    }
    for (const [key, en] of Object.entries(english)) {
      const fr = french[key];
      if (typeof en !== "string" || typeof fr !== "string" || !en.trim() || en === fr) continue;
      if (en.includes("{")) {
        const names = [];
        const src = escapeRe(en).replace(/\\\{(\w+)\\\}/g, (_, n) => (names.push(n), "(.+?)"));
        if (names.length) TEMPLATED.push({ re: new RegExp(`^${src}$`), fr, names });
      } else if (!EXACT.has(en)) {
        EXACT.set(en, fr);
      }
    }
    console.log(
      `${ID} | interface : ${EN_VALUES.size} libellés anglais reconnus ; ${EXACT.size} libellés et ${TEMPLATED.length} formules FR depuis ${packageLanguageFiles().length} fichier(s) de langue FR`,
    );
  })();
  return ready;
}

function lookupOfficial(text) {
  if (EXACT.has(text)) return EXACT.get(text);
  for (const { re, fr, names } of TEMPLATED) {
    const m = text.match(re);
    if (!m) continue;
    // Les variables sont elles-mêmes traduites si possible ("Strength" → "Force").
    return names.reduce((out, n, i) => out.replaceAll(`{${n}}`, EXACT.get(m[i + 1]) ?? m[i + 1]), fr);
  }
  return null;
}

// --- Parcours du DOM --------------------------------------------------------

const SKIP = ".window-header, script, style, textarea, input, select, [contenteditable], prose-mirror, .editor-content, .truchement-badge";
const ATTRS = ["data-tooltip", "title", "placeholder", "aria-label"];
const I18N_KEY = /^[A-Z][A-Z0-9_-]*(\.[\w-]+)+$/;
const FRENCH_HINT = /[àâçéèêëîïôûùœ]/i;

// Faut-il traduire ce texte ? (doit contenir des lettres, ne pas être déjà français)
// Abréviations des caractéristiques (STR, DEX…) : jamais traduites.
// Lues dans la configuration du système, plus les six classiques.
let ABBR = null;
function abbreviations() {
  if (ABBR) return ABBR;
  ABBR = new Set(["str", "dex", "con", "int", "wis", "cha"]);
  for (const [key, a] of Object.entries(globalThis.CONFIG?.DND5E?.abilities ?? {})) {
    ABBR.add(key.toLowerCase());
    if (a?.abbreviation) ABBR.add(game.i18n.localize(a.abbreviation).toLowerCase());
  }
  return ABBR;
}

function candidate(text) {
  const t = text.trim();
  if (t.length < 2 || !/[A-Za-z]{2,}/.test(t)) return false;
  if (PRODUCED.has(t) || FRENCH_HINT.test(t)) return false;
  if (abbreviations().has(t.toLowerCase())) return false;
  return true;
}

function isInterfaceText(t) {
  if (EN_VALUES.has(t)) return true;
  return EN_TEMPLATES.some((re) => re.test(t));
}

// Découpe un texte en morceaux ; les morceaux d'indice pair sont des libellés
// à traduire, les impairs des séparateurs (« Natural • Action »). Renvoie null
// si aucun morceau n'est un libellé d'interface connu.
const SEP = /(\s*[•·|]\s*)/;
function interfaceParts(text) {
  if (!candidate(text)) return null;
  if (isInterfaceText(text)) return [text];
  const parts = text.split(SEP);
  if (parts.length < 3) return null;
  const found = parts.some((p, i) => i % 2 === 0 && candidate(p) && isInterfaceText(p.trim()));
  return found ? parts : null;
}

// Libellés à traduire dans un découpage.
function unitsOf(parts) {
  return parts.filter((p, i) => i % 2 === 0 && candidate(p) && isInterfaceText(p.trim())).map((p) => p.trim());
}

function compose(parts, tr) {
  return parts.map((p, i) => (i % 2 === 0 && tr.has(p.trim()) ? p.replace(p.trim(), tr.get(p.trim())) : p)).join("");
}

// Journal des remplacements par fenêtre, pour tout remettre en anglais.
const JOURNAL = new WeakMap();

function logChange(root, restore) {
  let list = JOURNAL.get(root);
  if (!list) JOURNAL.set(root, (list = []));
  list.push(restore);
}

// Remet le texte d'origine, sauf si la fiche l'a déjà redessiné entre-temps.
export function restoreInterface(root) {
  for (const restore of JOURNAL.get(root) ?? []) restore();
  JOURNAL.delete(root);
}

function collect(root) {
  // Chaque cible enregistre de quoi revenir en arrière au moment où elle est modifiée.
  const targets = []; // { text, apply(fr) }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement?.closest(SKIP)) continue;
    const raw = node.nodeValue;
    const parts = interfaceParts(raw.trim());
    if (!parts) continue;
    const lead = raw.match(/^\s*/)[0];
    const trail = raw.match(/\s*$/)[0];
    targets.push({
      text: raw.trim(),
      parts,
      apply: (fr) => {
        const written = lead + fr + trail;
        node.nodeValue = written;
        ORIGINAL.set(node, raw.trim());
        logChange(root, () => {
          if (node.isConnected && node.nodeValue === written) node.nodeValue = raw;
        });
        fitToSpace(root, node.parentElement);
      },
      isConnected: () => node.isConnected,
    });
  }

  for (const el of root.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(","))) {
    if (el.closest(".truchement-badge")) continue;
    for (const attr of ATTRS) {
      const rawValue = el.getAttribute(attr);
      let value = rawValue;
      if (!value) continue;
      // Infobulle donnée par clé de traduction : Foundry la traduirait à l'affichage.
      if (I18N_KEY.test(value) && game.i18n.has(value)) value = game.i18n.localize(value);
      if (/<[^>]+>/.test(value)) continue;
      const parts = interfaceParts(value.trim());
      if (!parts) continue;
      targets.push({
        text: value.trim(),
        parts,
        apply: (fr) => {
          el.setAttribute(attr, fr);
          logChange(root, () => {
            if (el.isConnected && el.getAttribute(attr) === fr) el.setAttribute(attr, rawValue);
          });
        },
        isConnected: () => el.isConnected,
      });
    }
  }
  return targets;
}

// Mémoire anglais → français de l'interface : appliquée immédiatement,
// sans attendre le modèle, quand la fiche redessine un élément.
const MEMO = new Map();


// Nœud texte → texte anglais d'origine (pour la correction à la main).
const ORIGINAL = new WeakMap();

// --- Ajustement à la place disponible ---------------------------------------
// Le français est souvent plus long : si le libellé déborde de son élément,
// on réduit la police (jusqu'à 70 %), puis on coupe avec « … » et une infobulle.

const MIN_SCALE = 0.7;

function fitToSpace(root, el) {
  if (!el || el.children.length || !el.isConnected) return;
  const overflow = el.scrollWidth - el.clientWidth;
  if (el.clientWidth === 0 || overflow <= 1) return;
  const prevSize = el.style.fontSize;
  const prevTooltip = el.getAttribute("data-tooltip");
  const ratio = el.clientWidth / el.scrollWidth;
  const size = parseFloat(getComputedStyle(el).fontSize);
  el.style.fontSize = `${size * Math.max(ratio, MIN_SCALE)}px`;
  if (ratio < MIN_SCALE) {
    el.classList.add("truchement-fit");
    if (!prevTooltip) el.setAttribute("data-tooltip", el.textContent.trim());
  }
  logChange(root, () => {
    el.style.fontSize = prevSize;
    el.classList.remove("truchement-fit");
    if (!prevTooltip) el.removeAttribute("data-tooltip");
  });
}

// --- Correction à la main (Alt+clic) ------------------------------------------

// Renvoie { en, fr, node } pour le libellé traduit sous le clic, ou null.
export function translatedLabelAt(target) {
  for (const node of target?.childNodes ?? []) {
    if (node.nodeType === 3 && ORIGINAL.has(node)) return { en: ORIGINAL.get(node), fr: node.nodeValue.trim(), node };
  }
  return null;
}

export function applyCorrection(en, fr) {
  MEMO.set(en, fr);
  PRODUCED.add(fr);
}

// Textes déjà envoyés au modèle : jamais renvoyés une deuxième fois.
const SENT = new Set();

function remember(en, fr) {
  MEMO.set(en, fr);
  PRODUCED.add(fr);
}

// Traduit les libellés d'interface affichés dans `root`. `opts` : options du pipeline (nmt…).
// `isActive()` : faux dès que la fiche repasse en EN, pour ne rien appliquer après coup.
export async function translateInterface(root, opts, isActive = () => true) {
  await opts?.ready;
  await loadInterfaceTranslations();
  if (!isActive()) return;
  const targets = collect(root);
  if (!targets.length) return;

  // Résolution des libellés : correction du MJ, mémoire, traduction officielle.
  const tr = new Map();
  const pending = new Set();
  for (const t of targets) {
    for (const u of unitsOf(t.parts)) {
      if (tr.has(u)) continue;
      // Glossaire (corrections du MJ comprises), puis mémoire, puis traductions officielles.
      const fr = lookupGlossary(u) ?? MEMO.get(u) ?? lookupOfficial(u);
      if (fr) {
        tr.set(u, fr);
        remember(u, fr);
      } else pending.add(u);
    }
  }

  const done = new Set();
  const applyResolved = (final) => {
    for (const t of targets) {
      if (done.has(t) || !t.isConnected()) continue;
      const units = unitsOf(t.parts);
      if (!final && !units.every((u) => tr.has(u))) continue;
      done.add(t);
      const fr = compose(t.parts, tr);
      if (fr === t.text) continue;
      PRODUCED.add(fr);
      t.apply(fr);
    }
  };
  applyResolved(false);

  // Le reste passe par les gabarits puis le modèle.
  const toSend = [...pending].filter((u) => u.length <= 300 && !SENT.has(u));
  for (const u of toSend) SENT.add(u);
  if (toSend.length) {
    const results = await translateSegments(toSend, opts);
    if (!isActive()) return;
    toSend.forEach((u, i) => {
      const r = results[i];
      if (!r || r.layer === "non traduit") return;
      // Dans l'interface, pas de balise : on retire l'éventuel équivalent de distance.
      const fr = r.text
        .replace(/\s*<span class="truchement-alt">[^<]*<\/span>/g, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!fr) return;
      tr.set(u, fr);
      remember(u, fr);
    });
  }
  applyResolved(true);
}

// --- Suivi des fiches -------------------------------------------------------
// Les fiches réactives (Tidy5e/Svelte…) redessinent leurs éléments après le
// rendu et remettent l'anglais. On observe la fenêtre tant qu'elle est en FR
// et on retraduit ce qui change.

const WATCHERS = new WeakMap();
// Fenêtres actuellement en FR (pour les infobulles qui s'affichent hors fenêtre).
const ACTIVE_ROOTS = new Set();
let tooltipOpts = null;

export function watchInterface(app, element, opts, onPass) {
  let w = WATCHERS.get(app);
  if (w?.element === element) return w.schedule();
  w?.stop();

  let timer = null;
  let running = false;
  let again = false;
  let stopped = false;
  // Disjoncteur : si la fiche change sans arrêt (plus de 30 passages en
  // 5 secondes), on arrête de la suivre plutôt que de tourner en rond.
  let windowStart = Date.now();
  let passes = 0;
  const pass = async () => {
    if (stopped) return;
    if (running) return void (again = true);
    if (Date.now() - windowStart > 5000) {
      windowStart = Date.now();
      passes = 0;
    }
    if (++passes > 30) {
      console.warn(`${ID} | la fiche change sans arrêt, suivi de l'interface interrompu`);
      return unwatchInterface(app);
    }
    running = true;
    try {
      await translateInterface(element, opts, () => !stopped);
      if (!stopped) onPass?.();
    } finally {
      running = false;
      if (again && !stopped) {
        again = false;
        schedule();
      }
    }
  };
  const schedule = () => {
    if (stopped) return;
    clearTimeout(timer);
    timer = setTimeout(pass, 30);
  };
  // Arrêt complet : plus d'observation, plus de passage programmé ou en cours.
  const stop = () => {
    stopped = true;
    ACTIVE_ROOTS.delete(element);
    clearTimeout(timer);
    observer.disconnect();
  };

  const observer = new MutationObserver(schedule);
  observer.observe(element, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });
  ACTIVE_ROOTS.add(element);
  tooltipOpts = opts;
  w = { element, observer, schedule, stop };
  WATCHERS.set(app, w);
  schedule();
}

export function unwatchInterface(app, element) {
  const w = WATCHERS.get(app);
  w?.stop();
  WATCHERS.delete(app);
  // Retour en anglais : on défait ce que Truchement a changé dans la fenêtre.
  const root = w?.element ?? element;
  if (root) restoreInterface(root);
}

// --- Infobulles ---------------------------------------------------------------
// L'infobulle de Foundry (#tooltip) s'affiche hors de la fenêtre : on traduit
// ses libellés quand la souris survole une fiche en FR. Les infobulles
// verrouillées (clic molette) sont des copies de celle-ci, déjà traduite.

export function initTooltips() {
  let hoverInFr = false;
  document.addEventListener(
    "pointerover",
    (ev) => {
      const t = ev.target;
      if (t?.closest?.("#tooltip, .locked-tooltip")) return; // on garde l'état du survol précédent
      hoverInFr = [...ACTIVE_ROOTS].some((root) => root.contains(t));
    },
    true,
  );
  const el = globalThis.game?.tooltip?.element ?? document.getElementById("tooltip");
  if (!el) return;
  let timer = null;
  new MutationObserver(() => {
    if (!hoverInFr || !tooltipOpts) return;
    clearTimeout(timer);
    timer = setTimeout(() => translateInterface(el, tooltipOpts, () => hoverInFr).catch(() => {}), 10);
  }).observe(el, { childList: true, subtree: true, characterData: true });
}
