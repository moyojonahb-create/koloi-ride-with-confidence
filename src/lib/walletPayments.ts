import { supabase } from "@/integrations/supabase/client";

export async function payRideFromWallet(rideId: string) {
  const { data, error } = await supabase.rpc("pay_ride_from_wallet", { p_ride_id: rideId });
  if (error) throw error;
  return data as { ok: boolean; reason?: string; amount?: number; already_paid?: boolean };
}

export async function transferFunds(receiverId: string, amount: number, note?: string) {
  const { data, error } = await supabase.rpc("transfer_funds", {
    p_receiver_id: receiverId,
    p_amount: amount,
    p_note: note ?? null,
  });
  if (error) throw error;
  return data as { ok: boolean; reason?: string; amount?: number };
}

export async function requestWithdrawal(
  amount: number,
  method: "ecocash" | "bank" | "innbucks",
  destination: string,
  accountName?: string
) {
  const { data, error } = await supabase.rpc("request_withdrawal", {
    p_amount: amount,
    p_method: method,
    p_destination: destination,
    p_account_name: accountName ?? null,
  });
  if (error) throw error;
  return data as { ok: boolean; reason?: string; id?: string };
}

export async function adminApproveWithdrawal(id: string, note = "") {
  const { data, error } = await supabase.rpc("admin_approve_withdrawal", { p_id: id, p_note: note });
  if (error) throw error;
  return data as { ok: boolean; reason?: string };
}

export async function adminRejectWithdrawal(id: string, note = "") {
  const { data, error } = await supabase.rpc("admin_reject_withdrawal", { p_id: id, p_note: note });
  if (error) throw error;
  return data as { ok: boolean; reason?: string; refunded?: number };
}

/** Look up a user by phone for transfers. Tries profiles first. */
export async function lookupUserByPhone(phone: string) {
  const cleaned = phone.replace(/\s+/g, "");
  const { data } = await supabase
    .from("profiles")
    .select("user_id, full_name, phone")
    .eq("phone", cleaned)
    .maybeSingle();
  return data as { user_id: string; full_name: string | null; phone: string | null } | null;
}

/** Look up a user by their PickMe Account number (PMR######R) for wallet-to-wallet transfers. */
export async function lookupUserByPickmeAccount(account: string) {
  const cleaned = account.trim().toUpperCase();
  const { data, error } = await supabase.rpc("lookup_user_by_pickme_account", {
    p_account: cleaned,
  });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return row
    ? (row as { user_id: string; full_name: string | null; pickme_account: string })
    : null;
}

