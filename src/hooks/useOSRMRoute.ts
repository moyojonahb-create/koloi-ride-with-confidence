import { useState, useEffect, useCallback } from 'react';
import { getRouteWithFallback, type Coordinates } from '@/lib/osrm';

interface RouteData {
  distanceKm: number;
  durationMinutes: number;
  geometry: string | null;
  isEstimate: boolean;
}

interface UseOSRMRouteResult {
  route: RouteData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useOSRMRoute(
  pickup: Coordinates | null,
  dropoff: Coordinates | null
): UseOSRMRouteResult {
  const [route, setRoute] = useState<RouteData | null>(null);
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
      const result = await getRouteWithFallback(pickup, dropoff);
      setRoute(result);
      
      if (result.isEstimate) {
        console.info('Using estimated route (OSRM unavailable)');
      }
    } catch (err) {
      console.error('Route fetch error:', err);
      setError('Failed to calculate route');
      setRoute(null);
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
