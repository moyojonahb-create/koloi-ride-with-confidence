import { useState, useEffect, useLayoutEffect } from 'react';
import voyexLogo from '@/assets/voyex-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SplashScreen = ({ onComplete, duration = 5000 }: SplashScreenProps) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useLayoutEffect(() => {
    document.getElementById('instant-splash')?.remove();
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t1 = setTimeout(() => setExiting(true), duration - 500);
    const t2 = setTimeout(onComplete, duration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [duration, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-500 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <img
        src={voyexLogo}
        alt="Voyex"
        className={`w-72 h-72 sm:w-80 sm:h-80 object-contain transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
      />
    </div>
  );
};

export default SplashScreen;
