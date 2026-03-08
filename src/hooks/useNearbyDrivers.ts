import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface NearbyDriver {
  id: string;
  lat: number;
  lng: number;
  isOnline: boolean;
}

/**
 * Fetches and subscribes to nearby online drivers' live locations.
 * Used on the rider waiting screen to show driver movement on the map.
 */
export function useNearbyDrivers(active: boolean): NearbyDriver[] {
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!active) {
      setDrivers([]);
      return;
    }

    const fetchDrivers = async () => {
      const { data } = await supabase
        .from("live_locations")
        .select("user_id, latitude, longitude, is_online")
        .eq("user_type", "driver")
        .eq("is_online", true);

      if (data) {
        setDrivers(
          data.map((d) => ({
            id: d.user_id,
            lat: d.latitude,
            lng: d.longitude,
            isOnline: d.is_online ?? true,
          }))
        );
      }
    };

    fetchDrivers();

    // Subscribe to realtime changes
    const channelName = `nearby-drivers-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_locations",
          filter: "user_type=eq.driver",
        },
        () => {
          // Re-fetch all on any change for simplicity
          fetchDrivers();
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Poll every 10s as fallback
    const poll = setInterval(fetchDrivers, 10000);

    return () => {
      clearInterval(poll);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [active]);

  return drivers;
}
