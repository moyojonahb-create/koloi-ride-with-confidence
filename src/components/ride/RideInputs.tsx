import { useState, useCallback } from 'react';
import { MapPin, Navigation, Crosshair, Loader2, Search, X, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useLandmarks, type Landmark } from '@/hooks/useLandmarks';
import QuickPickChips from './QuickPickChips';

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
  className,
}: RideInputsProps) {
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff' | null>('pickup');
  const [searchQuery, setSearchQuery] = useState('');

  const { landmarks, loading: landmarksLoading, findNearestLandmark } = useLandmarks({
    searchQuery,
    limit: 10,
  });

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
      onPickupSelect(null as any);
    } else {
      onDropoffSelect(null as any);
    }
    setActiveField(field);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Location Inputs */}
      <div className="space-y-3">
        {/* Pickup Input */}
        <div className="relative">
          <button
            onClick={() => setActiveField('pickup')}
            className={cn(
              'w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left min-h-[56px]',
              activeField === 'pickup'
                ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20'
                : 'border-border hover:bg-secondary/50'
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
              pickupLocation ? 'bg-emerald-100' : 'bg-secondary'
            )}>
              <div className={cn(
                'w-3 h-3 rounded-full',
                pickupLocation ? 'bg-emerald-500' : 'bg-muted-foreground'
              )} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Pickup</p>
              <p className={cn(
                'font-medium truncate text-base',
                pickupLocation ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {pickupLocation?.name || 'Where from?'}
              </p>
            </div>
            {pickupLocation && (
              <button
                onClick={(e) => { e.stopPropagation(); clearLocation('pickup'); }}
                className="p-1 hover:bg-secondary rounded-full"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </button>
        </div>

        {/* Arrow connector */}
        <div className="flex justify-center">
          <ArrowDown className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* Dropoff Input */}
        <div className="relative">
          <button
            onClick={() => setActiveField('dropoff')}
            className={cn(
              'w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left min-h-[56px]',
              activeField === 'dropoff'
                ? 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20'
                : 'border-border hover:bg-secondary/50'
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
              dropoffLocation ? 'bg-blue-100' : 'bg-secondary'
            )}>
              <Navigation className={cn(
                'w-4 h-4',
                dropoffLocation ? 'text-blue-500' : 'text-muted-foreground'
              )} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Destination</p>
              <p className={cn(
                'font-medium truncate text-base',
                dropoffLocation ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {dropoffLocation?.name || 'Where to?'}
              </p>
            </div>
            {dropoffLocation && (
              <button
                onClick={(e) => { e.stopPropagation(); clearLocation('dropoff'); }}
                className="p-1 hover:bg-secondary rounded-full"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </button>
        </div>
      </div>

      {/* GPS Button */}
      {activeField === 'pickup' && (
        <Button
          onClick={onUseMyLocation}
          variant="outline"
          size="lg"
          disabled={isGettingLocation}
          className="w-full min-h-[48px] justify-start gap-3"
        >
          {isGettingLocation ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Crosshair className="w-5 h-5 text-emerald-500" />
          )}
          <span>Use my current location</span>
        </Button>
      )}

      {gpsError && (
        <p className="text-sm text-amber-600 px-1">{gpsError}</p>
      )}

      {/* Quick Picks */}
      {activeField && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Quick picks
          </p>
          <QuickPickChips
            onSelect={handleQuickPickSelect}
            selectedName={activeField === 'pickup' ? pickupLocation?.name : dropoffLocation?.name}
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
            className="pl-12 h-14 text-base"
          />
        </div>
      )}

      {/* Search Results */}
      {activeField && searchQuery.trim() && (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {landmarksLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : landmarks.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No results for "{searchQuery}"
            </div>
          ) : (
            landmarks.map((landmark) => (
              <button
                key={landmark.id}
                onClick={() => handleLandmarkSelect(landmark)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/50 transition-colors text-left min-h-[48px]"
              >
                <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{landmark.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{landmark.category}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
