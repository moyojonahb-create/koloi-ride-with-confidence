import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleAutocompletePrediction {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
  };
}

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

    // Referer header required because the API key has HTTP referrer restrictions
    const refererUrl = Deno.env.get('SUPABASE_URL') || 'https://pickme.co.zw';

    const url = new URL(req.url);
    const placeId = url.searchParams.get('placeId');

    // ── Place Details by ID ──
    if (placeId) {
      const detailsUrl = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
      detailsUrl.searchParams.set('languageCode', 'en');

      const detailsRes = await fetch(detailsUrl.toString(), {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'id,displayName,location',
          'Referer': refererUrl,
        },
      });

      if (!detailsRes.ok) {
        const errorText = await detailsRes.text();
        console.error('[google-places-search] details error:', detailsRes.status, errorText);
        return new Response(JSON.stringify({ error: 'Place details failed' }), {
          status: detailsRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const details = await detailsRes.json();
      const result = details?.location
        ? {
            lat: details.location.latitude,
            lng: details.location.longitude,
            name: details.displayName?.text || '',
          }
        : null;

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Autocomplete search ──
    const q = url.searchParams.get('q')?.trim();
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');
    const radiusKm = Number(url.searchParams.get('radiusKm') || '0');

    if (!q || q.length < 3) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody: Record<string, unknown> = {
      input: q,
      languageCode: 'en',
      includedRegionCodes: ['ZW'],
    };

    if (lat && lng) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: Number(lat),
            longitude: Number(lng),
          },
          radius: Math.max(radiusKm * 1000, 5000),
        },
      };
    }

    const autocompleteRes = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
        'Referer': refererUrl,
      },
      body: JSON.stringify(requestBody),
    });

    if (!autocompleteRes.ok) {
      const errorText = await autocompleteRes.text();
      console.error('[google-places-search] autocomplete error:', autocompleteRes.status, errorText);
      return new Response(JSON.stringify({ error: 'Place autocomplete failed' }), {
        status: autocompleteRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await autocompleteRes.json();
    const suggestions = (data?.suggestions ?? [])
      .map((entry: GoogleAutocompletePrediction) => {
        const prediction = entry.placePrediction;
        if (!prediction?.placeId) return null;

        return {
          placeId: prediction.placeId,
          name: prediction.structuredFormat?.mainText?.text || prediction.text?.text || '',
          description:
            prediction.structuredFormat?.secondaryText?.text ||
            prediction.text?.text ||
            '',
        };
      })
      .filter(Boolean);

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