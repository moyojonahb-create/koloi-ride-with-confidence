/// <reference types="@types/google.maps" />

import { useEffect, useMemo, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LatLng {
  lat: number;
  lng: number;
}

export interface PremiumTrackingMapProps {
  map: google.maps.Map;
  driverPosition: LatLng;
  riderPosition: LatLng;
  routePath: LatLng[];
  etaMinutes: number;
}

/* ------------------------------------------------------------------ */
/*  Distance helpers                                                   */
/* ------------------------------------------------------------------ */

function getDistanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function getEtaLabel(minutes: number) {
  const rounded = Math.max(1, Math.round(minutes));
  return `${rounded}M`;
}

/* ------------------------------------------------------------------ */
/*  Distance-based colors                                              */
/* ------------------------------------------------------------------ */

function getRouteColorByDistance(m: number): string {
  if (m > 2000) return "#FFC107"; // far – amber
  if (m > 1000) return "#5FA8FF"; // mid – light blue
  if (m > 300) return "#2F80ED";  // near – blue
  return "#0B3C8A";               // very close – deep blue
}

function getGlowColorByDistance(m: number): string {
  if (m > 2000) return "rgba(255,193,7,0.28)";
  if (m > 1000) return "rgba(95,168,255,0.28)";
  if (m > 300) return "rgba(47,128,237,0.30)";
  return "rgba(11,60,138,0.32)";
}

/* ------------------------------------------------------------------ */
/*  Bearing                                                            */
/* ------------------------------------------------------------------ */

function calculateBearing(from: LatLng, to: LatLng): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

function interpolateBearing(prev: number, next: number): number {
  let diff = next - prev;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return prev + diff * 0.18;
}

/* ------------------------------------------------------------------ */
/*  Car SVG for the overlay                                            */
/* ------------------------------------------------------------------ */

const CAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48">
  <circle cx="24" cy="24" r="22" fill="#0B3C8A" stroke="white" stroke-width="3"/>
  <path d="M16 28l2-8h12l2 8" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>
  <rect x="14" y="28" width="20" height="6" rx="2" fill="white"/>
  <circle cx="18" cy="34" r="2" fill="#0B3C8A"/>
  <circle cx="30" cy="34" r="2" fill="#0B3C8A"/>
  <rect x="20" y="22" width="8" height="5" rx="1" fill="white" opacity="0.6"/>
</svg>`;

/* ------------------------------------------------------------------ */
/*  Custom OverlayView – driver marker + ETA badge                     */
/* ------------------------------------------------------------------ */

interface DriverOverlayInstance extends google.maps.OverlayView {
  position: LatLng;
  etaMinutes: number;
  bearing: number;
  div: HTMLDivElement | null;
  update(position: LatLng, etaMinutes: number, bearing: number): void;
}

type DriverOverlayConstructor = new (position: LatLng, etaMinutes: number, bearing?: number) => DriverOverlayInstance;

let CachedDriverOverlayClass: DriverOverlayConstructor | null = null;

function getDriverOverlayClass(): DriverOverlayClass {
  if (CachedDriverOverlayClass) return CachedDriverOverlayClass;

  const g = (window as unknown as { google?: typeof google }).google;
  if (!g || !g.maps) {
    throw new Error("Google Maps JS API not loaded yet");
  }

  class DriverOverlay extends g.maps.OverlayView {
    position: LatLng;
    etaMinutes: number;
    bearing: number;
    div: HTMLDivElement | null = null;

    constructor(position: LatLng, etaMinutes: number, bearing = 0) {
      super();
      this.position = position;
      this.etaMinutes = etaMinutes;
      this.bearing = bearing;
    }

    onAdd() {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.transform = "translate(-50%, -50%)";
      div.style.pointerEvents = "none";
      div.style.zIndex = "30";

      div.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
          <!-- ETA badge -->
          <div data-role="eta" style="
            background:linear-gradient(135deg,#0B3C8A,#2F80ED);
            color:#fff;
            font-size:11px;
            font-weight:700;
            padding:2px 8px;
            border-radius:10px;
            box-shadow:0 2px 8px rgba(0,0,0,.25);
            letter-spacing:.5px;
            white-space:nowrap;
          ">${getEtaLabel(this.etaMinutes)}</div>

          <!-- Car shell (rotates) -->
          <div data-role="shell" style="
            transform:rotate(${this.bearing}deg);
            transition:transform .3s ease-out;
            position:relative;
            width:44px;
            height:44px;
            display:flex;
            align-items:center;
            justify-content:center;
          ">
            <!-- Pulse ring -->
            <div style="
              position:absolute;
              inset:-6px;
              border-radius:50%;
              background:rgba(47,128,237,.25);
              animation:voyexPulse 2s ease-in-out infinite;
            "></div>
            <!-- Car icon -->
            <div style="position:relative;z-index:2">${CAR_SVG}</div>
          </div>
        </div>`;

      const panes = this.getPanes();
      panes?.overlayMouseTarget.appendChild(div);
      this.div = div;

      // Inject animation keyframes once
      if (!document.getElementById("voyex-driver-overlay-styles")) {
        const style = document.createElement("style");
        style.id = "voyex-driver-overlay-styles";
        style.innerHTML = `
          @keyframes voyexPulse {
            0%   { transform:scale(0.95); opacity:0.35; }
            50%  { transform:scale(1.12); opacity:0.18; }
            100% { transform:scale(0.95); opacity:0.35; }
          }
        `;
        document.head.appendChild(style);
      }
    }

    draw() {
      if (!this.div) return;
      const projection = this.getProjection();
      const point = projection?.fromLatLngToDivPixel(
        new g.maps.LatLng(this.position.lat, this.position.lng)
      );
      if (!point) return;
      this.div.style.left = `${point.x}px`;
      this.div.style.top = `${point.y - 10}px`;
    }

    onRemove() {
      this.div?.parentNode?.removeChild(this.div);
      this.div = null;
    }

    update(position: LatLng, etaMinutes: number, bearing: number) {
      this.position = position;
      this.etaMinutes = etaMinutes;
      this.bearing = bearing;

      if (this.div) {
        const badge = this.div.querySelector('[data-role="eta"]') as HTMLDivElement | null;
        if (badge) badge.textContent = getEtaLabel(etaMinutes);

        const shell = this.div.querySelector('[data-role="shell"]') as HTMLDivElement | null;
        if (shell) shell.style.transform = `rotate(${bearing}deg)`;
      }

      this.draw();
    }
  }

  CachedDriverOverlayClass = DriverOverlay;
  return DriverOverlay;
}

