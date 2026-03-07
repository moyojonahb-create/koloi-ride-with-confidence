import { useCallback, useEffect, useRef, useState, memo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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
  onMapClick?: (coords: Coords) => void;
  className?: string;
  height?: string;
  drivers?: Array<{ id: string; lat: number; lng: number; isOnline?: boolean }>;
  defaultCenter?: Coords;
  defaultZoom?: number;
}

const ZW_CENTER: Coords = { lat: -19.015, lng: 29.155 };
const containerStyle = { width: '100%', height: '100%' };
const GOOGLE_MAPS_LOADER_ID = 'koloi-google-map';
const GOOGLE_MAPS_LIBRARIES: ("places")[] = ['places'];

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

// ── Inner map component (only rendered when API key is available) ──
function InnerMapGoogle({
  pickup, dropoff, driverLocation, routeGeometry, onMapClick,
  className = '', height = '100%', drivers, defaultCenter, defaultZoom = 13, apiKey,
}: MapGoogleProps & { apiKey: string }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: GOOGLE_MAPS_LOADER_ID,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [routePath, setRoutePath] = useState<Coords[]>([]);

  useEffect(() => {
    if (routeGeometry) {
      try { setRoutePath(decodePolyline(routeGeometry)); }
      catch { setRoutePath([]); }
    } else { setRoutePath([]); }
  }, [routeGeometry]);

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
        {driverLocation && (
          <Marker position={driverLocation} icon={{ url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="hsl(215,80%,25%)" stroke="white" stroke-width="3"/><path d="M25.92 13.01C25.72 12.42 25.16 12 24.5 12h-13c-.66 0-1.21.42-1.42 1.01L8 19v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h14v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM12.5 23c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM11 18l1.5-4.5h11L25 18H11z" fill="white"/></svg>`), scaledSize: new google.maps.Size(36, 36), anchor: new google.maps.Point(18, 18) }} zIndex={20} />
        )}
        {drivers?.map((d) => (
          <Marker key={d.id} position={{ lat: d.lat, lng: d.lng }} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: d.isOnline ? '#22c55e' : '#9ca3af', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }} zIndex={5} />
        ))}
        {routePath.length > 1 && (
          <Polyline path={routePath} options={{ strokeColor: '#2563EB', strokeWeight: 5, strokeOpacity: 0.85 }} />
        )}
      </GoogleMap>
    </div>
  );
}

// ── Outer wrapper that gates on API key ──
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
