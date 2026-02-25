import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

interface DriverPosition {
  lat: number;
  lng: number;
}

/**
 * Real-time driver location tracking using Supabase Realtime.
 * Falls back to polling every 5s if realtime fails.
 */
export function useDriverTracking(
  driverUserId: string | null,
  rideStatus: string | null
): DriverPosition | null {
  const [position, setPosition] = useState<DriverPosition | null>(null);
  const channelRef = useRef<any>(null);

  const isActive = driverUserId && ["accepted", "in_progress", "arrived"].includes(rideStatus ?? "");

  // Initial fetch
  useEffect(() => {
    if (!isActive || !driverUserId) {
      setPosition(null);
      return;
    }

    const fetchInitial = async () => {
      const { data } = await supabase
        .from("live_locations")
        .select("latitude, longitude")
        .eq("user_id", driverUserId)
        .eq("user_type", "driver")
        .maybeSingle();

      if (data) {
        setPosition({ lat: data.latitude, lng: data.longitude });
      }
    };

    fetchInitial();
  }, [driverUserId, isActive]);

  // Realtime subscription
  useEffect(() => {
    if (!isActive || !driverUserId) return;

    const channelName = `driver-track-${driverUserId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_locations",
          filter: `user_id=eq.${driverUserId}`,
        },
        (payload) => {
          const { latitude, longitude } = payload.new as any;
          if (typeof latitude === "number" && typeof longitude === "number") {
            setPosition({ lat: latitude, lng: longitude });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Fallback polling every 8s in case realtime misses
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("live_locations")
        .select("latitude, longitude")
        .eq("user_id", driverUserId)
        .eq("user_type", "driver")
        .maybeSingle();

      if (data) {
        setPosition({ lat: data.latitude, lng: data.longitude });
      }
    }, 8000);

    return () => {
      clearInterval(poll);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [driverUserId, isActive]);

  return isActive ? position : null;
}
