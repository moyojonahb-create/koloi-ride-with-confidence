import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        name: place.display_name?.split(',')[0] || place.name || '',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Autocomplete search via Nominatim ──
    const q = url.searchParams.get('q')?.trim();
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');
    const radiusKm = Number(url.searchParams.get('radiusKm') || '0');
    // Accept explicit viewbox for strict town bounding
    const viewboxParam = url.searchParams.get('viewbox'); // "left,top,right,bottom"
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
    searchUrl.searchParams.set('limit', '15');
    searchUrl.searchParams.set('countrycodes', 'zw');
    searchUrl.searchParams.set('dedupe', '1');

    // Use explicit viewbox if provided, otherwise derive from lat/lng
    if (viewboxParam) {
      searchUrl.searchParams.set('viewbox', viewboxParam);
      searchUrl.searchParams.set('bounded', bounded ? '1' : '0');
    } else if (lat && lng) {
      // Derive viewbox from radiusKm or default ~30km
      const delta = radiusKm > 0 ? radiusKm / 111 : 0.3;
      const latNum = Number(lat);
      const lngNum = Number(lng);
      searchUrl.searchParams.set('viewbox', `${lngNum - delta},${latNum - delta},${lngNum + delta},${latNum + delta}`);
      // bounded=1 restricts to viewbox strictly
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
    const suggestions = results.map((r: any) => {
      const mainName = r.name || r.display_name?.split(',')[0] || '';
      const parts = r.display_name?.split(',') || [];
      const secondary = parts.slice(1, 3).map((s: string) => s.trim()).join(', ');
      
      return {
        placeId: `${(r.osm_type || 'node').charAt(0).toUpperCase()}${r.osm_id}`,
        name: mainName,
        description: secondary || 'Zimbabwe',
        lat: Number(r.lat),
        lng: Number(r.lon),
      };
    });

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
