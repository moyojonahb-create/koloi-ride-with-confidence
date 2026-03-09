import { supabase } from "@/integrations/supabase/client";

/**
 * Update the driver's current location in the database
 */
export async function updateDriverLocation(lat: number, lng: number): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  
  if (!userId) {
    console.warn("[DriverLocation] No user logged in");
    return;
  }

  const { error } = await supabase.from("live_locations").upsert(
    {
      user_id: userId,
      latitude: lat,
      longitude: lng,
      user_type: "driver",
      is_online: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[DriverLocation] Failed to update location:", error);
  }
}

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Filter and sort rides by distance from driver's location
 */
export function filterRidesByDistance<T extends { pickup_lat: number; pickup_lon: number }>(
  rides: T[],
  driverLat: number,
  driverLng: number,
  maxDistanceKm: number = 10
): (T & { distance_km: number })[] {
  return rides
    .map((ride) => ({
      ...ride,
      distance_km: calculateDistance(driverLat, driverLng, ride.pickup_lat, ride.pickup_lon),
    }))
    .filter((ride) => ride.distance_km <= maxDistanceKm)
    .sort((a, b) => a.distance_km - b.distance_km);
}
