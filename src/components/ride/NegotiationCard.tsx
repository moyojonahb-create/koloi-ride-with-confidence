// inDrive-style fare negotiation card with smart suggestions
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Send, Zap, TrendingUp, Info, Clock, Sun, Moon, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type TownPricingConfig,
  calculateRecommendedFare,
  getFareStep,
  formatFare
} from '@/hooks/useTownPricing';

interface NegotiationCardProps {
  pricing: TownPricingConfig;
  distanceKm: number;
  durationMinutes: number;
  onSendOffer: (fare: number) => void;
  isSubmitting?: boolean;
  className?: string;
}

/** Smart fare context based on time/distance */
function useSmartFareContext(distanceKm: number, durationMinutes: number) {
  return useMemo(() => {
    const hour = new Date().getHours();
    const isNight = hour >= 20 || hour < 6;
    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18);
    const isShortTrip = distanceKm < 2;
    const isLongTrip = distanceKm > 8;

    let smartTip = '';
    let tipIcon: typeof Sun = Sun;

    if (isNight) {
      smartTip = 'Night hours — drivers expect higher fares';
      tipIcon = Moon;
    } else if (isPeak) {
      smartTip = 'Peak hour — demand is high, offer more to get matched faster';
      tipIcon = Clock;
    } else if (isShortTrip) {
      smartTip = 'Short trip — a fair offer gets you matched quickly';
      tipIcon = Zap;
    } else if (isLongTrip) {
      smartTip = 'Long trip — drivers prefer these, standard fare works well';
      tipIcon = TrendingUp;
    }

    return { isNight, isPeak, isShortTrip, isLongTrip, smartTip, tipIcon };
  }, [distanceKm, durationMinutes]);
}

