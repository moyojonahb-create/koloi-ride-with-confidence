// Cache Nominatim results to places_cache table
import { supabase } from '@/lib/supabaseClient';
import type { NominatimResult } from '@/lib/geo';

function isNonFatalPlaceCacheError(error: { code?: string; status?: number; message?: string; details?: string; hint?: string }) {
  const message = (error.message ?? '').toLowerCase();
  const details = (error.details ?? '').toLowerCase();
  const hint = (error.hint ?? '').toLowerCase();

  return (
    error.code === '23505' ||
    error.status === 409 ||
    message.includes('no unique or exclusion constraint matching the on conflict specification') ||
    details.includes('no unique or exclusion constraint matching the on conflict specification') ||
    hint.includes('no unique or exclusion constraint matching the on conflict specification')
  );
}

/**
 * Cache a Nominatim result into the places_cache table.
 * Best-effort write: never throws into ride flow.
 */
export async function cachePlaceFromNominatim(p: NominatimResult): Promise<void> {
  try {
    const payload = {
      name: p.name ?? null,
      display_name: p.display_name,
      lat: Number(p.lat),
      lon: Number(p.lon),
      osm_type: p.osm_type ?? null,
      osm_id: p.osm_id ? Number(p.osm_id) : null,
      class: p.class ?? null,
      type: p.type ?? null,
      address: p.address ?? null,
    };

    const hasOsmIdentity = Boolean(payload.osm_type && payload.osm_id);

    // Idempotency guard: if this OSM entity already exists, skip write.
    if (hasOsmIdentity) {
      const { data: existingByOsm, error: existingByOsmError } = await supabase
        .from('places_cache')
        .select('id')
        .eq('osm_type', payload.osm_type)
        .eq('osm_id', payload.osm_id as number)
        .limit(1)
        .maybeSingle();

      if (!existingByOsmError && existingByOsm?.id) return;

      if (existingByOsmError && !isNonFatalPlaceCacheError(existingByOsmError)) {
        // Non-fatal cache read issue; continue and attempt insert as best-effort.
        console.warn('[placeCache] non-fatal precheck error:', existingByOsmError.message);
      }
    }

    // NOTE:
    // We intentionally avoid `upsert(..., { onConflict: 'osm_type,osm_id' })` here because
    // some environments only have a partial unique index for these columns. PostgREST then
    // returns 400: "there is no unique or exclusion constraint matching the ON CONFLICT
    // specification". Cache writes are non-critical, so use plain insert and fail safely.
    const { error } = await supabase.from('places_cache').insert(payload);

    // Cache is best-effort only; never fail ride flow due to cache writes.
    if (error) {
      // Duplicate/constraint conflicts are treated as successful idempotent cache writes.
      if (isNonFatalPlaceCacheError(error)) return;

      console.warn('[placeCache] non-fatal cache write error:', error.message);
    }
  } catch {
    // Ignore cache failures (duplicates, auth issues, etc.)
  }
}

/**
 * Search the local places_cache for previously cached results.
 * Useful for offline-first or reducing Nominatim API calls.
 */
export async function searchCachedPlaces(query: string, limit = 10) {
  const { data } = await supabase
    .from('places_cache')
    .select('*')
    .ilike('display_name', `%${query}%`)
    .limit(limit);
  return data ?? [];
}
