// Distances : on garde l'unité du texte source, et on ajoute en petit
// l'équivalent dans l'unité opposée (calcul exact : 1 pied = 0,3048 m).

const FOOT_IN_M = 0.3048;

function fmt(n, decimals = 1) {
  const r = Number(n.toFixed(decimals));
  return String(r).replace(".", ",");
}

const plural = (n, one, many) => (Math.abs(n) >= 2 ? many : one);
const alt = (txt) => ` <span class="truchement-alt">(≈ ${txt})</span>`;

// "20 pieds (≈ 6,1 m)"
export function feetText(feet) {
  const ft = Number(feet);
  return `${ft} ${plural(ft, "pied", "pieds")}${alt(`${fmt(ft * FOOT_IN_M)} m`)}`;
}

// "6 mètres (≈ 20 pieds)" — pour les textes déjà en mètres.
export function metersText(meters) {
  const m = Number(String(meters).replace(",", "."));
  const ft = Math.round(m / FOOT_IN_M);
  return `${fmt(m)} ${plural(m, "mètre", "mètres")}${alt(`${ft} ${plural(ft, "pied", "pieds")}`)}`;
}

// 1 → "1er", 3 → "3e"
export function ordinal(n) {
  return Number(n) === 1 ? "1er" : `${n}e`;
}
