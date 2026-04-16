// Offer/bidding system helpers - RLS safe implementation
import { supabase } from '@/lib/supabaseClient';
import { resolveAvatarUrl } from '@/lib/avatarUrl';

export type Offer = {
  id: string;
  ride_id: string;
  driver_id: string;
  price: number;
  eta_minutes: number | null;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
};

export type DriverProfile = {
  id: string;
  user_id: string;
  status: string;
  vehicle_type: string | null;
  plate_number: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  is_online: boolean | null;
  trial_ends_at: string | null;
  gender: string | null;
  avatar_url: string | null;
  rating_avg: number | null;
  total_trips: number | null;
};

// Round to nearest $0.50
export function roundTo5(n: number): number {
  return Math.round(Number(n) * 2) / 2;
}

export function clampTo5(n: number, min = 0.50, max = 500): number {
  const rounded = roundTo5(n);
  return Math.min(max, Math.max(min, rounded));
}

// Check if it's night time (after 20:00 or before 05:00)
export function isNightLocal(): boolean {
  const h = new Date().getHours();
  return h >= 20 || h < 5;
}

export function defaultNightMultiplier(): number {
  return isNightLocal() ? 1.2 : 1.0;
}

async function getUserOrThrow() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data?.user) throw new Error("Please log in.");
  return data.user;
}

// Fetch pending offers for a ride
export async function fetchPendingOffers(rideId: string): Promise<Offer[]> {
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("ride_id", rideId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Offer[];
}

// Fetch drivers by their user IDs, enriched with profile name
export async function fetchDriversByIds(driverIds: string[]): Promise<Record<string, DriverProfile & { full_name?: string | null }>> {
  if (driverIds.length === 0) return {};
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .in("user_id", driverIds);
  
  if (error) throw new Error(error.message);
  
  // Also fetch profile names
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", driverIds);
  
  const nameMap: Record<string, string> = {};
  for (const p of (profiles ?? [])) {
    if (p.full_name) nameMap[p.user_id] = p.full_name;
  }
  
  const map: Record<string, DriverProfile & { full_name?: string | null }> = {};
  for (const row of (data ?? []) as DriverProfile[]) {
    const resolvedAvatar = await resolveAvatarUrl(row.avatar_url);
    map[row.user_id] = { ...row, avatar_url: resolvedAvatar, full_name: nameMap[row.user_id] || null };
  }
  return map;
}

// Fetch open rides for drivers to bid on (only last 5 minutes)
// Filters out female-only rides if driver is male
export async function fetchOpenRides(driverGender?: string | null) {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("rides")
    .select("*")
    .eq("status", "pending")
    .gte("created_at", fiveMinAgo)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const rides = data ?? [];

  // Server-side filtering: hide female-only rides from male drivers
  if (driverGender && driverGender !== 'female') {
    return rides.filter((r: Record<string, unknown>) => {
      const gp = r.gender_preference as string | null;
      return !gp || gp === 'any';
    });
  }

  return rides;
}

// Get current driver profile
export async function getDriverProfile(): Promise<DriverProfile | null> {
  const user = await getUserOrThrow();
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  
  if (error) throw new Error(error.message);
  return data as DriverProfile | null;
}

// Submit a new offer
export async function submitOffer(input: {
  ride_id: string;
  price: number;
  eta_minutes: number;
  message?: string;
}): Promise<Offer> {
  const user = await getUserOrThrow();
  
  const payload = {
    ride_id: input.ride_id,
    driver_id: user.id,
    price: clampTo5(input.price),
    eta_minutes: Math.max(1, Math.min(240, Number(input.eta_minutes) || 10)),
    message: (input.message ?? "").trim() || null,
    status: "pending" as const,
  };

  const { data, error } = await supabase
    .from("offers")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Offer;
}

// Accept an offer (rider action)
export async function acceptOffer(rideId: string, offer: Offer): Promise<boolean> {
  const user = await getUserOrThrow();

  // Get the driver record to get the driver's ID
  const { data: driverData, error: driverErr } = await supabase
    .from("drivers")
    .select("id")
    .eq("user_id", offer.driver_id)
    .maybeSingle();

  if (driverErr) throw new Error(driverErr.message);
  if (!driverData) throw new Error("Driver record not found");

  // Update ride to accepted with driver
  const { error: rideErr } = await supabase
    .from("rides")
    .update({ 
      status: "accepted", 
      driver_id: driverData.id 
    })
    .eq("id", rideId)
    .eq("user_id", user.id);

  if (rideErr) throw new Error(rideErr.message);

  // Mark selected offer as accepted
  const { error: acceptErr } = await supabase
    .from("offers")
    .update({ status: "accepted" })
    .eq("id", offer.id);

  if (acceptErr) throw new Error(acceptErr.message);

  // Reject all other offers
  const { error: rejectErr } = await supabase
    .from("offers")
    .update({ status: "rejected" })
    .eq("ride_id", rideId)
    .neq("id", offer.id);

  if (rejectErr) throw new Error(rejectErr.message);

  return true;
}

// Decline an offer
export async function declineOffer(offerId: string): Promise<boolean> {
  const { error } = await supabase
    .from("offers")
    .update({ status: "rejected" })
    .eq("id", offerId);

  if (error) throw new Error(error.message);
  return true;
}
