import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseDriverNoShowProps {
  rideId: string | null;
  driverId: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  rideStatus: string;
  acceptedAt?: string | null;
}

/**
 * Monitors driver location after ride acceptance.
 * If driver hasn't moved closer to pickup for 5 minutes, triggers no-show alert.
 */
export function useDriverNoShow({ rideId, driverId, pickupLat, pickupLng, rideStatus, acceptedAt }: UseDriverNoShowProps) {
  const [showNoShowAlert, setShowNoShowAlert] = useState(false);
  const distanceHistory = useRef<number[]>([]);
  const checkCount = useRef(0);

  useEffect(() => {
    if (!rideId || !driverId || !pickupLat || !pickupLng) return;
    if (rideStatus !== 'accepted') { setShowNoShowAlert(false); return; }

    // Only start monitoring 2 minutes after acceptance
    const acceptTime = acceptedAt ? new Date(acceptedAt).getTime() : Date.now();
    const delay = Math.max(0, acceptTime + 2 * 60 * 1000 - Date.now());

    const timeoutId = setTimeout(() => {
      const interval = setInterval(async () => {
        const { data } = await supabase
          .from('live_locations')
          .select('latitude, longitude')
          .eq('user_id', driverId)
          .eq('user_type', 'driver')
          .maybeSingle();

        if (!data) return;

        const dist = haversine(data.latitude, data.longitude, pickupLat, pickupLng);
        distanceHistory.current.push(dist);
        checkCount.current++;

        // After 5 checks (5 min), check if driver hasn't gotten closer
        if (checkCount.current >= 5) {
          const first = distanceHistory.current[0];
          const last = distanceHistory.current[distanceHistory.current.length - 1];
          // If driver hasn't moved at least 100m closer
          if (last >= first - 0.1) {
            setShowNoShowAlert(true);
            clearInterval(interval);
          }
          // Reset window
          distanceHistory.current = [last];
          checkCount.current = 0;
        }
      }, 60 * 1000); // Check every minute

      return () => clearInterval(interval);
    }, delay);

    return () => { clearTimeout(timeoutId); distanceHistory.current = []; checkCount.current = 0; };
  }, [rideId, driverId, pickupLat, pickupLng, rideStatus, acceptedAt]);

  const dismissAlert = () => setShowNoShowAlert(false);

  return { showNoShowAlert, dismissAlert };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
