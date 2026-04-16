import { useState, useCallback, useEffect, useRef } from 'react';
import { MapPin, Navigation, Crosshair, Loader2, Search, X, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useLandmarks, type Landmark, formatDistance } from '@/hooks/useLandmarks';
import { useGooglePlacesAutocomplete, type PlaceSuggestion } from '@/hooks/useGooglePlacesAutocomplete';
import QuickPickChips from './QuickPickChips';
import ProximityFilter from './ProximityFilter';

interface SelectedLocation {
  name: string;
  lat: number;
  lng: number;
}

interface RideInputsProps {
  pickupLocation: SelectedLocation | null;
  dropoffLocation: SelectedLocation | null;
  onPickupSelect: (location: SelectedLocation) => void;
  onDropoffSelect: (location: SelectedLocation) => void;
  onUseMyLocation: () => void;
  isGettingLocation?: boolean;
  gpsError?: string | null;
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
}

export default function RideInputs({
  pickupLocation,
  dropoffLocation,
  onPickupSelect,
  onDropoffSelect,
  onUseMyLocation,
  isGettingLocation = false,
  gpsError,
  userLocation,
  className,
}: RideInputsProps) {
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff' | null>('pickup');
  const [searchQuery, setSearchQuery] = useState('');
  const [proximityRadius, setProximityRadius] = useState<number | null>(null);

  const { landmarks, loading: landmarksLoading, findNearestLandmark } = useLandmarks({
    searchQuery,
    limit: 15,
    userLocation,
    radiusKm: proximityRadius,
  });

  // Google Places autocomplete for broader street/place search
  const { suggestions: placeSuggestions, loading: placesLoading, search: searchPlaces, getPlaceDetails, clear: clearPlaces } = useGooglePlacesAutocomplete();

  // Trigger Google Places search when query changes
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      searchPlaces(searchQuery);
    } else {
      clearPlaces();
    }
  }, [searchQuery, searchPlaces, clearPlaces]);

  const handlePlaceSuggestionSelect = async (suggestion: PlaceSuggestion) => {
    // Use coordinates from suggestion directly if available
    if (suggestion.lat && suggestion.lng) {
      const location: SelectedLocation = {
        name: suggestion.name,
        lat: suggestion.lat,
        lng: suggestion.lng,
      };
      if (activeField === 'pickup') {
        onPickupSelect(location);
        setActiveField('dropoff');
      } else {
        onDropoffSelect(location);
        setActiveField(null);
      }
      setSearchQuery('');
      clearPlaces();
      return;
    }

    const details = await getPlaceDetails(suggestion.placeId, suggestion);
    if (!details) return;
    
    const location: SelectedLocation = {
      name: suggestion.name || details.name,
      lat: details.lat,
      lng: details.lng,
    };

    if (activeField === 'pickup') {
      onPickupSelect(location);
      setActiveField('dropoff');
    } else {
      onDropoffSelect(location);
      setActiveField(null);
    }
    setSearchQuery('');
    clearPlaces();
  };

  const handleLandmarkSelect = (landmark: Landmark) => {
    const location: SelectedLocation = {
      name: landmark.name,
      lat: landmark.latitude,
      lng: landmark.longitude,
    };

    if (activeField === 'pickup') {
      onPickupSelect(location);
      setActiveField('dropoff');
    } else {
      onDropoffSelect(location);
      setActiveField(null);
    }
    setSearchQuery('');
  };

  const handleQuickPickSelect = (pick: { name: string; lat: number; lng: number }) => {
    const location: SelectedLocation = {
      name: pick.name,
      lat: pick.lat,
      lng: pick.lng,
    };

    if (activeField === 'pickup') {
      onPickupSelect(location);
      setActiveField('dropoff');
    } else if (activeField === 'dropoff') {
      onDropoffSelect(location);
      setActiveField(null);
    }
  };

  const clearLocation = (field: 'pickup' | 'dropoff') => {
    if (field === 'pickup') {
      onPickupSelect(null);
    } else {
      onDropoffSelect(null);
    }
    setActiveField(field);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Location Inputs - Compact Card Style */}
      <div className="bg-pickme-gray-100 rounded-2xl p-1 space-y-1">
        {/* Pickup Input */}
        <button
          onClick={() => setActiveField('pickup')}
          className={cn(
            'w-full flex items-center gap-3 p-3.5 rounded-xl transition-all text-left',
            activeField === 'pickup'
              ? 'bg-background shadow-pickme-sm'
              : 'hover:bg-pickme-gray-200'
          )}
        >
          <div className={cn(
            'w-4 h-4 rounded-full shrink-0 shadow-sm',
            pickupLocation ? 'bg-accent' : 'bg-pickme-gray-400'
          )} />
          <div className="min-w-0 flex-1">
            <p className={cn(
              'font-medium truncate',
              pickupLocation ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {pickupLocation?.name || 'Where from?'}
            </p>
          </div>
          {pickupLocation && (
            <button
              onClick={(e) => { e.stopPropagation(); clearLocation('pickup'); }}
              className="p-1.5 hover:bg-pickme-gray-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </button>

        {/* Divider line */}
        <div className="flex items-center px-3">
          <div className="w-4 flex justify-center">
            <div className="w-0.5 h-4 bg-pickme-gray-300" />
          </div>
          <div className="flex-1 h-px bg-pickme-gray-300 ml-3" />
        </div>

        {/* Dropoff Input */}
        <button
          onClick={() => setActiveField('dropoff')}
          className={cn(
            'w-full flex items-center gap-3 p-3.5 rounded-xl transition-all text-left',
            activeField === 'dropoff'
              ? 'bg-background shadow-pickme-sm'
              : 'hover:bg-pickme-gray-200'
          )}
        >
          <div className={cn(
            'w-4 h-4 rounded-full shrink-0 shadow-sm',
            dropoffLocation ? 'bg-primary' : 'bg-pickme-gray-400'
          )} />
          <div className="min-w-0 flex-1">
            <p className={cn(
              'font-medium truncate',
              dropoffLocation ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {dropoffLocation?.name || 'Where to?'}
            </p>
          </div>
          {dropoffLocation && (
            <button
              onClick={(e) => { e.stopPropagation(); clearLocation('dropoff'); }}
              className="p-1.5 hover:bg-pickme-gray-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </button>
      </div>

      {/* GPS Button - Only when pickup is active */}
      {activeField === 'pickup' && (
        <Button
          onClick={onUseMyLocation}
          variant="outline"
          size="lg"
          disabled={isGettingLocation}
          className="w-full justify-start gap-3 rounded-2xl border-dashed"
        >
          {isGettingLocation ? (
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
          ) : (
            <Crosshair className="w-5 h-5 text-accent" />
          )}
          <span className="font-medium">Use my current location</span>
        </Button>
      )}

      {gpsError && (
        <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl">{gpsError}</p>
      )}

      {/* Quick Picks */}
      {activeField && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Quick picks
          </p>
          <QuickPickChips
            onSelect={handleQuickPickSelect}
            selectedName={activeField === 'pickup' ? pickupLocation?.name : dropoffLocation?.name}
          />
        </div>
      )}

      {/* Proximity Filter - Only when we have user location */}
      {activeField && userLocation && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Distance
          </p>
          <ProximityFilter
            selected={proximityRadius}
            onSelect={setProximityRadius}
          />
        </div>
      )}

      {/* Search Input */}
      {activeField && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeField === 'pickup' ? 'pickup' : 'destination'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 text-base bg-pickme-gray-100 border-0 rounded-2xl"
          />
        </div>
      )}

      {/* Search Results */}
      {activeField && (searchQuery.trim() || proximityRadius !== null) && (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {/* Loading state */}
          {landmarksLoading && placesLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Landmark results */}
              {landmarks.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">📍 Landmarks</p>
                  {landmarks.map((landmark) => (
                    <button
                      key={landmark.id}
                      onClick={() => handleLandmarkSelect(landmark)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-pickme-gray-100 hover:bg-pickme-gray-200 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center shadow-sm">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{landmark.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground capitalize">{landmark.category}</p>
                          {landmark.distance !== undefined && userLocation && (
                            <span className="text-xs text-accent font-medium">
                              {formatDistance(landmark.distance)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* Google Places results */}
              {searchQuery.trim().length >= 2 && placeSuggestions.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mt-2">🌍 Streets & Places</p>
                  {placeSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.placeId}
                      onClick={() => handlePlaceSuggestionSelect(suggestion)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-pickme-gray-100 hover:bg-pickme-gray-200 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center shadow-sm">
                        <Globe className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{suggestion.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{suggestion.description}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* No results */}
              {landmarks.length === 0 && placeSuggestions.length === 0 && !placesLoading && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  {searchQuery.trim()
                    ? `No results for "${searchQuery}"`
                    : proximityRadius
                      ? `No places within ${proximityRadius}km`
                      : 'No places found'}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
