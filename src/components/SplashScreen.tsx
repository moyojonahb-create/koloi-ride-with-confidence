import { useState, useEffect, useLayoutEffect } from 'react';
import splashLogo from '@/assets/koloi-splash-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SplashScreen = ({ onComplete, duration = 2800 }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'logo-enter' | 'logo-visible' | 'fade-out' | 'done'>('logo-enter');

  useLayoutEffect(() => {
    const instantSplash = document.getElementById('instant-splash');
    if (instantSplash) instantSplash.remove();
  }, []);

  useEffect(() => {
    let completed = false;
    const complete = () => {
      if (completed) return;
      completed = true;
      onComplete();
    };

    // Phase 1: Logo enters (scale + fade in)
    const t1 = setTimeout(() => setPhase('logo-visible'), 400);
    // Phase 2: Hold
    const t2 = setTimeout(() => setPhase('fade-out'), duration - 500);
    // Phase 3: Complete
    const t3 = setTimeout(complete, duration);
    // Failsafe
    const t4 = setTimeout(complete, 4000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [duration, onComplete]);

  if (phase === 'done') return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-500 ${
        phase === 'fade-out' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <img
        src={splashLogo}
        alt="Koloi"
        className={`w-36 h-auto sm:w-44 md:w-52 transition-all duration-700 ease-out ${
          phase === 'logo-enter'
            ? 'opacity-0 scale-90'
            : 'opacity-100 scale-100'
        }`}
      />
    </div>
  );
};

export default SplashScreen;
