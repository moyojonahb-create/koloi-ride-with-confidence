import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface DriverPosition {
  lat: number;
  lng: number;
}

export function useDriverTracking(
  driverUserId: string | null,
  rideStatus: string | null
): DriverPosition | null {
  const [position, setPosition] = useState<DriverPosition | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const isActive = driverUserId && ["accepted", "in_progress", "arrived", "enroute_pickup"].includes(rideStatus ?? "");

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
          const row = payload.new as Record<string, unknown>;
          const latitude = row.latitude as number;
          const longitude = row.longitude as number;
          if (typeof latitude === "number" && typeof longitude === "number") {
            setPosition({ lat: latitude, lng: longitude });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

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
