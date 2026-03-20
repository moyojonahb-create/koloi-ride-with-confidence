import { format } from 'date-fns';
import { MapPin, Navigation, Clock, Banknote, Car, CreditCard, CheckCircle2, Share2, Download, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import SurgePricingBadge from './SurgePricingBadge';

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
  demandMultiplier?: number;
  isNight?: boolean;
}

export default function TripReceipt({ ride, driverName, driverRating, onRateDriver, hasRated, demandMultiplier = 1.0, isNight = false }: TripReceiptProps) {
  const commissionRate = 0.15;
  const platformFee = Math.round(ride.fare * commissionRate * 100) / 100;
  const driverEarnings = Math.round((ride.fare - platformFee) * 100) / 100;
  const hasSurge = demandMultiplier > 1.0;
  const baseFare = hasSurge ? Math.round((ride.fare / demandMultiplier) * 100) / 100 : ride.fare;
  const surgeAmount = hasSurge ? Math.round((ride.fare - baseFare) * 100) / 100 : 0;

  const receiptId = `VYX-${ride.id.substring(0, 8).toUpperCase()}`;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="glass-card p-5 space-y-5"
      style={{ borderRadius: 22 }}
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-foreground">Trip Complete</h3>
            <p className="text-xs text-muted-foreground">
              {format(new Date(ride.created_at), 'EEEE, MMM d · h:mm a')}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md">
          {receiptId}
        </span>
      </motion.div>

      {/* Route summary */}
      <motion.div variants={itemVariants} className="space-y-2.5 pl-1">
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
      </motion.div>

      {/* Stats grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
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
      </motion.div>

      {/* Fare breakdown */}
      <motion.div variants={itemVariants} className="border-t border-border/30 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Base fare</span>
          <span className="font-semibold text-foreground">${baseFare.toFixed(2)}</span>
        </div>

        {hasSurge && (
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <SurgePricingBadge demandMultiplier={demandMultiplier} isNight={false} className="text-[10px] px-1.5 py-0.5" />
              Surge fee
            </span>
            <span className="font-semibold text-destructive">+${surgeAmount.toFixed(2)}</span>
          </div>
        )}

        {isNight && !hasSurge && (
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <SurgePricingBadge demandMultiplier={1} isNight={true} className="text-[10px] px-1.5 py-0.5" />
              Night rate
            </span>
            <span className="font-medium text-foreground">Included</span>
          </div>
        )}

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

        <div className="flex justify-between text-sm text-muted-foreground/60">
          <span className="flex items-center gap-1.5">
            <Percent className="w-3 h-3" />
            Platform fee (15%)
          </span>
          <span>${platformFee.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-border/30">
          <span className="font-bold text-foreground">Total paid</span>
          <motion.span
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-2xl font-black text-primary"
          >
            ${Number(ride.fare).toFixed(2)}
          </motion.span>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div variants={itemVariants} className="flex gap-3">
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
                title: `Voyex Receipt ${receiptId}`,
                text: `Trip from ${ride.pickup_address} to ${ride.dropoff_address} — $${Number(ride.fare).toFixed(2)}\nReceipt: ${receiptId}`,
              });
            }
          }}
        >
          <Share2 className="w-4 h-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
