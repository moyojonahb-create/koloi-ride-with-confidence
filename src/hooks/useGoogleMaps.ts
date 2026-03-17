/**
 * useGoogleMaps – loads the Google Maps JavaScript API via a <script> tag.
 *
 * Works with any version of @react-google-maps/api (which just needs
 * `window.google.maps` to be available).
 *
 * Debug info is logged to the console under [Voyex Maps].
 */

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const SCRIPT_ID = 'voyex-google-maps-script';
const LIBRARIES = ['places', 'geometry'];

let loadPromise: Promise<void> | null = null;
let loaded = false;
let loadError: Error | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (loaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    // Already present (e.g. injected externally)
    if (window.google?.maps) {
      loaded = true;
      console.info('[Voyex Maps] API already available');
      resolve();
      return;
    }

    if (document.getElementById(SCRIPT_ID)) {
      // Script tag exists but hasn't finished yet – wait for it
      const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement;
      existing.addEventListener('load', () => { loaded = true; resolve(); });
      existing.addEventListener('error', () => reject(new Error('Google Maps script failed to load')));
      return;
    }

    const callbackName = '__voyexGmapsInit';
    (window as Record<string, unknown>)[callbackName] = () => {
      loaded = true;
      delete (window as Record<string, unknown>)[callbackName];
      console.info('[Voyex Maps] API loaded successfully');
      resolve();
    };

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${LIBRARIES.join(',')}&callback=${callbackName}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      const err = new Error(
        'Google Maps failed to load. Check: billing enabled, Maps JS API enabled, Places API enabled, and HTTP referrer restrictions.'
      );
      loadError = err;
      reject(err);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

import { useEffect, useState } from 'react';

export interface GoogleMapsState {
  isLoaded: boolean;
  loadError: Error | null;
  apiKey: string | null;
}

export function useGoogleMaps(): GoogleMapsState {
  const [state, setState] = useState<GoogleMapsState>({
    isLoaded: loaded,
    loadError: loadError,
    apiKey: GOOGLE_MAPS_API_KEY || null,
  });

  useEffect(() => {
    // Debug logging
    console.info('[Voyex Maps] Debug:', {
      apiKeyPresent: !!GOOGLE_MAPS_API_KEY,
      apiKeyLength: GOOGLE_MAPS_API_KEY?.length || 0,
      alreadyLoaded: loaded,
    });

    if (!GOOGLE_MAPS_API_KEY) {
      const err = new Error('VITE_GOOGLE_MAPS_API_KEY is not configured');
      setState({ isLoaded: false, loadError: err, apiKey: null });
      console.error('[Voyex Maps] Missing API key. Set VITE_GOOGLE_MAPS_API_KEY in your environment.');
      return;
    }

    if (loaded) {
      setState({ isLoaded: true, loadError: null, apiKey: GOOGLE_MAPS_API_KEY });
      return;
    }

    loadGoogleMapsScript(GOOGLE_MAPS_API_KEY)
      .then(() => {
        console.info('[Voyex Maps] Status:', {
          mapsLoaded: !!window.google?.maps,
          placesLoaded: !!window.google?.maps?.places,
        });
        setState({ isLoaded: true, loadError: null, apiKey: GOOGLE_MAPS_API_KEY });
      })
      .catch((err) => {
        console.error('[Voyex Maps] Load error:', err.message);
        setState({ isLoaded: false, loadError: err as Error, apiKey: GOOGLE_MAPS_API_KEY });
      });
  }, []);

  return state;
}
