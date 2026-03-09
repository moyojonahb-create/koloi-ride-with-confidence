// inDrive-style fare negotiation card for rider
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Send, Edit3, Zap, TrendingUp, Info } from 'lucide-react';
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

export default function NegotiationCard({
  pricing,
  distanceKm,
  durationMinutes,
  onSendOffer,
  isSubmitting,
  className
}: NegotiationCardProps) {
  const fareCalc = calculateRecommendedFare(pricing, distanceKm, durationMinutes);
  const step = getFareStep(pricing.currency_code);
  const [customFare, setCustomFare] = useState(fareCalc.recommended);
  const [isEditing, setIsEditing] = useState(false);

  const increment = () => setCustomFare((prev) => Math.min(prev + step, fareCalc.ceiling));
  const decrement = () => setCustomFare((prev) => Math.max(prev - step, fareCalc.floor));

  const isAboveRecommended = customFare > fareCalc.recommended;
  const isBelowRecommended = customFare < fareCalc.recommended;

  return (
    <div className={cn('glass-card rounded-2xl p-4 space-y-3 glass-glow-blue', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" />
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Your Offer</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5" />
          <span>{distanceKm.toFixed(1)} km • ~{durationMinutes} min</span>
        </div>
      </div>

      {/* Recommended fare */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-primary/8">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary">Recommended</span>
        </div>
        <span className="font-bold text-primary">
          {formatFare(fareCalc.recommended, fareCalc.currencySymbol, fareCalc.currencyCode)}
        </span>
      </div>

      {/* Fare stepper */}
      <div className="flex items-center justify-center gap-4 my-0">
        <button
          onClick={decrement}
          disabled={customFare <= fareCalc.floor}
          className="w-11 h-11 rounded-full glass-card flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 shrink-0">
          
          <Minus className="w-5 h-5 text-foreground" />
        </button>

        <div className="text-center min-w-[100px]">
          <p className={cn(
            'text-3xl sm:text-4xl font-black font-display tabular-nums transition-colors',
            isAboveRecommended ? 'text-primary' : isBelowRecommended ? 'text-accent' : 'text-foreground'
          )}>
            {formatFare(customFare, fareCalc.currencySymbol, fareCalc.currencyCode)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Increments of $0.50
          </p>
        </div>

        <button
          onClick={increment}
          disabled={customFare >= fareCalc.ceiling}
          className="w-11 h-11 rounded-full glass-card flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 shrink-0">
          
          <Plus className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Fare hint */}
      {isBelowRecommended &&
      <p className="text-xs text-center text-accent font-medium">
          ⚡ Lower offers may take longer to get accepted
        </p>
      }
      {isAboveRecommended &&
      <p className="text-xs text-center text-primary font-medium">
          🚀 Higher offers attract drivers faster
        </p>
      }

      {/* Range indicator */}
      <div className="px-1">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>{formatFare(fareCalc.floor, fareCalc.currencySymbol, fareCalc.currencyCode)}</span>
          <span>{formatFare(fareCalc.ceiling, fareCalc.currencySymbol, fareCalc.currencyCode)}</span>
        </div>
        <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden relative">
          <div
            className="absolute h-full bg-primary/30 rounded-full"
            style={{
              left: '0%',
              width: `${Math.min(100, (fareCalc.recommended - fareCalc.floor) / (fareCalc.ceiling - fareCalc.floor) * 100)}%`
            }} />
          
          <div
            className="absolute h-full w-1.5 bg-primary rounded-full"
            style={{
              left: `${Math.min(100, (customFare - fareCalc.floor) / (fareCalc.ceiling - fareCalc.floor) * 100)}%`
            }} />
          
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          onClick={() => onSendOffer(customFare)}
          disabled={isSubmitting}
          className={cn(
            'flex-1 h-[52px] text-[15px] font-medium rounded-2xl gap-2 active:scale-[0.97]',
            'bg-accent hover:bg-accent/90 text-accent-foreground shadow-[0_4px_24px_hsl(45_100%_51%/0.35)]'
          )}>
          
          <Send className="w-4 h-4" />
          {isSubmitting ? 'Sending…' : `Send Offer`}
        </Button>
      </div>

      {/* Currency note */}
      <p className="text-[10px] text-center text-muted-foreground">
        Prices in {pricing.currency_code} • {pricing.town_name}
      </p>
    </div>);

}