import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Hook for subscribing to realtime updates on a specific ride and its offers
 */
export function useRideRealtime(
  rideId: string | null,
  callbacks: {
    onRideChange?: () => void;
    onOfferChange?: () => void;
    onMessageChange?: () => void;
  }
) {
  useEffect(() => {
    if (!rideId) return;

    const channel = supabase
      .channel(`ride-realtime-${rideId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
        () => callbacks.onRideChange?.()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers", filter: `ride_id=eq.${rideId}` },
        () => callbacks.onOfferChange?.()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `ride_id=eq.${rideId}` },
        () => callbacks.onMessageChange?.()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId, callbacks.onRideChange, callbacks.onOfferChange, callbacks.onMessageChange]);
}

/**
 * Hook for subscribing to all open rides (for driver dashboard)
 */
export function useOpenRidesRealtime(onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel("open-rides-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rides" },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}
