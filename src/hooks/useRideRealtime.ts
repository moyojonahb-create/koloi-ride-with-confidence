/* eslint-disable react-hooks/exhaustive-deps */
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
  }, [rideId]);
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
  }, []);
}

/**
 * Hook for subscribing to new ride requests (INSERT only) - for driver notifications
 * Calls onNewRide only for newly inserted pending rides that haven't expired
 */
export function useRealtimeRideRequests(onNewRide: (ride: unknown) => void) {
  const onNewRideRef = useRef(onNewRide);
  onNewRideRef.current = onNewRide;

  useEffect(() => {
    console.log('[Realtime] Subscribing to new ride requests');

    const channel = supabase
      .channel(`driver-ride-requests-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "rides",
        },
        (payload) => {
          const ride = payload.new;
          if (ride.status === "pending") {
            // Check if ride hasn't already expired
            const expiresAt = ride.expires_at ? new Date(ride.expires_at).getTime() : null;
            if (!expiresAt || expiresAt > Date.now()) {
              console.log('[Realtime] New ride request:', ride.id);
              onNewRideRef.current(ride);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Ride requests subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Unsubscribing from ride requests');
      supabase.removeChannel(channel);
    };
  }, []);
}

/**
 * Hook for subscribing to offers on a specific ride (INSERT only) - for rider notifications
 * Calls onOffer when a new offer is submitted for this ride
 */
export function useRealtimeOffers(rideId: string | null, onOffer: (offer: unknown) => void) {
  const onOfferRef = useRef(onOffer);
  onOfferRef.current = onOffer;

  useEffect(() => {
    if (!rideId) return;

    console.log('[Realtime] Subscribing to offers for ride:', rideId);

    const channel = supabase
      .channel(`rider-offers-${rideId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "offers",
          filter: `ride_id=eq.${rideId}`,
        },
        (payload) => {
          console.log('[Realtime] New offer received:', payload.new);
          onOfferRef.current(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Offers subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Unsubscribing from offers for ride:', rideId);
      supabase.removeChannel(channel);
    };
  }, [rideId]);
}

/**
 * Hook for subscribing to ride status changes (UPDATE only) - for both rider and driver
 * Calls onUpdate when the ride record is updated (status change, driver assignment, etc.)
 */
export function useRealtimeRideStatus(rideId: string | null, onUpdate: (ride: unknown) => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!rideId) return;

    console.log('[Realtime] Subscribing to ride status:', rideId);

    const channel = supabase
      .channel(`ride-status-${rideId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rides",
          filter: `id=eq.${rideId}`,
        },
        (payload) => {
          console.log('[Realtime] Ride status updated:', payload.new);
          onUpdateRef.current(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Ride status subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Unsubscribing from ride status:', rideId);
      supabase.removeChannel(channel);
    };
  }, [rideId]);
}
