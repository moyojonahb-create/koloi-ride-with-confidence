import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PRICING,
  calculateRecommendedFare,
  formatFare,
  getFareStep,
  isNightTime,
  type TownPricingConfig,
} from './fare';

const at = (hour: number) => () => new Date(2026, 0, 15, hour, 0, 0);

// A config with the multipliers neutralised, so a test asserting one behaviour
// is not silently also asserting night or demand pricing.
const flat: TownPricingConfig = {
  ...DEFAULT_PRICING,
  night_multiplier: 1,
  demand_multiplier: 1,
};

describe('isNightTime', () => {
  it('is night from 20:00 through 04:59', () => {
    expect(isNightTime(at(20))).toBe(true);
    expect(isNightTime(at(23))).toBe(true);
    expect(isNightTime(at(0))).toBe(true);
    expect(isNightTime(at(4))).toBe(true);
  });

  it('is day from 05:00 to 19:59', () => {
    expect(isNightTime(at(5))).toBe(false);
    expect(isNightTime(at(12))).toBe(false);
    expect(isNightTime(at(19))).toBe(false);
  });
});

describe('calculateRecommendedFare', () => {
  it('applies base + distance + duration, rounded to the nearest $0.50', () => {
    // 2 + (10 * 0.8) + (10 * 0.03) = 10.30 → rounds to 10.50
    const q = calculateRecommendedFare(flat, 10, 10, at(12));
    expect(q.recommended).toBe(10.5);
  });

  it('never returns less than the $0.50 hard floor', () => {
    const free: TownPricingConfig = { ...flat, base_fare: 0, per_km_rate: 0, minimum_fare: 0 };
    expect(calculateRecommendedFare(free, 0, 0, at(12)).recommended).toBe(0.5);
  });

  it('respects the town minimum before rounding', () => {
    const config: TownPricingConfig = { ...flat, base_fare: 0, per_km_rate: 0, minimum_fare: 3 };
    expect(calculateRecommendedFare(config, 0, 0, at(12)).recommended).toBe(3);
  });

  it('applies the night multiplier only at night', () => {
    const config: TownPricingConfig = { ...DEFAULT_PRICING, demand_multiplier: 1, night_multiplier: 2 };
    const day = calculateRecommendedFare(config, 10, 10, at(12)).recommended;
    const night = calculateRecommendedFare(config, 10, 10, at(22)).recommended;
    expect(night).toBeGreaterThan(day);
    // 10.30 * 2 = 20.60 → 20.50 after rounding to nearest 0.50
    expect(night).toBe(20.5);
  });

  it('compounds demand on top of night', () => {
    const config: TownPricingConfig = { ...DEFAULT_PRICING, night_multiplier: 2, demand_multiplier: 1.5 };
    // 10.30 * 2 * 1.5 = 30.90 → 31.00
    expect(calculateRecommendedFare(config, 10, 10, at(22)).recommended).toBe(31);
  });

  it('caps the ceiling at the lower of the town cap and 2x the fare', () => {
    // 2x the fare (21.00) is below the town ceiling of 50, so 2x wins.
    const low = calculateRecommendedFare(flat, 10, 10, at(12));
    expect(low.ceiling).toBe(21);

    // With a tight town ceiling, the town cap wins instead.
    const capped = calculateRecommendedFare({ ...flat, offer_ceiling: 5 }, 10, 10, at(12));
    expect(capped.ceiling).toBe(5);
  });

  it('floors the negotiable band at the greater of offer_floor and minimum_fare', () => {
    expect(calculateRecommendedFare({ ...flat, offer_floor: 1, minimum_fare: 4 }, 5, 5, at(12)).floor).toBe(4);
    expect(calculateRecommendedFare({ ...flat, offer_floor: 6, minimum_fare: 2 }, 5, 5, at(12)).floor).toBe(6);
  });

  it('carries the currency through from the town config', () => {
    const zwl: TownPricingConfig = { ...flat, currency_code: 'ZWG', currency_symbol: 'Z$' };
    const q = calculateRecommendedFare(zwl, 5, 5, at(12));
    expect(q.currencyCode).toBe('ZWG');
    expect(q.currencySymbol).toBe('Z$');
  });

  it('grows monotonically with distance', () => {
    const near = calculateRecommendedFare(flat, 2, 5, at(12)).recommended;
    const far = calculateRecommendedFare(flat, 20, 5, at(12)).recommended;
    expect(far).toBeGreaterThan(near);
  });
});

describe('formatting', () => {
  it('formats to two decimals with the symbol', () => {
    expect(formatFare(10.5, '$')).toBe('$10.50');
    expect(formatFare(3, 'Z$')).toBe('Z$3.00');
  });

  it('steps in half units', () => {
    expect(getFareStep()).toBe(0.5);
  });
});
