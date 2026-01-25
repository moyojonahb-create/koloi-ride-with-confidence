import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AlertCircle, MapIcon, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { decodeFlexiblePolyline, toGeoJSONLineString } from '@/lib/flexPolyline';
import { speak } from '@/lib/voiceNav';
import { Button } from '@/components/ui/button';

interface MapLocation {
  lng: number;
  lat: number;
  type: 'pickup' | 'dropoff' | 'driver';
  label?: string;
  eta?: number; // ETA in minutes
  distance?: number; // Distance in km
  heading?: number; // Direction driver is facing (degrees)
}

interface RouteInfo {
  distance: number; // in km
  duration: number; // in minutes
  polyline?: string; // route polyline for storage
}

interface RideMapProps {
  pickupLocation?: { lng: number; lat: number } | null;
  dropoffLocation?: { lng: number; lat: number } | null;
  onLocationSelect?: (location: { lng: number; lat: number }, type: 'pickup' | 'dropoff') => void;
  onRouteCalculated?: (routeInfo: RouteInfo | null) => void;
  className?: string;
}

// Calculate distance between two points (Haversine formula)
const calculateDistance = (lng1: number, lat1: number, lng2: number, lat2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Simulated nearby drivers for demo with ETA and distance
const generateNearbyDrivers = (centerLng: number, centerLat: number): MapLocation[] => {
  const drivers: MapLocation[] = [];
  for (let i = 0; i < 5; i++) {
    const driverLng = centerLng + (Math.random() - 0.5) * 0.03;
    const driverLat = centerLat + (Math.random() - 0.5) * 0.03;
    const distance = calculateDistance(centerLng, centerLat, driverLng, driverLat);
    const eta = Math.ceil(distance * 3 + 1); // ~3 min per km + 1 min buffer
    
    drivers.push({
      lng: driverLng,
      lat: driverLat,
      type: 'driver',
      label: `Driver ${i + 1}`,
      eta,
      distance: Math.round(distance * 10) / 10,
      heading: Math.random() * 360,
    });
  }
  // Sort by ETA
  return drivers.sort((a, b) => (a.eta || 0) - (b.eta || 0));
};

const RideMap = ({ pickupLocation, dropoffLocation, onLocationSelect, onRouteCalculated, className = '' }: RideMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const mapInitialized = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const hasAnnouncedRoute = useRef(false);
  
  // Default center: Gwanda, Zimbabwe
  const defaultCenter = useRef({ lng: 29.0147, lat: -20.9389 });
  const [drivers, setDrivers] = useState<MapLocation[]>([]);

  // Voice announcement helper
  const announce = useCallback((text: string) => {
    if (voiceEnabled) {
      speak(text);
    }
  }, [voiceEnabled]);

  // Fetch Mapbox token from edge function on mount
  useEffect(() => {
    const fetchToken = async () => {
      // First try environment variable
      const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
      if (envToken) {
        setMapboxToken(envToken);
        return;
      }

      // Fallback to edge function
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setMapError('Mapbox token not available');
        }
      } catch (err) {
        console.error('Failed to fetch Mapbox token:', err);
        setMapError('Failed to load map configuration');
      }
    };

    fetchToken();
  }, []);

  // Initialize map once token is available
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;
    
    // Prevent re-initialization
    if (mapInitialized.current || map.current) return;
    
    mapInitialized.current = true;
    mapboxgl.accessToken = mapboxToken;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [defaultCenter.current.lng, defaultCenter.current.lat],
        zoom: 13,
        attributionControl: false,
        fadeDuration: 0,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      map.current.on('load', () => {
        setIsLoaded(true);
        setDrivers(generateNearbyDrivers(defaultCenter.current.lng, defaultCenter.current.lat));
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        if ((e.error as any)?.status === 401) {
          setMapError('Invalid Mapbox token');
        }
      });

    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapError('Failed to load map');
    }

    // Cleanup only on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        mapInitialized.current = false;
      }
    };
  }, [mapboxToken]);

  // Fetch route using HERE Maps via edge function
  const fetchHereRoute = async (pickup: { lng: number; lat: number }, dropoff: { lng: number; lat: number }) => {
    if (!map.current) return;

    try {
      console.log('Fetching route from HERE Maps...');
      const { data, error } = await supabase.functions.invoke('here-route', {
        body: {
          origin: { lat: pickup.lat, lng: pickup.lng },
          destination: { lat: dropoff.lat, lng: dropoff.lng },
        },
      });

      if (error) {
        console.error('HERE route error:', error);
        // Fallback to Mapbox if HERE fails
        return fetchMapboxRoute(pickup, dropoff);
      }

      if (data && data.polyline) {
        const distanceKm = data.distance / 1000;
        const durationMin = Math.round(data.duration / 60);

        // Notify parent of route info with polyline for storage
        onRouteCalculated?.({
          distance: Math.round(distanceKm * 10) / 10,
          duration: durationMin,
          polyline: data.polyline,
        });

        // Decode HERE flexible polyline and convert to GeoJSON
        const coordinates = decodeFlexiblePolyline(data.polyline);
        const routeGeoJSON = toGeoJSONLineString(coordinates);

        updateRouteLayer(routeGeoJSON);
        console.log('HERE Maps route displayed successfully');
      }
    } catch (error) {
      console.error('Error fetching HERE route:', error);
      // Fallback to Mapbox
      fetchMapboxRoute(pickup, dropoff);
    }
  };

  // Fallback: Fetch route using Mapbox Directions API
  const fetchMapboxRoute = async (pickup: { lng: number; lat: number }, dropoff: { lng: number; lat: number }) => {
    if (!map.current || !mapboxToken) return;

    try {
      console.log('Fetching route from Mapbox (fallback)...');
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?geometries=geojson&access_token=${mapboxToken}`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = route.distance / 1000;
        const durationMin = Math.round(route.duration / 60);

        onRouteCalculated?.({
          distance: Math.round(distanceKm * 10) / 10,
          duration: durationMin,
          polyline: JSON.stringify(route.geometry.coordinates),
        });

        const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
          type: 'Feature',
          properties: {},
          geometry: route.geometry,
        };

        updateRouteLayer(routeGeoJSON);
      }
    } catch (error) {
      console.error('Error fetching Mapbox route:', error);
    }
  };

  // Update route layer on map
  const updateRouteLayer = (routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString>) => {
    if (!map.current) return;

    if (map.current.getSource('route')) {
      (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData(routeGeoJSON);
    } else {
      map.current.addSource('route', {
        type: 'geojson',
        data: routeGeoJSON,
      });

      map.current.addLayer({
        id: 'route-outline',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#000000',
          'line-width': 8,
          'line-opacity': 0.3,
        },
      });

      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#F97316', // Orange accent color
          'line-width': 5,
        },
      });

      // Add directional arrows along the route
      map.current.addLayer({
        id: 'route-arrows',
        type: 'symbol',
        source: 'route',
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 100,
          'icon-image': 'triangle-11',
          'icon-size': 1.2,
          'icon-rotate': 90,
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        paint: {
          'icon-color': '#FFFFFF',
          'icon-opacity': 0.9,
        },
      });
    }
  };

  // Add driver distance lines to pickup
  const updateDriverLines = useCallback(() => {
    if (!map.current || !pickupLocation || drivers.length === 0) return;

    // Create GeoJSON for driver-to-pickup lines
    const driverLines: GeoJSON.Feature<GeoJSON.LineString>[] = drivers.map((driver, index) => ({
      type: 'Feature',
      properties: {
        driverId: index,
        eta: driver.eta,
        distance: driver.distance,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [driver.lng, driver.lat],
          [pickupLocation.lng, pickupLocation.lat],
        ],
      },
    }));

    const geoJsonData: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: 'FeatureCollection',
      features: driverLines,
    };

    if (map.current.getSource('driver-lines')) {
      (map.current.getSource('driver-lines') as mapboxgl.GeoJSONSource).setData(geoJsonData);
    } else {
      map.current.addSource('driver-lines', {
        type: 'geojson',
        data: geoJsonData,
      });

      // Dashed lines from drivers to pickup
      map.current.addLayer({
        id: 'driver-lines',
        type: 'line',
        source: 'driver-lines',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#10B981',
          'line-width': 2,
          'line-dasharray': [2, 4],
          'line-opacity': 0.6,
        },
      });
    }
  }, [pickupLocation, drivers]);

  // Update markers when locations change
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add pickup marker
    if (pickupLocation) {
      const pickupEl = createMarkerElement('pickup');
      const marker = new mapboxgl.Marker({ element: pickupEl })
        .setLngLat([pickupLocation.lng, pickupLocation.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Pickup Location'))
        .addTo(map.current);
      markersRef.current.push(marker);
    }

    // Add dropoff marker
    if (dropoffLocation) {
      const dropoffEl = createMarkerElement('dropoff');
      const marker = new mapboxgl.Marker({ element: dropoffEl })
        .setLngLat([dropoffLocation.lng, dropoffLocation.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Dropoff Location'))
        .addTo(map.current);
      markersRef.current.push(marker);
    }

    // Add driver markers with ETA labels
    drivers.forEach((driver, index) => {
      const driverEl = createMarkerElement('driver', driver.eta, driver.heading);
      const marker = new mapboxgl.Marker({ element: driverEl })
        .setLngLat([driver.lng, driver.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <strong>${driver.label}</strong><br/>
            <span style="color: #10B981;">● Available</span><br/>
            <div style="margin-top: 4px; font-size: 12px;">
              <strong>${driver.eta} min</strong> away<br/>
              <span style="color: #666;">${driver.distance} km</span>
            </div>
          </div>
        `))
        .addTo(map.current!);
      markersRef.current.push(marker);
    });

    // Update driver lines to pickup
    if (pickupLocation && drivers.length > 0) {
      updateDriverLines();
    }

    // Fetch route and fit bounds when both locations are set
    if (pickupLocation && dropoffLocation) {
      // Use HERE Maps for routing (with Mapbox fallback)
      fetchHereRoute(pickupLocation, dropoffLocation);
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([pickupLocation.lng, pickupLocation.lat]);
      bounds.extend([dropoffLocation.lng, dropoffLocation.lat]);
      map.current.fitBounds(bounds, { padding: 80 });

      // Voice announcement for route
      if (!hasAnnouncedRoute.current) {
        hasAnnouncedRoute.current = true;
      }
    } else if (pickupLocation) {
      map.current.flyTo({ center: [pickupLocation.lng, pickupLocation.lat], zoom: 14 });
      // Clear route if only pickup is set
      if (map.current.getSource('route')) {
        (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] },
        });
      }
      onRouteCalculated?.(null as any);
      hasAnnouncedRoute.current = false;

      // Announce pickup set
      if (drivers.length > 0) {
        const nearestDriver = drivers[0];
        announce(`Pickup location set. Nearest driver is ${nearestDriver.eta} minutes away.`);
      }
    }
  }, [pickupLocation, dropoffLocation, drivers, isLoaded, updateDriverLines, announce]);

  // Voice announcement when route is calculated
  useEffect(() => {
    if (pickupLocation && dropoffLocation && hasAnnouncedRoute.current) {
      // This will be called after route info is available
    }
  }, [pickupLocation, dropoffLocation]);

  // Show error if no token configured or loading
  if (!mapboxToken && !mapError) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full h-full rounded-2xl overflow-hidden bg-koloi-gray-100 flex flex-col items-center justify-center p-8">
          <div className="bg-card rounded-xl shadow-koloi-md p-6 max-w-md w-full text-center">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapIcon className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Map Loading...</h3>
            <p className="text-sm text-muted-foreground">
              Please wait while the map initializes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-2xl overflow-hidden" />
      
      {/* Voice toggle button */}
      {isLoaded && (
        <Button
          variant="outline"
          size="icon"
          className="absolute top-4 left-4 bg-card/95 backdrop-blur-sm shadow-koloi-md"
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          title={voiceEnabled ? 'Disable voice navigation' : 'Enable voice navigation'}
        >
          {voiceEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      )}

      {/* Map legend */}
      {isLoaded && (
        <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-koloi-md text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-foreground border-2 border-white flex items-center justify-center relative">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <span>Pickup</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 bg-accent rounded-sm rotate-45 flex items-center justify-center">
              <svg className="-rotate-45" width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                <path d="M12 5v14M19 12l-7 7-7-7"/>
              </svg>
            </div>
            <span>Destination</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-1 bg-accent rounded-full" />
            <span className="flex items-center gap-1">Route <span className="text-muted-foreground text-xs">→</span></span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 border-t-2 border-dashed border-emerald-500" />
            <span>Driver distance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                <path d="M12 2L19 21L12 17L5 21L12 2Z"/>
              </svg>
            </div>
            <span>Drivers <span className="text-muted-foreground text-xs">(ETA)</span></span>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {!isLoaded && !mapError && (
        <div className="absolute inset-0 bg-koloi-gray-100 rounded-2xl flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading map...</div>
        </div>
      )}

      {/* Error state */}
      {mapError && (
        <div className="absolute inset-0 bg-koloi-gray-100 rounded-2xl flex items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive mb-2">{mapError}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to create custom marker elements
const createMarkerElement = (type: 'pickup' | 'dropoff' | 'driver', eta?: number, heading?: number): HTMLDivElement => {
  const el = document.createElement('div');
  el.className = 'custom-marker';
  
  if (type === 'pickup') {
    // Pickup: Circle with pulsing animation
    el.innerHTML = `
      <div style="position: relative;">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 48px;
          height: 48px;
          background: rgba(18, 18, 18, 0.2);
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        "></div>
        <div style="
          position: relative;
          width: 32px;
          height: 32px;
          background: #121212;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4"/>
          </svg>
        </div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
        }
      </style>
    `;
  } else if (type === 'dropoff') {
    // Dropoff: Pin with arrow pointing down
    el.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
      ">
        <div style="
          width: 32px;
          height: 32px;
          background: #F97316;
          border: 3px solid white;
          border-radius: 6px 6px 6px 0;
          transform: rotate(-45deg);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" style="transform: rotate(45deg);">
            <path d="M12 5v14M19 12l-7 7-7-7"/>
          </svg>
        </div>
      </div>
    `;
  } else {
    // Driver: Car with ETA badge and direction arrow
    const rotation = heading ? `transform: rotate(${heading}deg);` : '';
    el.innerHTML = `
      <div style="position: relative; cursor: pointer;">
        <div style="
          width: 40px;
          height: 40px;
          background: #10B981;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          ${rotation}
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M12 2L19 21L12 17L5 21L12 2Z"/>
          </svg>
        </div>
        ${eta ? `
          <div style="
            position: absolute;
            top: -8px;
            right: -8px;
            background: #121212;
            color: white;
            font-size: 10px;
            font-weight: bold;
            padding: 2px 5px;
            border-radius: 8px;
            border: 2px solid white;
            white-space: nowrap;
          ">${eta}m</div>
        ` : ''}
      </div>
    `;
  }
  
  return el;
};

export default RideMap;
