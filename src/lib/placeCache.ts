// Cache Nominatim results to places_cache table
import { supabase } from '@/lib/supabaseClient';
import type { NominatimResult } from '@/lib/geo';

/**
 * Cache a Nominatim result into the places_cache table.
 * Silently ignores duplicate OSM entities (upsert via unique index).
 */
export async function cachePlaceFromNominatim(p: NominatimResult): Promise<void> {
  try {
    await supabase.from('places_cache').insert({
      name: p.name ?? null,
      display_name: p.display_name,
      lat: Number(p.lat),
      lon: Number(p.lon),
      osm_type: p.osm_type ?? null,
      osm_id: p.osm_id ? Number(p.osm_id) : null,
      class: p.class ?? null,
      type: p.type ?? null,
      address: p.address ?? null,
    });
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
