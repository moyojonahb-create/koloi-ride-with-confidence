import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Hook for subscribing to realtime updates on a specific ride and its offers
 * Uses refs to avoid stale closures and ensure immediate updates
 */
export function useRideRealtime(
  rideId: string | null,
  callbacks: {
    onRideChange?: () => void;
    onOfferChange?: () => void;
    onMessageChange?: () => void;
  }
) {
  // Use refs to store latest callbacks to avoid stale closures
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!rideId) return;

    console.log('[Realtime] Subscribing to ride:', rideId);

    const channel = supabase
      .channel(`ride-realtime-${rideId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
        (payload) => {
          console.log('[Realtime] Ride change detected:', payload);
          callbacksRef.current.onRideChange?.();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers", filter: `ride_id=eq.${rideId}` },
        (payload) => {
          console.log('[Realtime] Offer change detected:', payload);
          callbacksRef.current.onOfferChange?.();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `ride_id=eq.${rideId}` },
        (payload) => {
          console.log('[Realtime] Message change detected:', payload);
          callbacksRef.current.onMessageChange?.();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Unsubscribing from ride:', rideId);
      supabase.removeChannel(channel);
    };
  }, [rideId]); // Only re-subscribe when rideId changes
}

/**
 * Hook for subscribing to all open rides (for driver dashboard)
 * Uses refs to avoid stale closures and ensure immediate updates
 */
export function useOpenRidesRealtime(onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    console.log('[Realtime] Subscribing to open rides');

    const channel = supabase
      .channel(`open-rides-realtime-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rides" },
        (payload) => {
          console.log('[Realtime] Open rides change detected:', payload);
          onUpdateRef.current();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers" },
        (payload) => {
          console.log('[Realtime] Offers change detected:', payload);
          onUpdateRef.current();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Open rides subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Unsubscribing from open rides');
      supabase.removeChannel(channel);
    };
  }, []); // Empty deps - only subscribe once
}
