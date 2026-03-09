// Money/pricing utilities (USD)

/** Round to nearest $0.50 */
export function roundToHalf(n: number): number {
  return Math.round(Number(n) * 2) / 2;
}

/** Clamp fare to nearest $0.50 within bounds */
export function clampFare(n: number, min = 0.50, max = 500): number {
  const r = roundToHalf(n);
  return Math.min(max, Math.max(min, r));
}

// Legacy aliases
export function roundTo5(n: number): number {
  return roundToHalf(n);
}

export function clampTo5(n: number, min = 0.50, max = 500): number {
  return clampFare(n, min, max);
}
