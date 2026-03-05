import { useState } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import ZWPlacesAutocomplete from "@/components/ZWPlacesAutocomplete";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRiderLocationGate } from "@/hooks/useRiderLocationGate";

type LatLng = { lat: number; lng: number };

const FALLBACK_CENTER: LatLng = { lat: -17.8292, lng: 31.0522 }; // Harare

function fitPickupDropoff(map: google.maps.Map, pickup: LatLng, dropoff: LatLng) {
  const bounds = new google.maps.LatLngBounds();
  bounds.extend(pickup);
  bounds.extend(dropoff);
  map.fitBounds(bounds, 80);
}

export default function Ride() {
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);

  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");

  const {
    detectedCity,
    detectedAddress,
    isConfirmOpen,
    canRequest,
    confirmLocation,
    changeLocation,
  } = useRiderLocationGate(map, { streetZoom: 16, followRider: false });

  return (
    <div className="relative h-screen w-full">
      <GoogleMap
        onLoad={(m) => setMap(m)}
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={pickup ?? FALLBACK_CENTER}
        zoom={pickup ? 16 : 12}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          minZoom: 12,
          maxZoom: 19,
        }}
      >
        {/* markers can be added later */}
      </GoogleMap>

      {/* Confirm location modal */}
      <AlertDialog open={isConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you in {detectedCity ?? "this area"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {detectedAddress ??
                "We detected your location from GPS. Confirm to continue."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={changeLocation}>No, change</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLocation}>Yes, continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom sheet UI */}
      <div className="absolute bottom-4 left-0 right-0 px-4">
        <div className="mx-auto max-w-[520px] rounded-3xl bg-white shadow-2xl p-4 space-y-3">
          <ZWPlacesAutocomplete
            placeholder="Pickup location"
            defaultValue={pickupAddress}
            onPick={(p) => {
              const nextPickup = { lat: p.lat, lng: p.lng };
              setPickup(nextPickup);
              setPickupAddress(p.label);

              map?.setCenter(nextPickup);
              map?.setZoom(16);

              if (dropoff && map) {
                fitPickupDropoff(map, nextPickup, dropoff);
              }
            }}
          />

          <ZWPlacesAutocomplete
            placeholder="Where to?"
            defaultValue={dropoffAddress}
            onPick={(p) => {
              const nextDropoff = { lat: p.lat, lng: p.lng };
              setDropoff(nextDropoff);
              setDropoffAddress(p.label);

              map?.setCenter(nextDropoff);
              map?.setZoom(16);

              if (pickup && map) {
                fitPickupDropoff(map, pickup, nextDropoff);
              }
            }}
          />

          <Button className="w-full h-14 rounded-full" disabled={!canRequest}>
            Request Ride
          </Button>

          {!canRequest && (
            <p className="text-xs text-muted-foreground">
              Confirm your location to start requesting.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}