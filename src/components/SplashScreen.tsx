import { useState, useEffect, useLayoutEffect } from 'react';
import voyexSplash from '@/assets/voyex-splash.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SplashScreen = ({ onComplete, duration = 1200 }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');

  useLayoutEffect(() => {
    document.getElementById('instant-splash')?.remove();
  }, []);

  useEffect(() => {
    // Kick enter animation on next frame
    const exitTimer = setTimeout(() => setPhase('exit'), duration - 300);
    const doneTimer = setTimeout(onComplete, duration);
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [duration, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-300 ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <img
        src={voyexSplash}
        alt="Voyex"
        className="w-56 h-56 object-contain animate-[splash-pop_0.4s_ease-out_both]"
      />
    </div>
  );
};

export default SplashScreen;