export default function NegotiationCard({
  pricing, distanceKm, durationMinutes, onSendOffer, isSubmitting, className
}: NegotiationCardProps) {
  const fareCalc = calculateRecommendedFare(pricing, distanceKm, durationMinutes);
  const step = getFareStep(pricing.currency_code);
  const [customFare, setCustomFare] = useState(fareCalc.recommended);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const smart = useSmartFareContext(distanceKm, durationMinutes);

  const increment = () => { setDirection('up'); setCustomFare((prev) => Math.min(prev + step, fareCalc.ceiling)); };
  const decrement = () => { setDirection('down'); setCustomFare((prev) => Math.max(prev - step, fareCalc.floor)); };

  const isAboveRecommended = customFare > fareCalc.recommended;
  const isBelowRecommended = customFare < fareCalc.recommended;
  const progressPercent = Math.min(100, (customFare - fareCalc.floor) / (fareCalc.ceiling - fareCalc.floor) * 100);

  // Quick-pick fare presets
  const quickPicks = useMemo(() => {
    const picks = [
      { label: 'Budget', value: fareCalc.floor, color: 'text-accent' },
      { label: 'Fair', value: fareCalc.recommended, color: 'text-foreground' },
      { label: 'Priority', value: Math.min(fareCalc.recommended + step * 2, fareCalc.ceiling), color: 'text-primary' },
    ];
    return picks.filter((p, i, arr) => arr.findIndex(q => q.value === p.value) === i);
  }, [fareCalc, step]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn('glass-card rounded-2xl p-4 space-y-3 glass-glow-blue', className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 1 }}>
            <Zap className="w-4 h-4 text-accent" />
          </motion.div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Your Offer</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5" />
          <span>{distanceKm.toFixed(1)} km • ~{durationMinutes} min</span>
        </div>
      </div>

      {/* Smart context tip */}
      {smart.smartTip && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/10"
        >
          <smart.tipIcon className="w-4 h-4 text-accent shrink-0" />
          <span className="text-[11px] font-medium text-accent-foreground/80">{smart.smartTip}</span>
        </motion.div>
      )}

      {/* Quick-pick fare chips */}
      <div className="flex gap-2">
        {quickPicks.map((pick) => (
          <motion.button
            key={pick.label}
            whileTap={{ scale: 0.92 }}
            onClick={() => { setCustomFare(pick.value); setDirection(pick.value > customFare ? 'up' : 'down'); }}
            className={cn(
              'flex-1 py-2 rounded-xl text-center transition-all',
              customFare === pick.value ? 'glass-card ring-1 ring-primary/30 shadow-voyex-sm' : 'bg-muted/40'
            )}
          >
            <p className={cn('text-[10px] font-bold uppercase tracking-wider', pick.color)}>{pick.label}</p>
            <p className="text-sm font-bold text-foreground">{formatFare(pick.value, fareCalc.currencySymbol, fareCalc.currencyCode)}</p>
          </motion.button>
        ))}
      </div>

      {/* Recommended fare */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-primary/8"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary">Recommended</span>
        </div>
        <span className="font-bold text-primary">
          {formatFare(fareCalc.recommended, fareCalc.currencySymbol, fareCalc.currencyCode)}
        </span>
      </motion.div>

      {/* Fare stepper */}
      <div className="flex items-center justify-center gap-4 my-0">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={decrement}
          disabled={customFare <= fareCalc.floor}
          className="w-12 h-12 rounded-full glass-card flex items-center justify-center transition-all disabled:opacity-30 shrink-0 shadow-voyex-sm"
        >
          <Minus className="w-5 h-5 text-foreground" />
        </motion.button>

        <div className="text-center min-w-[110px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={customFare}
              initial={{ y: direction === 'up' ? 20 : -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: direction === 'up' ? -20 : 20, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={cn(
                'text-3xl sm:text-4xl font-black font-display tabular-nums transition-colors',
                isAboveRecommended ? 'text-primary' : isBelowRecommended ? 'text-accent' : 'text-foreground'
              )}
            >
              {formatFare(customFare, fareCalc.currencySymbol, fareCalc.currencyCode)}
            </motion.p>
          </AnimatePresence>
          <p className="text-[10px] text-muted-foreground mt-0.5">Increments of $0.50</p>
        </div>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={increment}
          disabled={customFare >= fareCalc.ceiling}
          className="w-12 h-12 rounded-full glass-card flex items-center justify-center transition-all disabled:opacity-30 shrink-0 shadow-voyex-sm"
        >
          <Plus className="w-5 h-5 text-foreground" />
        </motion.button>
      </div>

      {/* Fare hint */}
      <AnimatePresence mode="wait">
        {isBelowRecommended && (
          <motion.p key="low" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-xs text-center text-accent font-medium">
            ⚡ Lower offers may take longer to get accepted
          </motion.p>
        )}
        {isAboveRecommended && (
          <motion.p key="high" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-xs text-center text-primary font-medium">
            🚀 Higher offers attract drivers faster
          </motion.p>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="px-1">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>{formatFare(fareCalc.floor, fareCalc.currencySymbol, fareCalc.currencyCode)}</span>
          <span>{formatFare(fareCalc.ceiling, fareCalc.currencySymbol, fareCalc.currencyCode)}</span>
        </div>
        <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden relative">
          {/* Recommended marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary/40 z-10"
            style={{ left: `${Math.min(100, (fareCalc.recommended - fareCalc.floor) / (fareCalc.ceiling - fareCalc.floor) * 100)}%` }}
          />
          {/* Fill bar */}
          <motion.div
            className={cn(
              'absolute h-full rounded-full',
              isAboveRecommended ? 'bg-primary' : isBelowRecommended ? 'bg-accent' : 'bg-primary'
            )}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
      </div>

      {/* Send button */}
      <motion.div whileTap={{ scale: 0.97 }}>
        <Button
          onClick={() => onSendOffer(customFare)}
          disabled={isSubmitting}
          className={cn(
            'w-full h-[52px] text-[15px] font-semibold rounded-2xl gap-2',
            'bg-accent hover:bg-accent/90 text-accent-foreground shadow-[0_4px_24px_hsl(45_100%_51%/0.35)]'
          )}
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? 'Sending…' : 'Send Offer'}
        </Button>
      </motion.div>

      <p className="text-[10px] text-center text-muted-foreground">
        Prices in {pricing.currency_code} • {pricing.town_name}
      </p>
    </motion.div>
  );
}
