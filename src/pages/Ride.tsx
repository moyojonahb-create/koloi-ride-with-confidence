import RideView from "@/components/ride/RideView";

export default function Ride() {
  return <RideView />;
}
import { useState } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
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

export default function RidePage() {
  const [map, setMap] = useState<google.maps.Map | null>(null);

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
        center={{ lat: -17.8292, lng: 31.0522 }} // fallback
        zoom={12}
        options={{ disableDefaultUI: true, zoomControl: true }}
      >
        {/* markers */}
      </GoogleMap>

      {/* Location confirmation */}
      <AlertDialog open={isConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you in {detectedCity ?? "this area"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {detectedAddress ?? "We detected your location from GPS. Confirm to continue."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={changeLocation}>
              No, change
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmLocation}>
              Yes, continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Request button disabled until confirmed */}
      <div className="absolute bottom-4 left-0 right-0 px-4">
        <div className="mx-auto max-w-[520px] rounded-3xl bg-white shadow-2xl p-4">
          <Button className="w-full h-14 rounded-full" disabled={!canRequest}>
            Request Ride
          </Button>
          {!canRequest && (
            <p className="mt-2 text-xs text-muted-foreground">
              Confirm your location to start requesting.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}