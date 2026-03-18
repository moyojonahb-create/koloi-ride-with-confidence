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

  return;




































































































































































}