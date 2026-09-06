import { describe, expect, it } from 'vitest';

import { DEFAULT_TOWN, detectTown, getTownById } from './towns';
import { isStreetLike, rankTownStreets, type RankablePlace } from './streetSearchRank';

const gwanda = DEFAULT_TOWN;

function place(over: Partial<RankablePlace> & { name: string }): RankablePlace {
  return { lat: gwanda.center.lat, lng: gwanda.center.lng, ...over };
}

describe('isStreetLike', () => {
  it('accepts anything OSM classifies as a highway', () => {
    expect(isStreetLike(place({ name: 'Unnamed', class: 'highway' }))).toBe(true);
  });

  it('accepts known street types', () => {
    for (const type of ['road', 'residential', 'primary', 'trunk']) {
      expect(isStreetLike(place({ name: 'Something', type }))).toBe(true);
    }
  });

  it('falls back to street words in the name', () => {
    expect(isStreetLike(place({ name: 'Main Street' }))).toBe(true);
    expect(isStreetLike(place({ name: 'Jason Moyo Ave' }))).toBe(true);
    expect(isStreetLike(place({ name: 'Chicken Inn' }))).toBe(false);
  });
});

describe('rankTownStreets', () => {
  const ctx = {
    townName: gwanda.name,
    townCenter: gwanda.center,
    maxDistanceKm: gwanda.maxDistanceKm,
  };

  it('puts in-town streets first, then in-town places, then the rest', () => {
    // Far away: well outside the town radius in both lat and lng.
    const far = { lat: gwanda.center.lat + 5, lng: gwanda.center.lng + 5 };

    const ranked = rankTownStreets(
      [
        place({ name: 'Far Away Road', ...far }),
        place({ name: 'Local Shop' }),
        place({ name: 'Local Road', class: 'highway' }),
        place({ name: 'Far Away Shop', ...far }),
      ],
      ctx,
    );

    expect(ranked.map((p) => p.name)).toEqual([
      'Local Road',    // tier 0 — in town AND street-like
      'Local Shop',    // tier 1 — in town
      'Far Away Road', // tier 2 — street-like but out of town
      'Far Away Shop', // tier 3
    ]);
  });

  it('orders within a tier by distance from the rider when GPS is available', () => {
    const near = { lat: gwanda.center.lat + 0.001, lng: gwanda.center.lng };
    const further = { lat: gwanda.center.lat + 0.01, lng: gwanda.center.lng };

    const ranked = rankTownStreets(
      [place({ name: 'Further Shop', ...further }), place({ name: 'Nearer Shop', ...near })],
      { ...ctx, userCoords: near },
    );
    expect(ranked[0].name).toBe('Nearer Shop');
  });

  it('treats a displayName naming the town as in-town even when far from centre', () => {
    const ranked = rankTownStreets(
      [
        place({ name: 'Elsewhere Shop', lat: 0, lng: 0 }),
        place({ name: 'Named Shop', lat: 0, lng: 0, displayName: `Somewhere, ${gwanda.name}` }),
      ],
      { ...ctx, maxDistanceKm: 1 },
    );
    expect(ranked[0].name).toBe('Named Shop');
  });

  it('does not mutate the input array', () => {
    const input = [place({ name: 'B Road' }), place({ name: 'A Shop' })];
    const copy = [...input];
    rankTownStreets(input, ctx);
    expect(input).toEqual(copy);
  });
});

describe('towns port sanity', () => {
  it('resolves the default town by id', () => {
    expect(getTownById(DEFAULT_TOWN.id)?.name).toBe(DEFAULT_TOWN.name);
  });

  it('detects the default town from its own centre', () => {
    expect(detectTown(gwanda.center.lat, gwanda.center.lng).id).toBe(gwanda.id);
  });
});
