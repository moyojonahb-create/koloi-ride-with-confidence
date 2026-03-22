import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { MapPin, Navigation, Clock, Car, Shield } from "lucide-react";
import { motion } from "framer-motion";

interface RideInfo {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  status: string;
  driver_id: string | null;
}

interface DriverInfo {
  vehicle_make: string | null;
  vehicle_model: string | null;
  plate_number: string | null;
  vehicle_type: string;
  user_id: string;
}

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  updated_at: string;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LiveTrackingPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [ride, setRide] = useState<RideInfo | null>(null);
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [driverLoc, setDriverLoc] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch ride and driver info
  useEffect(() => {
    if (!tripId) return;
    (async () => {
      const { data: rideData, error: rideErr } = await supabase
        .from("rides")
        .select("id, pickup_address, dropoff_address, status, driver_id, pickup_lat, pickup_lon, dropoff_lat, dropoff_lon")
        .eq("id", tripId)
        .maybeSingle();

      if (rideErr || !rideData) {
        setError("Trip not found or access denied");
        setLoading(false);
        return;
      }
      setRide(rideData as unknown as RideInfo);

      if (rideData.driver_id) {
        const { data: driverData } = await supabase
          .from("drivers")
          .select("vehicle_make, vehicle_model, plate_number, vehicle_type, user_id")
          .eq("id", rideData.driver_id)
          .maybeSingle();
        if (driverData) setDriver(driverData);
      }
      setLoading(false);
    })();
  }, [tripId]);

  // Subscribe to realtime driver location
  useEffect(() => {
    if (!driver?.user_id) return;

    // Fetch initial location
    supabase
      .from("live_locations")
      .select("latitude, longitude, heading, speed, updated_at")
      .eq("user_id", driver.user_id)
      .eq("user_type", "driver")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setDriverLoc(data);
      });

    const channel = supabase
      .channel(`track-driver-${driver.user_id}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_locations", filter: `user_id=eq.${driver.user_id}` },
        (payload) => {
          const loc = payload.new as DriverLocation;
          if (loc?.latitude) setDriverLoc(loc);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [driver?.user_id]);

  // Also subscribe to ride status changes
  useEffect(() => {
    if (!tripId) return;
    const channel = supabase
      .channel(`track-ride-${tripId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${tripId}` },
        (payload) => {
          const updated = payload.new as RideInfo;
          setRide(prev => prev ? { ...prev, status: updated.status } : prev);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

  const etaMinutes = driverLoc && ride
    ? Math.max(1, Math.round(haversineKm(driverLoc.latitude, driverLoc.longitude, 0, 0) / 25 * 60))
    : null;

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "Waiting for driver", color: "text-amber-500" },
    accepted: { label: "Driver en route", color: "text-primary" },
    arrived: { label: "Driver arrived", color: "text-accent" },
    in_progress: { label: "Trip in progress", color: "text-primary" },
    completed: { label: "Trip completed", color: "text-muted-foreground" },
    cancelled: { label: "Trip cancelled", color: "text-destructive" },
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading trip…</span>
        </div>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Trip Not Found</h1>
          <p className="text-sm text-muted-foreground">{error || "This trip link may have expired."}</p>
        </div>
      </div>
    );
  }

  const status = statusLabels[ride.status] || statusLabels.pending;

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-5 py-6">
        <div className="flex items-center gap-2 mb-1">
          <Car className="w-5 h-5" />
          <h1 className="text-lg font-bold">Live Trip Tracking</h1>
        </div>
        <p className="text-xs opacity-80">Voyex — Safe rides in real time</p>
      </div>

      {/* Status */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <motion.div
            animate={["accepted", "in_progress", "arrived"].includes(ride.status) ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={`w-3 h-3 rounded-full ${ride.status === "completed" ? "bg-muted-foreground" : ride.status === "cancelled" ? "bg-destructive" : "bg-primary"}`}
          />
          <span className={`font-bold text-sm ${status.color}`}>{status.label}</span>
        </div>
      </div>

      {/* Route */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-accent shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Pickup</p>
            <p className="text-sm font-medium text-foreground">{ride.pickup_address}</p>
          </div>
        </div>
        <div className="ml-[5px] w-px h-4 bg-border" />
        <div className="flex items-start gap-3">
          <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Dropoff</p>
            <p className="text-sm font-medium text-foreground">{ride.dropoff_address}</p>
          </div>
        </div>
      </div>

      {/* Driver & Vehicle */}
      {driver && (
        <div className="px-5 py-4 border-t border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Vehicle</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">
                {driver.vehicle_make} {driver.vehicle_model}
              </p>
              <p className="text-sm text-muted-foreground">{driver.plate_number} • {driver.vehicle_type}</p>
            </div>
          </div>
        </div>
      )}

      {/* Live location update */}
      {driverLoc && (
        <div className="px-5 py-4 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <Navigation className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Driver Location</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-foreground">
                {driverLoc.speed ? `${(driverLoc.speed * 3.6).toFixed(0)}` : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">km/h</p>
            </div>
            <div className="bg-muted rounded-xl p-3 text-center">
              <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">
                Updated {new Date(driverLoc.updated_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Shared via <span className="font-bold text-primary">Voyex</span> • Real-time tracking
        </p>
      </div>
    </div>
  );
}
