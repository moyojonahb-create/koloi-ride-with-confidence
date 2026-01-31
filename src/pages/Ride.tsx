import RideView from "@/components/ride/RideView";

export default function Ride() {
  return <RideView />;
}
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

/* -------------------------
   BRAND + MAP LAYERS
-------------------------- */
const BRAND = {
  blue: "#0F2A44",
  yellow: "#F7C600",
  brightBlue: "#1E6BFF",
  black: "#111111",
  bg: "#FFFFFF",
};

const TILE_LAYERS = {
  humanitarian: {
    name: "Humanitarian",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  standard: {
    name: "Street Map",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  osmFrance: {
    name: "OSM France",
    url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
} as const;

/* -------------------------
   PRICING (Distance + Night from 20:00)
   - Around town: base + perKm
   - Outside/long rides: minimum R50
   - Night multiplier applies after 8pm
-------------------------- */
function computePriceRands(distanceKm: number, now = new Date()) {
  const hour = now.getHours();
  const isNight = hour >= 20; // from 8pm

  const base = 12;
  const perKm = 8;

  let price = Math.round(base + distanceKm * perKm);

  const outOfTownMin = 50;
  const outOfTownThresholdKm = 6; // adjust if you want
  if (distanceKm >= outOfTownThresholdKm) price = Math.max(price, outOfTownMin);

  const nightMultiplier = 1.25; // +25% at night
  const nightPrice = Math.round(price * nightMultiplier);

  return { dayPrice: price, nightPrice, isNight };
}

/* -------------------------
   HELPERS
-------------------------- */
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(s));
}

async function fetchOsrmRoute(pickup: { lat: number; lng: number }, dropoff: { lat: number; lng: number }) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}` +
    `?overview=full&geometries=geojson&steps=true`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Routing request failed");
  const data = await res.json();
  const route = data?.routes?.[0];
  if (!route) throw new Error("No route found");

  const distanceMeters = route.distance as number;
  const durationSeconds = route.duration as number;
  const coords: [number, number][] = route.geometry.coordinates; // [lng,lat]

  const latlngs: LatLngExpression[] = coords.map(([lng, lat]) => [lat, lng]);
  return { distanceMeters, durationSeconds, latlngs };
}

/* -------------------------
   ICONS
-------------------------- */
function makeDivIcon(html: string, size: [number, number], anchor: [number, number]) {
  return L.divIcon({ className: "koloi-div-icon", html, iconSize: size, iconAnchor: anchor });
}

const pickupIcon = makeDivIcon(
  `
  <div style="display:flex;flex-direction:column;align-items:center">
    <div style="
      width:38px;height:38px;border-radius:999px;background:${BRAND.yellow};
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 10px 20px rgba(0,0,0,.18);
      border:2px solid rgba(255,255,255,.9)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="${BRAND.black}">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/>
      </svg>
    </div>
    <div style="margin-top:6px;font-size:11px;font-weight:800;color:#111">Pickup</div>
  </div>
  `,
  [44, 60],
  [22, 54],
);

const dropoffIcon = makeDivIcon(
  `
  <div style="display:flex;flex-direction:column;align-items:center">
    <div style="
      width:38px;height:38px;border-radius:999px;background:${BRAND.blue};
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 10px 20px rgba(0,0,0,.18);
      border:2px solid rgba(255,255,255,.9)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
        <path d="M12 3c.55 0 1 .45 1 1v12.17l3.59-3.58a1 1 0 1 1 1.41 1.41l-5.3 5.3a1 1 0 0 1-1.4 0l-5.3-5.3a1 1 0 0 1 1.41-1.41L11 16.17V4c0-.55.45-1 1-1z"/>
      </svg>
    </div>
    <div style="margin-top:6px;font-size:11px;font-weight:800;color:#111">Drop-off</div>
  </div>
  `,
  [44, 60],
  [22, 54],
);

const carIcon = makeDivIcon(
  `
  <div style="
    width:34px;height:34px;border-radius:999px;background:${BRAND.black};
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 10px 20px rgba(0,0,0,.18);
    border:2px solid rgba(255,255,255,.9)">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="${BRAND.brightBlue}">
      <path d="M5 16c0 1.1.9 2 2 2h1a2 2 0 1 0 4 0h4a2 2 0 1 0 4 0h1c.55 0 1-.45 1-1v-5l-2.1-6.3A2 2 0 0 0 18.0 4H7.0A2 2 0 0 0 5.1 5.7L3 12v4c0 .55.45 1 1 1h1zm3 3a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm10 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM6.2 6.3A1 1 0 0 1 7 6h11a1 1 0 0 1 .95.68L20.6 12H3.4l2.8-5.7z"/>
    </svg>
  </div>
  `,
  [38, 38],
  [19, 19],
);

/* -------------------------
   MAP UTIL
-------------------------- */
function FitBounds({ points }: { points: LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length < 2) return;
    const bounds = L.latLngBounds(points as any);
    map.fitBounds(bounds.pad(0.18));
  }, [map, points]);
  return null;
}

function MapOverlayControls({ onUseMyLocation, onRecenter }: { onUseMyLocation: () => void; onRecenter: () => void }) {
  return (
    <>
      <button
        onClick={onRecenter}
        className="absolute left-4 bottom-4 z-[600] w-12 h-12 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center active:scale-95"
        title="Recenter"
        type="button"
      >
        🎯
      </button>
      <button
        onClick={onUseMyLocation}
        className="absolute left-4 bottom-20 z-[600] w-12 h-12 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center active:scale-95"
        title="Use my location"
        type="button"
      >
        📍
      </button>
    </>
  );
}

/* -------------------------
   TYPES
-------------------------- */
type DriverOffer = {
  id: string;
  driverName: string;
  phone: string; // +263
  vehicleType: string;
  plate: string;
  language: string;
  distanceKm: number;
  etaMin: number;
  priceR: number;
  viewed: boolean;
};

/* -------------------------
   MAIN PAGE
-------------------------- */
export default function RidePage() {
  // Center: Gwanda
  const gwandaCenter = useMemo<LatLngExpression>(() => [-20.936, 29.01], []);
  const [layer, setLayer] = useState<keyof typeof TILE_LAYERS>("humanitarian");

  // Pickup + dropoff labels and coords
  const [pickupLabel, setPickupLabel] = useState("Gwanda Rank");
  const [dropoffLabel, setDropoffLabel] = useState("Phakama Shops");

  const [pickup, setPickup] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoff, setDropoff] = useState<{ lat: number; lng: number } | null>(null);

  // Route
  const [routeLine, setRouteLine] = useState<LatLngExpression[]>([]);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [etaMin, setEtaMin] = useState<number>(0);
  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Driver live position (simulate now; replace with realtime later)
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [tripStatus, setTripStatus] = useState<"IDLE" | "SEARCHING" | "BIDDING" | "ACCEPTED" | "ARRIVED">("IDLE");

  // Offers modal
  const [offersOpen, setOffersOpen] = useState(false);
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<DriverOffer | null>(null);
  const [acceptTimer, setAcceptTimer] = useState<number>(10);

  // arrival notification
  const [arrivalBanner, setArrivalBanner] = useState<string | null>(null);

  // map ref (recenter)
  const mapRef = useRef<L.Map | null>(null);

  // pricing
  const { dayPrice, nightPrice, isNight } = useMemo(() => computePriceRands(distanceKm), [distanceKm]);

  // Setup demo coords if empty
  useEffect(() => {
    if (!pickup) setPickup({ lat: -20.9385, lng: 29.0122 }); // rank approx
    if (!dropoff) setDropoff({ lat: -20.9325, lng: 29.0185 }); // shops approx
  }, []);

  // Compute route whenever pickup/dropoff change
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!pickup || !dropoff) return;
      setIsRouting(true);
      setRouteError(null);
      try {
        const r = await fetchOsrmRoute(pickup, dropoff);
        if (cancelled) return;
        setRouteLine(r.latlngs);
        setDistanceKm(Math.max(0, r.distanceMeters / 1000));
        setEtaMin(Math.max(1, Math.round(r.durationSeconds / 60)));
      } catch (e: any) {
        if (cancelled) return;
        console.error("Route error:", e);
        setRouteError(e?.message ?? "Routing failed");
        // fallback straight line
        const a = L.latLng(pickup.lat, pickup.lng);
        const b = L.latLng(dropoff.lat, dropoff.lng);
        const meters = a.distanceTo(b);
        setDistanceKm(Math.max(0, meters / 1000));
        setEtaMin(Math.max(1, Math.round((meters / 1000 / 25) * 60)));
        setRouteLine([a, b]);
      } finally {
        if (!cancelled) setIsRouting(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  // "Use my location" pickup: must show ONLY "My location"
  function useMyLocationForPickup() {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPickup({ lat: latitude, lng: longitude });
        setPickupLabel("My location"); // IMPORTANT: no "near ..."
        if (mapRef.current) mapRef.current.setView([latitude, longitude], 16, { animate: true });
      },
      () => alert("Location permission denied or unavailable"),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  function recenter() {
    if (!mapRef.current) return;
    if (pickup) mapRef.current.setView([pickup.lat, pickup.lng], 15, { animate: true });
    else mapRef.current.setView(gwandaCenter as any, 15, { animate: true });
  }

  // When rider clicks "Request Ride"
  function requestRide() {
    if (!pickup || !dropoff) return;

    setTripStatus("SEARCHING");
    setOffersOpen(true);
    setSelectedOffer(null);
    setAcceptTimer(10);

    // Create demo offers (replace later with real DB/realtime)
    const base = isNight ? nightPrice : dayPrice;
    const demo: DriverOffer[] = [
      {
        id: "d1",
        driverName: "S. Ncube",
        phone: "+263778111222",
        vehicleType: "Toyota IST",
        plate: "ACF 1234",
        language: "Ndebele/English",
        distanceKm: 1.4,
        etaMin: 5,
        priceR: base + 5,
        viewed: true,
      },
      {
        id: "d2",
        driverName: "T. Sibanda",
        phone: "+263778333444",
        vehicleType: "Honda Fit",
        plate: "ADF 7788",
        language: "English/Shona",
        distanceKm: 2.1,
        etaMin: 7,
        priceR: base,
        viewed: true,
      },
      {
        id: "d3",
        driverName: "M. Dube",
        phone: "+263778555666",
        vehicleType: "Taxi",
        plate: "ABT 0099",
        language: "Ndebele",
        distanceKm: 3.0,
        etaMin: 9,
        priceR: base - 3,
        viewed: false,
      },
    ];

    setOffers(demo);

    // After a short delay, switch to BIDDING state
    setTimeout(() => setTripStatus("BIDDING"), 800);
  }

  // Accept timer (10 seconds once you select a driver)
  useEffect(() => {
    if (!selectedOffer) return;
    setAcceptTimer(10);

    const t = window.setInterval(() => {
      setAcceptTimer((s) => s - 1);
    }, 1000);

    return () => window.clearInterval(t);
  }, [selectedOffer?.id]);

  // If timer hits 0, clear selection
  useEffect(() => {
    if (!selectedOffer) return;
    if (acceptTimer <= 0) {
      setSelectedOffer(null);
    }
  }, [acceptTimer, selectedOffer]);

  // Accept offer: set trip to ACCEPTED and start driver movement simulation
  function acceptOffer() {
    if (!selectedOffer || !pickup) return;
    setTripStatus("ACCEPTED");
    setOffersOpen(false);

    // Simulate driver starting from "somewhere nearby"
    const start = {
      lat: pickup.lat + 0.008, // ~ near
      lng: pickup.lng - 0.006,
    };
    setDriverPos(start);

    // Simulate driver moving towards pickup every 2 seconds
    const interval = window.setInterval(() => {
      setDriverPos((prev) => {
        if (!prev) return start;
        const to = pickup;
        const step = 0.18; // move % per tick
        const next = {
          lat: prev.lat + (to.lat - prev.lat) * step,
          lng: prev.lng + (to.lng - prev.lng) * step,
        };
        return next;
      });
    }, 2000);

    // Stop simulation after some time (or when arrived)
    setTimeout(() => window.clearInterval(interval), 60000);
  }

  // Arrival detection (<= 50m -> notify rider "Your Koloi has arrived")
  useEffect(() => {
    if (tripStatus !== "ACCEPTED") return;
    if (!pickup || !driverPos) return;

    const meters = haversineMeters(pickup, driverPos);
    if (meters <= 50 && tripStatus !== "ARRIVED") {
      setTripStatus("ARRIVED");
      setArrivalBanner("🚗 Your Koloi has arrived");
      // auto clear banner
      setTimeout(() => setArrivalBanner(null), 6000);

      // Optional: browser notification if permission granted
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Koloi", { body: "Your Koloi has arrived." });
      }
    }
  }, [driverPos?.lat, driverPos?.lng, tripStatus, pickup?.lat, pickup?.lng]);

  // Ask notification permission (optional button later)
  async function enableNotifications() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") alert("Notifications not enabled.");
  }

  const viewingCount = offers.filter((o) => o.viewed).length;
  const acceptedCount = offers.filter((o) => o.viewed).length; // MVP: treat viewed as engaged

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0F2A44] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-white/10" />
          <div className="font-bold text-lg">Koloi</div>
        </div>
        <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">☰</button>
      </div>

      {/* Arrival banner */}
      {arrivalBanner && (
        <div className="px-4 pt-3">
          <div className="rounded-2xl bg-[#0F2A44] text-white px-4 py-3 shadow">{arrivalBanner}</div>
        </div>
      )}

      {/* MAP BOX */}
      <div className="px-4 pt-4">
        <div
          className="relative overflow-hidden rounded-2xl border border-gray-200 shadow-sm"
          style={{ height: "45vh", minHeight: 280, maxHeight: 460 }}
        >
          {/* Layer switcher */}
          <div className="absolute right-4 top-4 z-[600] rounded-xl bg-white shadow border border-gray-200 px-2 py-2">
            <select className="text-sm outline-none" value={layer} onChange={(e) => setLayer(e.target.value as any)}>
              {Object.entries(TILE_LAYERS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status chips */}
          <div className="absolute left-4 top-4 z-[600] flex gap-2">
            {isRouting && (
              <div className="rounded-full bg-white px-3 py-1 text-xs shadow border border-gray-200">
                Calculating route…
              </div>
            )}
            {routeError && (
              <div className="rounded-full bg-white px-3 py-1 text-xs shadow border border-red-200 text-red-700">
                Route estimate
              </div>
            )}
          </div>

          <MapContainer
            center={gwandaCenter}
            zoom={15}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
            whenCreated={(m) => (mapRef.current = m)}
          >
            <TileLayer url={TILE_LAYERS[layer].url} attribution={TILE_LAYERS[layer].attribution} />

            {/* Route line (blue) */}
            {routeLine.length > 1 && (
              <>
                <Polyline positions={routeLine} pathOptions={{ color: BRAND.brightBlue, weight: 5, opacity: 0.9 }} />
                <FitBounds points={routeLine} />
              </>
            )}

            {/* Pickup/Dropoff */}
            {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />}
            {dropoff && <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon} />}

            {/* Driver car marker (live) */}
            {driverPos && <Marker position={[driverPos.lat, driverPos.lng]} icon={carIcon} />}

            {/* Overlay buttons */}
            <MapOverlayControls onUseMyLocation={useMyLocationForPickup} onRecenter={recenter} />
          </MapContainer>
        </div>
      </div>

      {/* Bottom card */}
      <div className="px-4 pb-10">
        <div className="mt-4 rounded-2xl border border-gray-200 shadow-sm p-4">
          {/* Pickup */}
          <div className="flex items-center gap-3 py-2">
            <div className="w-3 h-3 rounded-full" style={{ background: BRAND.yellow }} />
            <div className="flex-1">
              <div className="text-xs text-gray-500">Pickup</div>
              <div className="font-medium">{pickupLabel}</div>
            </div>
            <button
              onClick={useMyLocationForPickup}
              className="text-sm font-semibold px-3 py-2 rounded-xl"
              style={{ color: BRAND.blue, background: `${BRAND.blue}1A` }}
              type="button"
            >
              Current location
            </button>
          </div>

          <div className="h-px bg-gray-100 my-2" />

          {/* Dropoff */}
          <div className="flex items-center gap-3 py-2">
            <div className="w-3 h-3 rounded-full" style={{ background: BRAND.blue }} />
            <div className="flex-1">
              <div className="text-xs text-gray-500">Drop-off</div>
              <div className="font-medium">{dropoffLabel}</div>
            </div>
            <button
              onClick={() => {
                // demo switch (replace with your suggestions modal)
                setDropoffLabel("Gwanda Hospital");
                setDropoff({ lat: -20.9349, lng: 29.0079 });
              }}
              className="text-sm font-semibold px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200"
              type="button"
            >
              Change
            </button>
          </div>

          {/* Fare */}
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-3xl font-extrabold text-black">R{isNight ? nightPrice : dayPrice}</div>
              <div className="text-xs text-gray-500 mt-1">
                {distanceKm.toFixed(1)} km • {etaMin} min {isNight ? "• Night price (from 8pm)" : ""}
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              Day: <b>R{dayPrice}</b>
              <br />
              Night: <b>R{nightPrice}</b>
            </div>
          </div>

          {/* Request */}
          <button
            onClick={requestRide}
            className="mt-4 w-full rounded-2xl text-black font-bold py-4 shadow-sm active:scale-[0.99]"
            style={{ background: BRAND.yellow }}
            type="button"
          >
            Request Ride →
          </button>

          {/* Notifications permission (optional) */}
          <button
            onClick={enableNotifications}
            className="mt-3 w-full rounded-2xl py-3 border border-gray-200 text-sm font-semibold"
            style={{ color: BRAND.blue }}
            type="button"
          >
            Enable notifications
          </button>
        </div>
      </div>

      {/* OFFERS MODAL (1) + timer (10s) + choose driver */}
      {offersOpen && (
        <div className="fixed inset-0 z-[999] bg-black/45 flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="font-extrabold text-lg" style={{ color: BRAND.blue }}>
                  Driver Offers
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {viewingCount} drivers viewing • {acceptedCount} responding
                </div>
              </div>
              <button
                onClick={() => {
                  setOffersOpen(false);
                  setTripStatus("IDLE");
                }}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                type="button"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Offers list */}
            <div className="max-h-[55vh] overflow-auto px-5 py-4">
              {offers.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOffer(o)}
                  className={`w-full text-left rounded-2xl border p-4 mb-3 active:scale-[0.99] ${
                    selectedOffer?.id === o.id ? "border-[#0F2A44]" : "border-gray-200"
                  }`}
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold">{o.driverName}</div>
                    <div className="font-extrabold" style={{ color: BRAND.blue }}>
                      R{o.priceR}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {o.vehicleType} • {o.plate} • {o.language}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {o.distanceKm.toFixed(1)} km away • {o.etaMin} min ETA
                  </div>
                </button>
              ))}

              {/* Selected driver actions */}
              {selectedOffer && (
                <div className="rounded-2xl border border-gray-200 p-4 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold">Accept this driver?</div>
                    <div className="text-sm font-extrabold text-red-600">{acceptTimer}s</div>
                  </div>

                  <div className="text-sm text-gray-600 mt-2">
                    Driver phone: <b>{selectedOffer.phone}</b>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      onClick={acceptOffer}
                      className="rounded-2xl py-3 font-bold text-white"
                      style={{ background: BRAND.blue }}
                      type="button"
                      disabled={acceptTimer <= 0}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => setSelectedOffer(null)}
                      className="rounded-2xl py-3 font-bold bg-gray-100"
                      type="button"
                    >
                      Decline
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setOffersOpen(false);
                      setTripStatus("IDLE");
                      setSelectedOffer(null);
                    }}
                    className="mt-2 w-full rounded-2xl py-3 font-bold text-white"
                    style={{ background: "#111" }}
                    type="button"
                  >
                    Cancel Ride
                  </button>

                  {/* (4) Call buttons (MVP) */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <a
                      href={`tel:${selectedOffer.phone}`}
                      className="rounded-2xl py-3 font-bold text-center bg-white border border-gray-200"
                      style={{ color: BRAND.blue }}
                    >
                      Call Driver
                    </a>
                    <a
                      href={`tel:+263778553169`}
                      className="rounded-2xl py-3 font-bold text-center bg-white border border-gray-200"
                      style={{ color: BRAND.blue }}
                    >
                      Call Support
                    </a>
                  </div>

                  <div className="text-xs text-gray-500 mt-2">
                    Note: This is MVP calling via phone dialer. Later we can add in-app VoIP calling.
                  </div>
                </div>
              )}

              {!selectedOffer && (
                <div className="text-xs text-gray-500 mt-2">Select a driver to enable Accept/Decline (10 seconds).</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
