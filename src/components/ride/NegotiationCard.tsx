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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('glass-card rounded-2xl p-4', className)}
    >
      {/* Smart tip */}
      {smart.smartTip && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          <smart.tipIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{smart.smartTip}</span>
        </div>
      )}

      {/* Fare display */}
      <div className="mb-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">Your offer</p>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={customFare}
            initial={{ y: direction === 'up' ? 16 : -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: direction === 'up' ? -16 : 16, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="inline-block text-4xl font-bold"
            style={{ background: 'linear-gradient(135deg, hsl(45 100% 45%), hsl(35 100% 40%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            {formatFare(customFare, fareCalc.currencySymbol)}
          </motion.span>
        </AnimatePresence>
        <p className="mt-1 text-xs text-muted-foreground">
          Recommended: {formatFare(fareCalc.recommended, fareCalc.currencySymbol)}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full',
            isBelowRecommended ? 'bg-accent' : isAboveRecommended ? 'bg-primary' : 'bg-foreground'
          )}
          animate={{ width: `${progressPercent}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>

      {/* +/- controls */}
      <div className="mb-4 flex items-center justify-center gap-6">
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={decrement}
          disabled={customFare <= fareCalc.floor}
        >
          <Minus className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={increment}
          disabled={customFare >= fareCalc.ceiling}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Quick picks */}
      <div className="mb-4 flex gap-2 justify-center">
        {quickPicks.map((pick) => (
          <button
            key={pick.label}
            onClick={() => { setCustomFare(pick.value); setDirection(pick.value > customFare ? 'up' : 'down'); }}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              customFare === pick.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted'
            )}
          >
            {pick.label} · {formatFare(pick.value, fareCalc.currencySymbol)}
          </button>
        ))}
      </div>

      {/* Send button */}
      <Button
        className="w-full gap-2"
        size="lg"
        disabled={isSubmitting}
        onClick={() => onSendOffer(customFare)}
      >
        <Send className="h-4 w-4" />
        {isSubmitting ? 'Sending…' : 'Send Offer'}
      </Button>
    </motion.div>
  );
}