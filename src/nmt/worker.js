// Worker : charge le modèle de traduction EN→FR et traduit par lots,
// hors du fil principal pour ne pas figer Foundry.
//
// Le modèle (~75 Mo) n'est téléchargé qu'une fois. Il est gardé :
// - dans le cache du navigateur (Cache API) quand la page est sécurisée (HTTPS, localhost) ;
// - sinon dans IndexedDB : la Cache API n'existe pas sur une page en http://
//   (Foundry ouvert par l'adresse IP du réseau local, par exemple), et sans
//   cache de secours le modèle serait retéléchargé à chaque chargement.

import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js";

const MODEL = "Xenova/opus-mt-en-fr";
let translator = null;

// --- Cache de secours IndexedDB (même interface que la Cache API) ------------

const DB_NAME = "truchement-models";
const STORE = "files";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idb(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req?.result);
        tx.onerror = () => reject(tx.error);
      }),
  );
}

const idbCache = {
  async match(key) {
    const k = typeof key === "string" ? key : key.url;
    const entry = await idb("readonly", (s) => s.get(k)).catch(() => undefined);
    if (!entry) return undefined;
    return new Response(entry.body, { headers: entry.headers });
  },
  async put(key, response) {
    const k = typeof key === "string" ? key : key.url;
    const body = await response.arrayBuffer();
    const headers = Object.fromEntries(response.headers?.entries?.() ?? []);
    await idb("readwrite", (s) => s.put({ body, headers }, k)).catch((err) => {
      console.warn("Truchement | modèle non mis en cache (IndexedDB)", err);
    });
  },
};

if (!("caches" in self)) {
  env.useBrowserCache = false;
  env.useCustomCache = true;
  env.customCache = idbCache;
}

// --- Chargement et traduction ---------------------------------------------------

async function load() {
  if (translator) return translator;
  let downloading = false;
  translator = await pipeline("translation", MODEL, {
    dtype: "q8",
    progress_callback: (p) => {
      // « download » n'est émis que pour un vrai téléchargement réseau,
      // pas quand le fichier vient du cache.
      if (p.status === "download" && !downloading) {
        downloading = true;
        self.postMessage({ type: "download", file: p.file });
      }
      if (downloading && p.status === "progress") {
        self.postMessage({ type: "progress", file: p.file, progress: p.progress });
      }
    },
  });
  self.postMessage({ type: "ready", downloaded: downloading, cache: "caches" in self ? "navigateur" : "IndexedDB" });
  return translator;
}

self.onmessage = async ({ data }) => {
  const { id, texts } = data;
  try {
    const t = await load();
    const out = [];
    for (const text of texts) {
      const [r] = await t(text, { max_length: 512 });
      out.push(r.translation_text);
    }
    self.postMessage({ type: "result", id, texts: out });
  } catch (err) {
    self.postMessage({ type: "error", id, message: String(err?.message ?? err) });
  }
};
