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

const ID = "truchement";

// Texte anglais → texte français (correspondance exacte).
const EXACT = new Map();
// Textes avec variables : { re, fr, names } — "{ability} Saving Throw".
const TEMPLATED = [];
// Tout texte déjà produit en français, pour ne jamais le retraduire.
const PRODUCED = new Set();

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
    console.log(`${ID} | interface : ${EXACT.size} libellés et ${TEMPLATED.length} formules depuis ${packageLanguageFiles().length} fichier(s) de langue FR`);
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
    if (!candidate(raw)) continue;
    const lead = raw.match(/^\s*/)[0];
    const trail = raw.match(/\s*$/)[0];
    targets.push({
      text: raw.trim(),
      apply: (fr) => {
        const written = lead + fr + trail;
        node.nodeValue = written;
        logChange(root, () => {
          if (node.isConnected && node.nodeValue === written) node.nodeValue = raw;
        });
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
      if (/<[^>]+>/.test(value) || !candidate(value)) continue;
      targets.push({
        text: value.trim(),
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

// Textes déjà envoyés au modèle : jamais renvoyés une deuxième fois.
const SENT = new Set();

function remember(en, fr) {
  MEMO.set(en, fr);
  PRODUCED.add(fr);
}

// Traduit tout le texte affiché dans `root`. `opts` : options du pipeline (nmt…).
// `isActive()` : faux dès que la fiche repasse en EN, pour ne rien appliquer après coup.
export async function translateInterface(root, opts, isActive = () => true) {
  await loadInterfaceTranslations();
  if (!isActive()) return;
  const targets = collect(root);
  if (!targets.length) return;

  const pending = [];
  for (const t of targets) {
    const fr = MEMO.get(t.text) ?? lookupOfficial(t.text);
    if (fr) {
      remember(t.text, fr);
      t.apply(fr);
    } else pending.push(t);
  }
  if (!pending.length) return;

  // Le reste passe par les gabarits puis le modèle (textes courts uniquement).
  const short = pending.filter((t) => t.text.length <= 300 && !SENT.has(t.text));
  const unique = [...new Set(short.map((t) => t.text))];
  for (const u of unique) SENT.add(u);
  if (!unique.length) return;
  const results = await translateSegments(unique, opts);
  if (!isActive()) return;
  const byText = new Map(unique.map((src, i) => [src, results[i]]));
  for (const t of short) {
    const r = byText.get(t.text);
    if (!r || r.layer === "non traduit") continue;
    // Dans l'interface, pas de balise : on retire l'éventuel équivalent de distance.
    const fr = r.text
      .replace(/\s*<span class="truchement-alt">[^<]*<\/span>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!fr) continue;
    remember(t.text, fr);
    if (t.isConnected()) t.apply(fr);
  }
}

// --- Suivi des fiches -------------------------------------------------------
// Les fiches réactives (Tidy5e/Svelte…) redessinent leurs éléments après le
// rendu et remettent l'anglais. On observe la fenêtre tant qu'elle est en FR
// et on retraduit ce qui change.

const WATCHERS = new WeakMap();

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
