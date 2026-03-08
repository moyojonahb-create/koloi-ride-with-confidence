import { Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateKoloiFare, PRICING_INFO, type Location } from '@/lib/pricing';
import { Clock, Moon, Sun } from 'lucide-react';

export interface VehicleType {
  id: 'standard';
  name: string;
  description: string;
  icon: React.ElementType;
  eta: string;
}

export const VEHICLE_TYPES: VehicleType[] = [
  {
    id: 'standard',
    name: 'Voyex',
    description: 'Affordable town rides',
    icon: Car,
    eta: '3 min',
  },
];

// Legacy function for backward compatibility - now uses Koloi pricing
export const calculateFareForVehicle = (
  distanceKm: number,
  _vehicleType: VehicleType,
  pickup?: Location,
  dropoff?: Location
): number => {
  // If we have actual coordinates, use proper pricing
  if (pickup && dropoff) {
    return calculateKoloiFare(pickup, dropoff).priceR;
  }
  // Fallback: estimate using distance only (within town)
  let price = PRICING_INFO.baseFare + distanceKm * PRICING_INFO.perKmRate;
  price = Math.max(PRICING_INFO.minFare, Math.min(price, PRICING_INFO.maxTownFare));
  return Math.round(price);
};

interface VehicleTypeSelectorProps {
  selectedType: VehicleType;
  onSelect: (type: VehicleType) => void;
  distanceKm?: number;
  pickup?: Location;
  dropoff?: Location;
  routedDistanceKm?: number; // Authoritative distance from Google Routes API
}

const VehicleTypeSelector = ({ 
  selectedType, 
  onSelect, 
  distanceKm, 
  pickup, 
  dropoff,
  routedDistanceKm,
}: VehicleTypeSelectorProps) => {
  // Calculate fare with routed distance as authoritative source
  const fareResult = pickup && dropoff 
    ? calculateKoloiFare(pickup, dropoff, routedDistanceKm) 
    : null;

  const getMultiplierIcon = () => {
    if (!fareResult) return null;
    if (fareResult.multiplier === 1.3) return <Moon className="w-3 h-3" />;
    if (fareResult.multiplier === 1.2) return <Clock className="w-3 h-3" />;
    return <Sun className="w-3 h-3" />;
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Your ride</p>
      <div className="space-y-2">
        {VEHICLE_TYPES.map((vehicle) => {
          const Icon = vehicle.icon;
          const isSelected = selectedType.id === vehicle.id;
          const fare = fareResult?.priceR ?? (distanceKm ? calculateFareForVehicle(distanceKm, vehicle) : null);
          
          return (
            <button
              key={vehicle.id}
              onClick={() => onSelect(vehicle)}
              className={cn(
                "w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 text-left",
                isSelected 
                  ? "border-accent bg-accent/5" 
                  : "border-border hover:border-muted-foreground/30 hover:bg-secondary/50"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                isSelected ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
              )}>
                <Icon className="w-6 h-6" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{vehicle.name}</span>
                  <span className="text-xs text-muted-foreground">{vehicle.eta}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{vehicle.description}</p>
                {fareResult && (
                  <div className="flex items-center gap-1 mt-1">
                    {getMultiplierIcon()}
                    <span className={cn(
                      "text-xs",
                      fareResult.multiplier > 1 ? "text-amber-600" : "text-muted-foreground"
                    )}>
                      {fareResult.reason}
                      {fareResult.multiplier > 1 && ` (${fareResult.multiplier}x)`}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="text-right shrink-0">
                {fare ? (
                  <span className="font-bold text-foreground">R{fare}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">R{PRICING_INFO.minFare}+</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Pricing info */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
        R{PRICING_INFO.minFare} - R{PRICING_INFO.maxTownFare} in town (R5 increments)
      </div>
    </div>
  );
};

export default VehicleTypeSelector;
