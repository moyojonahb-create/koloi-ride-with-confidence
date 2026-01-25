import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodeRequest {
  address: string;
}

serve(async (req) => {
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

    const { address }: GeocodeRequest = await req.json();
    
    if (!address || address.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Geocoding address: ${address}`);

    // HERE Geocoding API
    const url = new URL('https://geocode.search.hereapi.com/v1/geocode');
    url.searchParams.set('q', address);
    url.searchParams.set('limit', '1');
    url.searchParams.set('apiKey', HERE_API_KEY);

    console.log('Calling HERE Geocoding API...');
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('HERE Geocoding API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to geocode address', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('HERE Geocoding response received');

    if (!data.items || data.items.length === 0) {
      console.log('No results found for address');
      return new Response(
        JSON.stringify({ error: 'Address not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data.items[0];
    const geocoded = {
      latitude: result.position.lat,
      longitude: result.position.lng,
      formattedAddress: result.address.label,
      city: result.address.city,
      country: result.address.countryName,
    };

    console.log(`Geocoded: ${geocoded.formattedAddress} -> (${geocoded.latitude}, ${geocoded.longitude})`);

    return new Response(
      JSON.stringify(geocoded),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing geocode request:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
