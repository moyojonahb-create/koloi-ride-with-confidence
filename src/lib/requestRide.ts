// ✅ Request Ride utility - RLS safe implementation
import { supabase } from '@/lib/supabaseClient';

type RequestRideInput = {
  pickup_address: string;
  dropoff_address: string;
  fare: number;
  distance_km: number;
  duration_minutes: number;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  vehicle_type?: string;
  route_polyline?: string | null;
  passenger_count?: number;
};

export async function requestRide(input: RequestRideInput) {
  // 1) Auth check
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) {
    return { ok: false as const, error: `Auth error: ${authErr.message}` };
  }
  const user = authData?.user;
  if (!user) {
    return { ok: false as const, error: "You must be logged in to request a ride." };
  }

  // 2) Validate inputs
  const pickup_address = (input.pickup_address || "").trim();
  const dropoff_address = (input.dropoff_address || "").trim();
  const fare = Number(input.fare);
  const distance_km = Number(input.distance_km);
  const duration_minutes = Number(input.duration_minutes);

  if (!pickup_address) return { ok: false as const, error: "Pickup address is required." };
  if (!dropoff_address) return { ok: false as const, error: "Drop-off address is required." };
  if (!Number.isFinite(fare) || fare <= 0) {
    return { ok: false as const, error: "Fare must be a valid number above 0." };
  }
  if (!Number.isFinite(distance_km) || distance_km <= 0) {
    return { ok: false as const, error: "Distance must be a valid number above 0." };
  }
  if (!Number.isFinite(duration_minutes) || duration_minutes <= 0) {
    return { ok: false as const, error: "Duration must be a valid number above 0." };
  }
  if (!Number.isFinite(input.pickup_lat) || !Number.isFinite(input.pickup_lng)) {
    return { ok: false as const, error: "Pickup coordinates are required." };
  }
  if (!Number.isFinite(input.dropoff_lat) || !Number.isFinite(input.dropoff_lng)) {
    return { ok: false as const, error: "Drop-off coordinates are required." };
  }

  // 3) Insert ride - user_id must match auth.uid() for RLS
  const { data, error } = await supabase
    .from("rides")
    .insert({
      user_id: user.id,
      status: "pending",
      pickup_address,
      dropoff_address,
      fare,
      distance_km,
      duration_minutes,
      pickup_lat: input.pickup_lat,
      pickup_lon: input.pickup_lng,
      dropoff_lat: input.dropoff_lat,
      dropoff_lon: input.dropoff_lng,
      vehicle_type: input.vehicle_type ?? "economy",
      route_polyline: input.route_polyline ?? null,
      passenger_count: input.passenger_count ?? 1,
    })
    .select("*")
    .single();

  if (error) {
    const msg =
      `Ride request failed: ${error.message}` +
      (error.details ? ` | Details: ${error.details}` : "") +
      (error.hint ? ` | Hint: ${error.hint}` : "");
    console.error("SUPABASE INSERT ERROR:", error);
    return { ok: false as const, error: msg };
  }

  return { ok: true as const, ride: data };
}
