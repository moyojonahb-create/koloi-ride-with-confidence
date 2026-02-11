// Nominatim geocoding utilities bounded to Gwanda, Zimbabwe

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
 * Forward geocode search bounded to Gwanda area via Nominatim.
 * Returns up to 10 results within the Gwanda viewbox.
 */
export async function nominatimSearchGwanda(q: string): Promise<NominatimResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", q);
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "10");
  url.searchParams.set("countrycodes", "zw");
  url.searchParams.set("bounded", "1");
  url.searchParams.set(
    "viewbox",
    `${GWANDA_VIEWBOX.left},${GWANDA_VIEWBOX.top},${GWANDA_VIEWBOX.right},${GWANDA_VIEWBOX.bottom}`
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
