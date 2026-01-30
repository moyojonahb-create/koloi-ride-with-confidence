import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RouteRequest {
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
}

interface GoogleRouteResponse {
  distanceKm: number;
  durationMinutes: number;
  durationInTrafficMinutes: number;
  polyline: string | null;
  isTrafficAware: boolean;
  routeCount?: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('GOOGLE_MAPS_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { pickup, dropoff }: RouteRequest = await req.json();

    if (!pickup?.lat || !pickup?.lng || !dropoff?.lat || !dropoff?.lng) {
      return new Response(
        JSON.stringify({ error: 'Missing pickup or dropoff coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Computing route: ${pickup.lat},${pickup.lng} → ${dropoff.lat},${dropoff.lng}`);

    // Call Google Routes API (v2) - request alternative routes to select longest
    const routesApiUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    
    const routeBody = {
      origin: {
        location: {
          latLng: {
            latitude: pickup.lat,
            longitude: pickup.lng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: dropoff.lat,
            longitude: dropoff.lng,
          },
        },
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: true, // Request multiple routes
      languageCode: 'en-US',
      units: 'METRIC',
    };

    const googleResponse = await fetch(routesApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify(routeBody),
    });

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error('Google Routes API error:', googleResponse.status, errorText);
      
      // Return a fallback response using Haversine
      const fallback = calculateFallbackRoute(pickup, dropoff);
      return new Response(
        JSON.stringify(fallback),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await googleResponse.json();
    console.log('Google Routes response:', JSON.stringify(data));

    if (!data.routes || data.routes.length === 0) {
      console.warn('No routes found, using fallback');
      const fallback = calculateFallbackRoute(pickup, dropoff);
      return new Response(
        JSON.stringify(fallback),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Select the route with the LONGEST distance for fare calculation
    // This avoids underpricing due to shortcuts or footpaths
    const routes = data.routes;
    console.log(`Received ${routes.length} route(s) from Google`);
    
    let selectedRoute = routes[0];
    let maxDistance = selectedRoute.distanceMeters || 0;
    
    for (const route of routes) {
      const distance = route.distanceMeters || 0;
      console.log(`Route option: ${distance}m`);
      if (distance > maxDistance) {
        maxDistance = distance;
        selectedRoute = route;
      }
    }
    
    console.log(`Selected route with distance: ${maxDistance}m (longest of ${routes.length})`);
    
    // Parse duration strings (format: "123s")
    const durationSeconds = parseInt(String(selectedRoute.duration).replace('s', ''), 10) || 0;
    const staticDurationSeconds = parseInt(String(selectedRoute.staticDuration).replace('s', ''), 10) || durationSeconds;
    
    const result: GoogleRouteResponse = {
      distanceKm: Math.round((maxDistance / 1000) * 10) / 10,
      durationMinutes: Math.round(staticDurationSeconds / 60),
      durationInTrafficMinutes: Math.round(durationSeconds / 60),
      polyline: selectedRoute.polyline?.encodedPolyline || null,
      isTrafficAware: true,
      routeCount: routes.length, // Include how many routes were considered
    };

    console.log('Route result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Google Routes function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fallback using Haversine formula when Google Routes fails
function calculateFallbackRoute(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number }
): GoogleRouteResponse {
  const R = 6371; // Earth's radius in km
  const dLat = ((dropoff.lat - pickup.lat) * Math.PI) / 180;
  const dLng = ((dropoff.lng - pickup.lng) * Math.PI) / 180;
  const lat1 = (pickup.lat * Math.PI) / 180;
  const lat2 = (dropoff.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  
  const straightLineKm = 2 * R * Math.asin(Math.sqrt(a));
  const estimatedRoadKm = Math.round(straightLineKm * 1.4 * 10) / 10;
  const estimatedMinutes = Math.round(estimatedRoadKm * 2.5); // ~24 km/h average

  return {
    distanceKm: estimatedRoadKm,
    durationMinutes: estimatedMinutes,
    durationInTrafficMinutes: estimatedMinutes,
    polyline: null,
    isTrafficAware: false,
  };
}
