import { cn } from '@/lib/utils';
import { Car, Clock, Route } from 'lucide-react';

interface FareEstimateProps {
  fareR: number;
  distanceKm: number;
  durationMinutes: number;
  vehicleType?: string;
  className?: string;
}

export default function FareEstimate({
  fareR,
  distanceKm,
  durationMinutes,
  vehicleType = 'Standard',
  className,
}: FareEstimateProps) {
  return (
    <div className={cn('bg-koloi-gray-100 rounded-2xl p-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-koloi-sm">
            <Car className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-foreground text-lg">{vehicleType}</p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Route className="w-3.5 h-3.5" />
                {distanceKm.toFixed(1)} km
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {durationMinutes} min
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-foreground">R{fareR.toFixed(0)}</p>
        </div>
      </div>
    </div>
  );
}
