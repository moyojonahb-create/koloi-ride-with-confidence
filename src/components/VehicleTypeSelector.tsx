import { Car } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface VehicleTypeSelectorProps {
  selectedType: VehicleType;
  onSelect: (type: VehicleType) => void;
  distanceKm?: number;
  fareUsd?: number;
}

const VehicleTypeSelector = ({ 
  selectedType, 
  onSelect, 
  distanceKm,
  fareUsd,
}: VehicleTypeSelectorProps) => {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Your ride</p>
      <div className="space-y-2">
        {VEHICLE_TYPES.map((vehicle) => {
          const Icon = vehicle.icon;
          const isSelected = selectedType.id === vehicle.id;
          
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
                {fareUsd ? (
                  <span className="font-bold text-foreground">${fareUsd.toFixed(2)}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">$1.50+</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Pricing info */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
        $1.50 – $50.00 in town ($0.50 increments)
      </div>
    </div>
  );
};

export default VehicleTypeSelector;
