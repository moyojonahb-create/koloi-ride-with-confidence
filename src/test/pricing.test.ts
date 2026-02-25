import { describe, it, expect } from 'vitest';
import { calculateKoloiFare, calculateCommission, detectCity } from '@/lib/pricing';

describe('City Detection', () => {
  it('detects Gwanda', () => {
    expect(detectCity({ lat: -20.940, lng: 29.004 })).toBe('gwanda');
  });
  it('detects Beitbridge', () => {
    expect(detectCity({ lat: -22.217, lng: 30.000 })).toBe('beitbridge');
  });
  it('detects unknown', () => {
    expect(detectCity({ lat: -18.0, lng: 31.0 })).toBe('unknown');
  });
});

describe('Gwanda Inner Zone', () => {
  it('flat R15, R3 commission for inner zone', () => {
    const result = calculateKoloiFare(
      { lat: -20.938, lng: 29.004 },
      { lat: -20.942, lng: 29.005 }
    );
    expect(result.priceR).toBe(15);
    expect(result.commission).toBe(3);
    expect(result.isInnerZone).toBe(true);
  });
});

describe('Gwanda Distance Bands', () => {
  it('R20 for 0-2 km', () => {
    const result = calculateKoloiFare(
      { lat: -20.940, lng: 29.004 },
      { lat: -20.955, lng: 29.010 },
      1.5
    );
    expect(result.priceR).toBe(20);
  });
  it('R30 for 3-4 km', () => {
    const result = calculateKoloiFare(
      { lat: -20.940, lng: 29.004 },
      { lat: -20.970, lng: 29.020 },
      3.5
    );
    expect(result.priceR).toBe(30);
  });
});

describe('Beitbridge Surcharge', () => {
  it('adds R10 to distance band fare', () => {
    // 3.5 km in Beitbridge → Gwanda R30 + R10 = R40
    const result = calculateKoloiFare(
      { lat: -22.217, lng: 30.000 },
      { lat: -22.230, lng: 30.010 },
      3.5
    );
    expect(result.priceR).toBe(40); // R30 + R10
    expect(result.reason).toContain('Beitbridge');
  });

  it('adds R10 for short ride in Beitbridge (0-2 km)', () => {
    const result = calculateKoloiFare(
      { lat: -22.217, lng: 30.000 },
      { lat: -22.220, lng: 30.002 },
      1.0
    );
    expect(result.priceR).toBe(30); // R20 + R10
  });

  it('adds R10 for long ride in Beitbridge (5-6 km)', () => {
    const result = calculateKoloiFare(
      { lat: -22.217, lng: 30.000 },
      { lat: -22.260, lng: 30.030 },
      5.5
    );
    expect(result.priceR).toBe(60); // R50 + R10
  });

  it('no inner zone in Beitbridge', () => {
    const result = calculateKoloiFare(
      { lat: -22.217, lng: 30.000 },
      { lat: -22.218, lng: 30.001 },
      0.5
    );
    expect(result.isInnerZone).toBe(false);
    expect(result.priceR).toBe(30); // R20 + R10, not R15
  });
});

describe('Commission Tiers', () => {
  it('R3 for R15 fare', () => expect(calculateCommission(15)).toBe(3));
  it('R6 for fare < R50', () => {
    expect(calculateCommission(20)).toBe(6);
    expect(calculateCommission(30)).toBe(6);
    expect(calculateCommission(40)).toBe(6);
  });
  it('11% rounded for fare >= R50', () => {
    expect(calculateCommission(50)).toBe(6); // 5.5 rounds to 6
    expect(calculateCommission(60)).toBe(7); // 6.6 rounds to 7
    expect(calculateCommission(80)).toBe(9); // 8.8 rounds to 9
    expect(calculateCommission(90)).toBe(10); // 9.9 rounds to 10
  });
});
