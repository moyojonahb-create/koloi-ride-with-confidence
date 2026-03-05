import { useEffect, useRef, useState } from "react";

type LatLng = { lat: number; lng: number };

function extractCityFromGeocoder(result: google.maps.GeocoderResult): string | null {
  const comps = result.address_components || [];
  const get = (type: string) =>
    comps.find((c) => c.types.includes(type))?.long_name || null;

  // Try common locality fields
  return (
    get("locality") ||
    get("sublocality") ||
    get("administrative_area_level_2") ||
    get("administrative_area_level_1") ||
    null
  );
}

export function useRiderLocationGate(
  map: google.maps.Map | null,
  {
    streetZoom = 16,
    followRider = false, // keep false for "center once before request"
  }: { streetZoom?: number; followRider?: boolean } = {}
) {
  const didInit = useRef(false);
  const [gpsCoords, setGpsCoords] = useState<LatLng | null>(null);

  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [canRequest, setCanRequest] = useState(false);

  // 1) Get GPS and center map immediately
  useEffect(() => {
    if (!map || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setGpsCoords({ lat, lng });

        // First fix: center + zoom
        if (!didInit.current) {
          didInit.current = true;
          map.setCenter({ lat, lng });
          map.setZoom(streetZoom);
        } else if (followRider) {
          map.panTo({ lat, lng });
        }
      },
      () => {
        // If denied, we can't gate by city. Let app continue.
        setCanRequest(true);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [map, streetZoom, followRider]);

  // 2) Reverse geocode once we have GPS
  useEffect(() => {
    if (!map || !gpsCoords) return;
    if (detectedCity) return; // already detected

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: gpsCoords }, (results, status) => {
      if (status !== "OK" || !results?.length) {
        // if geocoder fails, don't block user
        setCanRequest(true);
        return;
      }

      const top = results[0];
      const city = extractCityFromGeocoder(top);

      // Optional: ensure it's Zimbabwe
      const country = top.address_components?.find((c) => c.types.includes("country"))?.short_name;
      if (country && country !== "ZW") {
        // Outside Zimbabwe → block request (or your choice)
        setDetectedCity("Outside Zimbabwe");
        setDetectedAddress(top.formatted_address || null);
        setIsConfirmOpen(true);
        setCanRequest(false);
        return;
      }

      setDetectedCity(city ?? "Your area");
      setDetectedAddress(top.formatted_address || null);

      // Open confirmation before requesting
      setIsConfirmOpen(true);
      setCanRequest(false);
    });
  }, [map, gpsCoords, detectedCity]);

  // Actions
  function confirmLocation() {
    setIsConfirmOpen(false);
    setCanRequest(true);
  }

  function changeLocation() {
    // user wants to choose manually (search/drop pin)
    setIsConfirmOpen(false);
    setCanRequest(true); // allow flow but they'll set pickup
  }

  return {
    gpsCoords,
    detectedCity,
    detectedAddress,
    isConfirmOpen,
    canRequest,
    confirmLocation,
    changeLocation,
    setIsConfirmOpen,
  };
}