import { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Clock, Building2, Landmark } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  address: string;
  lng: number;
  lat: number;
  icon: 'landmark' | 'building' | 'pin';
}

// Predefined locations for Gwanda, Beit Bridge, and Blanket Mine areas
const SUGGESTED_LOCATIONS: Location[] = [
  // Gwanda Town
  { id: 'gwanda-town', name: 'Gwanda Town Center', address: 'Main Street, Gwanda', lng: 29.0147, lat: -20.9389, icon: 'landmark' },
  { id: 'gwanda-hospital', name: 'Gwanda Provincial Hospital', address: 'Hospital Road, Gwanda', lng: 29.0180, lat: -20.9350, icon: 'building' },
  { id: 'gwanda-bus', name: 'Gwanda Bus Terminal', address: 'Bus Station, Gwanda', lng: 29.0120, lat: -20.9410, icon: 'pin' },
  { id: 'gwanda-market', name: 'Gwanda Market', address: 'Market Square, Gwanda', lng: 29.0155, lat: -20.9375, icon: 'building' },
  { id: 'gwanda-police', name: 'Gwanda Police Station', address: 'Main Road, Gwanda', lng: 29.0140, lat: -20.9395, icon: 'building' },
  { id: 'gwanda-high', name: 'Gwanda High School', address: 'School Road, Gwanda', lng: 29.0200, lat: -20.9320, icon: 'building' },
  
  // Beit Bridge
  { id: 'beitbridge-border', name: 'Beit Bridge Border Post', address: 'Border Crossing, Beit Bridge', lng: 29.9833, lat: -22.2167, icon: 'landmark' },
  { id: 'beitbridge-town', name: 'Beit Bridge Town Center', address: 'Main Street, Beit Bridge', lng: 29.9900, lat: -22.2100, icon: 'landmark' },
  { id: 'beitbridge-bus', name: 'Beit Bridge Bus Terminal', address: 'Terminal Road, Beit Bridge', lng: 29.9850, lat: -22.2120, icon: 'pin' },
  { id: 'beitbridge-market', name: 'Dulivhadzimu Market', address: 'Market Area, Beit Bridge', lng: 29.9880, lat: -22.2080, icon: 'building' },
  { id: 'beitbridge-hospital', name: 'Beit Bridge District Hospital', address: 'Hospital Road, Beit Bridge', lng: 29.9920, lat: -22.2050, icon: 'building' },
  
  // Blanket Mine Area
  { id: 'blanket-mine', name: 'Blanket Mine', address: 'Blanket Mine, Gwanda District', lng: 29.0650, lat: -20.9100, icon: 'landmark' },
  { id: 'blanket-gate', name: 'Blanket Mine Main Gate', address: 'Mine Entrance, Gwanda District', lng: 29.0620, lat: -20.9120, icon: 'pin' },
  { id: 'blanket-housing', name: 'Blanket Mine Housing', address: 'Staff Quarters, Blanket Mine', lng: 29.0680, lat: -20.9080, icon: 'building' },
  
  // Other areas
  { id: 'west-nicholson', name: 'West Nicholson', address: 'West Nicholson Town', lng: 29.3667, lat: -21.0500, icon: 'landmark' },
  { id: 'colleen-bawn', name: 'Colleen Bawn', address: 'Colleen Bawn, Gwanda District', lng: 28.8500, lat: -20.8833, icon: 'pin' },
  { id: 'filabusi', name: 'Filabusi', address: 'Filabusi Town', lng: 29.2833, lat: -20.5333, icon: 'landmark' },
];

interface LocationInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: { name: string; lng: number; lat: number }) => void;
  onUseMyLocation?: () => void;
  showMyLocation?: boolean;
  markerType: 'pickup' | 'dropoff';
}

const LocationInput = ({
  placeholder,
  value,
  onChange,
  onLocationSelect,
  onUseMyLocation,
  showMyLocation = false,
  markerType,
}: LocationInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length > 0) {
      const filtered = SUGGESTED_LOCATIONS.filter(
        (loc) =>
          loc.name.toLowerCase().includes(value.toLowerCase()) ||
          loc.address.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredLocations(filtered.slice(0, 6));
    } else {
      // Show popular locations when input is empty
      setFilteredLocations(SUGGESTED_LOCATIONS.slice(0, 6));
    }
  }, [value]);

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
      case 'building':
        return <Building2 className="w-4 h-4 text-muted-foreground" />;
      default:
        return <MapPin className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative">
      {/* Marker indicator */}
      <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 ${
        markerType === 'pickup' ? 'bg-foreground rounded-full' : 'bg-foreground'
      }`} />
      
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        className="koloi-input pl-10 pr-12"
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
          className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl shadow-koloi-lg border border-border overflow-hidden z-30 animate-fade-in max-h-[320px] overflow-y-auto"
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
                <p className="font-medium text-foreground">My Location</p>
                <p className="text-sm text-muted-foreground">Use your current GPS location</p>
              </div>
            </button>
          )}

          {/* Recent/Suggested locations header */}
          <div className="px-4 py-2 bg-secondary/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {value ? 'Search Results' : 'Popular Locations'}
            </p>
          </div>

          {/* Location suggestions */}
          {filteredLocations.length > 0 ? (
            filteredLocations.map((location) => (
              <button
                key={location.id}
                onClick={() => {
                  onLocationSelect({
                    name: location.name,
                    lng: location.lng,
                    lat: location.lat,
                  });
                  setIsFocused(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center shrink-0">
                  {getIcon(location.icon)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{location.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{location.address}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-6 text-center text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No locations found</p>
              <p className="text-xs mt-1">Try searching for a different place</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationInput;
