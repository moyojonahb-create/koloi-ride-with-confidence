import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useDataMode } from "./useDataMode";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface NearbyDriver {
  id: string;
  lat: number;
  lng: number;
  isOnline: boolean;
}

/**
 * Fetches and subscribes to nearby online drivers' live locations.
 * Adapts polling interval based on network quality.
 */
export function useNearbyDrivers(active: boolean): NearbyDriver[] {
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { mode, pollInterval } = useDataMode();

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

    // Only subscribe to realtime on good connections
    if (mode !== 'offline') {
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
          () => fetchDrivers()
        )
        .subscribe();

      channelRef.current = channel;
    }

    // Adaptive polling based on data mode
    const poll = setInterval(fetchDrivers, pollInterval);

    return () => {
      clearInterval(poll);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [active, mode, pollInterval]);

  return drivers;
}
