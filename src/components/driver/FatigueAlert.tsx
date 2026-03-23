import { Clock, AlertTriangle, Coffee } from 'lucide-react';
import { motion } from 'framer-motion';

interface FatigueAlertProps {
  breakTimeRemaining: string;
  totalHours: number;
}

export default function FatigueAlert({ breakTimeRemaining, totalHours }: FatigueAlertProps) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div className="w-full max-w-sm bg-background rounded-3xl p-6 space-y-5 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
          <Coffee className="w-10 h-10 text-amber-500" />
        </div>

        <div>
          <h2 className="text-xl font-black text-foreground">Time for a Break</h2>
          <p className="text-sm text-muted-foreground mt-1">
            You've been online for <span className="font-bold text-foreground">{Math.round(totalHours)}+ hours</span> in the last 24 hours.
          </p>
        </div>

        <div className="bg-amber-500/10 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-center gap-2 text-amber-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Rest Required</span>
          </div>
          <p className="text-sm text-muted-foreground">
            For your safety and the safety of your riders, ride acceptance is paused.
          </p>
        </div>

        <div className="bg-muted rounded-2xl p-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Back online in</span>
          </div>
          <p className="text-3xl font-black text-foreground tabular-nums">{breakTimeRemaining}</p>
        </div>

        <p className="text-xs text-muted-foreground">
          Get some rest, grab a meal, and come back refreshed. Your riders will be here! 💪
        </p>
      </div>
    </motion.div>
  );
}
