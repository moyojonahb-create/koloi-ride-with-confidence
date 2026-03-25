import { motion, AnimatePresence } from 'framer-motion';
import { Car, Shield, Clock, Radio } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SearchingOverlayProps {
  secondsLeft: number;
  driversNearby?: number;
  offersCount?: number;
  onCancel?: () => void;
}

const SEARCHING_MESSAGES = [
  { text: "Searching for nearby drivers…", icon: Radio },
  { text: "Checking driver availability…", icon: Car },
  { text: "All drivers are verified ✓", icon: Shield },
  { text: "Finding the best match for you…", icon: Car },
  { text: "Your safety is our priority", icon: Shield },
];

export default function SearchingOverlay({ secondsLeft, driversNearby = 0, offersCount = 0, onCancel }: SearchingOverlayProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % SEARCHING_MESSAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const current = SEARCHING_MESSAGES[msgIndex];
  const Icon = current.icon;
  const progress = Math.min(100, (secondsLeft / 300) * 100);

  return (
    <div className="space-y-4">
      {/* Animated searching card */}
      <div className="bg-card rounded-2xl p-5 shadow-sm border border-border/40">
        {/* Pulsing radar animation */}
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-20 h-20">
            {/* Pulse rings */}
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-2 border-primary/20"
                initial={{ scale: 0.5, opacity: 0.6 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 2, delay: i * 0.6, ease: 'easeOut' }}
              />
            ))}
            {/* Center icon */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            >
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Car className="w-7 h-7 text-primary-foreground" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Dynamic message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={msgIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">{current.text}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
          {driversNearby > 0 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1"
            >
              <Car className="w-3.5 h-3.5" />
              {driversNearby} drivers nearby
            </motion.span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {Math.ceil(secondsLeft / 60)} min remaining
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-4 w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Offers badge */}
      {offersCount > 0 && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-accent/10 border border-accent/30 rounded-2xl p-3 text-center"
        >
          <p className="text-sm font-bold text-accent-foreground">
            🎉 {offersCount} driver{offersCount > 1 ? 's' : ''} responded!
          </p>
        </motion.div>
      )}
    </div>
  );
}
