import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Send, MapPin, Navigation, Clock, CreditCard, Users } from 'lucide-react';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { InputField } from '@/components/ui/input-field';
import RidePreferenceTags from '@/components/ride/RidePreferenceTags';

interface RidePrefs {
  quiet_ride: boolean;
  cool_temperature: boolean;
  wav_required?: boolean;
  hearing_impaired?: boolean;
  gender_preference?: string;
}

interface OfferModalProps {
  ride: {
    id: string;
    pickup_address: string;
    dropoff_address: string;
    fare: number;
    distance_km: number;
    duration_minutes: number;
    passenger_count?: number;
    payment_method?: string;
    vehicle_type?: string;
  };
  preferences?: RidePrefs | null;
  offerPrice: number;
  eta: number;
  note: string;
  submitting: boolean;
  onClose: () => void;
  onInc: () => void;
  onDec: () => void;
  onEtaChange: (v: number) => void;
  onNoteChange: (v: string) => void;
  onSubmit: () => void;
  fmtUSD: (n: number) => string;
}

export default function DriverOfferModal({
  ride, preferences, offerPrice, eta, note, submitting,
  onClose, onInc, onDec, onEtaChange, onNoteChange, onSubmit, fmtUSD,
}: OfferModalProps) {
  const hasPrefs = preferences && (
    preferences.quiet_ride || preferences.cool_temperature ||
    preferences.wav_required || preferences.hearing_impaired ||
    (preferences.gender_preference && preferences.gender_preference !== 'any')
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 350, damping: 35 }}
          className="relative w-full max-w-lg bg-background rounded-t-[28px] z-10 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          <div className="px-5 pb-6 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-foreground">Make an Offer</h3>
              <button
                onClick={onClose}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Route card */}
            <div className="bg-muted/50 rounded-2xl p-3">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center mt-1 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-primary/10" />
                  <div className="w-0.5 h-6 bg-border" />
                  <div className="w-3 h-3 rounded-full bg-destructive ring-4 ring-destructive/10" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{ride.pickup_address}</p>
                  <p className="text-xs text-muted-foreground truncate mt-1">{ride.dropoff_address}</p>
                </div>
              </div>

              {/* Meta chips */}
              <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-border/30">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <Navigation className="w-3 h-3" /> {ride.distance_km?.toFixed(1)} km
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <Clock className="w-3 h-3" /> ~{ride.duration_minutes} min
                </span>
                {ride.passenger_count && ride.passenger_count > 1 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Users className="w-3 h-3" /> {ride.passenger_count} pax
                  </span>
                )}
                {ride.payment_method && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                    <CreditCard className="w-3 h-3" /> {ride.payment_method}
                  </span>
                )}
              </div>
            </div>

            {/* Preferences */}
            {hasPrefs && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rider Requirements</p>
                <RidePreferenceTags
                  quietRide={preferences!.quiet_ride}
                  coolTemperature={preferences!.cool_temperature}
                  wavRequired={preferences!.wav_required}
                  hearingImpaired={preferences!.hearing_impaired}
                  genderPreference={preferences!.gender_preference}
                  size="md"
                />
              </div>
            )}

            {/* Price stepper — hero element */}
            <div className="flex items-center justify-center gap-6 py-2">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onDec}
                className="w-12 h-12 rounded-full bg-muted flex items-center justify-center active:bg-muted/80 transition-colors"
              >
                <Minus className="h-5 w-5 text-foreground" />
              </motion.button>
              <motion.div
                key={offerPrice}
                initial={{ scale: 1.15, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center min-w-[100px]"
              >
                <p className="text-4xl font-black text-foreground tabular-nums">
                  {fmtUSD(offerPrice)}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  Rider asked {fmtUSD(ride.fare)}
                </p>
              </motion.div>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onInc}
                className="w-12 h-12 rounded-full bg-muted flex items-center justify-center active:bg-muted/80 transition-colors"
              >
                <Plus className="h-5 w-5 text-foreground" />
              </motion.button>
            </div>

            {/* ETA + Note row */}
            <div className="grid grid-cols-[80px_1fr] gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">ETA</label>
                <InputField
                  type="number"
                  value={eta}
                  onChange={(e) => onEtaChange(Math.max(1, Number(e.target.value) || 10))}
                  className="text-center"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Note</label>
                <InputField value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder="e.g., Night service" />
              </div>
            </div>

            {/* Submit */}
            <motion.div whileTap={{ scale: 0.97 }}>
              <PrimaryButton
                className="w-full inline-flex items-center justify-center gap-2"
                onClick={onSubmit}
                disabled={submitting}
              >
                <Send className="h-4 w-4" />
                {submitting ? "Sending…" : `Send Offer • ${fmtUSD(offerPrice)}`}
              </PrimaryButton>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
