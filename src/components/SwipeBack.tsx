import { useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { haptic } from '@/lib/haptics';

/**
 * Wrap a page to enable edge-swipe-right → navigate back.
 * Only triggers when the swipe starts within 24px of the left edge.
 */
export default function SwipeBack({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, 120], [0, 0.35]);
  const startXRef = useRef(0);

  // Don't enable on root pages
  const rootPaths = ['/', '/ride', '/mapp/ride'];
  if (rootPaths.includes(location.pathname)) {
    return <>{children}</>;
  }

  const handlePanStart = (_: unknown, info: PanInfo) => {
    startXRef.current = (info as any).point?.x ?? 999;
  };

  const handlePan = (_: unknown, info: PanInfo) => {
    if (startXRef.current > 24) return;
    x.set(Math.max(0, info.offset.x));
  };

  const handlePanEnd = (_: unknown, info: PanInfo) => {
    if (startXRef.current > 24) { x.set(0); return; }
    if (info.offset.x > 100 && info.velocity.x > 200) {
      haptic('light');
      navigate(-1);
    }
    x.set(0);
  };

  return (
    <motion.div
      onPanStart={handlePanStart}
      onPan={handlePan}
      onPanEnd={handlePanEnd}
      style={{ x, position: 'relative' }}
    >
      {/* Back indicator */}
      <motion.div
        style={{ opacity }}
        className="fixed left-0 top-1/2 -translate-y-1/2 w-8 h-16 rounded-r-full bg-primary/20 backdrop-blur-sm z-[100] flex items-center justify-center pointer-events-none"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </motion.div>
      {children}
    </motion.div>
  );
}
