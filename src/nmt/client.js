// Client du worker de traduction : file de requêtes, progression du
// téléchargement du modèle, cache persistant des traductions.

const STORAGE_KEY = "truchement.cache";
const MAX_CACHED = 5000;

let worker = null;
let nextId = 0;
const waiting = new Map();
let onDownload = () => {};
let onProgress = () => {};
let onReady = () => {};

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  worker.onmessage = ({ data }) => {
    if (data.type === "download") return onDownload(data);
    if (data.type === "progress") return onProgress(data);
    if (data.type === "ready") return onReady(data);
    const p = waiting.get(data.id);
    if (!p) return;
    waiting.delete(data.id);
    if (data.type === "result") p.resolve(data.texts);
    else p.reject(new Error(data.message));
  };
  worker.onerror = (e) => {
    for (const p of waiting.values()) p.reject(new Error(e.message));
    waiting.clear();
  };
  return worker;
}

export function setCallbacks({ download, progress, ready } = {}) {
  if (download) onDownload = download;
  if (progress) onProgress = progress;
  if (ready) onReady = ready;
}

// (textes: string[]) => Promise<string[]>
export function nmt(texts) {
  if (!texts.length) return Promise.resolve([]);
  const id = nextId++;
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    getWorker().postMessage({ id, texts });
  });
}

// --- Cache persistant (par navigateur) ------------------------------------

export function loadCache(cache) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) for (const [k, v] of JSON.parse(raw)) cache.set(k, v);
  } catch {
    /* cache indisponible : on repart de zéro */
  }
}

export function saveCache(cache) {
  try {
    const entries = [...cache.entries()].slice(-MAX_CACHED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota dépassé ou stockage bloqué : tant pis */
  }
}
