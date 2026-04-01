import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Clock, Car, Shield, User } from 'lucide-react';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';

export interface PremiumOffer {
  offerId: string;
  driverId: string;
  driverName: string;
  avatarUrl?: string | null;
  ratingAvg: number;
  totalTrips: number;
  carModel: string;
  carColor?: string | null;
  plateNumber: string;
  etaMinutes: number;
  fare: number;
  gender?: string | null;
  acceptedAt: number;
  expiresAt: number;
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
      setSecondsLeft(Math.max(0, Math.ceil((offer.expiresAt - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [offer.expiresAt]);

  const expired = secondsLeft <= 0;
  if (expired) return null;

  const urgencyPct = Math.min(100, (secondsLeft / 60) * 100);
  const isUrgent = secondsLeft <= 15;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      layout
      className="bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden"
    >
      {/* Blue top bar */}
      <div className="px-4 py-1.5 text-center text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary">
        Driver Offer
      </div>
      {/* Countdown progress bar */}
      <div className="h-1 bg-muted">
        <motion.div
          className={`h-full ${isUrgent ? 'bg-destructive' : 'bg-primary'}`}
          animate={{ width: `${urgencyPct}%` }}
          transition={{ duration: 0.5, ease: 'linear' }}
        />
      </div>

      <div className="p-4">
        {/* Top: fare + countdown */}
        <div className="flex items-center justify-between mb-3">
          <motion.span
            key={offer.fare}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-2xl font-black text-primary tabular-nums"
          >
            ${offer.fare.toFixed(2)}
          </motion.span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {offer.etaMinutes} min
            </span>
            <span className={`text-xs font-black tabular-nums px-2 py-0.5 rounded-full ${
              isUrgent ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
            }`}>
              {secondsLeft}s
            </span>
          </div>
        </div>

        {/* Driver info */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-sm">
            {offer.avatarUrl && <AvatarImage src={offer.avatarUrl} alt={offer.driverName} />}
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
              {offer.driverName?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-foreground text-sm truncate">{offer.driverName}</p>
              {offer.totalTrips >= 50 && (
                <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {offer.ratingAvg > 0 ? offer.ratingAvg.toFixed(1) : 'New'}
              </span>
              <span className="text-border">•</span>
              <span>{offer.totalTrips} rides</span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-0.5">
                <Car className="h-3 w-3" /> {offer.carModel}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <motion.div whileTap={{ scale: 0.95 }}>
            <PrimaryButton
              onClick={() => onAccept(offer.offerId)}
              disabled={disabled || expired}
              className="w-full h-11 text-sm font-bold rounded-2xl inline-flex items-center justify-center"
            >
              Accept
            </PrimaryButton>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <SecondaryButton
              onClick={() => onDecline(offer.offerId)}
              disabled={disabled}
              className="w-full h-11 text-sm font-bold rounded-2xl"
            >
              Decline
            </SecondaryButton>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
