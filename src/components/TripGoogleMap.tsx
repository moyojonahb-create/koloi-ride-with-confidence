import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  DirectionsRenderer,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import { useGoogleMapsKey } from "@/hooks/useGoogleMapsKey";
import { calculateDistance } from "@/lib/driverLocation";
import { Loader2 } from "lucide-react";
import DistanceGradientLine from "@/components/map/DistanceGradientLine";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Coords {
  lat: number;
  lng: number;
}

export type TripPhase = "driver_to_pickup" | "pickup_to_dropoff" | "idle";

interface TripGoogleMapProps {
  driverLocation: Coords | null;
  pickup: Coords;
  dropoff: Coords;
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
    { featureType: "poi", stylers: [{ visibility: "off" }] },
  ],
};

const PICKUP_ICON_URL = "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
const DROPOFF_ICON_URL = "https://maps.google.com/mapfiles/ms/icons/blue-dot.png";

function getPhase(status: string): TripPhase {
  if (["accepted", "enroute_pickup"].includes(status)) return "driver_to_pickup";
  if (["arrived", "in_progress"].includes(status)) return "pickup_to_dropoff";
  return "idle";
}

const MIN_MOVE_KM = 0.075;
const MIN_INTERVAL_MS = 20_000;
const LERP_DURATION_MS = 1500; // smooth animation duration

/** Lerp between two coords */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

/* ------------------------------------------------------------------ */
/*  Smooth driver marker hook                                          */
/* ------------------------------------------------------------------ */

function useSmoothPosition(target: Coords | null): Coords | null {
  const [display, setDisplay] = useState<Coords | null>(target);
  const fromRef = useRef<Coords | null>(null);
  const toRef = useRef<Coords | null>(null);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!target) {
      setDisplay(null);
      fromRef.current = null;
      toRef.current = null;
      return;
    }

    // First position — snap immediately
    if (!fromRef.current) {
      fromRef.current = target;
      toRef.current = target;
      setDisplay(target);
      return;
    }

    // Start new animation from current displayed position
    fromRef.current = toRef.current ?? fromRef.current;
    toRef.current = target;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(1, elapsed / LERP_DURATION_MS);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);

      if (fromRef.current && toRef.current) {
        setDisplay({
          lat: lerp(fromRef.current.lat, toRef.current.lat, eased),
          lng: lerp(fromRef.current.lng, toRef.current.lng, eased),
        });
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target?.lat, target?.lng]);

  return display;
}

/* ------------------------------------------------------------------ */
/*  Custom car SVG for driver marker                                   */
/* ------------------------------------------------------------------ */

function createCarIcon(): google.maps.Icon {
  // SVG car icon encoded as data URL for a cleaner look
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="22" fill="#2563EB" stroke="white" stroke-width="3"/>
    <path d="M16 28l2-8h12l2 8" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <rect x="14" y="28" width="20" height="6" rx="2" fill="white"/>
    <circle cx="18" cy="34" r="2" fill="#2563EB"/>
    <circle cx="30" cy="34" r="2" fill="#2563EB"/>
    <rect x="20" y="22" width="8" height="5" rx="1" fill="white" opacity="0.6"/>
  </svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(44, 44),
    anchor: new google.maps.Point(22, 22),
  };
}

/* ------------------------------------------------------------------ */
/*  Inner map                                                          */
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
    id: "voyex-google-map",
    libraries: ["places"] as ("places")[],
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const lastFetchPos = useRef<Coords | null>(null);
  const lastFetchTime = useRef(0);
  const lastPhase = useRef<TripPhase>("idle");
  const hasFitBounds = useRef(false);
  const carIconRef = useRef<google.maps.Icon | null>(null);

  const phase = getPhase(tripStatus);
  const smoothDriverPos = useSmoothPosition(driverLocation);

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

          if ((!hasFitBounds.current || phaseChanged) && mapRef.current && result.routes[0]) {
            const bounds = result.routes[0].bounds;
            if (bounds) mapRef.current.fitBounds(bounds, 60);
            hasFitBounds.current = true;
          }
        }
      }
    );
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, phase, isLoaded]);

  useEffect(() => {
    fetchDirections();
  }, [fetchDirections]);

  useEffect(() => {
    if (phase === "idle") {
      setDirections(null);
      hasFitBounds.current = false;
    }
  }, [phase]);

  // Lazy-create car icon after API loads
  useEffect(() => {
    if (isLoaded && !carIconRef.current) {
      carIconRef.current = createCarIcon();
    }
  }, [isLoaded]);

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
      <div className="flex items-center justify-center bg-muted" style={{ height: height ?? "300px" }}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: height ?? "300px" }}>
      <GoogleMap
        mapContainerStyle={CONTAINER_STYLE}
        center={pickup}
        zoom={14}
        options={MAP_OPTIONS}
        onLoad={onMapLoad}
      >
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: "#2563EB",
                strokeWeight: 5,
                strokeOpacity: 0.85,
              },
            }}
          />
        )}

        {/* Pickup marker */}
        <Marker
          position={pickup}
          icon={{ url: PICKUP_ICON_URL, scaledSize: new google.maps.Size(40, 40) }}
          label={{ text: "P", color: "#000", fontWeight: "bold", fontSize: "11px" }}
          zIndex={10}
        />

        {/* Dropoff marker */}
        <Marker
          position={dropoff}
          icon={{ url: DROPOFF_ICON_URL, scaledSize: new google.maps.Size(40, 40) }}
          label={{ text: "D", color: "#fff", fontWeight: "bold", fontSize: "11px" }}
          zIndex={10}
        />

        {/* Distance gradient connector: driver → target */}
        {smoothDriverPos && (phase === "driver_to_pickup" || phase === "pickup_to_dropoff") && (() => {
          const target = phase === "driver_to_pickup" ? pickup : dropoff;
          const distKm = calculateDistance(smoothDriverPos.lat, smoothDriverPos.lng, target.lat, target.lng);
          return (
            <DistanceGradientLine from={smoothDriverPos} to={target} distanceKm={distKm} />
          );
        })()}

        {/* Smooth animated driver marker */}
        {smoothDriverPos && (
          <Marker
            position={smoothDriverPos}
            icon={carIconRef.current ?? undefined}
            zIndex={20}
          />
        )}
      </GoogleMap>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported wrapper                                                   */
/* ------------------------------------------------------------------ */

export default function TripGoogleMap(props: TripGoogleMapProps) {
  const { apiKey, loading, error } = useGoogleMapsKey();

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-muted rounded-xl" style={{ height: props.height ?? "300px" }}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !apiKey) {
    return (
      <div className="flex items-center justify-center bg-muted rounded-xl text-sm text-muted-foreground" style={{ height: props.height ?? "300px" }}>
        Map unavailable
      </div>
    );
  }

  return <InnerMap {...props} apiKey={apiKey} />;
}
