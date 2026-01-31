// Koloi money/pricing utilities

export function roundTo5(n: number): number {
  return Math.round(Number(n) / 5) * 5;
}

export function clampTo5(n: number, min = 5, max = 5000): number {
  const r = roundTo5(n);
  return Math.min(max, Math.max(min, r));
}
