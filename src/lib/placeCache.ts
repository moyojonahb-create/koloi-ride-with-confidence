// Cache Nominatim results to places_cache table
import { supabase } from '@/lib/supabaseClient';
import type { NominatimResult } from '@/lib/geo';

/**
 * Cache a Nominatim result into the places_cache table.
 * Silently ignores duplicate OSM entities (upsert via unique index).
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

    // Duplicates are expected when users search/select the same place repeatedly.
    // Use upsert on the OSM unique key when available, and ignore duplicates.
    const hasOsmIdentity = Boolean(payload.osm_type && payload.osm_id);

    const query = hasOsmIdentity
      ? supabase
          .from('places_cache')
          .upsert(payload, { onConflict: 'osm_type,osm_id', ignoreDuplicates: true })
      : supabase.from('places_cache').insert(payload);

    const { error } = await query;

    // Cache is best-effort only; never fail ride flow due to cache writes.
    if (error) {
      // 409/23505 duplicate conflicts are explicitly non-fatal.
      if (error.code === '23505' || (error as { status?: number }).status === 409) return;
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
