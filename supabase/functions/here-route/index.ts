import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RouteRequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HERE_API_KEY = Deno.env.get('HERE_API_KEY');
    
    if (!HERE_API_KEY) {
      console.error('HERE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'HERE Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { origin, destination }: RouteRequest = await req.json();
    
    console.log(`Fetching route from (${origin.lat}, ${origin.lng}) to (${destination.lat}, ${destination.lng})`);

    // HERE Routing API v8
    const url = new URL('https://router.hereapi.com/v8/routes');
    url.searchParams.set('transportMode', 'car');
    url.searchParams.set('origin', `${origin.lat},${origin.lng}`);
    url.searchParams.set('destination', `${destination.lat},${destination.lng}`);
    url.searchParams.set('return', 'polyline,summary');
    url.searchParams.set('apiKey', HERE_API_KEY);

    console.log('Calling HERE Maps API...');
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('HERE Maps API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch route from HERE Maps', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('HERE Maps response received');

    if (!data.routes || data.routes.length === 0) {
      console.log('No routes found');
      return new Response(
        JSON.stringify({ error: 'No route found between the locations' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const route = data.routes[0];
    const section = route.sections[0];
    
    // Decode the flexible polyline from HERE Maps
    const polyline = section.polyline;
    const summary = section.summary;
    
    const result = {
      distance: summary.length, // in meters
      duration: summary.duration, // in seconds
      polyline: polyline, // HERE flexible polyline format
    };

    console.log(`Route found: ${result.distance}m, ${result.duration}s`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing route request:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
