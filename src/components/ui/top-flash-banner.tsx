import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TopFlashBannerProps {
  open: boolean;
  /** Auto-dismiss after this many ms. Default 10000. */
  durationMs?: number;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Right-side slot, e.g. ETA pill. */
  trailing?: React.ReactNode;
  /** Optional CTA shown below the message. */
  actionLabel?: string;
  onAction?: () => void;
  /** Visual tone. */
  tone?: "success" | "info";
  icon?: React.ReactNode;
}

/**
 * Floating, flashing banner that pins to the top of the screen.
 * Auto-dismisses after `durationMs` (default 10s).
 * Designed for "driver arrived" / "rider on the way" moments.
 */
export default function TopFlashBanner({
  open,
  durationMs = 10_000,
  onClose,
  title,
  subtitle,
  trailing,
  actionLabel,
  onAction,
  tone = "success",
  icon,
}: TopFlashBannerProps) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(durationMs / 1000));

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(Math.ceil(durationMs / 1000));
    const dismiss = setTimeout(onClose, durationMs);
    const tick = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      clearTimeout(dismiss);
      clearInterval(tick);
    };
  }, [open, durationMs, onClose]);

  const toneClasses =
    tone === "success"
      ? "bg-green-600 text-white"
      : "bg-primary text-primary-foreground";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="top-flash-banner"
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed left-0 right-0 z-[2000] pointer-events-none flex justify-center px-3"
          style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
        >
          <motion.div
            animate={{
              boxShadow: [
                "0 8px 24px rgba(0,0,0,0.18)",
                "0 8px 36px rgba(34,197,94,0.55)",
                "0 8px 24px rgba(0,0,0,0.18)",
              ],
            }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            className={cn(
              "pointer-events-auto w-full max-w-md rounded-2xl px-4 py-3 backdrop-blur-md ring-1 ring-white/20",
              toneClasses
            )}
          >
            <div className="flex items-center gap-3">
              {icon && (
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                  className="shrink-0"
                >
                  {icon}
                </motion.div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-base font-extrabold leading-tight truncate">{title}</p>
                {subtitle && (
                  <p className="text-xs opacity-90 leading-snug mt-0.5 truncate">{subtitle}</p>
                )}
              </div>
              {trailing && <div className="shrink-0">{trailing}</div>}
              <button
                onClick={onClose}
                aria-label="Dismiss"
                className="shrink-0 -mr-1 w-8 h-8 inline-flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionLabel && onAction && (
              <button
                onClick={() => { onAction(); onClose(); }}
                className="mt-3 w-full h-10 rounded-xl bg-white text-foreground font-bold text-sm active:scale-[0.98] transition shadow-sm"
              >
                {actionLabel}
              </button>
            )}

            {/* Countdown bar */}
            <div className="mt-2 h-1 rounded-full bg-white/25 overflow-hidden">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: durationMs / 1000, ease: "linear" }}
                className="h-full bg-white"
              />
            </div>
            <p className="sr-only">Auto-dismiss in {secondsLeft}s</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
