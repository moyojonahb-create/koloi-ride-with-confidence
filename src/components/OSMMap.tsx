import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Crosshair, Layers, MapPin } from 'lucide-react';
import { useGwandaLandmarks, getCategoryColor, GWANDA_BOUNDS, type MapLandmark } from '@/hooks/useGwandaLandmarks';

// Fix default marker icons for Leaflet in React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet's default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Coordinates {
  lat: number;
  lng: number;
}

interface OSMMapProps {
  center?: Coordinates;
  zoom?: number;
  pickup?: Coordinates | null;
  dropoff?: Coordinates | null;
  routeGeometry?: string | null;
  driverLocation?: Coordinates | null;
  onMapClick?: (coords: Coordinates) => void;
  className?: string;
  height?: string;
  showLandmarks?: boolean;
  showRecenterButton?: boolean;
}

// Custom marker icons
const pickupIcon = L.divIcon({
  html: `<div class="w-8 h-8 rounded-full bg-emerald-500 border-4 border-white shadow-lg flex items-center justify-center">
    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="4"/>
    </svg>
  </div>`,
  className: 'custom-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const dropoffIcon = L.divIcon({
  html: `<div class="w-8 h-8 rounded-full bg-blue-500 border-4 border-white shadow-lg flex items-center justify-center">
    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2a6 6 0 00-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 00-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z"/>
    </svg>
  </div>`,
  className: 'custom-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const driverIcon = L.divIcon({
  html: `<div class="w-10 h-10 rounded-full bg-amber-500 border-4 border-white shadow-lg flex items-center justify-center animate-pulse">
    <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0h2.1a2.5 2.5 0 014.9 0H17a1 1 0 001-1V5a1 1 0 00-1-1H3z"/>
    </svg>
  </div>`,
  className: 'custom-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Create landmark icon with category color
const createLandmarkIcon = (color: string, size: 'small' | 'medium' = 'small') => {
  const sizeClasses = size === 'small' ? 'w-5 h-5' : 'w-6 h-6';
  return L.divIcon({
    html: `<div class="${sizeClasses} rounded-full border-2 border-white shadow-md flex items-center justify-center" style="background-color: ${color};">
      <svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="6"/>
      </svg>
    </div>`,
    className: 'landmark-marker',
    iconSize: size === 'small' ? [20, 20] : [24, 24],
    iconAnchor: size === 'small' ? [10, 10] : [12, 12],
  });
};

// Gwanda, Zimbabwe default center
const GWANDA_CENTER: Coordinates = { lat: -20.9355, lng: 29.0147 };

// Available tile layers - OSM updates are reflected here
const TILE_LAYERS = {
  // Standard OSM - updated frequently, shows all roads including paths
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  // OSM France - good detail, updates quickly
  osmFrance: {
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> France',
  },
  // Humanitarian style - shows paths and tracks well
  humanitarian: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, Tiles: HOT',
  },
};

// Gwanda service area bounds for map fitting
const gwandaBounds: L.LatLngBoundsExpression = [
  [GWANDA_BOUNDS.south, GWANDA_BOUNDS.west], // Southwest
  [GWANDA_BOUNDS.north, GWANDA_BOUNDS.east], // Northeast
];

export default function OSMMap({
  center = GWANDA_CENTER,
  zoom = 14,
  pickup,
  dropoff,
  routeGeometry,
  driverLocation,
  onMapClick,
  className = '',
  height = '400px',
  showLandmarks = true,
  showRecenterButton = true,
}: OSMMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const landmarkLayerRef = useRef<L.LayerGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [landmarksVisible, setLandmarksVisible] = useState(true);

  const { landmarks, loading: landmarksLoading } = useGwandaLandmarks();

  // Recenter map to Gwanda service area
  const handleRecenter = useCallback(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.fitBounds(gwandaBounds, { 
      padding: [20, 20],
      maxZoom: 15,
    });
  }, []);

  // Toggle landmarks visibility
  const handleToggleLandmarks = useCallback(() => {
    if (!mapInstanceRef.current || !landmarkLayerRef.current) return;
    
    if (landmarksVisible) {
      mapInstanceRef.current.removeLayer(landmarkLayerRef.current);
    } else {
      landmarkLayerRef.current.addTo(mapInstanceRef.current);
    }
    setLandmarksVisible(!landmarksVisible);
  }, [landmarksVisible]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: true,
      attributionControl: true,
      maxBounds: [
        [GWANDA_BOUNDS.south - 0.1, GWANDA_BOUNDS.west - 0.1],
        [GWANDA_BOUNDS.north + 0.1, GWANDA_BOUNDS.east + 0.1],
      ],
      maxBoundsViscosity: 0.8,
    });

    // Create base layers - OSM Humanitarian shows paths/tracks well
    const baseLayers = {
      'Street Map': L.tileLayer(TILE_LAYERS.osm.url, {
        attribution: TILE_LAYERS.osm.attribution,
        maxZoom: 19,
      }),
      'Humanitarian': L.tileLayer(TILE_LAYERS.humanitarian.url, {
        attribution: TILE_LAYERS.humanitarian.attribution,
        maxZoom: 19,
      }),
      'OSM France': L.tileLayer(TILE_LAYERS.osmFrance.url, {
        attribution: TILE_LAYERS.osmFrance.attribution,
        maxZoom: 19,
      }),
    };

    // Add default layer (Humanitarian shows roads/paths better)
    baseLayers['Humanitarian'].addTo(map);

    // Add layer control
    L.control.layers(baseLayers, {}, { position: 'topright' }).addTo(map);

    // Create landmark layer group
    landmarkLayerRef.current = L.layerGroup().addTo(map);

    baseLayers['Humanitarian'].on('load', () => {
      setIsLoading(false);
    });

    // Fit to Gwanda service area on initial load
    map.fitBounds(gwandaBounds, { 
      padding: [20, 20],
      maxZoom: 15,
    });

    // Handle map clicks
    if (onMapClick) {
      map.on('click', (e) => {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }

    mapInstanceRef.current = map;

    // Set loading false after a timeout as fallback
    setTimeout(() => setIsLoading(false), 2000);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      landmarkLayerRef.current = null;
    };
  }, []);

  // Add landmark markers to map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const landmarkLayer = landmarkLayerRef.current;
    if (!map || !landmarkLayer || !showLandmarks || landmarksLoading) return;

    // Clear existing landmarks
    landmarkLayer.clearLayers();

    // Add landmark markers
    landmarks.forEach((landmark: MapLandmark) => {
      const color = getCategoryColor(landmark.category);
      const icon = createLandmarkIcon(color);
      
      const marker = L.marker([landmark.latitude, landmark.longitude], { 
        icon,
        title: landmark.name,
      });

      marker.bindPopup(`
        <div class="p-2">
          <p class="font-semibold text-sm">${landmark.name}</p>
          <p class="text-xs text-gray-600 capitalize">${landmark.category}</p>
          ${landmark.description ? `<p class="text-xs mt-1">${landmark.description}</p>` : ''}
        </div>
      `, { 
        closeButton: false,
        className: 'landmark-popup',
      });

      marker.addTo(landmarkLayer);
    });

    // Update visibility based on state
    if (!landmarksVisible) {
      map.removeLayer(landmarkLayer);
    }
  }, [landmarks, landmarksLoading, showLandmarks, landmarksVisible]);

  // Update pickup marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pickupMarkerRef.current) {
      map.removeLayer(pickupMarkerRef.current);
      pickupMarkerRef.current = null;
    }

    if (pickup) {
      pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], { icon: pickupIcon })
        .addTo(map)
        .bindPopup('Pickup location');
    }
  }, [pickup?.lat, pickup?.lng]);

  // Update dropoff marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (dropoffMarkerRef.current) {
      map.removeLayer(dropoffMarkerRef.current);
      dropoffMarkerRef.current = null;
    }

    if (dropoff) {
      dropoffMarkerRef.current = L.marker([dropoff.lat, dropoff.lng], { icon: dropoffIcon })
        .addTo(map)
        .bindPopup('Dropoff location');
    }
  }, [dropoff?.lat, dropoff?.lng]);

  // Update driver marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (driverMarkerRef.current) {
      map.removeLayer(driverMarkerRef.current);
      driverMarkerRef.current = null;
    }

    if (driverLocation) {
      driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon })
        .addTo(map)
        .bindPopup('Driver location');
    }
  }, [driverLocation?.lat, driverLocation?.lng]);

  // Update route polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (routeGeometry) {
      try {
        // Decode polyline (OSRM returns encoded polyline)
        const decoded = decodePolyline(routeGeometry);
        if (decoded.length > 0) {
          routeLayerRef.current = L.polyline(decoded, {
            color: '#3b82f6',
            weight: 5,
            opacity: 0.8,
          }).addTo(map);
        }
      } catch (e) {
        console.error('Failed to decode route geometry:', e);
      }
    }
  }, [routeGeometry]);

  // Fit bounds to show pickup/dropoff when both are set
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds: L.LatLngBoundsLiteral = [];
    
    if (pickup) bounds.push([pickup.lat, pickup.lng]);
    if (dropoff) bounds.push([dropoff.lat, dropoff.lng]);
    if (driverLocation) bounds.push([driverLocation.lat, driverLocation.lng]);

    if (bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    }
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, driverLocation?.lat, driverLocation?.lng]);

  return (
    <div className={cn('relative rounded-xl overflow-hidden', className)} style={{ height }}>
      {isLoading && (
        <Skeleton className="absolute inset-0 z-10" />
      )}
      <div 
        ref={mapRef} 
        className="w-full h-full"
      />

      {/* Map Controls */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-2 z-[1000]">
        {/* Recenter Button */}
        {showRecenterButton && (
          <Button
            onClick={handleRecenter}
            variant="secondary"
            size="sm"
            className="shadow-lg"
            title="Recenter to Gwanda"
          >
            <Crosshair className="w-4 h-4 mr-1.5" />
            Gwanda
          </Button>
        )}

        {/* Toggle Landmarks Button */}
        {showLandmarks && (
          <Button
            onClick={handleToggleLandmarks}
            variant={landmarksVisible ? "secondary" : "outline"}
            size="sm"
            className="shadow-lg"
            title={landmarksVisible ? "Hide landmarks" : "Show landmarks"}
          >
            <MapPin className="w-4 h-4 mr-1.5" />
            {landmarksVisible ? 'Hide' : 'Show'} Pins
          </Button>
        )}
      </div>

      {/* Landmark count badge */}
      {showLandmarks && landmarksVisible && !landmarksLoading && (
        <div className="absolute top-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-md">
          <MapPin className="w-3 h-3 inline-block mr-1 text-accent" />
          {landmarks.length} landmarks
        </div>
      )}
    </div>
  );
}

// Decode Google/OSRM polyline format
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}
