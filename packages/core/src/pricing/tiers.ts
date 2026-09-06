/**
 * Ride tier pricing — PORT of the derivation in `src/components/ride/RideView.tsx`.
 *
 * Economy is the real priced fare. Share and Parcel are derived client-side
 * from the same base numbers, and are sent in the ride request as-is, exactly
 * as Economy's is.
 *
 * **Why this is ported as a tested unit rather than reimplemented.** The Share
 * formula carries a fixed regression, recorded in the web source: it was once
 * `max(economy + 2, economy * 1.4)`, which priced Share *above* Economy while
 * badging it "Save more" — a $5 economy trip came out at $7. The current rule
 * is a real 30% discount, floored at the town's base fare so it can never
 * undercut the minimum a trip is allowed to cost. That is precisely the kind of
 * rule that silently regresses when rewritten from memory, so it moves with its
 * tests attached.
 *
 * **`null` is a value here, not a missing one.** Before a destination is known
 * there is no route, so there is no fare and no ETA. Web's comment is explicit:
 * *"Never fabricate a number here."* `tierOptionsWithoutFare()` exists so the
 * picker can be shown pre-destination without inventing a price.
 */

export type RideTierId = 'economy' | 'share' | 'parcel';

export type ParcelSize = 'small' | 'medium' | 'large';

export const PARCEL_SIZE_SURCHARGE: Record<ParcelSize, number> = {
  small: 0,
  medium: 0.5,
  large: 1.5,
};

/** The 30% Share discount. Named so a change to it is a visible decision. */
export const SHARE_DISCOUNT_RATE = 0.7;

/** Parcel is priced off base plus 60% of the distance component. */
export const PARCEL_DISTANCE_RATE = 0.6;

export interface RideTierOption {
  id: RideTierId;
  name: string;
  capacity: number;
  /** Null until a route exists. Render as "See fare next", never as a number. */
  etaMinutes: number | null;
  price: number | null;
  badge: string;
  badgeVariant: 'primary' | 'accent';
}

export interface FareBreakdownInput {
  /** The town's flat base fare. */
  baseFare: number;
  /** The distance-dependent component, excluding base. */
  distanceFare: number;
  /** Economy's final fare, after passengers, stops and any discount. */
  totalFare: number;
}

/** The three tiers with no pricing — used before a destination is chosen. */
export function tierOptionsWithoutFare(): RideTierOption[] {
  return [
    { id: 'economy', name: 'Economy', capacity: 4, etaMinutes: null, price: null, badge: 'Fast pickup', badgeVariant: 'primary' },
    { id: 'share', name: 'Share Ride', capacity: 4, etaMinutes: null, price: null, badge: 'Save more', badgeVariant: 'accent' },
    { id: 'parcel', name: 'Parcel', capacity: 1, etaMinutes: null, price: null, badge: 'Send anything', badgeVariant: 'accent' },
  ];
}

/** The three tiers priced from a known route. */
export function tierOptionsWithFare(
  breakdown: FareBreakdownInput,
  durationMinutes: number,
  parcelSize: ParcelSize = 'medium',
): RideTierOption[] {
  const economyPrice = breakdown.totalFare;

  // Floored at base fare: a discount must never take a trip below the minimum
  // the town allows it to cost.
  const sharePrice = Math.max(economyPrice * SHARE_DISCOUNT_RATE, breakdown.baseFare);

  const parcelBasePrice = Math.max(
    breakdown.baseFare,
    breakdown.baseFare + breakdown.distanceFare * PARCEL_DISTANCE_RATE,
  );
  const parcelPrice = parcelBasePrice + PARCEL_SIZE_SURCHARGE[parcelSize];

  const etaMinutes = Math.max(1, Math.round(durationMinutes));

  return [
    { id: 'economy', name: 'Economy', capacity: 4, etaMinutes, price: economyPrice, badge: 'Fast pickup', badgeVariant: 'primary' },
    { id: 'share', name: 'Share Ride', capacity: 4, etaMinutes: etaMinutes + 2, price: sharePrice, badge: 'Save more', badgeVariant: 'accent' },
    { id: 'parcel', name: 'Parcel', capacity: 1, etaMinutes: Math.max(etaMinutes, 10), price: parcelPrice, badge: 'Send anything', badgeVariant: 'accent' },
  ];
}

export interface EconomyFareInput {
  baseFare: number;
  /** Total fare for the route before adjustments, from the pricing engine. */
  routeFare: number;
  passengerCount: number;
  /** Count of stops that have a resolved address and coordinates. */
  validStopsCount: number;
  studentDiscountAvailable: boolean;
  studentDiscount: number;
}

export interface FareBreakdown extends FareBreakdownInput {
  extraPassengers: number;
  extraPassengerFee: number;
  validStopsCount: number;
  stopFee: number;
  subtotal: number;
  discount: number;
}

/**
 * Economy's fare breakdown — PORT of `fareBreakdown` in `RideView.tsx`.
 *
 * The thresholds are load-bearing and unobvious: passengers are only charged
 * beyond the *third*, and the student discount is capped so it can never drive
 * a fare below $0.50.
 */
export function computeFareBreakdown(input: EconomyFareInput): FareBreakdown {
  const baseFare = input.baseFare;
  const distanceFare = input.routeFare - baseFare;

  const extraPassengers = Math.max(input.passengerCount - 3, 0);
  const extraPassengerFee = extraPassengers * 0.5;
  const stopFee = input.validStopsCount * 0.5;

  const subtotal = baseFare + distanceFare + extraPassengerFee + stopFee;

  const discount = input.studentDiscountAvailable
    ? Math.min(input.studentDiscount, Math.max(subtotal - 0.5, 0))
    : 0;

  const totalFare = Math.max(subtotal - discount, 0.5);

  return {
    baseFare,
    distanceFare,
    extraPassengers,
    extraPassengerFee,
    validStopsCount: input.validStopsCount,
    stopFee,
    subtotal,
    discount,
    totalFare,
  };
}
