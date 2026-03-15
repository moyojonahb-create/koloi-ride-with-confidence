import { supabase } from "@/integrations/supabase/client";

export async function completeTrip(tripId: string) {
  const { data, error } = await supabase.rpc("complete_trip_with_commission", {
    p_trip_id: tripId,
  });
  if (error) throw error;
  const result = data as {
    ok: boolean;
    fare_usd?: number;
    commission_usd?: number;
    driver_earnings_usd?: number;
    reason?: string;
  };

  // Auto-settle to platform ledger after successful completion
  if (result.ok) {
    try {
      await settleTrip(tripId);
    } catch (e) {
      console.warn("Settlement failed (non-blocking):", e);
    }
  }

  return result;
}

export async function settleTrip(tripId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  const res = await supabase.functions.invoke("settle-trip", {
    body: { tripId },
  });

  if (res.error) throw res.error;
  return res.data as { ok: boolean; alreadySettled?: boolean; settlement?: unknown };
}
