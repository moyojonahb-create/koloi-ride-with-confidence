const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || null;

export function useGoogleMapsKey(): { apiKey: string | null; loading: boolean; error: string | null } {
  // Keep synchronous hook simple — environment variables are statically available.
  const apiKey = GOOGLE_MAPS_KEY;
  const error = apiKey ? null : 'Google Maps API key not configured';

  return {
    apiKey,
    loading: false,
    error,
  };
}
