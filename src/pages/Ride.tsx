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
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

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

  const handleRequestRide = async () => {
    try {
      setError(null);
      
      if (!pickup || !dropoff) {
        setError("Please select both pickup and dropoff locations");
        return;
      }

      setIsRequesting(true);
      // TODO: Implement actual ride request logic
      console.log("Requesting ride from", pickup, "to", dropoff);
      alert("Ride request submitted!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to request ride";
      setError(message);
      console.error("Ride request error:", err);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="relative h-screen w-full bg-gray-100">
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-20">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-red-700 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {map ? (
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
      ) : (
        <GoogleMap
          onLoad={(m) => setMap(m)}
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={FALLBACK_CENTER}
          zoom={12}
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
      )}

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

          <Button
            className="w-full h-14 rounded-full"
            disabled={!pickup || !dropoff || isRequesting || !canRequest}
            onClick={handleRequestRide}
          >
            {isRequesting ? "Requesting..." : "Request Ride"}
          </Button>

          {!pickup && (
            <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
              Select a pickup location to start
            </p>
          )}
          {!dropoff && pickup && (
            <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
              Select a dropoff location
            </p>
          )}
          {pickup && dropoff && !canRequest && (
            <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
              Confirm your location to request a ride
            </p>
          )}
        </div>
      </div>
    </div>
  );
}