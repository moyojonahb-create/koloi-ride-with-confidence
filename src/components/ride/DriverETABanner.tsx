import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, MapPin, Navigation, Clock, CheckCircle2 } from "lucide-react";

interface DriverETABannerProps {
  driverLocation: { lat: number; lng: number };
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
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateMinutes(distanceKm: number): number {
  return Math.max(1, Math.round(distanceKm / 25 * 60));
}

export default function DriverETABanner({
  driverLocation, pickupLat, pickupLng, dropoffLat, dropoffLng, rideStatus
}: DriverETABannerProps) {
  const [, setTick] = useState(0);
  const prevEta = useRef<number>(0);

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
  const isNearPickup = distToPickup < 0.15;

  // Track ETA changes for animation
  const currentEta = isInProgress ? etaToDropoff : etaToPickup;
  const etaChanged = prevEta.current !== currentEta;
  useEffect(() => { prevEta.current = currentEta; }, [currentEta]);

  // Progress percentage for the bar
  const progressPercent = isInProgress
    ? Math.max(5, Math.min(95, (1 - distToDropoff / Math.max(distToDropoff + 1, 5)) * 100))
    : isEnRoute
    ? Math.max(5, Math.min(95, (1 - distToPickup / Math.max(distToPickup + 2, 5)) * 100))
    : 0;

  if (isArrived || (isNearPickup && isEnRoute)) {
    return (
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-3 px-4 py-3.5 bg-accent text-accent-foreground rounded-b-2xl"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <CheckCircle2 className="h-6 w-6" />
        </motion.div>
        <div className="flex-1">
          <p className="font-bold text-sm">Driver has arrived!</p>
          <p className="text-xs opacity-80">Meet your driver at the pickup point</p>
        </div>
        <MapPin className="h-5 w-5" />
      </motion.div>
    );
  }

  if (isInProgress) {
    return (
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-4 py-3.5 bg-primary text-primary-foreground rounded-b-2xl"
      >
        <div className="flex items-center gap-3 mb-2">
          <Navigation className="h-5 w-5" />
          <div className="flex-1">
            <p className="font-bold text-sm">Trip in progress</p>
            <p className="text-xs opacity-80">
              {distToDropoff.toFixed(1)} km to destination
            </p>
          </div>
          <motion.span
            key={etaToDropoff}
            initial={etaChanged ? { scale: 1.3, color: "hsl(45 100% 70%)" } : false}
            animate={{ scale: 1, color: "hsl(0 0% 100%)" }}
            className="text-lg font-bold font-display tabular-nums"
          >
            {etaToDropoff} min
          </motion.span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1 bg-primary-foreground/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </motion.div>
    );
  }

  if (isEnRoute) {
    return (
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-4 py-3.5 bg-primary text-primary-foreground rounded-b-2xl"
      >
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            animate={{ x: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <Car className="h-5 w-5" />
          </motion.div>
          <div className="flex-1">
            <p className="font-bold text-sm">Driver is on the way</p>
            <p className="text-xs opacity-80">{distToPickup.toFixed(1)} km away</p>
          </div>
          <motion.span
            key={etaToPickup}
            initial={etaChanged ? { scale: 1.3, color: "hsl(45 100% 70%)" } : false}
            animate={{ scale: 1, color: "hsl(0 0% 100%)" }}
            className="text-lg font-bold font-display tabular-nums"
          >
            {etaToPickup} min
          </motion.span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1 bg-primary-foreground/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </motion.div>
    );
  }

  return null;
}
