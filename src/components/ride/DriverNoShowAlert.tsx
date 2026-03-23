import { AlertTriangle, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface DriverNoShowAlertProps {
  onCancel: () => void;
  onDismiss: () => void;
}

export default function DriverNoShowAlert({ onCancel, onDismiss }: DriverNoShowAlertProps) {
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-4 left-4 right-4 z-[9990] bg-destructive/95 backdrop-blur-lg rounded-2xl p-4 shadow-xl"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white">Your driver seems delayed</h3>
          <p className="text-xs text-white/80 mt-0.5">
            No movement towards pickup for 5 minutes. You can cancel penalty-free.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2 rounded-xl bg-white text-destructive font-semibold text-xs active:scale-95 transition-all"
            >
              Cancel & Find New Driver
            </button>
            <button
              onClick={onDismiss}
              className="py-2 px-3 rounded-xl bg-white/20 text-white font-semibold text-xs active:scale-95 transition-all"
            >
              Wait
            </button>
          </div>
        </div>
        <button onClick={onDismiss} className="p-1 rounded-full hover:bg-white/10">
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>
    </motion.div>
  );
}
