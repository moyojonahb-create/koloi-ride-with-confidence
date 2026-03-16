import { useState, useCallback, useRef, useEffect } from 'react';

export interface PlaceSuggestion {
  placeId: string;
  name: string;
  description: string;
  lat?: number;
  lng?: number;
}

/**
 * Hook that provides Google Places Autocomplete suggestions restricted to Zimbabwe.
 * Requires the Google Maps JS API with 'places' library to be loaded via useGoogleMaps.
 */
export function useGooglePlacesAutocomplete() {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize service when Google Maps is loaded
  const ensureService = useCallback(() => {
    if (!window.google?.maps?.places) {
      console.warn('[Voyex Places] Google Maps Places API not available yet');
      return false;
    }
    if (!serviceRef.current) {
      serviceRef.current = new google.maps.places.AutocompleteService();
      console.info('[Voyex Places] AutocompleteService initialized');
    }
    if (!geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
    return true;
  }, []);

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(() => {
      if (!ensureService()) {
        setLoading(false);
        return;
      }

      console.info('[Voyex Places] Searching:', query.trim());

      serviceRef.current!.getPlacePredictions(
        {
          input: query.trim(),
          componentRestrictions: { country: 'zw' },
          sessionToken: sessionTokenRef.current!,
          types: ['geocode', 'establishment'],
        },
        (predictions, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            const mapped: PlaceSuggestion[] = predictions.map((p) => ({
              placeId: p.place_id,
              name: p.structured_formatting.main_text,
              description: p.structured_formatting.secondary_text || p.description,
            }));
            setSuggestions(mapped);
            console.info('[Voyex Places] Found', mapped.length, 'suggestions');
          } else {
            setSuggestions([]);
            if (status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              console.warn('[Voyex Places] Search status:', status);
            }
          }
          setLoading(false);
        }
      );
    }, 300);
  }, [ensureService]);

  /** Resolve a place ID to coordinates */
  const getPlaceDetails = useCallback(
    (placeId: string): Promise<{ lat: number; lng: number; name: string } | null> => {
      return new Promise((resolve) => {
        if (!ensureService() || !geocoderRef.current) {
          resolve(null);
          return;
        }

        geocoderRef.current.geocode({ placeId }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
            const loc = results[0].geometry.location;
            // Reset session token after selection
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
            const detail = {
              lat: loc.lat(),
              lng: loc.lng(),
              name: results[0].formatted_address?.split(',')[0] || '',
            };
            console.info('[Voyex Places] Selected place:', detail.name, detail.lat, detail.lng);
            resolve(detail);
          } else {
            console.warn('[Voyex Places] Geocode failed:', status);
            resolve(null);
          }
        });
      });
    },
    [ensureService]
  );

  const clear = useCallback(() => {
    setSuggestions([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { suggestions, loading, search, getPlaceDetails, clear };
}
