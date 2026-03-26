import { motion } from 'framer-motion';
import { Volume2, Thermometer, Accessibility, Ear, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RidePreferenceTagsProps {
  quietRide?: boolean;
  coolTemperature?: boolean;
  wavRequired?: boolean;
  hearingImpaired?: boolean;
  genderPreference?: string;
  size?: 'sm' | 'md';
}

const TAG_CONFIGS = [
  { key: 'quietRide', icon: Volume2, label: 'Quiet Ride', color: 'bg-primary/10 text-primary border-primary/20' },
  { key: 'coolTemperature', icon: Thermometer, label: 'Cool Temp', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  { key: 'wavRequired', icon: Accessibility, label: 'WAV Required', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { key: 'hearingImpaired', icon: Ear, label: 'Hearing Impaired', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
] as const;

export default function RidePreferenceTags({ quietRide, coolTemperature, wavRequired, hearingImpaired, genderPreference, size = 'sm' }: RidePreferenceTagsProps) {
  const values: Record<string, boolean | undefined> = { quietRide, coolTemperature, wavRequired, hearingImpaired };
  const activeTags = TAG_CONFIGS.filter(t => values[t.key]);
  const showGender = genderPreference && genderPreference !== 'any';
  
  if (activeTags.length === 0 && !showGender) return null;

  const isSmall = size === 'sm';

  return (
    <div className="flex flex-wrap gap-1.5">
      {activeTags.map((tag, i) => (
        <motion.span
          key={tag.key}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05, type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border font-semibold',
            tag.color,
            isSmall ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
          )}
        >
          <tag.icon className={isSmall ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          {tag.label}
        </motion.span>
      ))}
      {showGender && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: activeTags.length * 0.05, type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border font-semibold',
            'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
            isSmall ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
          )}
        >
          <ShieldCheck className={isSmall ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          Women Only
        </motion.span>
      )}
    </div>
  );
}
