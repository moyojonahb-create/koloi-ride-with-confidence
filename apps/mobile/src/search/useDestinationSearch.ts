/**
 * Destination search across the three sources the web app uses.
 *
 *   landmarks  → `koloi_landmarks` (Supabase)
 *   streets    → `streets`         (Supabase)
 *   osm        → Nominatim via the Supabase Edge Function (core client)
 *
 * The three run concurrently and are merged, then ordered by
 * `rankTownStreets()` from `@cruixe/core` — the same ranking web applies, so
 * in-town streets surface above distant points of interest.
 *
 * **Why this is a hook in the app rather than in core.** Core's charter forbids
 * framework code ("must stay runnable in Node for tests"). The pure parts —
 * ranking and the Nominatim request — are ported into core and unit-tested
 * there; only the React lifecycle around them lives here. That is the split
 * that keeps core testable without a renderer.
 *
 * Debounce and abort semantics are carried over from `useStreets.ts`: 200 ms,
 * and every in-flight request is aborted when the query changes. A cancelled
 * lookup resolves empty rather than throwing — see the core client — because a
 * request superseded by the next keystroke is normal, not an error.
 *
 * NOT included: the `places_cache` read (`searchCachedPlacesPrefix`). It is a
 * latency optimisation over the same OSM data, not a fourth source, and it is
 * deferred rather than dropped.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createNominatimClient,
  rankTownStreets,
  type TownConfig,
} from '@cruixe/core';

import { coreConfigResult } from '../core/config';
import { requireSupabase } from '../core/supabase';

export type DestinationSource = 'landmark' | 'street' | 'osm';

export interface DestinationResult {
  id: string;
  name: string;
  subtitle: string | null;
  lat: number;
  lng: number;
  source: DestinationSource;
}

const DEBOUNCE_MS = 200;
const MIN_QUERY = 3;

interface Options {
  query: string;
  town: TownConfig;
  userCoords?: { lat: number; lng: number } | null;
  limit?: number;
}

export function useDestinationSearch({ query, town, userCoords = null, limit = 10 }: Options) {
  const [results, setResults] = useState<DestinationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const nominatim = useMemo(
    () => (coreConfigResult.ok ? createNominatimClient({ config: coreConfigResult.config }) : null),
    [],
  );

  useEffect(() => {
    const q = query.trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (q.length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      void (async () => {
        try {
          const [landmarks, streets, osm] = await Promise.all([
            searchLandmarks(q, limit, controller.signal),
            searchStreets(q, town.name, limit, controller.signal),
            nominatim
              ? nominatim.search(q, limit, town.nominatimViewbox, false, controller.signal)
              : Promise.resolve([]),
          ]);

          if (controller.signal.aborted) return;

          const merged: DestinationResult[] = [
            ...landmarks,
            ...streets,
            ...osm.map((r) => ({
              id: `osm-${r.osm_type}-${r.osm_id}`,
              name: r.name ?? r.display_name.split(',')[0],
              subtitle: r.display_name,
              lat: Number(r.lat),
              lng: Number(r.lon),
              source: 'osm' as const,
            })),
          ];

          // Same ranking as web: in-town streets first, then in-town places,
          // then everything else — each group by proximity.
          const ranked = rankTownStreets(
            merged.map((m) => ({ ...m, displayName: m.subtitle ?? undefined })),
            {
              townName: town.name,
              townCenter: town.center,
              userCoords,
              maxDistanceKm: town.maxDistanceKm,
            },
          );

          setResults(dedupe(ranked as DestinationResult[]).slice(0, limit * 2));
        } catch (err) {
          if (controller.signal.aborted) return;
          console.error('Destination search failed:', err);
          setError('Search failed. Check your connection and try again.');
          setResults([]);
        } finally {
          if (abortRef.current === controller) setLoading(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [query, town, userCoords, limit, nominatim]);

  return { results, loading, error };
}

/** Same coordinate can arrive from two sources; keep the first (better-ranked). */
function dedupe(rows: DestinationResult[]): DestinationResult[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = `${r.lat.toFixed(5)},${r.lng.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// `koloi_landmarks` and `streets` are not in the generated Database types yet,
// so the client is narrowed to an untyped shape at these two call sites — the
// same approach `useStreets.ts` takes on web, and for the same reason.
type UntypedDb = { from: (table: string) => any };

async function searchLandmarks(
  q: string,
  limit: number,
  signal: AbortSignal,
): Promise<DestinationResult[]> {
  const db = requireSupabase() as unknown as UntypedDb;
  const { data, error } = await db
    .from('koloi_landmarks')
    .select('*')
    .eq('is_active', true)
    .ilike('name', `%${q}%`)
    .abortSignal(signal)
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: `landmark-${String(row.id)}`,
    name: String(row.name ?? ''),
    subtitle: (row.category as string | null) ?? null,
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    source: 'landmark' as const,
  }));
}

async function searchStreets(
  q: string,
  townName: string,
  limit: number,
  signal: AbortSignal,
): Promise<DestinationResult[]> {
  const db = requireSupabase() as unknown as UntypedDb;
  const scoped = () =>
    db.from('streets').select('*').eq('is_active', true).eq('town', townName).abortSignal(signal);

  // Prefix beats contains — web scores these 3 and 2 respectively. Keyword
  // matching is omitted here; it is a third query per keystroke for a long-tail
  // gain, and this link cannot afford it.
  const [prefix, contains] = await Promise.all([
    scoped().ilike('name', `${q}%`).limit(limit),
    scoped().ilike('name', `%${q}%`).limit(limit),
  ]);

  if (prefix.error) throw prefix.error;
  if (contains.error) throw contains.error;

  const seen = new Set<string>();
  const out: DestinationResult[] = [];
  for (const row of [...(prefix.data ?? []), ...(contains.data ?? [])]) {
    const id = String(row.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id: `street-${id}`,
      name: String(row.name ?? ''),
      subtitle: (row.road_class as string | null) ?? townName,
      lat: Number(row.latitude),
      lng: Number(row.longitude),
      source: 'street',
    });
  }
  return out.slice(0, limit);
}
