import { supabase } from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

const TOPIC = (rideId: string) => `ride-signal:${rideId}`;
const EVENT_RIDER_COMING = "rider_coming";

/** Send a "I'm on my way to the pickup point" signal from rider → driver. */
export async function broadcastRiderComing(
  rideId: string,
  payload?: { riderName?: string; etaSeconds?: number }
) {
  const ch = supabase.channel(TOPIC(rideId), {
    config: { broadcast: { self: false, ack: false } },
  });

  // Wait for subscription with a timeout so we don't hang forever.
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") finish();
    });
    setTimeout(finish, 2500);
  });

  const body = {
    type: "broadcast" as const,
    event: EVENT_RIDER_COMING,
    payload: { ts: Date.now(), ...(payload ?? {}) },
  };

  // Send twice with a brief gap. Realtime broadcasts are best-effort and
  // occasional first-send drops happen right after handshake; the second
  // send is deduplicated on the receiver via `ts`.
  try { await ch.send(body); } catch (e) { console.warn("[rideSignals] send #1 failed", e); }
  await new Promise((r) => setTimeout(r, 400));
  try { await ch.send(body); } catch (e) { console.warn("[rideSignals] send #2 failed", e); }

  // Cleanup shortly after to avoid leaving idle channels
  setTimeout(() => { supabase.removeChannel(ch); }, 2500);
}

/** Subscribe to "rider coming" signals for a given ride. Returns unsubscribe fn. */
export function subscribeRiderComing(
  rideId: string,
  handler: (payload: { riderName?: string; etaSeconds?: number; ts?: number }) => void
): () => void {
  const seen = new Set<number>();
  let ch: RealtimeChannel | null = supabase
    .channel(TOPIC(rideId), { config: { broadcast: { self: false, ack: false } } })
    .on("broadcast", { event: EVENT_RIDER_COMING }, ({ payload }) => {
      const p = (payload ?? {}) as { riderName?: string; etaSeconds?: number; ts?: number };
      // Dedup duplicate sends within a short window
      if (typeof p.ts === "number") {
        if (seen.has(p.ts)) return;
        seen.add(p.ts);
        // GC after 1 minute
        setTimeout(() => seen.delete(p.ts!), 60_000);
      }
      handler(p);
    })
    .subscribe();

  return () => {
    if (ch) {
      supabase.removeChannel(ch);
      ch = null;
    }
  };
}

