import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AlertCircle, ExternalLink, MapIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { decodeFlexiblePolyline, toGeoJSONLineString } from '@/lib/flexPolyline';

interface MapLocation {
  lng: number;
  lat: number;
  type: 'pickup' | 'dropoff' | 'driver';
  label?: string;
}

interface RouteInfo {
  distance: number; // in km
  duration: number; // in minutes
  fare: number; // in Rands
}

interface RideMapProps {
  pickupLocation?: { lng: number; lat: number } | null;
  dropoffLocation?: { lng: number; lat: number } | null;
  onLocationSelect?: (location: { lng: number; lat: number }, type: 'pickup' | 'dropoff') => void;
  onRouteCalculated?: (routeInfo: RouteInfo) => void;
  className?: string;
}

// Fare calculation constants
const BASE_FARE = 50; // Starting price in Rands
const PRICE_PER_KM = 4; // Rands per km (calibrated: ~12km Gwanda to Spitzkop = 50 Rands total)
const MIN_FARE = 50; // Minimum fare

// Calculate fare based on distance
const calculateFare = (distanceKm: number): number => {
  const fare = BASE_FARE + (distanceKm * PRICE_PER_KM);
  return Math.max(MIN_FARE, Math.round(fare / 5) * 5); // Round to nearest 5
};

// Simulated nearby drivers for demo
const generateNearbyDrivers = (centerLng: number, centerLat: number): MapLocation[] => {
  const drivers: MapLocation[] = [];
  for (let i = 0; i < 5; i++) {
    drivers.push({
      lng: centerLng + (Math.random() - 0.5) * 0.03,
      lat: centerLat + (Math.random() - 0.5) * 0.03,
      type: 'driver',
      label: `Driver ${i + 1}`,
    });
  }
  return drivers;
};

// Store token in localStorage for persistence
const getStoredToken = () => localStorage.getItem('mapbox_token') || '';
const setStoredToken = (token: string) => localStorage.setItem('mapbox_token', token);

const RideMap = ({ pickupLocation, dropoffLocation, onLocationSelect, onRouteCalculated, className = '' }: RideMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState(getStoredToken());
  const [tokenInput, setTokenInput] = useState(getStoredToken());
  
  // Default center: Gwanda, Zimbabwe (near Beit Bridge and Blanket Mine)
  const defaultCenter = { lng: 29.0147, lat: -20.9389 };
  const [center] = useState(defaultCenter);
  const [drivers, setDrivers] = useState<MapLocation[]>([]);

  const handleTokenSubmit = () => {
    if (tokenInput.startsWith('pk.')) {
      setStoredToken(tokenInput);
      setMapboxToken(tokenInput);
      setMapError(null);
    } else {
      setMapError('Please enter a valid Mapbox public token (starts with pk.)');
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;
    
    // Clean up existing map
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    mapboxgl.accessToken = mapboxToken;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [center.lng, center.lat],
        zoom: 13,
        attributionControl: false,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      map.current.on('load', () => {
        setIsLoaded(true);
        setMapError(null);
        // Generate simulated nearby drivers
        setDrivers(generateNearbyDrivers(center.lng, center.lat));
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        const errorStatus = (e.error as any)?.status;
        if (errorStatus === 401) {
          setMapError('Invalid Mapbox token. Please enter a valid public token.');
          setMapboxToken('');
        }
      });

      // Handle map clicks for location selection
      map.current.on('click', (e) => {
        if (onLocationSelect) {
          // Toggle between pickup and dropoff based on what's already set
          const type = !pickupLocation ? 'pickup' : 'dropoff';
          onLocationSelect({ lng: e.lngLat.lng, lat: e.lngLat.lat }, type);
        }
      });
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapError('Failed to load map. Please check your Mapbox token.');
    }

    return () => {
      map.current?.remove();
      map.current = null;
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
        const fare = calculateFare(distanceKm);

        // Notify parent of route info
        onRouteCalculated?.({
          distance: Math.round(distanceKm * 10) / 10,
          duration: durationMin,
          fare: fare,
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
        const fare = calculateFare(distanceKm);

        onRouteCalculated?.({
          distance: Math.round(distanceKm * 10) / 10,
          duration: durationMin,
          fare: fare,
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
    }
  };

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

    // Add driver markers
    drivers.forEach((driver) => {
      const driverEl = createMarkerElement('driver');
      const marker = new mapboxgl.Marker({ element: driverEl })
        .setLngLat([driver.lng, driver.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 4px;">
            <strong>${driver.label}</strong><br/>
            <span style="color: #F97316;">● Available</span><br/>
            <small>2 min away</small>
          </div>
        `))
        .addTo(map.current!);
      markersRef.current.push(marker);
    });

    // Fetch route and fit bounds when both locations are set
    if (pickupLocation && dropoffLocation) {
      // Use HERE Maps for routing (with Mapbox fallback)
      fetchHereRoute(pickupLocation, dropoffLocation);
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([pickupLocation.lng, pickupLocation.lat]);
      bounds.extend([dropoffLocation.lng, dropoffLocation.lat]);
      map.current.fitBounds(bounds, { padding: 80 });
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
    }
  }, [pickupLocation, dropoffLocation, drivers, isLoaded]);

  // Show token input if no token
  if (!mapboxToken) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full h-full rounded-2xl overflow-hidden bg-koloi-gray-100 flex flex-col items-center justify-center p-8">
          <div className="bg-card rounded-xl shadow-koloi-md p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Mapbox Token Required</h3>
                <p className="text-sm text-muted-foreground">Enter your public access token</p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Get a free token from{' '}
              <a 
                href="https://account.mapbox.com/access-tokens/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-accent hover:underline inline-flex items-center gap-1"
              >
                Mapbox <ExternalLink className="w-3 h-3" />
              </a>
            </p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="pk.eyJ1Ijoi..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="koloi-input text-sm"
              />
              {mapError && (
                <p className="text-destructive text-sm">{mapError}</p>
              )}
              <button 
                onClick={handleTokenSubmit}
                className="koloi-btn-primary w-full h-12"
              >
                Load Map
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-2xl overflow-hidden" />
      
      {/* Map legend */}
      {isLoaded && (
        <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-koloi-md text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-foreground" />
            <span>Pickup</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-foreground" />
            <span>Dropoff</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span>Drivers nearby</span>
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
            <p className="text-destructive mb-2">{mapError}</p>
            <button 
              onClick={() => {
                setMapboxToken('');
                setTokenInput('');
              }}
              className="text-sm text-accent hover:underline"
            >
              Enter a new token
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to create custom marker elements
const createMarkerElement = (type: 'pickup' | 'dropoff' | 'driver'): HTMLDivElement => {
  const el = document.createElement('div');
  el.className = 'custom-marker';
  
  if (type === 'pickup') {
    el.innerHTML = `
      <div style="
        width: 24px;
        height: 24px;
        background: #121212;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      "></div>
    `;
  } else if (type === 'dropoff') {
    el.innerHTML = `
      <div style="
        width: 24px;
        height: 24px;
        background: #121212;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      "></div>
    `;
  } else {
    el.innerHTML = `
      <div style="
        width: 36px;
        height: 36px;
        background: #10B981;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h14a2 2 0 012 2v6a2 2 0 01-2 2M5 17l-1 2h16l-1-2"/>
          <circle cx="7.5" cy="17" r="2"/>
          <circle cx="16.5" cy="17" r="2"/>
        </svg>
      </div>
    `;
  }
  
  return el;
};

export default RideMap;
