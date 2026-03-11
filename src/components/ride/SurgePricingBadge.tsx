import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Moon, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SurgePricingBadgeProps {
  demandMultiplier: number;
  isNight: boolean;
  className?: string;
}

export default function SurgePricingBadge({ demandMultiplier, isNight, className }: SurgePricingBadgeProps) {
  const isSurge = demandMultiplier > 1.0;
  const showBadge = isSurge || isNight;

  if (!showBadge) return null;

  const surgeLevel = demandMultiplier >= 1.5 ? 'high' : demandMultiplier >= 1.2 ? 'medium' : 'low';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold',
          isSurge && surgeLevel === 'high' && 'bg-destructive/15 text-destructive',
          isSurge && surgeLevel === 'medium' && 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
          isSurge && surgeLevel === 'low' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
          !isSurge && isNight && 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
          className
        )}
      >
        {isSurge ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              {surgeLevel === 'high' ? (
                <Flame className="w-3.5 h-3.5" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5" />
              )}
            </motion.div>
            <span>{demandMultiplier.toFixed(1)}× Surge</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5" />
            <span>Night Rate</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
