/**
 * Fare estimate for a chosen pickup/dropoff pair.
 *
 * ⚠️ **This uses straight-line distance, not road distance.** Web routes the
 * pair through OSRM (`useOSRMRoute` / `src/lib/osrm.ts`) and prices the returned
 * road distance. OSRM is a network round trip to a routing service, which
 * belongs with the request path in increment 3d, so this increment prices
 * haversine distance from `getDistance()` instead.
 *
 * **The direction of the error is known and consistent: straight-line distance
 * is always ≤ road distance, so these fares read LOW** — typically by 20–30% in
 * a street grid. That is acceptable for an increment whose gate is "a fare
 * number appears and responds correctly to inputs", and unacceptable for
 * anything a rider is quoted. It is surfaced in the UI as an estimate rather
 * than hidden, and 3d replaces the distance source without touching the
 * arithmetic, which is all in core and tested.
 *
 * `AVERAGE_SPEED_KMH` exists only to feed the fare formula's small per-minute
 * term (0.03/min). It is a stated assumption, not a measurement — named so it
 * is visible rather than buried as a magic number.
 */

import { useMemo } from 'react';
import {
  calculateRecommendedFare,
  computeFareBreakdown,
  getDistance,
  tierOptionsWithFare,
  tierOptionsWithoutFare,
  type ParcelSize,
  type RideTierOption,
  type TownPricingConfig,
} from '@cruixe/core';

/** Assumed urban average speed, used only for the per-minute fare term. */
export const AVERAGE_SPEED_KMH = 30;

/** Matches web's STUDENT_DISCOUNT. */
const STUDENT_DISCOUNT = 1;

export interface FareEstimateInput {
  pricing: TownPricingConfig;
  pickup: { lat: number; lng: number } | null;
  dropoff: { lat: number; lng: number } | null;
  passengerCount?: number;
  parcelSize?: ParcelSize;
  studentDiscountAvailable?: boolean;
}

export interface FareEstimate {
  /** Null until both ends of the trip are known — never fabricate a fare. */
  distanceKm: number | null;
  durationMinutes: number | null;
  tiers: RideTierOption[];
  currencySymbol: string;
  /** True while the estimate is straight-line rather than routed. */
  isStraightLine: boolean;
}

export function useFareEstimate({
  pricing,
  pickup,
  dropoff,
  passengerCount = 1,
  parcelSize = 'medium',
  studentDiscountAvailable = false,
}: FareEstimateInput): FareEstimate {
  return useMemo(() => {
    if (!pickup || !dropoff) {
      return {
        distanceKm: null,
        durationMinutes: null,
        tiers: tierOptionsWithoutFare(),
        currencySymbol: pricing.currency_symbol,
        isStraightLine: true,
      };
    }

    const distanceKm = getDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    const durationMinutes = (distanceKm / AVERAGE_SPEED_KMH) * 60;

    const quote = calculateRecommendedFare(pricing, distanceKm, durationMinutes);

    const breakdown = computeFareBreakdown({
      baseFare: pricing.base_fare,
      routeFare: quote.recommended,
      passengerCount,
      validStopsCount: 0,
      studentDiscountAvailable,
      studentDiscount: STUDENT_DISCOUNT,
    });

    return {
      distanceKm,
      durationMinutes,
      tiers: tierOptionsWithFare(breakdown, durationMinutes, parcelSize),
      currencySymbol: quote.currencySymbol,
      isStraightLine: true,
    };
  }, [pricing, pickup, dropoff, passengerCount, parcelSize, studentDiscountAvailable]);
}
