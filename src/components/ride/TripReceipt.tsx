import { format } from 'date-fns';
import { MapPin, Navigation, Clock, Banknote, Car, CreditCard, CheckCircle2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TripReceiptProps {
  ride: {
    id: string;
    pickup_address: string;
    dropoff_address: string;
    fare: number;
    distance_km: number;
    duration_minutes: number;
    payment_method: string;
    vehicle_type: string;
    created_at: string;
  };
  driverName?: string;
  driverRating?: number;
  onRateDriver?: () => void;
  hasRated?: boolean;
}

export default function TripReceipt({ ride, driverName, driverRating, onRateDriver, hasRated }: TripReceiptProps) {
  const platformFee = Math.round(ride.fare * 0.1); // 10% platform estimate
  const driverEarnings = ride.fare - platformFee;

  return (
    <div className="glass-card p-5 space-y-5" style={{ borderRadius: 22 }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold font-display text-foreground">Trip Complete</h3>
          <p className="text-xs text-muted-foreground">
            {format(new Date(ride.created_at), 'EEEE, MMM d · h:mm a')}
          </p>
        </div>
      </div>

      {/* Route summary */}
      <div className="space-y-2.5 pl-1">
        <div className="flex items-start gap-3">
          <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Pickup</p>
            <p className="text-sm font-medium text-foreground">{ride.pickup_address}</p>
          </div>
        </div>
        <div className="ml-[5px] w-px h-4 bg-border" />
        <div className="flex items-start gap-3">
          <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-accent shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Dropoff</p>
            <p className="text-sm font-medium text-foreground">{ride.dropoff_address}</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-secondary/50 rounded-2xl p-3 text-center">
          <Navigation className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{ride.distance_km.toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground font-medium">km</p>
        </div>
        <div className="bg-secondary/50 rounded-2xl p-3 text-center">
          <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{ride.duration_minutes}</p>
          <p className="text-[10px] text-muted-foreground font-medium">min</p>
        </div>
        <div className="bg-secondary/50 rounded-2xl p-3 text-center">
          <Car className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground capitalize">{ride.vehicle_type}</p>
          <p className="text-[10px] text-muted-foreground font-medium">type</p>
        </div>
      </div>

      {/* Fare breakdown */}
      <div className="border-t border-border/30 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Trip fare</span>
          <span className="font-semibold text-foreground">${Number(ride.fare).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Payment
          </span>
          <span className="font-medium text-foreground capitalize">{ride.payment_method}</span>
        </div>
        {driverName && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Driver</span>
            <span className="font-medium text-foreground">{driverName}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-border/30">
          <span className="font-bold text-foreground">Total paid</span>
          <span className="text-2xl font-black text-primary">R{ride.fare}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onRateDriver && !hasRated && (
          <Button 
            onClick={onRateDriver}
            className="flex-1 h-12 rounded-2xl font-bold"
            variant="default"
          >
            Rate Driver ⭐
          </Button>
        )}
        <Button
          variant="outline"
          className="h-12 rounded-2xl px-4"
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: 'Voyex Trip Receipt',
                text: `Trip from ${ride.pickup_address} to ${ride.dropoff_address} — R${ride.fare}`,
              });
            }
          }}
        >
          <Share2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
