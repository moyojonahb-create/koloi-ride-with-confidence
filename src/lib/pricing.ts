// Koloi Dynamic Fare Pricing System — Gwanda Zone-Based Pricing

export type Location = { lat: number; lng: number };

// ═══════════════════════════════════════════════════════════
// GWANDA INNER ZONE — polygon defined by key landmarks
// Glow Petroleum, St Christopher's, Gwanda Pool, ZIMSEC,
// NASSA Complex, Railway Line / Substation
// ═══════════════════════════════════════════════════════════
const GWANDA_INNER_ZONE: Location[] = [
  { lat: -20.9358, lng: 29.0028 }, // Glow Petroleum (north-west)
  { lat: -20.9358, lng: 29.0064 }, // Railway Line / Substation (north-east)
  { lat: -20.9449, lng: 29.0071 }, // NASSA Complex (south-east)
  { lat: -20.9452, lng: 29.0053 }, // ZIMSEC Offices (south)
  { lat: -20.9437, lng: 29.0014 }, // Gwanda Pool (south-west)
  { lat: -20.9384, lng: 29.0015 }, // St Christopher's (west)
];

// Gwanda CBD center for town radius checks
const GWANDA_CBD: Location = { lat: -20.940, lng: 29.004 };

// ═══════════════════════════════════════════════════════════
// DISTANCE BANDS — outside inner zone pricing
// ═══════════════════════════════════════════════════════════
const DISTANCE_BANDS: { minKm: number; maxKm: number; fare: number }[] = [
  { minKm: 0, maxKm: 2, fare: 20 },
  { minKm: 2, maxKm: 3, fare: 20 },
  { minKm: 3, maxKm: 4, fare: 30 },
  { minKm: 4, maxKm: 5, fare: 40 },
  { minKm: 5, maxKm: 6, fare: 50 },
  { minKm: 6, maxKm: 7, fare: 60 },
  { minKm: 7, maxKm: 8, fare: 70 },
  { minKm: 8, maxKm: 9, fare: 80 },
  { minKm: 9, maxKm: Infinity, fare: 80 }, // Cap at R80 for 9km+
];

// ═══════════════════════════════════════════════════════════
// COMMISSION TIERS
// ═══════════════════════════════════════════════════════════
export function calculateCommission(fare: number): number {
  if (fare === 15) return 3;
  if (fare < 50) return 6;
  return Math.round(fare * 0.11); // 11% rounded
}

