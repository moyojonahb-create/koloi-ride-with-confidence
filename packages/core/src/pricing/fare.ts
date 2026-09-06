/**
 * Fare calculation — PORT of the pure half of `src/hooks/useTownPricing.ts`.
 *
 * The web module mixes three things: a React hook, a module-level cache, and
 * the arithmetic. Only the arithmetic and the config shape come here; the hook
 * and its Supabase read stay in the app, because core must run in Node without
 * a renderer.
 *
 * **One signature change, deliberate and backwards-compatible.** Web's
 * `isNightTime()` reads `new Date().getHours()` directly, which makes the night
 * multiplier untestable — a test asserting it either passes or fails depending
 * on what time the suite runs, which is worse than no test. `now` is injectable
 * here and defaults to the real clock, exactly as `createGoBackendClient` does
 * for its breaker timing. Same behaviour, testable.
 *
 * No DIVERGENCE entry: an added optional parameter with a default is not a
 * behavioural difference.
 */

export interface TownPricingConfig {
  id: string;
  town_id: string;
  town_name: string;
  currency_code: string;
  currency_symbol: string;
  base_fare: number;
  per_km_rate: number;
  minimum_fare: number;
  offer_floor: number;
  offer_ceiling: number;
  short_trip_fare: number;
  short_trip_km: number;
  night_multiplier: number;
  demand_multiplier: number;
  is_negotiation_enabled: boolean;
}

/** Fallback when a town has no pricing row. Values match the web original. */
export const DEFAULT_PRICING: TownPricingConfig = {
  id: '',
  town_id: 'unknown',
  town_name: 'Zimbabwe',
  currency_code: 'USD',
  currency_symbol: '$',
  base_fare: 2,
  per_km_rate: 0.8,
  minimum_fare: 1,
  offer_floor: 1,
  offer_ceiling: 50,
  short_trip_fare: 1,
  short_trip_km: 2,
  night_multiplier: 1.2,
  demand_multiplier: 1.0,
  is_negotiation_enabled: true,
};

export interface FareQuote {
  recommended: number;
  floor: number;
  ceiling: number;
  currencySymbol: string;
  currencyCode: string;
}

/** 20:00–04:59 attracts the night multiplier. */
export function isNightTime(now: () => Date = () => new Date()): boolean {
  const h = now().getHours();
  return h >= 20 || h < 5;
}

/**
 * Recommended fare plus the negotiable band around it.
 *
 * Kept arithmetically identical to web, including the details that look like
 * rounding noise but are not: the flat `0.03` per-minute term, rounding to the
 * nearest $0.50, and the $0.50 hard floor applied *after* rounding.
 */
export function calculateRecommendedFare(
  pricing: TownPricingConfig,
  distanceKm: number,
  durationMinutes: number,
  now: () => Date = () => new Date(),
): FareQuote {
  const nightMult = isNightTime(now) ? pricing.night_multiplier : 1.0;
  const demandMult = pricing.demand_multiplier;

  let fare = pricing.base_fare + distanceKm * pricing.per_km_rate + durationMinutes * 0.03;
  fare = fare * nightMult * demandMult;
  fare = Math.max(fare, pricing.minimum_fare);

  // Round to nearest $0.50, then apply the absolute floor.
  fare = Math.round(fare * 2) / 2;
  fare = Math.max(fare, 0.5);

  const tripFloor = Math.max(pricing.offer_floor, pricing.minimum_fare);
  // Ceiling is the lower of the town's cap and 2x this trip's recommendation.
  const tripCeiling = Math.min(pricing.offer_ceiling, fare * 2);

  return {
    recommended: fare,
    floor: tripFloor,
    ceiling: tripCeiling,
    currencySymbol: pricing.currency_symbol,
    currencyCode: pricing.currency_code,
  };
}

/** Step size for manual fare adjustment. */
export function getFareStep(_currencyCode?: string): number {
  return 0.5;
}

export function formatFare(amount: number, symbol = '$', _code?: string): string {
  return `${symbol}${amount.toFixed(2)}`;
}
