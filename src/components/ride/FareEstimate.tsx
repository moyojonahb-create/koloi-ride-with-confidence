import { cn } from '@/lib/utils';
import { Car, Clock, Route, Wallet } from 'lucide-react';

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
    <div className={cn('bg-secondary/50 rounded-xl p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Car className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{vehicleType}</p>
            <p className="text-xs text-muted-foreground">Estimated fare</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">R {fareR.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Route className="w-4 h-4" />
          <span>{distanceKm.toFixed(1)} km</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>{durationMinutes} min</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Final fare may vary based on traffic and route changes
      </p>
    </div>
  );
}
