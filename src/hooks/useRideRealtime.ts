/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Single consolidated channel per ride — handles rides, offers, and messages.
 * Replaces multiple separate subscriptions with ONE channel.
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

    // ONE channel for all three tables — reduces connection count by 3x
    const channel = supabase
      .channel(`ride-${rideId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
        () => callbacksRef.current.onRideChange?.()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers", filter: `ride_id=eq.${rideId}` },
        () => callbacksRef.current.onOfferChange?.()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `ride_id=eq.${rideId}` },
        () => callbacksRef.current.onMessageChange?.()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId]);
}

/**
 * Single channel for driver dashboard — rides + offers combined.
 */
export function useOpenRidesRealtime(onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const channel = supabase
      .channel('open-rides')
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rides" },
        () => onUpdateRef.current()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers" },
        () => onUpdateRef.current()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

/**
 * New ride INSERT listener for driver notifications.
 */
export function useRealtimeRideRequests(onNewRide: (ride: unknown) => void) {
  const onNewRideRef = useRef(onNewRide);
  onNewRideRef.current = onNewRide;

  useEffect(() => {
    const channel = supabase
      .channel('driver-ride-requests')
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rides" },
        (payload) => {
          const ride = payload.new;
          if (ride.status === "pending") {
            const expiresAt = ride.expires_at ? new Date(ride.expires_at).getTime() : null;
            if (!expiresAt || expiresAt > Date.now()) {
              onNewRideRef.current(ride);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

/**
 * Offer INSERT listener for a specific ride.
 */
export function useRealtimeOffers(rideId: string | null, onOffer: (offer: unknown) => void) {
  const onOfferRef = useRef(onOffer);
  onOfferRef.current = onOffer;

  useEffect(() => {
    if (!rideId) return;

    const channel = supabase
      .channel(`offers-${rideId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "offers", filter: `ride_id=eq.${rideId}` },
        (payload) => onOfferRef.current(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId]);
}

/**
 * Ride UPDATE listener for status changes.
 */
export function useRealtimeRideStatus(rideId: string | null, onUpdate: (ride: unknown) => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!rideId) return;

    const channel = supabase
      .channel(`ride-status-${rideId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
        (payload) => onUpdateRef.current(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId]);
}