// ═══════════════════════════════════════════════════════════
// GEOMETRY — point-in-polygon (ray casting)
// ═══════════════════════════════════════════════════════════
function isPointInPolygon(point: Location, polygon: Location[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect =
      yi > point.lng !== yj > point.lng &&
      point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isInsideInnerZone(loc: Location): boolean {
  return isPointInPolygon(loc, GWANDA_INNER_ZONE);
}

// ═══════════════════════════════════════════════════════════
// HAVERSINE DISTANCE
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// CITY DETECTION — is this ride in Gwanda?
// ═══════════════════════════════════════════════════════════
const GWANDA_RADIUS_KM = 15; // generous radius for Gwanda area

export function isInGwanda(loc: Location): boolean {
  return distanceKm(loc, GWANDA_CBD) <= GWANDA_RADIUS_KM;
}

export function isInsideTown(loc: Location): boolean {
  return isInGwanda(loc);
}

// ═══════════════════════════════════════════════════════════
// LEGACY CONFIG (kept for backward compat with DB settings)
// ═══════════════════════════════════════════════════════════
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

const DEFAULT_SETTINGS: PricingConfig = {
  baseFare: 15,
  perKmRate: 10,
  minFare: 15,
  maxTownFare: 80,
  fixedTownFare: 80,
  townRadiusKm: 15,
  peakMultiplier: 1.0,
  nightMultiplier: 1.2,
  gwandaCbd: GWANDA_CBD,
};

let currentPricingConfig: PricingConfig = { ...DEFAULT_SETTINGS };

export function setPricingConfig(config: Partial<PricingConfig>) {
  currentPricingConfig = { ...currentPricingConfig, ...config };
}

export function getPricingConfig(): PricingConfig {
  return { ...currentPricingConfig };
}

// ═══════════════════════════════════════════════════════════
// FARE RESULT
// ═══════════════════════════════════════════════════════════
export interface FareResult {
  priceR: number;
  commission: number;
  reason: string;
  multiplier: number;
  isOutsideTown: boolean;
  isInnerZone: boolean;
  routedDistanceKm?: number;
}

// ═══════════════════════════════════════════════════════════
// MAIN FARE CALCULATOR — Gwanda zone-based pricing
// ═══════════════════════════════════════════════════════════
function getFareFromDistanceBand(distKm: number): number {
  for (const band of DISTANCE_BANDS) {
    if (distKm >= band.minKm && distKm < band.maxKm) {
      return band.fare;
    }
  }
  return DISTANCE_BANDS[DISTANCE_BANDS.length - 1].fare;
}

export function calculateKoloiFare(
  pickup: Location,
  dropoff: Location,
  routedDistanceKm?: number,
  now: Date = new Date(),
  config?: PricingConfig
): FareResult {
  const pickupGwanda = isInGwanda(pickup);
  const dropoffGwanda = isInGwanda(dropoff);

  // If not in Gwanda, use legacy distance-band pricing
  if (!pickupGwanda || !dropoffGwanda) {
    const dist = routedDistanceKm ?? distanceKm(pickup, dropoff);
    const fare = getFareFromDistanceBand(dist);
    return {
      priceR: fare,
      commission: calculateCommission(fare),
      reason: 'Out of Gwanda service area',
      multiplier: 1.0,
      isOutsideTown: true,
      isInnerZone: false,
      routedDistanceKm: dist,
    };
  }

  // Check if both points are inside inner zone
  const pickupInner = isInsideInnerZone(pickup);
  const dropoffInner = isInsideInnerZone(dropoff);

  if (pickupInner && dropoffInner) {
    // INNER ZONE: flat R15, R3 commission
    return {
      priceR: 15,
      commission: 3,
      reason: 'Inner zone fare',
      multiplier: 1.0,
      isOutsideTown: false,
      isInnerZone: true,
      routedDistanceKm: routedDistanceKm ?? distanceKm(pickup, dropoff),
    };
  }

  // OUTSIDE INNER ZONE: distance-band pricing
  const dist = routedDistanceKm ?? distanceKm(pickup, dropoff);
  const fare = getFareFromDistanceBand(dist);
  const commission = calculateCommission(fare);

  return {
    priceR: fare,
    commission,
    reason: `Distance band (${Math.floor(dist)}–${Math.ceil(dist)} km)`,
    multiplier: 1.0,
    isOutsideTown: false,
    isInnerZone: false,
    routedDistanceKm: dist,
  };
}

// ═══════════════════════════════════════════════════════════
// TIME MULTIPLIER (kept for backward compat, not used in new pricing)
// ═══════════════════════════════════════════════════════════
function toMinutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function timeMultiplier(now: Date, config?: PricingConfig): number {
  const cfg = config || currentPricingConfig;
  const m = toMinutesSinceMidnight(now);
  const nightStart = 19 * 60;
  const nightEnd = 5 * 60 + 59;
  const isNight = m >= nightStart || m <= nightEnd;
  return isNight ? cfg.nightMultiplier : 1.0;
}

// Export for display purposes
export const PRICING_INFO = {
  get baseFare() { return currentPricingConfig.baseFare; },
  get perKmRate() { return currentPricingConfig.perKmRate; },
  get minFare() { return currentPricingConfig.minFare; },
  get maxTownFare() { return currentPricingConfig.maxTownFare; },
  get fixedTownFare() { return currentPricingConfig.fixedTownFare; },
  get peakMultiplier() { return currentPricingConfig.peakMultiplier; },
  get nightMultiplier() { return currentPricingConfig.nightMultiplier; },
  get townRadiusKm() { return currentPricingConfig.townRadiusKm; },
  get innerZoneFare() { return 15; },
  get innerZoneCommission() { return 3; },
};
