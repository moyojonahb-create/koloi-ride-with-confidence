import { cn } from '@/lib/utils';
import { Loader2, Check, Car, MapPin, Navigation } from 'lucide-react';

export type RideStatus = 
  | 'idle'
  | 'searching'
  | 'offers_received'
  | 'driver_assigned'
  | 'driver_arriving'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed';

interface RideStatusBannerProps {
  status: RideStatus;
  driverName?: string;
  eta?: number; // minutes
  offersCount?: number;
  className?: string;
}

const STATUS_CONFIG: Record<RideStatus, {
  icon: React.ReactNode;
  label: string;
  color: string;
  pulse?: boolean;
}> = {
  idle: {
    icon: <MapPin className="w-4 h-4" />,
    label: 'Where to?',
    color: 'bg-secondary text-secondary-foreground',
  },
  searching: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: 'Finding drivers nearby...',
    color: 'bg-accent text-accent-foreground',
    pulse: true,
  },
  offers_received: {
    icon: <Car className="w-4 h-4" />,
    label: 'Offers received',
    color: 'bg-emerald-500 text-white',
    pulse: true,
  },
  driver_assigned: {
    icon: <Check className="w-4 h-4" />,
    label: 'Driver assigned',
    color: 'bg-emerald-500 text-white',
  },
  driver_arriving: {
    icon: <Car className="w-4 h-4" />,
    label: 'Driver on the way',
    color: 'bg-primary text-primary-foreground',
    pulse: true,
  },
  driver_arrived: {
    icon: <Check className="w-4 h-4" />,
    label: 'Driver has arrived',
    color: 'bg-emerald-500 text-white',
    pulse: true,
  },
  in_progress: {
    icon: <Navigation className="w-4 h-4" />,
    label: 'Trip in progress',
    color: 'bg-primary text-primary-foreground',
  },
  completed: {
    icon: <Check className="w-4 h-4" />,
    label: 'Trip completed',
    color: 'bg-emerald-500 text-white',
  },
};

export default function RideStatusBanner({
  status,
  driverName,
  eta,
  offersCount,
  className,
}: RideStatusBannerProps) {
  if (status === 'idle') return null;

  const config = STATUS_CONFIG[status];

  const getLabel = () => {
    if (status === 'offers_received' && offersCount) {
      return `${offersCount} offer${offersCount > 1 ? 's' : ''} received`;
    }
    if (status === 'driver_arriving' && eta) {
      return `${driverName || 'Driver'} arriving in ${eta} min`;
    }
    if (status === 'driver_arrived' && driverName) {
      return `${driverName} has arrived`;
    }
    if (status === 'in_progress' && driverName) {
      return `On trip with ${driverName}`;
    }
    return config.label;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm',
        config.color,
        config.pulse && 'animate-pulse',
        className
      )}
    >
      {config.icon}
      <span className="flex-1">{getLabel()}</span>
      {status === 'driver_arriving' && eta && (
        <span className="text-xs opacity-80">{eta} min</span>
      )}
    </div>
  );
}
