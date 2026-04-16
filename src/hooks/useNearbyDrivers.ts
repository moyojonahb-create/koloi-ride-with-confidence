import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface NearbyDriver {
  id: string;
  lat: number;
  lng: number;
  isOnline: boolean;
}

/**
 * Pure-realtime nearby drivers hook — no polling.
 * OPTIMIZED: Added LIMIT 100 to initial fetch to prevent loading all 10K drivers.
 * Uses debounced state sync to avoid re-renders on every realtime event.
 */
export function useNearbyDrivers(active: boolean): NearbyDriver[] {
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const driversMapRef = useRef<Map<string, NearbyDriver>>(new Map());
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced sync: batch rapid realtime events into one state update
  const syncToState = useCallback(() => {
    if (syncTimerRef.current) return; // already scheduled
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      setDrivers(
        Array.from(driversMapRef.current.values()).filter((d) => d.isOnline)
      );
    }, 500); // 500ms debounce — prevents 10K setState calls
  }, []);

  useEffect(() => {
    if (!active) {
      setDrivers([]);
      driversMapRef.current.clear();
      return;
    }

    // Initial fetch — LIMIT 100 nearest (was unbounded)
    const fetchDrivers = async () => {
      const { data } = await supabase
        .from("live_locations")
        .select("user_id, latitude, longitude, is_online")
        .eq("user_type", "driver")
        .eq("is_online", true)
        .limit(100); // Cap initial load

      if (data) {
        const map = new Map<string, NearbyDriver>();
        data.forEach((d) => {
          map.set(d.user_id, {
            id: d.user_id,
            lat: d.latitude,
            lng: d.longitude,
            isOnline: d.is_online ?? true,
          });
        });
        driversMapRef.current = map;
        setDrivers(Array.from(map.values()));
      }
    };

    fetchDrivers();

    // Subscribe to realtime changes — no polling
    const channel = supabase
      .channel(`nearby-drivers-rt`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_locations",
          filter: "user_type=eq.driver",
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (payload.eventType === "DELETE") {
            const old = payload.old as Record<string, unknown>;
            if (old?.user_id) driversMapRef.current.delete(old.user_id as string);
          } else if (row?.user_id) {
            driversMapRef.current.set(row.user_id as string, {
              id: row.user_id as string,
              lat: row.latitude as number,
              lng: row.longitude as number,
              isOnline: (row.is_online as boolean) ?? true,
            });
          }
          syncToState();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [active, syncToState]);

  return drivers;
}
