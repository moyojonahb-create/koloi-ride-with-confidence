import { useState, useCallback, useRef, useEffect } from 'react';

export interface PlaceSuggestion {
  placeId: string;
  name: string;
  description: string;
  lat?: number;
  lng?: number;
}

/**
 * Hook that provides Google Places Autocomplete suggestions.
 * Biases results to the provided town location for ride-hailing relevance.
 */
export function useGooglePlacesAutocomplete() {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const townRef = useRef<{ lat: number; lng: number; radiusKm: number } | null>(null);

  const ensureService = useCallback(() => {
    if (!window.google?.maps?.places) return false;
    if (!serviceRef.current) {
      serviceRef.current = new google.maps.places.AutocompleteService();
    }
    if (!geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
    return true;
  }, []);

  /** Set the town context so results are biased to that area */
  const setTownBias = useCallback((center: { lat: number; lng: number }, radiusKm: number) => {
    townRef.current = { ...center, radiusKm };
  }, []);

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Ultra-fast: 150ms debounce
    debounceRef.current = setTimeout(() => {
      if (!ensureService()) {
        setLoading(false);
        return;
      }

      const request: google.maps.places.AutocompletionRequest = {
        input: query.trim(),
        componentRestrictions: { country: 'zw' },
        sessionToken: sessionTokenRef.current!,
        types: ['geocode', 'establishment'],
      };

      // Bias to current town if available
      if (townRef.current) {
        const { lat, lng, radiusKm } = townRef.current;
        request.locationBias = {
          center: { lat, lng },
          radius: radiusKm * 1000, // convert to meters
        } as google.maps.CircleLiteral;
      }

      serviceRef.current!.getPlacePredictions(request, (predictions, status) => {
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
        } else {
          setSuggestions([]);
        }
        setLoading(false);
      });
    }, 150);
  }, [ensureService]);

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
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
            resolve({
              lat: loc.lat(),
              lng: loc.lng(),
              name: results[0].formatted_address?.split(',')[0] || '',
            });
          } else {
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

  return { suggestions, loading, search, getPlaceDetails, clear, setTownBias };
}
