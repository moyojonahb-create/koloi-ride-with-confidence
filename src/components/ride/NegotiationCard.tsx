// inDrive-style fare negotiation card for rider
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Send, Zap, TrendingUp, Info } from 'lucide-react';
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

export default function NegotiationCard({
  pricing, distanceKm, durationMinutes, onSendOffer, isSubmitting, className
}: NegotiationCardProps) {
  const fareCalc = calculateRecommendedFare(pricing, distanceKm, durationMinutes);
  const step = getFareStep(pricing.currency_code);
  const [customFare, setCustomFare] = useState(fareCalc.recommended);
  const [direction, setDirection] = useState<'up' | 'down'>('up');

  const increment = () => { setDirection('up'); setCustomFare((prev) => Math.min(prev + step, fareCalc.ceiling)); };
  const decrement = () => { setDirection('down'); setCustomFare((prev) => Math.max(prev - step, fareCalc.floor)); };

  const isAboveRecommended = customFare > fareCalc.recommended;
  const isBelowRecommended = customFare < fareCalc.recommended;
  const progressPercent = Math.min(100, (customFare - fareCalc.floor) / (fareCalc.ceiling - fareCalc.floor) * 100);

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
