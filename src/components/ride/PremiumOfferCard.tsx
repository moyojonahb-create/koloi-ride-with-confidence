import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Clock, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PremiumOffer {
  offerId: string;
  driverId: string;
  driverName: string;
  avatarUrl?: string | null;
  ratingAvg: number;
  totalTrips: number;
  carModel: string;
  plateNumber: string;
  etaMinutes: number;
  fare: number;
  gender?: string | null;
  acceptedAt: number; // timestamp ms
  expiresAt: number;  // timestamp ms
}

interface Props {
  offer: PremiumOffer;
  riderFare: number;
  onAccept: (offerId: string) => void;
  onDecline: (offerId: string) => void;
  disabled?: boolean;
}

export default function PremiumOfferCard({ offer, riderFare, onAccept, onDecline, disabled }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((offer.expiresAt - Date.now()) / 1000)));

  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.max(0, Math.ceil((offer.expiresAt - Date.now()) / 1000));
      setSecondsLeft(s);
    }, 1000);
    return () => clearInterval(t);
  }, [offer.expiresAt]);

  const expired = secondsLeft <= 0;
  if (expired) return null;

  const urgencyColor = secondsLeft <= 10
    ? 'text-destructive'
    : secondsLeft <= 20
      ? 'text-amber-500'
      : 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      {/* Top row: fare + ETA */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-primary">${offer.fare.toFixed(2)}</span>
          <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground text-[10px] font-bold uppercase">
            Your fare
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {offer.etaMinutes} min
        </div>
      </div>

      {/* Driver info */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-12 w-12 border-2 border-primary/20">
          {offer.avatarUrl ? (
            <AvatarImage src={offer.avatarUrl} alt={offer.driverName} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
            {offer.driverName?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm truncate">{offer.driverName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {offer.ratingAvg > 0 ? offer.ratingAvg.toFixed(1) : 'New'}
            </span>
            <span>•</span>
            <span>{offer.totalTrips} rides</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Car className="h-3 w-3" />
            {offer.carModel}
          </div>
        </div>
        {/* Countdown badge */}
        <div className={`text-xs font-black tabular-nums ${urgencyColor}`}>
          {secondsLeft}s
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          onClick={() => onAccept(offer.offerId)}
          disabled={disabled || expired}
          className="flex-1 rounded-2xl h-12 text-sm font-bold"
        >
          Accept
        </Button>
        <Button
          variant="secondary"
          onClick={() => onDecline(offer.offerId)}
          disabled={disabled}
          className="flex-1 rounded-2xl h-12 text-sm font-bold bg-muted hover:bg-muted/80 text-foreground"
        >
          Decline
        </Button>
      </div>
    </motion.div>
  );
}
