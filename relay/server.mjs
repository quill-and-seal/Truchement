// Relais de signalement Truchement.
//
// Reçoit les signalements envoyés par le module (captures FR et EN de la
// fiche, textes, versions) et les dépose dans un dépôt GitHub privé :
// images dans reports/, puis issue « [Traduction] Nom — Type ». Si une issue
// ouverte porte déjà ce titre, le signalement y est ajouté en commentaire.
//
// Le jeton GitHub ne quitte jamais ce serveur. Aucune dépendance : Node 20+.
//
// Variables d'environnement :
//   GITHUB_TOKEN   jeton à accès fin : dépôt de signalements uniquement,
//                  droits Issues (lecture/écriture) + Contents (lecture/écriture)
//   REPORTS_REPO   dépôt cible, ex. quill-and-seal/truchement-reports
//   PORT           port d'écoute (défaut 8787)
//   RATE_LIMIT     signalements max par adresse IP et par heure (défaut 10)
//   GITHUB_API     URL de l'API (défaut https://api.github.com, utile en test)

import http from "node:http";
import { randomUUID } from "node:crypto";

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.REPORTS_REPO;
const PORT = Number(process.env.PORT ?? 8787);
const RATE_LIMIT = Number(process.env.RATE_LIMIT ?? 10);
const API = process.env.GITHUB_API ?? "https://api.github.com";

const MAX_BODY = 12 * 1024 * 1024; // deux captures + textes
const MAX_IMAGE = 5 * 1024 * 1024; // par capture, une fois décodée
const MAX_TEXT = 20000;

if (!TOKEN || !REPO) {
  console.error("GITHUB_TOKEN et REPORTS_REPO sont obligatoires.");
  process.exit(1);
}

// --- GitHub -------------------------------------------------------------------

async function gh(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "truchement-relay",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(`GitHub ${method} ${path} → ${res.status} ${data?.message ?? ""}`);
  return data;
}

async function uploadImage(path, base64) {
  const data = await gh("PUT", `/repos/${REPO}/contents/${path}`, {
    message: `Signalement : ${path}`,
    content: base64,
  });
  return data.content.html_url;
}

async function findOpenIssue(title) {
  for (let page = 1; page <= 5; page++) {
    const issues = await gh("GET", `/repos/${REPO}/issues?state=open&per_page=100&page=${page}`);
    const hit = issues.find((i) => !i.pull_request && i.title === title);
    if (hit) return hit;
    if (issues.length < 100) return null;
  }
  return null;
}

// --- Validation -----------------------------------------------------------------

const clean = (v, max = 200) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const text = (v) => String(v ?? "").slice(0, MAX_TEXT);

function parseImage(dataUrl) {
  if (!dataUrl) return null;
  const m = String(dataUrl).match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error("image invalide");
  if ((m[2].length * 3) / 4 > MAX_IMAGE) throw new Error("image trop lourde");
  return { ext: m[1] === "jpeg" ? "jpg" : m[1], base64: m[2] };
}

// Bloc de code Markdown sûr (le texte peut contenir des ```).
function codeBlock(s) {
  const fence = "`".repeat(Math.max(3, ...[...String(s).matchAll(/`+/g)].map((m) => m[0].length + 1)));
  return `${fence}html\n${s}\n${fence}`;
}

// --- Limite d'envois --------------------------------------------------------------

const hits = new Map(); // ip → [horodatages]
function allowed(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

// --- Traitement d'un signalement ----------------------------------------------------

async function handleReport(r) {
  const name = clean(r.name) || "Sans nom";
  const type = clean(r.type, 60) || "document";
  const title = `[Traduction] ${name} — ${type}`;

  const day = new Date().toISOString().slice(0, 10);
  const id = randomUUID().slice(0, 8);
  const slug = name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "doc";
  // Validation des deux images avant tout dépôt.
  const parsed = { fr: parseImage(r.screenshots?.fr), en: parseImage(r.screenshots?.en) };
  const images = {};
  for (const lang of ["fr", "en"]) {
    const img = parsed[lang];
    if (img) images[lang] = await uploadImage(`reports/${day}/${slug}-${id}-${lang}.${img.ext}`, img.base64);
  }

  const lines = [
    `**Document** : ${clean(r.documentName, 40)} « ${name} » (${type})`,
    r.nameFr ? `**Nom traduit** : ${clean(r.nameFr)}` : null,
    r.source ? `**Source** : ${clean(r.source)}` : null,
    `**Versions** : Truchement ${clean(r.versions?.module, 20)} · Foundry ${clean(r.versions?.core, 20)} · ${clean(r.versions?.system, 40)}`,
    r.note ? `\n**Remarque du MJ** :\n> ${clean(r.note, 2000)}` : null,
    "",
    "| FR | EN |",
    "|---|---|",
    `| ${images.fr ? `[![FR](${images.fr}?raw=true)](${images.fr})` : "—"} | ${images.en ? `[![EN](${images.en}?raw=true)](${images.en})` : "—"} |`,
  ];
  if (r.texts?.en || r.texts?.fr) {
    lines.push("", "<details><summary>Textes</summary>", "", "**EN**", codeBlock(text(r.texts.en)), "", "**FR**", codeBlock(text(r.texts.fr)), "", "</details>");
  }
  const body = lines.filter((l) => l !== null).join("\n");

  const existing = await findOpenIssue(title);
  if (existing) {
    await gh("POST", `/repos/${REPO}/issues/${existing.number}/comments`, { body });
    return { url: existing.html_url, number: existing.number, created: false };
  }
  const issue = await gh("POST", `/repos/${REPO}/issues`, { title, body });
  return { url: issue.html_url, number: issue.number, created: true };
}

// --- Serveur HTTP ---------------------------------------------------------------------

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function send(res, status, data) {
  res.writeHead(status, { ...CORS, "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
  if (req.method !== "POST" || req.url !== "/report") return send(res, 404, { error: "introuvable" });

  const ip = (req.headers["x-forwarded-for"]?.split(",")[0] ?? req.socket.remoteAddress ?? "?").trim();
  if (!allowed(ip)) return send(res, 429, { error: "trop de signalements, réessaie plus tard" });

  let size = 0;
  const chunks = [];
  req.on("data", (c) => {
    size += c.length;
    if (size > MAX_BODY) {
      send(res, 413, { error: "signalement trop lourd" });
      req.destroy();
    } else chunks.push(c);
  });
  req.on("end", async () => {
    if (res.writableEnded) return;
    try {
      const report = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const out = await handleReport(report);
      console.log(`${new Date().toISOString()} ${ip} ${out.created ? "issue" : "commentaire"} #${out.number}`);
      send(res, 200, out);
    } catch (err) {
      console.error(`${new Date().toISOString()} ${ip} erreur : ${err.message}`);
      send(res, 400, { error: err.message.startsWith("GitHub") ? "échec côté GitHub" : err.message });
    }
  });
});

server.listen(PORT, () => console.log(`Relais Truchement : port ${PORT}, dépôt ${REPO}`));
