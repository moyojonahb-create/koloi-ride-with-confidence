import { supabase } from "@/integrations/supabase/client";

export async function completeTrip(tripId: string) {
  const { data, error } = await supabase.rpc("complete_trip_and_charge_flat_r4", {
    p_trip_id: tripId,
  });
  if (error) throw error;
  return data as { ok: boolean; fee_usd?: number; zar_per_usd?: number; reason?: string };
}
