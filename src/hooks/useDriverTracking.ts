import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface DriverPosition {
  lat: number;
  lng: number;
}

/**
 * Pure-realtime driver tracking — no polling fallback.
 * Subscribes to live_locations changes for the specific driver.
 */
export function useDriverTracking(
  driverUserId: string | null,
  rideStatus: string | null
): DriverPosition | null {
  const [position, setPosition] = useState<DriverPosition | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const positionRef = useRef<DriverPosition | null>(null);
  const frameRef = useRef<number | null>(null);

  const isActive = useMemo(
    () => Boolean(
      driverUserId &&
      ["accepted", "enroute", "enroute_pickup", "driver_arrived", "arrived", "in_progress"].includes(rideStatus ?? "")
    ),
    [driverUserId, rideStatus]
  );

  useEffect(() => {
    if (!isActive || !driverUserId) {
      setPosition(null);
      positionRef.current = null;
      return;
    }

    let cancelled = false;

    const applyPosition = (next: DriverPosition) => {
      const prev = positionRef.current;
      // Ignore tiny GPS jitter to keep mobile map rendering smooth.
      if (prev && Math.abs(prev.lat - next.lat) < 0.00001 && Math.abs(prev.lng - next.lng) < 0.00001) {
        return;
      }

      positionRef.current = next;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        if (!cancelled) setPosition(next);
      });
    };

    // Initial fetch
    const fetchInitial = async () => {
      const { data } = await supabase
        .from("live_locations")
        .select("latitude, longitude, updated_at")
        .eq("user_id", driverUserId)
        .eq("user_type", "driver")
        .order("updated_at", { ascending: false })
        .maybeSingle();

      if (!cancelled && data) {
        applyPosition({ lat: data.latitude, lng: data.longitude });
      }
    };
    fetchInitial();

    // Pure realtime subscription — listen for INSERT too in case the driver's
    // live_locations row is created after the rider opens tracking.
    const channel = supabase
      .channel(`driver-track-${driverUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_locations",
          filter: `user_id=eq.${driverUserId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.user_type && row.user_type !== "driver") return;
          const latitude = row.latitude as number;
          const longitude = row.longitude as number;
          if (typeof latitude === "number" && typeof longitude === "number") {
            applyPosition({ lat: latitude, lng: longitude });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      cancelled = true;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [driverUserId, isActive]);

  return isActive ? position : null;
}
