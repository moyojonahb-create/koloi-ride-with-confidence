/**
 * Foreground device location for rider screens.
 *
 * **Why `expo-location` and not `react-native-background-geolocation`, which is
 * already in the binary.** The spike harness registers a global
 * `BackgroundGeolocation.onLocation` listener that appends every fix to the
 * spike's log (`App.tsx` → `appendFix`). A rider screen asking that library for
 * a position would therefore write phantom fixes into an S0–S6 measurement and
 * silently corrupt it. The two must not share a location source while the spike
 * is running.
 *
 * It is also the right long-term split regardless: background-geolocation is a
 * driver-side, always-on, foreground-service concern. A rider wanting one fix to
 * centre a map is a foreground one-shot, and paying background-geolocation's
 * lifecycle cost for it would be wrong even after the spike ends.
 *
 * The state shape mirrors web's `GPSState` in `RideView.tsx` so the ported
 * screen logic reads the same.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export type GpsStatus = 'idle' | 'loading' | 'success' | 'denied' | 'unavailable';

export interface Coords {
  lat: number;
  lng: number;
  /** Metres, when the platform reports it. */
  accuracy: number | null;
}

export interface GpsState {
  status: GpsStatus;
  coords: Coords | null;
  error: string | null;
}

const INITIAL: GpsState = { status: 'idle', coords: null, error: null };

export function useDeviceLocation() {
  const [state, setState] = useState<GpsState>(INITIAL);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const request = useCallback(async () => {
    setState({ status: 'loading', coords: null, error: null });

    try {
      // Services-off is a different failure from permission-denied and needs a
      // different remedy from the user, so they are not collapsed together.
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        if (mounted.current) {
          setState({
            status: 'unavailable',
            coords: null,
            error: 'Location services are turned off on this device.',
          });
        }
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        if (mounted.current) {
          setState({
            status: 'denied',
            coords: null,
            error: 'CruiXe needs location access to set your pickup point.',
          });
        }
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!mounted.current) return;
      setState({
        status: 'success',
        coords: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
        },
        error: null,
      });
    } catch (error) {
      if (!mounted.current) return;
      setState({
        status: 'unavailable',
        coords: null,
        // Surfaced rather than swallowed: on a dev-client built before
        // expo-location was installed this reads "Cannot find native module
        // 'ExpoLocation'", which is a build problem, not a permissions one.
        error: (error as Error)?.message ?? 'Could not get your location.',
      });
    }
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  return { ...state, request, reset };
}
