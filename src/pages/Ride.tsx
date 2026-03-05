import { useState } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import RideUI from "@/components/ride/RideUI";
import { useRiderLocationGate } from "@/hooks/useRiderLocationGate";

type LatLng = { lat: number; lng: number };
const FALLBACK_CENTER: LatLng = { lat: -17.8292, lng: 31.0522 };

export default function Ride() {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyCsdyc5GgX50oEuAn5QUtLhYEw1jLYNiFU",
    libraries: ["places"],
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const {
    detectedCity,
    detectedAddress,
    isConfirmOpen,
    canRequest,
    confirmLocation,
    changeLocation,
    gpsCoords,
  } = useRiderLocationGate(map, { streetZoom: 16, followRider: false });

  const pickupText = gpsCoords ? "My location" : "Enable location";
  const dropoffText = "Where to?";

  if (!isLoaded) return <div className="h-[100dvh] grid place-items-center">Loading…</div>;

  return (
    <>
      {/* Location confirm: keep your modal if you want. For now we auto-confirm UI text */}
      {/* You can re-add the AlertDialog here exactly like before */}

      <RideUI
        pickupText={pickupText}
        dropoffText={dropoffText}
        canRequest={canRequest && !isConfirmOpen}
        onBack={() => window.history.back()}
        onProfile={() => console.log("profile")}
        onCenter={() => {
          if (!map || !gpsCoords) return;
          map.setCenter(gpsCoords);
          map.setZoom(16);
        }}
        onNavigate={() => console.log("navigate")}
        onPickupClick={() => console.log("pickup click")}
        onDropoffClick={() => console.log("dropoff click")}
        onRequest={() => console.log("request ride")}
        mapSlot={
          <GoogleMap
            onLoad={(m) => setMap(m)}
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={gpsCoords ?? FALLBACK_CENTER}
            zoom={gpsCoords ? 16 : 12}
            options={{
              disableDefaultUI: true,
              zoomControl: false,
              clickableIcons: false,
            }}
          />
        }
      />
    </>
  );
}