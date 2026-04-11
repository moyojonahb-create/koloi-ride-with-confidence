// Nationwide Zimbabwe geocoding via Nominatim (OSM)
// No town-specific restrictions — searches across all of Zimbabwe

import { cachePlaceFromNominatim } from '@/lib/placeCache';

export interface NominatimResult {
  place_id: number;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  class?: string;
  type?: string;
  address?: Record<string, string>;
}

/**
 * Forward geocode search across Zimbabwe via Nominatim.
 * No bounding box — nationwide results, country-restricted to ZW.
 */
export async function searchZW(q: string, limit = 10): Promise<NominatimResult[]> {
  // In browsers, Nominatim often blocks direct cross-origin requests.
  // In dev we use Vite proxy: `/api/nominatim/search`.
  // In production you should use a server-side proxy (e.g., Supabase Edge Function).
  const base = (typeof window !== 'undefined')
    ? '/api/nominatim/search'
    : 'https://nominatim.openstreetmap.org/search';

  const url = new URL(base, typeof window !== 'undefined' ? window.location.origin : undefined);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', q);
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('countrycodes', 'zw');
  url.searchParams.set('dedupe', '1');

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      // Nominatim usage policy recommends a valid User-Agent; browsers disallow setting it.
      // The dev proxy will set origin correctly.
    },
  });
  if (!res.ok) throw new Error('Place search failed');
  return res.json();
}

/**
 * Reverse geocode coordinates via Nominatim.
 * Returns the closest address/place for the given lat/lon.
 */
export async function reverseZW(lat: number, lon: number): Promise<NominatimResult> {
  const base = (typeof window !== 'undefined')
    ? '/api/nominatim/reverse'
    : 'https://nominatim.openstreetmap.org/reverse';

  const url = new URL(base, typeof window !== 'undefined' ? window.location.origin : undefined);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('zoom', '18');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Reverse geocode failed');
  return res.json();
}

/**
 * Search + cache helper: searches nationwide and caches results.
 */
export async function searchAndCache(q: string, limit = 10) {
  const results = await searchZW(q, limit);
  // Cache in background
  for (const r of results) {
    cachePlaceFromNominatim(r).catch(() => {});
  }
  return results.map((r) => ({
    name: r.name || r.display_name.split(',')[0],
    lat: Number(r.lat),
    lng: Number(r.lon),
    displayName: r.display_name,
  }));
}
