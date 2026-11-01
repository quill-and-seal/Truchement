// Worker : charge le modèle de traduction EN→FR et traduit par lots,
// hors du fil principal pour ne pas figer Foundry.
// Le modèle (~75 Mo) est téléchargé au premier usage puis mis en cache
// par le navigateur.

import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js";

const MODEL = "Xenova/opus-mt-en-fr";
let translator = null;

async function load() {
  if (translator) return translator;
  translator = await pipeline("translation", MODEL, {
    dtype: "q8",
    progress_callback: (p) => {
      if (p.status === "progress") self.postMessage({ type: "progress", file: p.file, progress: p.progress });
    },
  });
  self.postMessage({ type: "ready" });
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