/* ------------------------------------------------------------------ */
/*  Main component – renders nothing in React; manages native overlays */
/* ------------------------------------------------------------------ */

export default function PremiumTrackingMap({
  map,
  driverPosition,
  riderPosition,
  routePath,
  etaMinutes,
}: PremiumTrackingMapProps) {
  const glowPolyRef = useRef<google.maps.Polyline | null>(null);
  const mainPolyRef = useRef<google.maps.Polyline | null>(null);
  const overlayRef = useRef<DriverOverlay | null>(null);
  const prevDriverRef = useRef<LatLng | null>(null);
  const bearingRef = useRef(0);

  const distM = useMemo(
    () => getDistanceMeters(driverPosition, riderPosition),
    [driverPosition.lat, driverPosition.lng, riderPosition.lat, riderPosition.lng]
  );
  const routeColor = useMemo(() => getRouteColorByDistance(distM), [distM]);
  const glowColor = useMemo(() => getGlowColorByDistance(distM), [distM]);

  // ── Polylines ──
  useEffect(() => {
    if (!map || routePath.length < 2) return;

    if (!glowPolyRef.current) {
      glowPolyRef.current = new google.maps.Polyline({
        map,
        path: routePath,
        strokeColor: glowColor,
        strokeOpacity: 1,
        strokeWeight: 14,
        geodesic: true,
        zIndex: 1,
      });
    }

    if (!mainPolyRef.current) {
      mainPolyRef.current = new google.maps.Polyline({
        map,
        path: routePath,
        strokeColor: routeColor,
        strokeOpacity: 0.98,
        strokeWeight: 7,
        geodesic: true,
        zIndex: 2,
      });
    }

    glowPolyRef.current.setPath(routePath);
    glowPolyRef.current.setOptions({ strokeColor: glowColor });

    mainPolyRef.current.setPath(routePath);
    mainPolyRef.current.setOptions({ strokeColor: routeColor });
  }, [map, routePath, routeColor, glowColor]);

  // ── Driver overlay ──
  useEffect(() => {
    if (!map) return;

    let nextBearing = bearingRef.current;
    if (prevDriverRef.current) {
      const raw = calculateBearing(prevDriverRef.current, driverPosition);
      nextBearing = interpolateBearing(bearingRef.current, raw);
    }
    bearingRef.current = nextBearing;
    prevDriverRef.current = driverPosition;

    if (!overlayRef.current) {
      const DriverOverlay = getDriverOverlayClass();
      overlayRef.current = new DriverOverlay(driverPosition, etaMinutes, nextBearing);
      overlayRef.current.setMap(map);
    } else {
      overlayRef.current.update(driverPosition, etaMinutes, nextBearing);
    }
  }, [map, driverPosition.lat, driverPosition.lng, etaMinutes]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      glowPolyRef.current?.setMap(null);
      mainPolyRef.current?.setMap(null);
      overlayRef.current?.setMap(null);
    };
  }, []);

  return null;
}
