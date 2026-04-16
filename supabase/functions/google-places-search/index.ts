import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Map OSM class+type to a human-readable category label */
function getCategory(cls: string | undefined, type: string | undefined, addressParts: Record<string, string> | undefined): string {
  if (!cls && !type) return '';
  const c = cls || '';
  const t = type || '';

  // Amenity-based
  if (c === 'amenity' || t === 'hospital' || t === 'clinic') {
    const amenityMap: Record<string, string> = {
      hospital: '🏥 Hospital', clinic: '🏥 Clinic', pharmacy: '💊 Pharmacy',
      school: '🏫 School', university: '🎓 University', college: '🎓 College',
      bank: '🏦 Bank', atm: '🏦 ATM', fuel: '⛽ Fuel Station',
      police: '🚔 Police Station', post_office: '📮 Post Office',
      restaurant: '🍽️ Restaurant', fast_food: '🍔 Fast Food', cafe: '☕ Café',
      bar: '🍺 Bar', pub: '🍺 Pub', nightclub: '🎶 Nightclub',
      place_of_worship: '⛪ Place of Worship', church: '⛪ Church', mosque: '🕌 Mosque',
      courthouse: '🏛️ Government', townhall: '🏛️ Town Hall',
      community_centre: '🏘️ Community Centre', library: '📚 Library',
      bus_station: '🚌 Bus Station', taxi: '🚕 Taxi Rank',
      marketplace: '🏪 Market', cinema: '🎬 Cinema',
      stadium: '🏟️ Stadium', sports_centre: '🏟️ Sports Centre',
    };
    return amenityMap[t] || '📍 Amenity';
  }

  if (c === 'shop') {
    const shopMap: Record<string, string> = {
      supermarket: '🛒 Supermarket', mall: '🛍️ Shopping Mall',
      convenience: '🏪 Shop', department_store: '🛍️ Department Store',
      hardware: '🔧 Hardware', car_repair: '🔧 Auto Services',
    };
    return shopMap[t] || '🏪 Shop';
  }

  if (c === 'tourism') {
    const tourismMap: Record<string, string> = {
      hotel: '🏨 Hotel', guest_house: '🏨 Guest House', motel: '🏨 Motel',
      hostel: '🏨 Hostel', camp_site: '⛺ Camp Site',
      museum: '🏛️ Museum', attraction: '🎯 Attraction',
    };
    return tourismMap[t] || '🎯 Tourism';
  }

  if (c === 'office') return '🏢 Office';
  if (c === 'leisure') {
    if (t === 'park') return '🌳 Park';
    if (t === 'stadium') return '🏟️ Stadium';
    if (t === 'sports_centre') return '🏟️ Sports Centre';
    if (t === 'fitness_centre') return '💪 Fitness';
    return '🎯 Leisure';
  }
  if (c === 'building') {
    if (t === 'commercial') return '🏢 Commercial';
    if (t === 'industrial') return '🏭 Industrial';
    if (t === 'residential') return '🏠 Residential';
    if (t === 'government') return '🏛️ Government';
    if (t === 'school') return '🏫 School';
    if (t === 'hospital') return '🏥 Hospital';
    if (t === 'church') return '⛪ Church';
    return '🏢 Building';
  }
  if (c === 'highway') {
    if (t === 'bus_stop') return '🚌 Bus Stop';
    if (t === 'residential') return '🛤️ Road';
    if (t === 'primary' || t === 'secondary' || t === 'tertiary') return '🛤️ Road';
    return '🛤️ Road';
  }
  if (c === 'place') {
    if (t === 'suburb') return '🏘️ Suburb';
    if (t === 'neighbourhood') return '🏘️ Neighbourhood';
    if (t === 'village') return '🏘️ Village';
    if (t === 'town') return '🏙️ Town';
    if (t === 'city') return '🏙️ City';
    return '📍 Area';
  }
  if (c === 'landuse') {
    if (t === 'commercial') return '🏢 Commercial Area';
    if (t === 'industrial') return '🏭 Industrial Area';
    if (t === 'residential') return '🏘️ Residential Area';
    return '📍 Area';
  }
  if (c === 'boundary') return '📍 Area';
  if (c === 'natural') return '🌿 Natural';
  if (c === 'waterway') return '💧 Waterway';

  return '';
}

/** Build the best full display name — never truncate */
function buildFullName(r: any): string {
  // Prefer the explicit name field
  const name = r.name || '';
  const displayParts = (r.display_name || '').split(',').map((s: string) => s.trim());

  // If name exists and is meaningful, use it
  if (name && name.length >= 2) {
    return name;
  }

  // Fallback: first display_name part
  return displayParts[0] || 'Unknown';
}

