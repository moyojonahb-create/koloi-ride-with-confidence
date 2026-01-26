// Koloi Dynamic Fare Pricing System

export type Location = { lat: number; lng: number };

const GWANDA_CBD: Location = { lat: -20.933, lng: 29.013 };
const TOWN_RADIUS_KM = 5;

// Base pricing
const BASE_FARE = 20;
const PER_KM_RATE = 10;
const MIN_FARE = 25;
const MAX_TOWN_FARE = 50;
const FIXED_TOWN_FARE = 50;

// Time multipliers
const PEAK_MULTIPLIER = 1.2;
const NIGHT_MULTIPLIER = 1.3;

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

export function isInsideTown(loc: Location): boolean {
  return distanceKm(loc, GWANDA_CBD) <= TOWN_RADIUS_KM;
}

function toMinutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Returns the dynamic multiplier based on time.
 * Peak: 06:30–09:00 and 16:00–18:30 => 1.2x
 * Night: 19:00–05:59 => 1.3x
 * Otherwise => 1.0x
 */
export function timeMultiplier(now: Date): number {
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
  if (isPeak) mult = Math.max(mult, PEAK_MULTIPLIER);
  if (isNight) mult = Math.max(mult, NIGHT_MULTIPLIER);

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
  now: Date = new Date()
): FareResult {
  const pickupInTown = isInsideTown(pickup);
  const dropoffInTown = isInsideTown(dropoff);
  const mult = timeMultiplier(now);

  // If any point is outside town → fixed price
  if (!pickupInTown || !dropoffInTown) {
    return {
      priceR: FIXED_TOWN_FARE,
      reason: "Fixed town fare",
      multiplier: 1.0,
      isOutsideTown: true,
    };
  }

  // Around town pricing
  const dist = distanceKm(pickup, dropoff);
  let price = BASE_FARE + dist * PER_KM_RATE;

  // Apply time multiplier for around-town only
  price = price * mult;

  // Min/Max rules
  if (price < MIN_FARE) price = MIN_FARE;
  if (price > MAX_TOWN_FARE) price = MAX_TOWN_FARE;

  const reason =
    mult === NIGHT_MULTIPLIER
      ? "Night pricing"
      : mult === PEAK_MULTIPLIER
      ? "Peak-time pricing"
      : "Standard pricing";

  return {
    priceR: Math.round(price),
    reason,
    multiplier: mult,
    isOutsideTown: false,
  };
}

// Export constants for display purposes
export const PRICING_INFO = {
  baseFare: BASE_FARE,
  perKmRate: PER_KM_RATE,
  minFare: MIN_FARE,
  maxTownFare: MAX_TOWN_FARE,
  fixedTownFare: FIXED_TOWN_FARE,
  peakMultiplier: PEAK_MULTIPLIER,
  nightMultiplier: NIGHT_MULTIPLIER,
  townRadiusKm: TOWN_RADIUS_KM,
};
