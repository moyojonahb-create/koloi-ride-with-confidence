import { describe, expect, it } from 'vitest';

import {
  computeFareBreakdown,
  tierOptionsWithFare,
  tierOptionsWithoutFare,
  type EconomyFareInput,
} from './tiers';

const baseInput: EconomyFareInput = {
  baseFare: 2,
  routeFare: 10,
  passengerCount: 1,
  validStopsCount: 0,
  studentDiscountAvailable: false,
  studentDiscount: 1,
};

describe('computeFareBreakdown', () => {
  it('splits base from distance', () => {
    const b = computeFareBreakdown(baseInput);
    expect(b.baseFare).toBe(2);
    expect(b.distanceFare).toBe(8);
    expect(b.totalFare).toBe(10);
  });

  it('charges only for passengers beyond the third', () => {
    for (const count of [1, 2, 3]) {
      expect(computeFareBreakdown({ ...baseInput, passengerCount: count }).extraPassengerFee).toBe(0);
    }
    expect(computeFareBreakdown({ ...baseInput, passengerCount: 4 }).extraPassengerFee).toBe(0.5);
    expect(computeFareBreakdown({ ...baseInput, passengerCount: 5 }).extraPassengerFee).toBe(1);
  });

  it('charges 50c per valid stop', () => {
    expect(computeFareBreakdown({ ...baseInput, validStopsCount: 3 }).stopFee).toBe(1.5);
  });

  it('applies the student discount when available', () => {
    const b = computeFareBreakdown({ ...baseInput, studentDiscountAvailable: true, studentDiscount: 1 });
    expect(b.discount).toBe(1);
    expect(b.totalFare).toBe(9);
  });

  it('never lets the student discount drive the fare below $0.50', () => {
    // Subtotal 1.00, discount capped at 0.50 so the floor holds.
    const b = computeFareBreakdown({
      ...baseInput,
      baseFare: 1,
      routeFare: 1,
      studentDiscountAvailable: true,
      studentDiscount: 10,
    });
    expect(b.totalFare).toBeGreaterThanOrEqual(0.5);
    expect(b.discount).toBe(0.5);
  });
});

describe('tier pricing', () => {
  const breakdown = { baseFare: 2, distanceFare: 8, totalFare: 10 };

  it('fabricates nothing before a destination is known', () => {
    for (const opt of tierOptionsWithoutFare()) {
      expect(opt.price).toBeNull();
      expect(opt.etaMinutes).toBeNull();
    }
  });

  it('prices Share strictly BELOW Economy — the regression this guards', () => {
    // The old formula was max(economy + 2, economy * 1.4), which priced Share
    // ABOVE Economy while badging it "Save more". A $5 trip came out at $7.
    const tiers = tierOptionsWithFare(breakdown, 10);
    const economy = tiers.find((t) => t.id === 'economy')!.price!;
    const share = tiers.find((t) => t.id === 'share')!.price!;

    expect(share).toBeLessThan(economy);
    expect(share).toBeCloseTo(7, 5); // 10 * 0.7
  });

  it('matches the documented $5.00 → $3.50 example exactly', () => {
    const tiers = tierOptionsWithFare({ baseFare: 2, distanceFare: 3, totalFare: 5 }, 10);
    expect(tiers.find((t) => t.id === 'share')!.price).toBeCloseTo(3.5, 5);
  });

  it('floors Share at the town base fare so it cannot undercut the minimum', () => {
    // 70% of 2.50 is 1.75, which is below the 2.00 base fare — base wins.
    const tiers = tierOptionsWithFare({ baseFare: 2, distanceFare: 0.5, totalFare: 2.5 }, 5);
    expect(tiers.find((t) => t.id === 'share')!.price).toBe(2);
  });

  it('prices Parcel off base plus 60% of distance, with a size surcharge', () => {
    // 2 + (8 * 0.6) = 6.80, medium adds 0.50 → 7.30
    const medium = tierOptionsWithFare(breakdown, 10, 'medium');
    expect(medium.find((t) => t.id === 'parcel')!.price).toBeCloseTo(7.3, 5);

    const small = tierOptionsWithFare(breakdown, 10, 'small');
    expect(small.find((t) => t.id === 'parcel')!.price).toBeCloseTo(6.8, 5);

    const large = tierOptionsWithFare(breakdown, 10, 'large');
    expect(large.find((t) => t.id === 'parcel')!.price).toBeCloseTo(8.3, 5);
  });

  it('gives Share a longer ETA and Parcel a 10-minute minimum', () => {
    const tiers = tierOptionsWithFare(breakdown, 4);
    expect(tiers.find((t) => t.id === 'economy')!.etaMinutes).toBe(4);
    expect(tiers.find((t) => t.id === 'share')!.etaMinutes).toBe(6);
    expect(tiers.find((t) => t.id === 'parcel')!.etaMinutes).toBe(10);
  });

  it('never shows a zero-minute ETA', () => {
    expect(tierOptionsWithFare(breakdown, 0).find((t) => t.id === 'economy')!.etaMinutes).toBe(1);
  });
});
