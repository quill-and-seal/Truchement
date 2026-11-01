// Conversion des distances selon la convention de la VF : 5 pieds = 1,5 mètre.
export function feetToMeters(feet) {
  const m = (Number(feet) / 5) * 1.5;
  return Number.isInteger(m) ? String(m) : m.toFixed(1).replace(".", ",");
}

// 1 → "1er", 3 → "3e"
export function ordinal(n) {
  return Number(n) === 1 ? "1er" : `${n}e`;
}
