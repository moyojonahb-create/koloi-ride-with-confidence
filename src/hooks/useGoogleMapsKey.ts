const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export function useGoogleMapsKey() {
  return {
    apiKey: GOOGLE_MAPS_KEY || null,
    loading: false,
    error: GOOGLE_MAPS_KEY ? null : 'Google Maps API key not configured',
  };
}
