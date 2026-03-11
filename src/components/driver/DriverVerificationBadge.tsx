import { motion } from 'framer-motion';
import { Shield, Star, Award, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DriverVerificationBadgeProps {
  ratingAvg: number | null;
  totalTrips: number | null;
  isVerified?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

type BadgeTier = 'new' | 'silver' | 'gold' | 'platinum';

function getBadgeTier(rating: number, trips: number): BadgeTier {
  if (trips >= 100 && rating >= 4.8) return 'platinum';
  if (trips >= 50 && rating >= 4.5) return 'gold';
  if (trips >= 10 && rating >= 4.0) return 'silver';
  return 'new';
}

const badgeConfig: Record<BadgeTier, { label: string; icon: typeof Star; gradient: string; textColor: string; borderColor: string }> = {
  new: {
    label: 'New Driver',
    icon: Shield,
    gradient: 'from-muted to-muted',
    textColor: 'text-muted-foreground',
    borderColor: 'border-border',
  },
  silver: {
    label: 'Verified',
    icon: CheckCircle,
    gradient: 'from-slate-400 to-slate-500',
    textColor: 'text-slate-100',
    borderColor: 'border-slate-400/30',
  },
  gold: {
    label: 'Top Driver',
    icon: Star,
    gradient: 'from-amber-400 to-amber-500',
    textColor: 'text-amber-50',
    borderColor: 'border-amber-400/30',
  },
  platinum: {
    label: 'Elite',
    icon: Award,
    gradient: 'from-violet-500 to-indigo-500',
    textColor: 'text-violet-50',
    borderColor: 'border-violet-400/30',
  },
};

export default function DriverVerificationBadge({
  ratingAvg,
  totalTrips,
  isVerified = true,
  size = 'sm',
  className,
}: DriverVerificationBadgeProps) {
  const rating = ratingAvg ?? 0;
  const trips = totalTrips ?? 0;
  const tier = getBadgeTier(rating, trips);
  const config = badgeConfig[tier];
  const Icon = config.icon;

  if (tier === 'new' && !isVerified) return null;

  const isSm = size === 'sm';

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-bold',
        `bg-gradient-to-r ${config.gradient}`,
        config.borderColor,
        isSm ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        className
      )}
    >
      <Icon className={cn(isSm ? 'w-3 h-3' : 'w-3.5 h-3.5', config.textColor)} />
      <span className={config.textColor}>{config.label}</span>
    </motion.div>
  );
}
