/* eslint-disable react-hooks/exhaustive-deps */
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
  formatFare } from
'@/hooks/useTownPricing';

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
    const isPeak = hour >= 7 && hour <= 9 || hour >= 16 && hour <= 18;
    const isShortTrip = distanceKm < 2;
    const isLongTrip = distanceKm > 10;

    let smartTip = '';
    let tipIcon = Info;

    if (isNight) {
      smartTip = 'Night rates apply — drivers may expect more';
      tipIcon = Moon;
    } else if (isPeak) {
      smartTip = 'Peak hour — higher fares get faster matches';
      tipIcon = Clock;
    } else if (isShortTrip) {
      smartTip = 'Short trip — minimum fare applies';
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

  const increment = () => {setDirection('up');setCustomFare((prev) => Math.min(prev + step, fareCalc.ceiling));};
  const decrement = () => {setDirection('down');setCustomFare((prev) => Math.max(prev - step, fareCalc.floor));};

  const isAboveRecommended = customFare > fareCalc.recommended;
  const isBelowRecommended = customFare < fareCalc.recommended;
  const progressPercent = Math.min(100, (customFare - fareCalc.floor) / (fareCalc.ceiling - fareCalc.floor) * 100);

  // Quick-pick fare presets
  const quickPicks = useMemo(() => {
    const picks = [
    { label: 'Budget', value: fareCalc.floor, color: 'text-accent' },
    { label: 'Fair', value: fareCalc.recommended, color: 'text-foreground' },
    { label: 'Priority', value: Math.min(fareCalc.recommended + step * 2, fareCalc.ceiling), color: 'text-primary' }];

    return picks.filter((p, i, arr) => arr.findIndex((q) => q.value === p.value) === i);
  }, [fareCalc, step]);

  return (
    <div className={cn('glass-card rounded-3xl p-4 space-y-4', className)}>
      {/* Smart tip */}
      {smart.smartTip && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/10 text-accent text-xs font-medium">
          <smart.tipIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{smart.smartTip}</span>
        </div>
      )}

      {/* Fare display */}
      <div className="text-center">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Your offer</p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={decrement}
            disabled={customFare <= fareCalc.floor}
            className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center active:scale-90 transition-all disabled:opacity-30"
          >
            <Minus className="w-5 h-5 text-foreground" />
          </button>
          <AnimatePresence mode="wait">
            <motion.p
              key={customFare}
              initial={{ y: direction === 'up' ? 15 : -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: direction === 'up' ? -15 : 15, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'text-4xl font-black tabular-nums min-w-[100px] text-center',
                isAboveRecommended ? 'text-primary' : isBelowRecommended ? 'text-accent' : 'text-foreground'
              )}
            >
              {formatFare(customFare, pricing.currency_symbol)}
            </motion.p>
          </AnimatePresence>
          <button
            onClick={increment}
            disabled={customFare >= fareCalc.ceiling}
            className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center active:scale-90 transition-all disabled:opacity-30"
          >
            <Plus className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: isAboveRecommended ? 'hsl(var(--primary))' : isBelowRecommended ? 'hsl(var(--accent))' : 'hsl(var(--foreground))' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground -mt-2">
        <span>{formatFare(fareCalc.floor, pricing.currency_symbol)}</span>
        <span className="font-bold">Recommended: {formatFare(fareCalc.recommended, pricing.currency_symbol)}</span>
        <span>{formatFare(fareCalc.ceiling, pricing.currency_symbol)}</span>
      </div>

      {/* Quick picks */}
      <div className="flex gap-2">
        {quickPicks.map((pick) => (
          <button
            key={pick.label}
            onClick={() => {setCustomFare(pick.value);setDirection(pick.value > customFare ? 'up' : 'down');}}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-xs font-bold text-center transition-all active:scale-95',
              customFare === pick.value ? 'bg-primary text-primary-foreground' : 'glass-card'
            )}
          >
            {pick.label}
          </button>
        ))}
      </div>

      {/* Fare context */}
      {isAboveRecommended && (
        <p className="text-[11px] text-primary font-medium text-center">
          ⚡ Higher offer — faster driver match!
        </p>
      )}
      {isBelowRecommended && (
        <p className="text-[11px] text-accent font-medium text-center">
          💡 Below recommended — fewer drivers may accept
        </p>
      )}

      {/* Send button */}
      <Button
        onClick={() => onSendOffer(customFare)}
        disabled={isSubmitting}
        className="w-full h-14 rounded-2xl text-base font-bold"
        style={{ background: 'var(--gradient-primary)' }}
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <Zap className="w-5 h-5" />
            </motion.div>
            Finding drivers…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Offer {formatFare(customFare, pricing.currency_symbol)}
          </span>
        )}
      </Button>

      {/* Distance info */}
      <p className="text-center text-[10px] text-muted-foreground">
        {distanceKm.toFixed(1)} km · ~{durationMinutes} min · {pricing.currency_code}
      </p>
    </div>
  );
}
