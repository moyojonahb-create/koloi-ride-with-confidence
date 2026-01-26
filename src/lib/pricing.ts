// Koloi Dynamic Fare Pricing System

export type Location = { lat: number; lng: number };

// Default values (used as fallback)
const DEFAULT_SETTINGS = {
  baseFare: 20,
  perKmRate: 10,
  minFare: 25,
  maxTownFare: 50,
  fixedTownFare: 50,
  townRadiusKm: 5,
  peakMultiplier: 1.2,
  nightMultiplier: 1.3,
  gwandaCbd: { lat: -20.933, lng: 29.013 },
};

export interface PricingConfig {
  baseFare: number;
  perKmRate: number;
  minFare: number;
  maxTownFare: number;
  fixedTownFare: number;
  townRadiusKm: number;
  peakMultiplier: number;
  nightMultiplier: number;
  gwandaCbd: Location;
}

// Mutable pricing info that can be updated from DB
let currentPricingConfig: PricingConfig = { ...DEFAULT_SETTINGS };

export function setPricingConfig(config: Partial<PricingConfig>) {
  currentPricingConfig = { ...currentPricingConfig, ...config };
}

export function getPricingConfig(): PricingConfig {
  return { ...currentPricingConfig };
}

export function distanceKm(a: Location, b: Location): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function isInsideTown(loc: Location, config?: PricingConfig): boolean {
  const cfg = config || currentPricingConfig;
  return distanceKm(loc, cfg.gwandaCbd) <= cfg.townRadiusKm;
}

function toMinutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Returns the dynamic multiplier based on time.
 * Peak: 06:30–09:00 and 16:00–18:30 => peakMultiplier
 * Night: 19:00–05:59 => nightMultiplier
 * Otherwise => 1.0x
 */
export function timeMultiplier(now: Date, config?: PricingConfig): number {
  const cfg = config || currentPricingConfig;
  const m = toMinutesSinceMidnight(now);
  const peakMorningStart = 6 * 60 + 30; // 06:30
  const peakMorningEnd = 9 * 60; // 09:00
  const peakEveningStart = 16 * 60; // 16:00
  const peakEveningEnd = 18 * 60 + 30; // 18:30
  const nightStart = 19 * 60; // 19:00
  const nightEnd = 5 * 60 + 59; // 05:59

  const isPeak =
    (m >= peakMorningStart && m <= peakMorningEnd) ||
    (m >= peakEveningStart && m <= peakEveningEnd);

  // Night crosses midnight
  const isNight = m >= nightStart || m <= nightEnd;

  // Use the highest multiplier if both match
  let mult = 1.0;
  if (isPeak) mult = Math.max(mult, cfg.peakMultiplier);
  if (isNight) mult = Math.max(mult, cfg.nightMultiplier);

  return mult;
}

export interface FareResult {
  priceR: number;
  reason: string;
  multiplier: number;
  isOutsideTown: boolean;
}

export function calculateKoloiFare(
  pickup: Location,
  dropoff: Location,
  now: Date = new Date(),
  config?: PricingConfig
): FareResult {
  const cfg = config || currentPricingConfig;
  const pickupInTown = isInsideTown(pickup, cfg);
  const dropoffInTown = isInsideTown(dropoff, cfg);
  const mult = timeMultiplier(now, cfg);

  // If any point is outside town → fixed price
  if (!pickupInTown || !dropoffInTown) {
    return {
      priceR: cfg.fixedTownFare,
      reason: "Fixed town fare",
      multiplier: 1.0,
      isOutsideTown: true,
    };
  }

  // Around town pricing
  const dist = distanceKm(pickup, dropoff);
  let price = cfg.baseFare + dist * cfg.perKmRate;

  // Apply time multiplier for around-town only
  price = price * mult;

  // Min/Max rules
  if (price < cfg.minFare) price = cfg.minFare;
  if (price > cfg.maxTownFare) price = cfg.maxTownFare;

  const reason =
    mult === cfg.nightMultiplier
      ? "Night pricing"
      : mult === cfg.peakMultiplier
      ? "Peak-time pricing"
      : "Standard pricing";

  return {
    priceR: Math.round(price),
    reason,
    multiplier: mult,
    isOutsideTown: false,
  };
}

// Export for display purposes (uses current config)
export const PRICING_INFO = {
  get baseFare() { return currentPricingConfig.baseFare; },
  get perKmRate() { return currentPricingConfig.perKmRate; },
  get minFare() { return currentPricingConfig.minFare; },
  get maxTownFare() { return currentPricingConfig.maxTownFare; },
  get fixedTownFare() { return currentPricingConfig.fixedTownFare; },
  get peakMultiplier() { return currentPricingConfig.peakMultiplier; },
  get nightMultiplier() { return currentPricingConfig.nightMultiplier; },
  get townRadiusKm() { return currentPricingConfig.townRadiusKm; },
};
