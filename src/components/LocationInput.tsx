import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Clock, Loader2, Crosshair, ChevronDown } from 'lucide-react';
import { useLandmarks, formatDistance, getCategoryIcon, type Landmark as LandmarkType } from '@/hooks/useLandmarks';
import { LandmarkChips } from './LandmarkChips';
import { cn } from '@/lib/utils';

interface LocationInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: { name: string; lng: number; lat: number }) => void;
  onUseMyLocation?: () => void;
  showMyLocation?: boolean;
  markerType: 'pickup' | 'dropoff';
  userLocation?: { lat: number; lng: number } | null;
  gpsLoading?: boolean;
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
  gpsLoading = false,
}: LocationInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { landmarks, loading, getNearbyLandmarks, findNearestLandmark, allLandmarks } = useLandmarks({
    userLocation,
    searchQuery: value,
    limit: 10,
  });

  // Get nearby landmarks for chips when input is empty
  const nearbyLandmarks = userLocation ? getNearbyLandmarks(10).slice(0, 6) : allLandmarks.slice(0, 6);

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

  const handleLandmarkSelect = useCallback((landmark: LandmarkType) => {
    onLocationSelect({
      name: landmark.name,
      lng: landmark.longitude,
      lat: landmark.latitude,
    });
    setIsFocused(false);
    onChange('');
  }, [onLocationSelect, onChange]);

  const handleUseMyLocationClick = useCallback(() => {
    onUseMyLocation?.();
    setIsFocused(false);
  }, [onUseMyLocation]);

  // Get "Near X" suggestion when no exact match
  const nearestSuggestion = useCallback(() => {
    if (!userLocation || value.trim() === '' || landmarks.length > 0) return null;
    
    const nearest = findNearestLandmark(userLocation.lat, userLocation.lng);
    if (nearest && nearest.distance && nearest.distance < 2) {
      return nearest;
    }
    return null;
  }, [userLocation, value, landmarks, findNearestLandmark]);

  const nearest = nearestSuggestion();

  // Display landmarks based on context
  const displayLandmarks = value.trim() ? landmarks : nearbyLandmarks;
  const sectionTitle = value.trim() 
    ? `Results for "${value}"` 
    : (nearbyLandmarks.length > 0 && userLocation ? 'Nearby' : 'Popular');

  return (
    <div className="space-y-2">
      {/* Primary GPS button for pickup */}
      {showMyLocation && markerType === 'pickup' && (
        <button
          onClick={handleUseMyLocationClick}
          disabled={gpsLoading}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-all",
            "hover:border-accent hover:bg-accent/5",
            gpsLoading ? "border-accent bg-accent/5" : "border-border"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            gpsLoading ? "bg-accent/20" : "bg-accent/10"
          )}>
            {gpsLoading ? (
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
            ) : (
              <Crosshair className="w-5 h-5 text-accent" />
            )}
          </div>
          <div className="text-left">
            <p className="font-medium text-foreground">
              {gpsLoading ? 'Getting location...' : 'Use my live location'}
            </p>
            <p className="text-sm text-muted-foreground">
              GPS-based pickup for accuracy
            </p>
          </div>
        </button>
      )}

      {/* Landmark Chips - Quick Selection */}
      {showChips && !value.trim() && markerType === 'pickup' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {userLocation ? 'Nearby Landmarks' : 'Popular Locations'}
            </span>
            <button
              onClick={() => setShowChips(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Hide
            </button>
          </div>
          <LandmarkChips
            landmarks={nearbyLandmarks}
            onSelect={handleLandmarkSelect}
            loading={loading}
            maxChips={6}
          />
        </div>
      )}

      {/* Text Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          {markerType === 'pickup' ? (
            <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
          ) : (
            <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-500/30" />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="w-full h-12 pl-10 pr-4 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
        />
        
        {/* Expand button when collapsed chips */}
        {!showChips && !value.trim() && markerType === 'pickup' && (
          <button
            onClick={() => setShowChips(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-secondary rounded-lg"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown Suggestions */}
      {isFocused && (
        <div
          ref={dropdownRef}
          className="bg-card rounded-xl shadow-lg border border-border overflow-hidden animate-fade-in max-h-[320px] overflow-y-auto"
        >
          {/* My Location option for destination too */}
          {showMyLocation && markerType === 'dropoff' && (
            <button
              onClick={handleUseMyLocationClick}
              className="w-full px-4 py-3 text-left hover:bg-accent/10 transition-colors flex items-center gap-3 border-b border-border"
            >
              <div className="w-9 h-9 bg-accent/20 rounded-full flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Current location</p>
                <p className="text-xs text-muted-foreground">Use GPS coordinates</p>
              </div>
            </button>
          )}

          {/* Section header */}
          <div className="px-4 py-2 bg-secondary/50 sticky top-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Clock className="w-3 h-3" />
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
              <LandmarkButton
                key={landmark.id}
                landmark={landmark}
                onClick={() => handleLandmarkSelect(landmark)}
              />
            ))
          ) : (
            <div className="px-4 py-6 text-center text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No landmarks found for "{value}"</p>
              
              {/* Nearest suggestion when no match */}
              {nearest && (
                <button
                  onClick={() => handleLandmarkSelect(nearest)}
                  className="mt-3 px-4 py-2 bg-accent/10 hover:bg-accent/20 rounded-lg text-accent text-sm transition-colors"
                >
                  Use nearest: {nearest.name}
                </button>
              )}
            </div>
          )}

          {/* Fallback: Nearest landmark for destination */}
          {markerType === 'dropoff' && value.trim() && displayLandmarks.length === 0 && userLocation && nearest && (
            <div className="border-t border-border">
              <div className="px-4 py-2 bg-accent/10">
                <p className="text-xs font-medium text-accent uppercase tracking-wide">
                  Nearest public place
                </p>
              </div>
              <LandmarkButton
                landmark={nearest}
                onClick={() => handleLandmarkSelect(nearest)}
                highlight
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Separate component for landmark buttons - using forwardRef to fix ref warning
interface LandmarkButtonProps {
  landmark: LandmarkType;
  onClick: () => void;
  highlight?: boolean;
}

const LandmarkButton = React.forwardRef<HTMLButtonElement, LandmarkButtonProps>(
  ({ landmark, onClick, highlight = false }, ref) => {
    const iconType = getCategoryIcon(landmark.category);
    
    const iconColors: Record<string, string> = {
      landmark: 'text-accent',
      hospital: 'text-red-500',
      school: 'text-blue-500',
      fuel: 'text-amber-500',
      market: 'text-green-500',
      bank: 'text-emerald-500',
      building: 'text-muted-foreground',
      pin: 'text-muted-foreground',
    };

    return (
      <button
        ref={ref}
        onClick={onClick}
        className={cn(
          "w-full px-4 py-3 text-left transition-colors flex items-center gap-3",
          highlight ? "bg-accent/5 hover:bg-accent/10" : "hover:bg-secondary"
        )}
      >
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
          highlight ? "bg-accent/20" : "bg-secondary"
        )}>
          <MapPin className={cn("w-4 h-4", iconColors[iconType])} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground text-sm truncate">{landmark.name}</p>
            <span className="text-xs px-1.5 py-0.5 bg-secondary rounded text-muted-foreground shrink-0 capitalize">
              {landmark.category}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            {landmark.description && (
              <span className="truncate">{landmark.description}</span>
            )}
            {/* Distance hidden for riders - only shown to drivers */}
          </div>
        </div>
      </button>
    );
  }
);

LandmarkButton.displayName = 'LandmarkButton';

export default LocationInput;
