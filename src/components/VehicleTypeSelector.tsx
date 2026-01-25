import { Car, Sparkles, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VehicleType {
  id: 'economy' | 'comfort' | 'premium';
  name: string;
  description: string;
  baseFare: number;
  pricePerKm: number;
  icon: React.ElementType;
  eta: string;
}

export const VEHICLE_TYPES: VehicleType[] = [
  {
    id: 'economy',
    name: 'Economy',
    description: 'Affordable everyday rides',
    baseFare: 50,
    pricePerKm: 4,
    icon: Car,
    eta: '3 min',
  },
  {
    id: 'comfort',
    name: 'Comfort',
    description: 'Newer cars, top-rated drivers',
    baseFare: 70,
    pricePerKm: 6,
    icon: Sparkles,
    eta: '5 min',
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Luxury vehicles, priority pickup',
    baseFare: 100,
    pricePerKm: 8,
    icon: Crown,
    eta: '7 min',
  },
];

export const calculateFareForVehicle = (distanceKm: number, vehicleType: VehicleType): number => {
  const fare = vehicleType.baseFare + (distanceKm * vehicleType.pricePerKm);
  return Math.max(vehicleType.baseFare, Math.round(fare / 5) * 5);
};

interface VehicleTypeSelectorProps {
  selectedType: VehicleType;
  onSelect: (type: VehicleType) => void;
  distanceKm?: number;
}

const VehicleTypeSelector = ({ selectedType, onSelect, distanceKm }: VehicleTypeSelectorProps) => {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Choose your ride</p>
      <div className="space-y-2">
        {VEHICLE_TYPES.map((vehicle) => {
          const Icon = vehicle.icon;
          const isSelected = selectedType.id === vehicle.id;
          const fare = distanceKm ? calculateFareForVehicle(distanceKm, vehicle) : null;
          
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
              </div>
              
              <div className="text-right shrink-0">
                {fare ? (
                  <span className="font-bold text-foreground">R{fare}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">R{vehicle.baseFare}+</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default VehicleTypeSelector;
