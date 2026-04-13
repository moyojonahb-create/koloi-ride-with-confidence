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
    const isReverse = url.searchParams.get('reverse') === '1';

    if (isReverse) {
      const lat = url.searchParams.get('lat');
      const lon = url.searchParams.get('lon');
      if (!lat || !lon) {
        return new Response(JSON.stringify({ error: 'Missing lat/lon' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const nominatimUrl = new URL('https://nominatim.openstreetmap.org/reverse');
      nominatimUrl.searchParams.set('format', 'jsonv2');
      nominatimUrl.searchParams.set('lat', lat);
      nominatimUrl.searchParams.set('lon', lon);
      nominatimUrl.searchParams.set('addressdetails', '1');
      nominatimUrl.searchParams.set('zoom', '18');
      const res = await fetch(nominatimUrl.toString(), {
        headers: { 'User-Agent': 'KoloiRideApp/1.0 (contact@koloi.app)', 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error(`Nominatim returned ${res.status}`);
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const q = url.searchParams.get('q');
    const limit = url.searchParams.get('limit') || '10';
    const countrycodes = url.searchParams.get('countrycodes') || 'zw';
    const viewbox = url.searchParams.get('viewbox');
    const bounded = url.searchParams.get('bounded');

    if (!q) {
      return new Response(JSON.stringify({ error: 'Missing query parameter q' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('format', 'jsonv2');
    nominatimUrl.searchParams.set('q', q);
    nominatimUrl.searchParams.set('addressdetails', '1');
    nominatimUrl.searchParams.set('limit', limit);
    nominatimUrl.searchParams.set('countrycodes', countrycodes);
    nominatimUrl.searchParams.set('dedupe', '1');
    if (viewbox) nominatimUrl.searchParams.set('viewbox', viewbox);
    if (bounded) nominatimUrl.searchParams.set('bounded', bounded);

    const res = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'KoloiRideApp/1.0 (contact@koloi.app)',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Nominatim returned ${res.status}`);
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[nominatim-search]', err);
    return new Response(JSON.stringify({ error: 'Search failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
