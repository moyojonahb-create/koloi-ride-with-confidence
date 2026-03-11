// Intercity route definitions for Zimbabwe
// Used for long-distance ride pricing and suggestions

export interface IntercityRoute {
  id: string;
  from: string;
  to: string;
  distanceKm: number;
  durationHrs: number;
  baseFareUsd: number;
  popular: boolean;
}

export const INTERCITY_ROUTES: IntercityRoute[] = [
  { id: 'gwa-byo', from: 'gwanda', to: 'bulawayo', distanceKm: 126, durationHrs: 1.8, baseFareUsd: 15, popular: true },
  { id: 'gwa-bb', from: 'gwanda', to: 'beitbridge', distanceKm: 220, durationHrs: 3, baseFareUsd: 25, popular: true },
  { id: 'byo-hre', from: 'bulawayo', to: 'harare', distanceKm: 439, durationHrs: 5.5, baseFareUsd: 45, popular: true },
  { id: 'byo-vic', from: 'bulawayo', to: 'victoriafalls', distanceKm: 440, durationHrs: 5.5, baseFareUsd: 50, popular: true },
  { id: 'hre-mtr', from: 'harare', to: 'mutare', distanceKm: 263, durationHrs: 3.5, baseFareUsd: 30, popular: true },
  { id: 'hre-msv', from: 'harare', to: 'masvingo', distanceKm: 292, durationHrs: 3.5, baseFareUsd: 30, popular: false },
  { id: 'byo-gwr', from: 'bulawayo', to: 'gweru', distanceKm: 164, durationHrs: 2, baseFareUsd: 18, popular: false },
  { id: 'gwr-hre', from: 'gweru', to: 'harare', distanceKm: 275, durationHrs: 3.5, baseFareUsd: 28, popular: false },
  { id: 'byo-pmt', from: 'bulawayo', to: 'plumtree', distanceKm: 100, durationHrs: 1.3, baseFareUsd: 12, popular: false },
  { id: 'byo-hwg', from: 'bulawayo', to: 'hwange', distanceKm: 324, durationHrs: 4, baseFareUsd: 35, popular: false },
  { id: 'gwa-zvs', from: 'gwanda', to: 'zvishavane', distanceKm: 180, durationHrs: 2.5, baseFareUsd: 20, popular: false },
  { id: 'hre-kwe', from: 'harare', to: 'kwekwe', distanceKm: 213, durationHrs: 2.5, baseFareUsd: 22, popular: false },
  { id: 'hre-kdm', from: 'harare', to: 'kadoma', distanceKm: 141, durationHrs: 2, baseFareUsd: 15, popular: false },
];

/**
 * Find routes originating from a given town.
 */
export function getRoutesFromTown(townId: string): IntercityRoute[] {
  return INTERCITY_ROUTES.filter(
    (r) => r.from === townId || r.to === townId
  ).map((r) => {
    // Normalize so the given town is always "from"
    if (r.to === townId) {
      return { ...r, from: r.to, to: r.from };
    }
    return r;
  });
}

/**
 * Calculate intercity fare with optional negotiation.
 * Returns base fare; riders can negotiate ±30%.
 */
export function calcIntercityFare(route: IntercityRoute, passengers: number = 1): {
  baseFare: number;
  minOffer: number;
  maxOffer: number;
} {
  const baseFare = route.baseFareUsd * Math.max(1, passengers * 0.8);
  return {
    baseFare: Math.round(baseFare * 2) / 2, // round to $0.50
    minOffer: Math.round(baseFare * 0.7 * 2) / 2,
    maxOffer: Math.round(baseFare * 1.3 * 2) / 2,
  };
}
