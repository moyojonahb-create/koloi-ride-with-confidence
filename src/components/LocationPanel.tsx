import { useState, useEffect } from 'react';
import { Navigation, MapPin, Crosshair, AlertCircle, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLandmarks, formatDistance, type Landmark } from '@/hooks/useLandmarks';
import { cn } from '@/lib/utils';

interface SelectedLocation {
  name: string;
  lat: number;
  lng: number;
}

interface LocationPanelProps {
  pickupLocation: SelectedLocation | null;
  dropoffLocation: SelectedLocation | null;
  onPickupSelect: (location: SelectedLocation) => void;
  onDropoffSelect: (location: SelectedLocation) => void;
  className?: string;
}

interface GPSState {
  status: 'idle' | 'loading' | 'success' | 'denied' | 'unavailable';
  coords: { lat: number; lng: number } | null;
  accuracy: number | null;
  error: string | null;
}

const LocationPanel = ({
  pickupLocation,
  dropoffLocation,
  onPickupSelect,
  onDropoffSelect,
  className = '',
}: LocationPanelProps) => {
  const [gpsState, setGpsState] = useState<GPSState>({
    status: 'idle',
    coords: null,
    accuracy: null,
    error: null,
  });
  const [activeSelector, setActiveSelector] = useState<'pickup' | 'dropoff' | null>('pickup');

  const { landmarks, loading: landmarksLoading, getNearbyLandmarks } = useLandmarks({
    userLocation: gpsState.coords,
    limit: 20,
  });

  // Get nearby landmarks sorted by distance
  const nearbyLandmarks = gpsState.coords 
    ? getNearbyLandmarks(20) 
    : landmarks.slice(0, 12);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGpsState({
        status: 'unavailable',
        coords: null,
        accuracy: null,
        error: 'Geolocation is not supported by your browser',
      });
      return;
    }

    setGpsState(prev => ({ ...prev, status: 'loading', error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setGpsState({
          status: 'success',
          coords,
          accuracy: Math.round(position.coords.accuracy),
          error: null,
        });

        // Auto-set as pickup if none selected
        if (!pickupLocation) {
          onPickupSelect({
            name: 'My Current Location',
            lat: coords.lat,
            lng: coords.lng,
          });
        }
      },
      (error) => {
        let errorMessage = 'Unable to get your location';
        let status: GPSState['status'] = 'unavailable';
        
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location access denied. Please select a landmark manually.';
          status = 'denied';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Location unavailable. Please select a landmark.';
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'Location request timed out. Try again or select a landmark.';
        }

        setGpsState({
          status,
          coords: null,
          accuracy: null,
          error: errorMessage,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleLandmarkSelect = (landmark: Landmark) => {
    const location: SelectedLocation = {
      name: landmark.name,
      lat: landmark.latitude,
      lng: landmark.longitude,
    };

    if (activeSelector === 'pickup') {
      onPickupSelect(location);
      setActiveSelector('dropoff');
    } else {
      onDropoffSelect(location);
      setActiveSelector(null);
    }
  };

  // Distance calculation helper
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Estimated distance between pickup and dropoff
  const tripDistance = pickupLocation && dropoffLocation
    ? calculateDistance(
        pickupLocation.lat,
        pickupLocation.lng,
        dropoffLocation.lat,
        dropoffLocation.lng
      )
    : null;

  return (
    <div className={cn("bg-card rounded-xl border border-border overflow-hidden", className)}>
      {/* GPS Section */}
      <div className="p-4 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-accent" />
            Your Location
          </h3>
          <Button
            onClick={handleUseMyLocation}
            variant="outline"
            size="sm"
            disabled={gpsState.status === 'loading'}
            className="shrink-0"
          >
            {gpsState.status === 'loading' ? (
              <>
                <span className="animate-pulse">Locating...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 mr-1.5" />
                Use my live location
              </>
            )}
          </Button>
        </div>

        {/* GPS Status */}
        {gpsState.status === 'success' && gpsState.coords && (
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-muted-foreground">
              {gpsState.coords.lat.toFixed(5)}, {gpsState.coords.lng.toFixed(5)}
            </span>
            {gpsState.accuracy && (
              <span className="text-xs text-muted-foreground">
                (±{gpsState.accuracy}m)
              </span>
            )}
          </div>
        )}

        {(gpsState.status === 'denied' || gpsState.status === 'unavailable') && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{gpsState.error}</span>
          </div>
        )}

        {gpsState.status === 'idle' && (
          <p className="text-sm text-muted-foreground">
            Tap "Use my live location" for GPS or select a landmark below.
          </p>
        )}
      </div>

      {/* Selected Locations Display */}
      <div className="p-4 border-b border-border space-y-3">
        {/* Pickup */}
        <button
          onClick={() => setActiveSelector('pickup')}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
            activeSelector === 'pickup'
              ? "border-accent bg-accent/5"
              : "border-border hover:bg-secondary/50"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            pickupLocation ? "bg-emerald-100" : "bg-secondary"
          )}>
            <MapPin className={cn(
              "w-5 h-5",
              pickupLocation ? "text-emerald-600" : "text-muted-foreground"
            )} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pickup</p>
            <p className={cn(
              "font-medium truncate",
              pickupLocation ? "text-foreground" : "text-muted-foreground"
            )}>
              {pickupLocation?.name || 'Select pickup location'}
            </p>
          </div>
          {activeSelector === 'pickup' && (
            <span className="text-xs text-accent font-medium shrink-0">Selecting</span>
          )}
        </button>

        {/* Dropoff */}
        <button
          onClick={() => setActiveSelector('dropoff')}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
            activeSelector === 'dropoff'
              ? "border-accent bg-accent/5"
              : "border-border hover:bg-secondary/50"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            dropoffLocation ? "bg-blue-100" : "bg-secondary"
          )}>
            <Navigation className={cn(
              "w-5 h-5",
              dropoffLocation ? "text-blue-600" : "text-muted-foreground"
            )} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Dropoff</p>
            <p className={cn(
              "font-medium truncate",
              dropoffLocation ? "text-foreground" : "text-muted-foreground"
            )}>
              {dropoffLocation?.name || 'Select destination'}
            </p>
          </div>
          {activeSelector === 'dropoff' && (
            <span className="text-xs text-accent font-medium shrink-0">Selecting</span>
          )}
        </button>

        {/* Trip Summary */}
        {tripDistance !== null && (
          <div className="flex items-center justify-center gap-2 pt-2 text-sm text-muted-foreground">
            <ArrowRight className="w-4 h-4" />
            <span>Estimated distance: <strong className="text-foreground">{tripDistance.toFixed(1)} km</strong></span>
          </div>
        )}
      </div>

      {/* Landmarks Selector */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">
          {activeSelector === 'pickup' ? 'Select Pickup Location' : 'Select Destination'}
        </h4>

        {landmarksLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-secondary animate-pulse rounded-lg" />
            ))}
          </div>
        ) : nearbyLandmarks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No landmarks available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto">
            {nearbyLandmarks.map((landmark) => {
              const isSelected = 
                (activeSelector === 'pickup' && pickupLocation?.name === landmark.name) ||
                (activeSelector === 'dropoff' && dropoffLocation?.name === landmark.name);

              return (
                <button
                  key={landmark.id}
                  onClick={() => handleLandmarkSelect(landmark)}
                  disabled={!activeSelector}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    isSelected
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-accent/50 hover:bg-secondary/50",
                    !activeSelector && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <p className="font-medium text-sm text-foreground truncate">
                    {landmark.name}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground capitalize">
                      {landmark.category}
                    </span>
                    {landmark.distance !== undefined && (
                      <span className="text-xs text-accent font-medium">
                        {formatDistance(landmark.distance)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationPanel;
