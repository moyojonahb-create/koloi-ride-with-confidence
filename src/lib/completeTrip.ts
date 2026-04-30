import { supabase } from "@/integrations/supabase/client";

export async function completeTrip(tripId: string) {
  if (!tripId?.trim()) throw new Error("Trip id is required");

  const { data: trip, error: tripError } = await supabase
    .from("rides")
    .select("id,status,payment_method,fare,driver_id")
    .eq("id", tripId)
    .maybeSingle();

  if (tripError) throw tripError;
  if (!trip) throw new Error("Trip not found");
  if (trip.status !== "in_progress") throw new Error("Trip can only be completed after it has started");
  if (!Number.isFinite(Number(trip.fare)) || Number(trip.fare) <= 0) throw new Error("Trip fare is invalid");
  if (!["cash", "wallet", "ecocash"].includes(String(trip.payment_method ?? "cash"))) {
    throw new Error("Trip payment method is invalid");
  }

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
