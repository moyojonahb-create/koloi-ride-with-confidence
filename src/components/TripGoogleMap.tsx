import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  DirectionsRenderer,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import { useGoogleMapsKey } from "@/hooks/useGoogleMapsKey";
import { calculateDistance } from "@/lib/driverLocation";
import { Car, Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Coords {
  lat: number;
  lng: number;
}

export type TripPhase = "driver_to_pickup" | "pickup_to_dropoff" | "idle";

interface TripGoogleMapProps {
  /** Live driver position from realtime */
  driverLocation: Coords | null;
  pickup: Coords;
  dropoff: Coords;
  /** Trip status string from DB */
  tripStatus: string;
  height?: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const CONTAINER_STYLE: React.CSSProperties = { width: "100%", height: "100%" };

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    {
      featureType: "poi",
      stylers: [{ visibility: "off" }],
    },
  ],
};

const PICKUP_ICON_URL =
  "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
const DROPOFF_ICON_URL =
  "https://maps.google.com/mapfiles/ms/icons/blue-dot.png";
const DRIVER_ICON_URL =
  "https://maps.google.com/mapfiles/ms/icons/cabs.png";

function getPhase(status: string): TripPhase {
  if (["accepted", "enroute_pickup"].includes(status)) return "driver_to_pickup";
  if (["arrived", "in_progress"].includes(status)) return "pickup_to_dropoff";
  return "idle";
}

const MIN_MOVE_KM = 0.075; // 75 m
const MIN_INTERVAL_MS = 20_000; // 20 s

/* ------------------------------------------------------------------ */
/*  Inner map (loaded after API key is ready)                          */
/* ------------------------------------------------------------------ */

function InnerMap({
  apiKey,
  driverLocation,
  pickup,
  dropoff,
  tripStatus,
  height,
}: TripGoogleMapProps & { apiKey: string }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: "koloi-google-map",
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const lastFetchPos = useRef<Coords | null>(null);
  const lastFetchTime = useRef(0);
  const lastPhase = useRef<TripPhase>("idle");
  const hasFitBounds = useRef(false);

  const phase = getPhase(tripStatus);

  // Compute origin / destination for this phase
  const origin: Coords | null =
    phase === "driver_to_pickup"
      ? driverLocation
      : phase === "pickup_to_dropoff"
      ? driverLocation ?? pickup
      : null;

  const destination: Coords | null =
    phase === "driver_to_pickup"
      ? pickup
      : phase === "pickup_to_dropoff"
      ? dropoff
      : null;

  // Fetch directions with throttle
  const fetchDirections = useCallback(() => {
    if (!origin || !destination || !isLoaded) return;

    const now = Date.now();
    const moved =
      lastFetchPos.current == null ||
      calculateDistance(
        lastFetchPos.current.lat,
        lastFetchPos.current.lng,
        origin.lat,
        origin.lng
      ) >= MIN_MOVE_KM;
    const elapsed = now - lastFetchTime.current >= MIN_INTERVAL_MS;
    const phaseChanged = lastPhase.current !== phase;

    if (!phaseChanged && !moved && !elapsed) return;

    const svc = new google.maps.DirectionsService();
    svc.route(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          lastFetchPos.current = { ...origin };
          lastFetchTime.current = Date.now();
          lastPhase.current = phase;

          // Fit bounds on first fetch or phase change
          if ((!hasFitBounds.current || phaseChanged) && mapRef.current && result.routes[0]) {
            const bounds = result.routes[0].bounds;
            if (bounds) mapRef.current.fitBounds(bounds, 60);
            hasFitBounds.current = true;
          }
        }
      }
    );
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, phase, isLoaded]);

  // On phase change or driver move, try to fetch
  useEffect(() => {
    fetchDirections();
  }, [fetchDirections]);

  // Clear directions when idle
  useEffect(() => {
    if (phase === "idle") {
      setDirections(null);
      hasFitBounds.current = false;
    }
  }, [phase]);

  // Fit bounds on initial load when no directions yet
  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (!hasFitBounds.current) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(pickup);
        bounds.extend(dropoff);
        if (driverLocation) bounds.extend(driverLocation);
        map.fitBounds(bounds, 60);
      }
    },
    [pickup, dropoff, driverLocation]
  );

  if (!isLoaded) {
    return (
      <div
        className="flex items-center justify-center bg-muted"
        style={{ height: height ?? "300px" }}
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div style={{ height: height ?? "300px" }}>
      <GoogleMap
        mapContainerStyle={CONTAINER_STYLE}
        options={MAP_OPTIONS}
        onLoad={onMapLoad}
        zoom={14}
        center={pickup}
      >
        {/* Route polyline */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: "#1a73e8",
                strokeWeight: 5,
                strokeOpacity: 0.85,
              },
            }}
          />
        )}

        {/* Pickup marker */}
        <Marker
          position={pickup}
          icon={{
            url: PICKUP_ICON_URL,
            scaledSize: new google.maps.Size(40, 40),
          }}
          title="Pickup"
        />

        {/* Dropoff marker */}
        <Marker
          position={dropoff}
          icon={{
            url: DROPOFF_ICON_URL,
            scaledSize: new google.maps.Size(40, 40),
          }}
          title="Drop-off"
        />

        {/* Driver marker (live) */}
        {driverLocation && phase !== "idle" && (
          <Marker
            position={driverLocation}
            icon={{
              url: DRIVER_ICON_URL,
              scaledSize: new google.maps.Size(36, 36),
            }}
            title="Driver"
            zIndex={999}
          />
        )}
      </GoogleMap>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported wrapper – fetches API key then renders InnerMap            */
/* ------------------------------------------------------------------ */

export default function TripGoogleMap(props: TripGoogleMapProps) {
  const { apiKey, loading, error } = useGoogleMapsKey();

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-muted rounded-xl"
        style={{ height: props.height ?? "300px" }}
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !apiKey) {
    return (
      <div
        className="flex items-center justify-center bg-muted rounded-xl text-sm text-muted-foreground"
        style={{ height: props.height ?? "300px" }}
      >
        Map unavailable
      </div>
    );
  }

  return <InnerMap {...props} apiKey={apiKey} />;
}
