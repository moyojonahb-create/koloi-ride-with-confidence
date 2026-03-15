/* eslint-disable react-hooks/exhaustive-deps */
import { Polyline } from '@react-google-maps/api';
import { useMemo } from 'react';

interface Coords {
  lat: number;
  lng: number;
}

interface DistanceGradientLineProps {
  from: Coords;
  to: Coords;
  /** Distance in km between the two points */
  distanceKm: number;
}

/** Max distance (km) for full red; at 0 km it's full green */
const MAX_DIST_KM = 5;
const SEGMENTS = 12;

/**
 * Interpolate between red → yellow → green based on a 0-1 ratio.
 * 0 = far (red), 1 = close (green)
 */
function getGradientColor(ratio: number): string {
  // ratio: 0 = far (red), 1 = close (green)
  const clamped = Math.max(0, Math.min(1, ratio));

  let r: number, g: number, b: number;

  if (clamped < 0.5) {
    // Red → Yellow (0 → 0.5)
    const t = clamped / 0.5;
    r = 239;
    g = Math.round(68 + (160) * t); // 68 → 228
    b = Math.round(68 * (1 - t));   // 68 → 0
  } else {
    // Yellow → Green (0.5 → 1)
    const t = (clamped - 0.5) / 0.5;
    r = Math.round(239 - (239 - 34) * t); // 239 → 34
    g = Math.round(228 + (197 - 228) * t); // 228 → 197
    b = Math.round(0 + 94 * t);            // 0 → 94
  }

  return `rgb(${r},${g},${b})`;
}

function lerpCoord(a: Coords, b: Coords, t: number): Coords {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

/**
 * Renders a gradient polyline between two points on a Google Map.
 * Color transitions from red (far) → yellow (medium) → green (close)
 * based on the real distance between driver and rider.
 */
export default function DistanceGradientLine({ from, to, distanceKm }: DistanceGradientLineProps) {
  const segments = useMemo(() => {
    const closenessRatio = 1 - Math.min(distanceKm / MAX_DIST_KM, 1);
    const result: Array<{ path: Coords[]; color: string }> = [];

    for (let i = 0; i < SEGMENTS; i++) {
      const t1 = i / SEGMENTS;
      const t2 = (i + 1) / SEGMENTS;
      const segRatio = closenessRatio * (1 - t1) + closenessRatio * 0.3 * t1;
      // Gradient along the line: closer to driver = matches distance color,
      // closer to rider = greener
      const localRatio = closenessRatio + (1 - closenessRatio) * (t2);
      const blended = segRatio * 0.4 + localRatio * 0.6;

      result.push({
        path: [lerpCoord(from, to, t1), lerpCoord(from, to, t2)],
        color: getGradientColor(blended),
      });
    }

    return result;
  }, [from.lat, from.lng, to.lat, to.lng, distanceKm]);

  return (
    <>
      {/* Glow / outline layer */}
      {segments.map((seg, i) => (
        <Polyline
          key={`glow-${i}`}
          path={seg.path}
          options={{
            strokeColor: seg.color,
            strokeWeight: 8,
            strokeOpacity: 0.25,
            zIndex: 14,
          }}
        />
      ))}
      {/* Main colored line */}
      {segments.map((seg, i) => (
        <Polyline
          key={`main-${i}`}
          path={seg.path}
          options={{
            strokeColor: seg.color,
            strokeWeight: 4,
            strokeOpacity: 0.9,
            zIndex: 15,
          }}
        />
      ))}
    </>
  );
}
