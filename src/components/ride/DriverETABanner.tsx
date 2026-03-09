import { useEffect, useState } from "react";
import { Car, MapPin, Navigation, Clock } from "lucide-react";

interface DriverETABannerProps {
  driverLocation: {lat: number;lng: number;};
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  rideStatus: string;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
  Math.sin(dLat / 2) ** 2 +
  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateMinutes(distanceKm: number): number {
  // Assume ~25 km/h average in town
  return Math.max(1, Math.round(distanceKm / 25 * 60));
}

export default function DriverETABanner({
  driverLocation,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  rideStatus
}: DriverETABannerProps) {
  const [, setTick] = useState(0);

  // Re-render every 5s to update ETA
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const isEnRoute = rideStatus === "accepted";
  const isArrived = rideStatus === "arrived";
  const isInProgress = rideStatus === "in_progress";

  const distToPickup = haversineKm(driverLocation.lat, driverLocation.lng, pickupLat, pickupLng);
  const distToDropoff = haversineKm(driverLocation.lat, driverLocation.lng, dropoffLat, dropoffLng);

  const etaToPickup = estimateMinutes(distToPickup);
  const etaToDropoff = estimateMinutes(distToDropoff);

  const isNearPickup = distToPickup < 0.15; // 150m

  if (isArrived || isNearPickup && isEnRoute) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-accent text-accent-foreground">
        <Car className="h-5 w-5 animate-pulse" />
        <div className="flex-1">
          <p className="font-bold text-sm">Driver has arrived!</p>
          <p className="text-xs opacity-80">Meet your driver at the pickup point</p>
        </div>
        <MapPin className="h-5 w-5" />
      </div>);

  }

  if (isInProgress) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground">
        <Navigation className="h-5 w-5" />
        <div className="flex-1">
          <p className="font-bold text-sm">Trip in progress</p>
          <p className="text-xs opacity-80">
            {distToDropoff.toFixed(1)} km to destination • ~{etaToDropoff} min
          </p>
        </div>
        <Clock className="h-4 w-4" />
      </div>);

  }

  // En route to pickup
  if (isEnRoute) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground">
        <Car className="h-5 w-5" />
        <div className="flex-1">
          <p className="font-bold text-sm">Driver is on the way</p>
          <p className="text-xs opacity-80">
            {distToPickup.toFixed(1)} km away • ~{etaToPickup} min
          </p>
        </div>
        <Clock className="h-4 w-4" />
      </div>
    );
  }

  return null;
}