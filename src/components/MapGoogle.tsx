/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useRef, useState, memo, useMemo } from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { Loader } from '@googlemaps/js-api-loader';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PremiumTrackingMap from '@/components/map/PremiumTrackingMap';

// ── Types ──
interface Coords {
  lat: number;
  lng: number;
}

interface MapGoogleProps {
  pickup?: Coords | null;
  dropoff?: Coords | null;
  driverLocation?: Coords | null;
  routeGeometry?: string | null;
  secondaryRouteGeometry?: string | null;
  onMapClick?: (coords: Coords) => void;
  className?: string;
  height?: string;
  drivers?: Array<{ id: string; lat: number; lng: number; isOnline?: boolean }>;
  defaultCenter?: Coords;
  defaultZoom?: number;
  /** ETA in minutes for the premium driver overlay */
  etaMinutes?: number;
}

const ZW_CENTER: Coords = { lat: -19.015, lng: 29.155 };
const containerStyle = { width: '100%', height: '100%' };
const GOOGLE_MAPS_LOADER_ID = 'voyex-google-map';
const GOOGLE_MAPS_LIBRARIES: LoaderOptions['libraries'] = ['places'];

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  zoomControlOptions: { position: 9 },
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  styles: [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
};

const NEARBY_CAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="#22c55e" stroke="white" stroke-width="2.5"/><path d="M25.92 13.01C25.72 12.42 25.16 12 24.5 12h-13c-.66 0-1.21.42-1.42 1.01L8 19v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h14v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM12.5 23c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM11 18l1.5-4.5h11L25 18H11z" fill="white"/></svg>`;

const OFFLINE_CAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="#9ca3af" stroke="white" stroke-width="2.5"/><path d="M25.92 13.01C25.72 12.42 25.16 12 24.5 12h-13c-.66 0-1.21.42-1.42 1.01L8 19v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h14v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM12.5 23c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM11 18l1.5-4.5h11L25 18H11z" fill="white"/></svg>`;

