import { supabase } from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

const TOPIC = (rideId: string) => `ride-signal:${rideId}`;
const EVENT_RIDER_COMING = "rider_coming";

/** Send a "I'm on my way to the pickup point" signal from rider → driver. */
export async function broadcastRiderComing(rideId: string, payload?: { riderName?: string; etaSeconds?: number }) {
  const ch = supabase.channel(TOPIC(rideId), { config: { broadcast: { self: false, ack: false } } });
  await new Promise<void>((resolve) => {
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
  });
  await ch.send({
    type: "broadcast",
    event: EVENT_RIDER_COMING,
    payload: payload ?? {},
  });
  // Cleanup shortly after to avoid leaving idle channels
  setTimeout(() => { supabase.removeChannel(ch); }, 1500);
}

/** Subscribe to "rider coming" signals for a given ride. Returns unsubscribe fn. */
export function subscribeRiderComing(
  rideId: string,
  handler: (payload: { riderName?: string; etaSeconds?: number }) => void
): () => void {
  let ch: RealtimeChannel | null = supabase
    .channel(TOPIC(rideId), { config: { broadcast: { self: false, ack: false } } })
    .on("broadcast", { event: EVENT_RIDER_COMING }, ({ payload }) => {
      handler((payload ?? {}) as { riderName?: string; etaSeconds?: number });
    })
    .subscribe();

  return () => {
    if (ch) {
      supabase.removeChannel(ch);
      ch = null;
    }
  };
}
