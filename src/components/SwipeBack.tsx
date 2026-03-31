import { useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { hapticSync } from '@/lib/haptics';

interface SwipeBackProps {
  children: ReactNode;
  threshold?: number;
}

/** iOS-style swipe-from-left-edge to go back */
export default function SwipeBack({ children, threshold = 80 }: SwipeBackProps) {
  const navigate = useNavigate();
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, 150], [1, 0.6]);
  const triggered = useRef(false);

  const handleDrag = (_: any, info: PanInfo) => {
    if (info.offset.x > threshold && !triggered.current) {
      triggered.current = true;
      hapticSync('light');
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > threshold) {
      navigate(-1);
    }
    triggered.current = false;
  };

  return (
    <motion.div
      style={{ x, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.5 }}
      dragDirectionLock
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      className="min-h-[100dvh]"
    >
      {children}
    </motion.div>
  );
}