function decodePolyline(encoded: string): Coords[] {
  const points: Coords[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

// ── Smooth driver position interpolation ──
const LERP_MS = 1200;
function lerpVal(a: number, b: number, t: number) { return a + (b - a) * Math.min(1, Math.max(0, t)); }

function useSmoothDrivers(drivers?: Array<{ id: string; lat: number; lng: number; isOnline?: boolean }>) {
  const prevRef = useRef<Map<string, Coords>>(new Map());
  const [smoothed, setSmoothed] = useState<Array<{ id: string; lat: number; lng: number; isOnline?: boolean }>>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!drivers?.length) { setSmoothed([]); return; }

    const targets = new Map<string, { lat: number; lng: number; isOnline?: boolean }>();
    const froms = new Map<string, Coords>();

    for (const d of drivers) {
      targets.set(d.id, { lat: d.lat, lng: d.lng, isOnline: d.isOnline });
      froms.set(d.id, prevRef.current.get(d.id) ?? { lat: d.lat, lng: d.lng });
    }

    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / LERP_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const result: Array<{ id: string; lat: number; lng: number; isOnline?: boolean }> = [];

      for (const d of drivers) {
        const from = froms.get(d.id)!;
        const to = targets.get(d.id)!;
        result.push({
          id: d.id,
          lat: lerpVal(from.lat, to.lat, eased),
          lng: lerpVal(from.lng, to.lng, eased),
          isOnline: to.isOnline,
        });
      }
      setSmoothed(result);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
      else {
        for (const d of drivers) prevRef.current.set(d.id, { lat: d.lat, lng: d.lng });
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [drivers]);

  return smoothed;
}

// ── Inner map component ──
function InnerMapGoogle({
  pickup, dropoff, driverLocation, routeGeometry, secondaryRouteGeometry, onMapClick,
  className = '', height = '100%', drivers, defaultCenter, defaultZoom = 13, apiKey, etaMinutes = 0,
}: MapGoogleProps & { apiKey: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    if (!apiKey) return;

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: GOOGLE_MAPS_LIBRARIES,
    });

    loader
      .load()
      .then(() => setIsLoaded(true))
      .catch((err) => setLoadError(err as Error));
  }, [apiKey]);

  const mapRef = useRef<google.maps.Map | null>(null);
  const [routePath, setRoutePath] = useState<Coords[]>([]);
  const [secondaryPath, setSecondaryPath] = useState<Coords[]>([]);
  const smoothDrivers = useSmoothDrivers(drivers);

  // Whether the premium overlay is active (driver + pickup present)
  const hasPremiumOverlay = !!(driverLocation && pickup && mapRef.current);

  useEffect(() => {
    if (routeGeometry) {
      try { setRoutePath(decodePolyline(routeGeometry)); }
      catch { setRoutePath([]); }
    } else { setRoutePath([]); }
  }, [routeGeometry]);

  useEffect(() => {
    if (secondaryRouteGeometry) {
      try { setSecondaryPath(decodePolyline(secondaryRouteGeometry)); }
      catch { setSecondaryPath([]); }
    } else { setSecondaryPath([]); }
  }, [secondaryRouteGeometry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pickup || dropoff || driverLocation) return;
    if (defaultCenter) {
      map.panTo(defaultCenter);
      map.setZoom(defaultZoom);
    }
  }, [defaultCenter?.lat, defaultCenter?.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts: Coords[] = [];
    if (pickup) pts.push(pickup);
    if (dropoff) pts.push(dropoff);
    if (driverLocation) pts.push(driverLocation);
    if (pts.length >= 2) {
      const bounds = new google.maps.LatLngBounds();
      pts.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, { top: 80, bottom: 280, left: 40, right: 40 });
    } else if (pts.length === 1) {
      map.panTo(pts[0]);
      map.setZoom(15);
    }
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, driverLocation?.lat, driverLocation?.lng]);

  const handleLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);
  const handleClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!onMapClick || !e.latLng) return;
    onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  }, [onMapClick]);

  if (loadError) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`} style={{ height, minHeight: 260 }}>
        <div className="text-center p-6 space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-destructive" />
          <p className="font-semibold text-foreground">Map failed to load</p>
          <p className="text-sm text-muted-foreground">{loadError.message}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`relative ${className}`} style={{ height, minHeight: 260 }}>
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full shadow-md">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-foreground">Loading map…</span>
          </div>
        </div>
      </div>
    );
  }

  const center = pickup || dropoff || driverLocation || defaultCenter || ZW_CENTER;

  return (
    <div className={className} style={{ height, minHeight: height === '100%' ? undefined : 260 }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={defaultZoom}
        options={mapOptions}
        onLoad={handleLoad}
        onClick={handleClick}
      >
        {pickup && (
          <Marker position={pickup} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#FBBF24', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 }} label={{ text: 'P', color: '#000', fontWeight: 'bold', fontSize: '11px' }} zIndex={10} />
        )}
        {dropoff && (
          <Marker position={dropoff} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#2563EB', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 }} label={{ text: 'D', color: '#fff', fontWeight: 'bold', fontSize: '11px' }} zIndex={10} />
        )}

        {/* Premium tracking overlay: replaces plain driver marker + gradient line */}
        {driverLocation && pickup && mapRef.current && (
          <PremiumTrackingMap
            map={mapRef.current}
            driverPosition={driverLocation}
            riderPosition={pickup}
            routePath={secondaryPath.length > 1 ? secondaryPath : (routePath.length > 1 ? routePath : [driverLocation, pickup])}
            etaMinutes={etaMinutes}
          />
        )}

        {/* Nearby drivers as animated car icons */}
        {smoothDrivers.map((d) => (
          <Marker key={d.id} position={{ lat: d.lat, lng: d.lng }} icon={{
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(d.isOnline ? NEARBY_CAR_SVG : OFFLINE_CAR_SVG),
            scaledSize: new google.maps.Size(d.isOnline ? 32 : 28, d.isOnline ? 32 : 28),
            anchor: new google.maps.Point(d.isOnline ? 16 : 14, d.isOnline ? 16 : 14),
          }} zIndex={5} />
        ))}

        {/* Secondary route (only when premium overlay is NOT handling it) */}
        {!hasPremiumOverlay && secondaryPath.length > 1 && (
          <Polyline path={secondaryPath} options={{ strokeColor: '#60a5fa', strokeWeight: 4, strokeOpacity: 0.7, icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '15px' }] }} />
        )}
        {/* Primary route: pickup → dropoff (solid blue) */}
        {routePath.length > 1 && (
          <Polyline path={routePath} options={{ strokeColor: '#2563EB', strokeWeight: 5, strokeOpacity: 0.85 }} />
        )}
      </GoogleMap>
    </div>
  );
}

// ── Outer wrapper ──
function MapGoogle(props: MapGoogleProps) {
  const { apiKey, loading: keyLoading, error: keyError } = useGoogleMapsKey();
  const { className = '', height = '100%' } = props;

  if (keyLoading) {
    return (
      <div className={`flex items-center justify-center bg-muted animate-pulse ${className}`} style={{ height, minHeight: 260 }}>
        <p className="text-muted-foreground text-sm">Loading map…</p>
      </div>
    );
  }

  if (keyError || !apiKey) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`} style={{ height, minHeight: 260 }}>
        <div className="text-center p-6 space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-destructive" />
          <p className="font-semibold text-foreground">Google Maps unavailable</p>
          <p className="text-sm text-muted-foreground">Please log in to access the map.</p>
        </div>
      </div>
    );
  }

  return <InnerMapGoogle {...props} apiKey={apiKey} />;
}

export default memo(MapGoogle);
