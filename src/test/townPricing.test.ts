import { describe, it, expect } from 'vitest';
import { calculateRecommendedFare, formatFare, getFareStep } from '@/hooks/useTownPricing';
import type { TownPricingConfig } from '@/hooks/useTownPricing';

const usdTown: TownPricingConfig = {
  id: '1',
  town_id: 'harare',
  town_name: 'Harare',
  currency_code: 'USD',
  currency_symbol: '$',
  base_fare: 2,
  per_km_rate: 0.80,
  minimum_fare: 1,
  offer_floor: 1,
  offer_ceiling: 50,
  short_trip_fare: 1,
  short_trip_km: 2,
  night_multiplier: 1.2,
  demand_multiplier: 1.0,
  is_negotiation_enabled: true,
};

const zarTown: TownPricingConfig = {
  id: '2',
  town_id: 'gwanda',
  town_name: 'Gwanda',
  currency_code: 'ZAR',
  currency_symbol: 'R',
  base_fare: 15,
  per_km_rate: 10,
  minimum_fare: 15,
  offer_floor: 15,
  offer_ceiling: 100,
  short_trip_fare: 15,
  short_trip_km: 2,
  night_multiplier: 1.2,
  demand_multiplier: 1.0,
  is_negotiation_enabled: true,
};

describe('calculateRecommendedFare', () => {
  it('calculates USD fare: base + distance * rate + duration * 0.03', () => {
    const result = calculateRecommendedFare(usdTown, 5, 10);
    // 2 + 5*0.80 + 10*0.03 = 2 + 4 + 0.3 = 6.3 → rounded to $6.50
    expect(result.recommended).toBe(6.5);
    expect(result.currencySymbol).toBe('$');
    expect(result.currencyCode).toBe('USD');
  });

  it('enforces minimum fare', () => {
    const result = calculateRecommendedFare(usdTown, 0, 0);
    // 2 + 0 + 0 = 2, min is 1, so 2 → rounded to $2.00
    expect(result.recommended).toBeGreaterThanOrEqual(usdTown.minimum_fare);
  });

  it('ZAR rounds to nearest R5', () => {
    const result = calculateRecommendedFare(zarTown, 3, 5);
    // 15 + 3*10 + 5*0.03 = 15 + 30 + 0.15 = 45.15 → round to R45
    expect(result.recommended % 5).toBe(0);
    expect(result.recommended).toBe(45);
  });

  it('floor and ceiling are bounded', () => {
    const result = calculateRecommendedFare(usdTown, 10, 20);
    expect(result.floor).toBeGreaterThanOrEqual(usdTown.offer_floor);
    expect(result.ceiling).toBeLessThanOrEqual(usdTown.offer_ceiling);
  });
});

describe('formatFare', () => {
  it('formats USD with 2 decimals', () => {
    expect(formatFare(5.5, '$', 'USD')).toBe('$5.50');
  });
  it('formats ZAR as whole number', () => {
    expect(formatFare(45, 'R', 'ZAR')).toBe('R45');
  });
});

describe('getFareStep', () => {
  it('returns R5 for ZAR', () => expect(getFareStep('ZAR')).toBe(5));
  it('returns $0.50 for USD', () => expect(getFareStep('USD')).toBe(0.5));
});
