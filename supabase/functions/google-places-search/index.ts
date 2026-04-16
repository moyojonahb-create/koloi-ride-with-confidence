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
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Google Maps API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const placeId = url.searchParams.get('placeId');

    // ── Place Details by ID (legacy) ──
    if (placeId) {
      const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      detailsUrl.searchParams.set('place_id', placeId);
      detailsUrl.searchParams.set('fields', 'geometry,name,formatted_address');
      detailsUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);

      const detailsRes = await fetch(detailsUrl.toString());
      if (!detailsRes.ok) {
        const errorText = await detailsRes.text();
        console.error('[google-places-search] details error:', detailsRes.status, errorText);
        return new Response(JSON.stringify({ error: 'Place details failed' }), {
          status: detailsRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const details = await detailsRes.json();
      if (details.status !== 'OK' || !details.result) {
        console.error('[google-places-search] details status:', details.status);
        return new Response(JSON.stringify(null), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = {
        lat: details.result.geometry.location.lat,
        lng: details.result.geometry.location.lng,
        name: details.result.name || details.result.formatted_address || '',
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Autocomplete search (legacy) ──
    const q = url.searchParams.get('q')?.trim();
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');
    const radiusKm = Number(url.searchParams.get('radiusKm') || '0');

    if (!q || q.length < 3) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const autocompleteUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    autocompleteUrl.searchParams.set('input', q);
    autocompleteUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    autocompleteUrl.searchParams.set('components', 'country:zw');
    autocompleteUrl.searchParams.set('language', 'en');

    if (lat && lng) {
      autocompleteUrl.searchParams.set('location', `${lat},${lng}`);
      autocompleteUrl.searchParams.set('radius', String(Math.max(radiusKm * 1000, 5000)));
    }

    const autocompleteRes = await fetch(autocompleteUrl.toString());
    if (!autocompleteRes.ok) {
      const errorText = await autocompleteRes.text();
      console.error('[google-places-search] autocomplete error:', autocompleteRes.status, errorText);
      return new Response(JSON.stringify({ error: 'Place autocomplete failed' }), {
        status: autocompleteRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await autocompleteRes.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[google-places-search] autocomplete status:', data.status, data.error_message);
      return new Response(JSON.stringify({ error: data.error_message || 'Autocomplete failed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const suggestions = (data.predictions || []).map((p: any) => ({
      placeId: p.place_id,
      name: p.structured_formatting?.main_text || p.description?.split(',')[0] || '',
      description: p.structured_formatting?.secondary_text || p.description || '',
    }));

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
