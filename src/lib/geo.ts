// Nominatim geocoding utilities bounded to service areas in Zimbabwe
import { DEFAULT_TOWN, TownConfig } from '@/lib/towns';

export const GWANDA_VIEWBOX = {
  left: 28.8107,
  top: -20.7614,
  right: 29.1967,
  bottom: -21.1214,
};

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
 * Forward geocode search bounded to a town's area via Nominatim.
 * Falls back to Gwanda viewbox if no town provided.
 */
export async function nominatimSearchGwanda(q: string, town?: TownConfig): Promise<NominatimResult[]> {
  const vb = town?.nominatimViewbox ?? GWANDA_VIEWBOX;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", q);
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "10");
  url.searchParams.set("countrycodes", "zw");
  url.searchParams.set("bounded", "1");
  url.searchParams.set(
    "viewbox",
    `${vb.left},${vb.top},${vb.right},${vb.bottom}`
  );
  url.searchParams.set("dedupe", "1");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Place search failed");
  return res.json();
}

/**
 * Reverse geocode coordinates via Nominatim.
 * Returns the closest address/place for the given lat/lon.
 */
export async function nominatimReverse(lat: number, lon: number): Promise<NominatimResult> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Reverse geocode failed");
  return res.json();
}
