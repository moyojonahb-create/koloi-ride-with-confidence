import { useState, useEffect } from 'react';

export const useRiderLocationGate = (map: google.maps.Map | null, options?: { streetZoom?: number; followRider?: boolean }) => {
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsCoords(coords);
        if (map) {
          map.setCenter(coords);
          map.setZoom(options?.streetZoom ?? 16);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [map]);

  return {
    detectedCity: null,
    detectedAddress: null,
    isConfirmOpen: false,
    canRequest: !!gpsCoords,
    confirmLocation: () => {},
    changeLocation: () => {},
    gpsCoords,
  };
};
