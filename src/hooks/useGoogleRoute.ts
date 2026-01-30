import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getFallbackRoute, type Coordinates } from '@/lib/osrm';

interface GoogleRouteData {
  distanceKm: number;
  durationMinutes: number;
  durationInTrafficMinutes: number;
  geometry: string | null;
  isTrafficAware: boolean;
  isEstimate: boolean;
}

interface UseGoogleRouteResult {
  route: GoogleRouteData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useGoogleRoute(
  pickup: Coordinates | null,
  dropoff: Coordinates | null
): UseGoogleRouteResult {
  const [route, setRoute] = useState<GoogleRouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(async () => {
    if (!pickup || !dropoff) {
      setRoute(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('google-routes', {
        body: { pickup, dropoff },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Map response to our format
      setRoute({
        distanceKm: data.distanceKm,
        durationMinutes: data.durationMinutes,
        durationInTrafficMinutes: data.durationInTrafficMinutes,
        geometry: data.polyline || null,
        isTrafficAware: data.isTrafficAware ?? false,
        isEstimate: !data.isTrafficAware,
      });
      
      if (data.isTrafficAware) {
        console.info('Using Google Routes with traffic-aware ETA');
      } else {
        console.info('Using estimated route (Google Routes unavailable)');
      }
    } catch (err) {
      console.error('Google Route fetch error:', err);
      
      // Fallback to local Haversine calculation
      try {
        const fallback = getFallbackRoute(pickup, dropoff);
        setRoute({
          distanceKm: fallback.distanceKm,
          durationMinutes: fallback.durationMinutes,
          durationInTrafficMinutes: fallback.durationMinutes,
          geometry: null,
          isTrafficAware: false,
          isEstimate: true,
        });
        setError('Using estimated route');
      } catch {
        setError('Failed to calculate route');
        setRoute(null);
      }
    } finally {
      setLoading(false);
    }
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  return {
    route,
    loading,
    error,
    refetch: fetchRoute,
  };
}
