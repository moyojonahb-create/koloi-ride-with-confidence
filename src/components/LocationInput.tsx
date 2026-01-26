import { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Clock, Building2, Landmark, Hospital, GraduationCap, Fuel, Store, Banknote, Loader2 } from 'lucide-react';
import { useLandmarks, formatDistance, getCategoryIcon, type Landmark as LandmarkType } from '@/hooks/useLandmarks';

interface LocationInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: { name: string; lng: number; lat: number }) => void;
  onUseMyLocation?: () => void;
  showMyLocation?: boolean;
  markerType: 'pickup' | 'dropoff';
  userLocation?: { lat: number; lng: number } | null;
}

const LocationInput = ({
  placeholder,
  value,
  onChange,
  onLocationSelect,
  onUseMyLocation,
  showMyLocation = false,
  markerType,
  userLocation,
}: LocationInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { landmarks, loading, getNearbyLandmarks, findNearestLandmark } = useLandmarks({
    userLocation,
    searchQuery: value,
    limit: 8,
  });

  // Get nearby landmarks for when input is empty
  const nearbyLandmarks = userLocation ? getNearbyLandmarks(10).slice(0, 6) : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'landmark':
        return <Landmark className="w-4 h-4 text-accent" />;
      case 'hospital':
        return <Hospital className="w-4 h-4 text-red-500" />;
      case 'school':
        return <GraduationCap className="w-4 h-4 text-blue-500" />;
      case 'fuel':
        return <Fuel className="w-4 h-4 text-amber-500" />;
      case 'market':
        return <Store className="w-4 h-4 text-green-500" />;
      case 'bank':
        return <Banknote className="w-4 h-4 text-emerald-500" />;
      case 'building':
        return <Building2 className="w-4 h-4 text-muted-foreground" />;
      default:
        return <MapPin className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleLandmarkSelect = (landmark: LandmarkType) => {
    onLocationSelect({
      name: landmark.name,
      lng: landmark.longitude,
      lat: landmark.latitude,
    });
    setIsFocused(false);
  };

  // Determine which landmarks to show
  const displayLandmarks = value.trim() ? landmarks : (nearbyLandmarks.length > 0 ? nearbyLandmarks : landmarks.slice(0, 6));
  const sectionTitle = value.trim() 
    ? 'Search Results' 
    : (nearbyLandmarks.length > 0 ? 'Nearby Landmarks' : 'Popular Locations');

  return (
    <div className="relative">
      {/* Marker indicator */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2">
        {markerType === 'pickup' ? (
          <MapPin className="w-5 h-5 text-muted-foreground" />
        ) : (
          <Navigation className="w-5 h-5 text-primary" />
        )}
      </div>
      
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        className="koloi-input pl-12 pr-12"
      />
      
      {/* My Location button for pickup */}
      {showMyLocation && (
        <button
          onClick={onUseMyLocation}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-koloi-gray-200 rounded-lg transition-colors group"
          title="Use my location"
        >
          <Navigation className="w-5 h-5 text-accent group-hover:text-accent/80" />
        </button>
      )}

      {/* Suggestions Dropdown */}
      {isFocused && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl shadow-koloi-lg border border-border overflow-hidden z-30 animate-fade-in max-h-[360px] overflow-y-auto"
        >
          {/* My Location option */}
          {showMyLocation && (
            <button
              onClick={() => {
                onUseMyLocation?.();
                setIsFocused(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-accent/10 transition-colors flex items-center gap-3 border-b border-border"
            >
              <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                <Navigation className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">Use my live location</p>
                <p className="text-sm text-muted-foreground">GPS location for accurate pickup</p>
              </div>
            </button>
          )}

          {/* Section header */}
          <div className="px-4 py-2 bg-secondary/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              {nearbyLandmarks.length > 0 && !value.trim() ? (
                <MapPin className="w-3 h-3" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
              {sectionTitle}
            </p>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : displayLandmarks.length > 0 ? (
            displayLandmarks.map((landmark) => (
              <button
                key={landmark.id}
                onClick={() => handleLandmarkSelect(landmark)}
                className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center shrink-0">
                  {getIcon(getCategoryIcon(landmark.category))}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">{landmark.name}</p>
                    <span className="text-xs px-1.5 py-0.5 bg-secondary rounded text-muted-foreground shrink-0">
                      {landmark.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {landmark.description && (
                      <span className="truncate">{landmark.description}</span>
                    )}
                    {landmark.distance !== undefined && (
                      <span className="shrink-0 text-accent font-medium">
                        {formatDistance(landmark.distance)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-6 text-center text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No landmarks found</p>
              <p className="text-xs mt-1">Try searching for a different place</p>
            </div>
          )}

          {/* Nearest landmark suggestion for destination */}
          {markerType === 'dropoff' && value.trim() && displayLandmarks.length === 0 && userLocation && (
            (() => {
              const nearest = findNearestLandmark(userLocation.lat, userLocation.lng);
              if (!nearest) return null;
              return (
                <div className="border-t border-border">
                  <div className="px-4 py-2 bg-accent/10">
                    <p className="text-xs font-medium text-accent uppercase tracking-wide">
                      Nearest public place
                    </p>
                  </div>
                  <button
                    onClick={() => handleLandmarkSelect(nearest)}
                    className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center shrink-0">
                      {getIcon(getCategoryIcon(nearest.category))}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{nearest.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {nearest.distance !== undefined && formatDistance(nearest.distance)} away
                      </p>
                    </div>
                  </button>
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
};

export default LocationInput;
