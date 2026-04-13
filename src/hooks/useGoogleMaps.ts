/**
 * useGoogleMaps – loads the Google Maps JavaScript API via a <script> tag.
 *
 * Works with any version of @react-google-maps/api (which just needs
 * `window.google.maps` to be available).
 *
 * Debug info is logged to the console under [PickMe Maps].
 */

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const SCRIPT_ID = 'pickme-google-maps-script';
const LIBRARIES = ['places', 'geometry'];
const MAPS_CALLBACK = '__pickmeGmapsInit' as const;

type WindowWithMapsCallback = Window & {
  [MAPS_CALLBACK]?: () => void;
};

let loadPromise: Promise<void> | null = null;
let loaded = false;
let loadError: Error | null = null;

export function resetGoogleMapsLoader() {
  loadPromise = null;
  loaded = false;
  loadError = null;
  const existing = document.getElementById(SCRIPT_ID);
  if (existing?.parentNode) {
    existing.parentNode.removeChild(existing);
  }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (loaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    // Already present (e.g. injected externally)
    if (window.google?.maps) {
      loaded = true;
      console.info('[PickMe Maps] API already available');
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

    const callbackWindow = window as WindowWithMapsCallback;
    callbackWindow[MAPS_CALLBACK] = () => {
      loaded = true;
      delete callbackWindow[MAPS_CALLBACK];
      console.info('[PickMe Maps] API loaded successfully');
      resolve();
    };

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${LIBRARIES.join(',')}&callback=${MAPS_CALLBACK}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      const err = new Error(
        'Google Maps failed to load. Check: billing enabled, Maps JS API enabled, Places API enabled, and HTTP referrer restrictions.'
      );
      loadError = err;
      loadPromise = null;
      loaded = false;
      reject(err);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface GoogleMapsState {
  isLoaded: boolean;
  loadError: Error | null;
  apiKey: string | null;
}

export function useGoogleMaps(retryKey = 0): GoogleMapsState {
  const [state, setState] = useState<GoogleMapsState>({
    isLoaded: loaded,
    loadError: loadError,
    apiKey: GOOGLE_MAPS_API_KEY || null,
  });

  const tryLoadWithKey = useCallback(async (key: string) => {
    try {
      await loadGoogleMapsScript(key);
      console.info('[PickMe Maps] Status:', {
        mapsLoaded: !!window.google?.maps,
        placesLoaded: !!window.google?.maps?.places,
      });
      setState({ isLoaded: true, loadError: null, apiKey: key });
      return true;
    } catch (err) {
      console.error('[PickMe Maps] Load error with key:', err instanceof Error ? err.message : String(err));
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      // Debug logging
      console.info('[PickMe Maps] Debug:', {
        apiKeyPresent: !!GOOGLE_MAPS_API_KEY,
        apiKeyLength: GOOGLE_MAPS_API_KEY?.length || 0,
        alreadyLoaded: loaded,
      });

      if (loaded) {
        setState({ isLoaded: true, loadError: null, apiKey: GOOGLE_MAPS_API_KEY });
        return;
      }

      // 1. Try with build-time key first
      if (GOOGLE_MAPS_API_KEY) {
        const success = await tryLoadWithKey(GOOGLE_MAPS_API_KEY);
        if (success || !active) return;
      }

      // 2. If build-time key failed or is missing, try fetching from Edge Function (only if logged in)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          console.info('[PickMe Maps] Attempting to fetch key from Edge Function...');
          const { data, error } = await supabase.functions.invoke('google-maps-key');
          
          if (!error && data?.apiKey && active) {
            console.info('[PickMe Maps] Received API key from Edge Function');
            const success = await tryLoadWithKey(data.apiKey);
            if (success) return;
          }
        }
      } catch (e) {
        console.warn('[PickMe Maps] Failed to fetch key from Edge Function:', e);
      }

      // 3. If everything failed, set error state
      if (active) {
        const err = new Error(GOOGLE_MAPS_API_KEY ? 'Google Maps failed to load. Check API key configuration and restrictions.' : 'Google Maps API key is not configured');
        setState({ isLoaded: false, loadError: err, apiKey: GOOGLE_MAPS_API_KEY || null });
      }
    }

    initialize();

    return () => { active = false; };
  }, [retryKey, tryLoadWithKey]);

  return state;
}