/** Build a secondary description from display_name parts */
function buildDescription(r: any): string {
  const parts = (r.display_name || '').split(',').map((s: string) => s.trim());
  // Skip the first part (that's the name), take next 2-3 for context
  const secondary = parts.slice(1, 4).join(', ');
  return secondary || 'Zimbabwe';
}

/** Priority score for sorting: stadiums/hospitals/schools first, generic areas last */
function getCategoryPriority(cls: string, type: string): number {
  // Tier 1: Major landmarks
  if (type === 'stadium' || type === 'sports_centre') return 1;
  if (type === 'hospital' || type === 'clinic') return 2;
  if (type === 'school' || type === 'university' || type === 'college') return 3;
  if (type === 'townhall' || type === 'courthouse' || cls === 'office') return 4;
  // Tier 2: Important places
  if (type === 'bus_station' || type === 'marketplace' || type === 'fuel') return 5;
  if (cls === 'amenity') return 6;
  if (cls === 'shop') return 7;
  if (cls === 'tourism') return 8;
  // Tier 3: Roads and intersections
  if (cls === 'highway') return 9;
  // Tier 4: Areas
  if (cls === 'place') return 10;
  if (cls === 'landuse' || cls === 'boundary') return 11;
  // Tier 5: Generic
  return 12;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const placeId = url.searchParams.get('placeId');

    // ── Place Details by OSM ID ──
    if (placeId) {
      const osmType = placeId.charAt(0);
      const osmId = placeId.substring(1);

      const lookupUrl = new URL('https://nominatim.openstreetmap.org/lookup');
      lookupUrl.searchParams.set('osm_ids', `${osmType}${osmId}`);
      lookupUrl.searchParams.set('format', 'json');
      lookupUrl.searchParams.set('addressdetails', '1');

      const res = await fetch(lookupUrl.toString(), {
        headers: { 'User-Agent': 'PickMeApp/1.0' },
      });
      const results = await res.json();
      
      if (!results || results.length === 0) {
        return new Response(JSON.stringify(null), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const place = results[0];
      return new Response(JSON.stringify({
        lat: Number(place.lat),
        lng: Number(place.lon),
        name: buildFullName(place),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Autocomplete search via Nominatim ──
    const q = url.searchParams.get('q')?.trim();
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');
    const radiusKm = Number(url.searchParams.get('radiusKm') || '0');
    const viewboxParam = url.searchParams.get('viewbox');
    const bounded = url.searchParams.get('bounded') === '1';

    if (!q || q.length < 2) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Search with Zimbabwe country code
    const searchUrl = new URL('https://nominatim.openstreetmap.org/search');
    searchUrl.searchParams.set('q', `${q}, Zimbabwe`);
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('addressdetails', '1');
    searchUrl.searchParams.set('limit', '20');
    searchUrl.searchParams.set('countrycodes', 'zw');
    searchUrl.searchParams.set('dedupe', '1');
    // Request extra fields for category detection
    searchUrl.searchParams.set('extratags', '1');

    if (viewboxParam) {
      searchUrl.searchParams.set('viewbox', viewboxParam);
      searchUrl.searchParams.set('bounded', bounded ? '1' : '0');
    } else if (lat && lng) {
      const delta = radiusKm > 0 ? radiusKm / 111 : 0.3;
      const latNum = Number(lat);
      const lngNum = Number(lng);
      searchUrl.searchParams.set('viewbox', `${lngNum - delta},${latNum - delta},${lngNum + delta},${latNum + delta}`);
      searchUrl.searchParams.set('bounded', bounded ? '1' : '0');
    }

    const searchRes = await fetch(searchUrl.toString(), {
      headers: { 'User-Agent': 'PickMeApp/1.0' },
    });

    if (!searchRes.ok) {
      const errorText = await searchRes.text();
      console.error('[google-places-search] nominatim error:', searchRes.status, errorText);
      return new Response(JSON.stringify({ error: 'Place search failed' }), {
        status: searchRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = await searchRes.json();

    // Deduplicate by full name (case-insensitive)
    const seenNames = new Set<string>();

    const suggestions = results
      .map((r: any) => {
        const fullName = buildFullName(r);
        const category = getCategory(r.class, r.type, r.address);
        const priority = getCategoryPriority(r.class || '', r.type || '');

        return {
          placeId: `${(r.osm_type || 'node').charAt(0).toUpperCase()}${r.osm_id}`,
          name: fullName,
          description: buildDescription(r),
          category, // e.g. "🏟️ Stadium"
          lat: Number(r.lat),
          lng: Number(r.lon),
          _priority: priority,
        };
      })
      .filter((s: any) => {
        const key = s.name.toLowerCase();
        if (seenNames.has(key)) return false;
        seenNames.add(key);
        return true;
      })
      .sort((a: any, b: any) => a._priority - b._priority)
      .map(({ _priority, ...rest }: any) => rest); // strip internal field

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[google-places-search]', error);
    return new Response(JSON.stringify({ error: 'Place search failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
