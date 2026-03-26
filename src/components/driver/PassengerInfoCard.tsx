import { motion } from 'framer-motion';
import { Users, Phone, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PassengerInfoCardProps {
  passengerName: string;
  passengerPhone: string;
  onMessage?: () => void;
}

export default function PassengerInfoCard({ passengerName, passengerPhone, onMessage }: PassengerInfoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 border-amber-400/50 bg-amber-50/80 dark:bg-amber-950/20 p-4 space-y-3"
    >
      {/* Header badge */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-amber-400/20 flex items-center justify-center">
          <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
            Ride for Someone Else
          </p>
        </div>
      </div>

      {/* Passenger info */}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{passengerName}</p>
        <p className="text-xs text-muted-foreground font-mono">{passengerPhone}</p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`tel:${passengerPhone.replace(/[^\d+]/g, '')}`}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 text-white font-medium text-xs active:scale-95 transition-all"
        >
          <Phone className="w-3.5 h-3.5" />
          Call Passenger
        </a>
        {onMessage ? (
          <button
            onClick={onMessage}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium text-xs active:scale-95 transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Message
          </button>
        ) : (
          <a
            href={`sms:${passengerPhone.replace(/[^\d+]/g, '')}`}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium text-xs active:scale-95 transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            SMS Passenger
          </a>
        )}
      </div>

      <p className="text-[10px] text-amber-600/70 dark:text-amber-400/60">
        This ride was booked by someone else. Contact the passenger above for pickup.
      </p>
    </motion.div>
  );
}
