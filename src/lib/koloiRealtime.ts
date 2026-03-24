// PickMe realtime presence utilities
import { supabase } from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

type PresenceState = Record<string, unknown[]>;

export async function joinRidePresence(
  rideId: string,
  meta: { role: "driver" | "rider"; name?: string }
): Promise<RealtimeChannel> {
  const channel = supabase.channel(`ride:${rideId}`, {
    config: { presence: { key: crypto.randomUUID() } },
  });

  await channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel.track({
        role: meta.role,
        name: meta.name ?? meta.role,
        ts: Date.now(),
      });
    }
  });

  return channel;
}

export function countDriversViewing(state: PresenceState): number {
  let count = 0;
  Object.values(state || {}).forEach((arr) => {
    arr.forEach((m) => {
      if ((m as Record<string, unknown>)?.role === "driver") count += 1;
    });
  });
  return count;
}
