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
  
  // Gwanda Schools
  { id: 'gwanda-high', name: 'Gwanda High School', address: 'School Road, Gwanda', lng: 29.0200, lat: -20.9320, icon: 'building' },
  { id: 'manama-high', name: 'Manama High School', address: 'Manama Mission, Gwanda', lng: 28.9500, lat: -21.0500, icon: 'building' },
  { id: 'embakwe-high', name: 'Embakwe High School', address: 'Embakwe, Gwanda District', lng: 28.7800, lat: -20.8200, icon: 'building' },
  { id: 'mtshabezi-high', name: 'Mtshabezi High School', address: 'Mtshabezi Mission, Gwanda', lng: 28.9200, lat: -20.7500, icon: 'building' },
  { id: 'gwanda-primary', name: 'Gwanda Primary School', address: 'Town Center, Gwanda', lng: 29.0160, lat: -20.9360, icon: 'building' },
  { id: 'jahunda-secondary', name: 'Jahunda Secondary School', address: 'Jahunda, Gwanda District', lng: 29.1500, lat: -21.0000, icon: 'building' },
  { id: 'sizeze-primary', name: 'Sizeze Primary School', address: 'Sizeze Village, Gwanda', lng: 29.0800, lat: -20.9800, icon: 'building' },
  
  // Gwanda Shopping Centers
  { id: 'ok-gwanda', name: 'OK Supermarket Gwanda', address: 'Main Street, Gwanda', lng: 29.0145, lat: -20.9380, icon: 'building' },
  { id: 'tm-gwanda', name: 'TM Pick n Pay Gwanda', address: 'Shopping Center, Gwanda', lng: 29.0150, lat: -20.9385, icon: 'building' },
  { id: 'spar-gwanda', name: 'Spar Gwanda', address: 'Town Center, Gwanda', lng: 29.0142, lat: -20.9392, icon: 'building' },
  { id: 'gwanda-mall', name: 'Gwanda Shopping Complex', address: 'Main Road, Gwanda', lng: 29.0148, lat: -20.9378, icon: 'building' },
  
  // Gwanda Villages
  { id: 'spitzkop', name: 'Spitzkop', address: 'Spitzkop Area, Gwanda', lng: 29.0000, lat: -20.8500, icon: 'pin' },
  { id: 'spitzkop-north', name: 'Spitzkop North (Red Cross)', address: 'Red Cross, Spitzkop North', lng: 28.9900, lat: -20.8300, icon: 'landmark' },
  { id: 'spitzkop-south', name: 'Spitzkop South', address: 'Spitzkop South Area', lng: 29.0050, lat: -20.8700, icon: 'pin' },
  { id: 'guyu', name: 'Guyu', address: 'Guyu Village, Gwanda District', lng: 29.2000, lat: -21.1000, icon: 'pin' },
  { id: 'makwe', name: 'Makwe', address: 'Makwe Area, Gwanda', lng: 28.9000, lat: -20.9500, icon: 'pin' },
  { id: 'mawaza', name: 'Mawaza', address: 'Mawaza Village, Gwanda', lng: 29.0500, lat: -21.0200, icon: 'pin' },
  { id: 'ntalale', name: 'Ntalale', address: 'Ntalale Village, Gwanda', lng: 29.1200, lat: -20.8800, icon: 'pin' },
  { id: 'sengezane', name: 'Sengezane', address: 'Sengezane Village, Gwanda', lng: 28.8500, lat: -21.0000, icon: 'pin' },
  { id: 'silozwi', name: 'Silozwi', address: 'Silozwi Area, Gwanda', lng: 29.1800, lat: -21.0500, icon: 'pin' },
  { id: 'nhwali', name: 'Nhwali', address: 'Nhwali Village, Gwanda', lng: 28.9800, lat: -20.8000, icon: 'pin' },
  { id: 'dibilishaba', name: 'Dibilishaba', address: 'Dibilishaba Village, Gwanda', lng: 29.0300, lat: -20.9600, icon: 'pin' },
  { id: 'buvuma', name: 'Buvuma', address: 'Buvuma Area, Gwanda', lng: 29.0900, lat: -21.0800, icon: 'pin' },
  
  // Beit Bridge
  { id: 'beitbridge-border', name: 'Beit Bridge Border Post', address: 'Border Crossing, Beit Bridge', lng: 29.9833, lat: -22.2167, icon: 'landmark' },
  { id: 'beitbridge-town', name: 'Beit Bridge Town Center', address: 'Main Street, Beit Bridge', lng: 29.9900, lat: -22.2100, icon: 'landmark' },
  { id: 'beitbridge-bus', name: 'Beit Bridge Bus Terminal', address: 'Terminal Road, Beit Bridge', lng: 29.9850, lat: -22.2120, icon: 'pin' },
  { id: 'beitbridge-market', name: 'Dulivhadzimu Market', address: 'Market Area, Beit Bridge', lng: 29.9880, lat: -22.2080, icon: 'building' },
  { id: 'beitbridge-hospital', name: 'Beit Bridge District Hospital', address: 'Hospital Road, Beit Bridge', lng: 29.9920, lat: -22.2050, icon: 'building' },
  { id: 'beitbridge-spar', name: 'Spar Beit Bridge', address: 'Main Road, Beit Bridge', lng: 29.9890, lat: -22.2090, icon: 'building' },
  { id: 'beitbridge-ok', name: 'OK Supermarket Beit Bridge', address: 'Town Center, Beit Bridge', lng: 29.9895, lat: -22.2095, icon: 'building' },
  
  // Beit Bridge Villages
  { id: 'lutumba', name: 'Lutumba', address: 'Lutumba Village, Beit Bridge', lng: 29.8500, lat: -22.1500, icon: 'pin' },
  { id: 'makakavhule', name: 'Makakavhule', address: 'Makakavhule Village, Beit Bridge', lng: 30.0500, lat: -22.1800, icon: 'pin' },
  { id: 'chaswingo', name: 'Chaswingo', address: 'Chaswingo Area, Beit Bridge', lng: 29.9200, lat: -22.1000, icon: 'pin' },
  { id: 'tshitaudze', name: 'Tshitaudze', address: 'Tshitaudze Village, Beit Bridge', lng: 30.1000, lat: -22.2000, icon: 'pin' },
  
  // Blanket Mine Area
  { id: 'blanket-mine', name: 'Blanket Mine', address: 'Blanket Mine, Gwanda District', lng: 29.0650, lat: -20.9100, icon: 'landmark' },
  { id: 'blanket-gate', name: 'Blanket Mine Main Gate', address: 'Mine Entrance, Gwanda District', lng: 29.0620, lat: -20.9120, icon: 'pin' },
  { id: 'blanket-housing', name: 'Blanket Mine Housing', address: 'Staff Quarters, Blanket Mine', lng: 29.0680, lat: -20.9080, icon: 'building' },
  { id: 'blanket-clinic', name: 'Blanket Mine Clinic', address: 'Medical Center, Blanket Mine', lng: 29.0660, lat: -20.9090, icon: 'building' },
  
  // Other Towns
  { id: 'west-nicholson', name: 'West Nicholson', address: 'West Nicholson Town', lng: 29.3667, lat: -21.0500, icon: 'landmark' },
  { id: 'west-nicholson-bus', name: 'West Nicholson Bus Stop', address: 'Main Road, West Nicholson', lng: 29.3650, lat: -21.0480, icon: 'pin' },
  { id: 'colleen-bawn', name: 'Colleen Bawn', address: 'Colleen Bawn, Gwanda District', lng: 28.8500, lat: -20.8833, icon: 'landmark' },
  { id: 'filabusi', name: 'Filabusi', address: 'Filabusi Town', lng: 29.2833, lat: -20.5333, icon: 'landmark' },
  { id: 'filabusi-bus', name: 'Filabusi Bus Terminal', address: 'Bus Station, Filabusi', lng: 29.2850, lat: -20.5350, icon: 'pin' },
  
  // Growth Points & Business Centers
  { id: 'maphisa', name: 'Maphisa Growth Point', address: 'Maphisa, Matobo District', lng: 28.7500, lat: -20.6500, icon: 'landmark' },
  { id: 'kezi', name: 'Kezi Business Center', address: 'Kezi, Matobo District', lng: 28.4500, lat: -20.9000, icon: 'building' },
  { id: 'shangani', name: 'Shangani Growth Point', address: 'Shangani, Insiza District', lng: 29.3500, lat: -20.1500, icon: 'landmark' },
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
