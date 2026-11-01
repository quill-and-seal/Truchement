// Distances : on garde l'unité du texte source (pas de conversion en mètres).
// "1 pied", "20 pieds" : en français, pluriel à partir de 2.
export function feetText(feet) {
  return `${feet} ${Number(feet) >= 2 ? "pieds" : "pied"}`;
}

// 1 → "1er", 3 → "3e"
export function ordinal(n) {
  return Number(n) === 1 ? "1er" : `${n}e`;
}
