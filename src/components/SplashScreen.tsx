import { useState, useEffect, useLayoutEffect } from 'react';
import splashLogo from '@/assets/koloi-splash-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SplashScreen = ({ onComplete, duration = 5000 }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'logo-visible' | 'fade-out' | 'done'>('logo-visible');

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

    // Fade out before completing
    const t2 = setTimeout(() => setPhase('fade-out'), duration - 500);
    const t3 = setTimeout(complete, duration);
    const t4 = setTimeout(complete, 4000);

    return () => { clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
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
        className="w-36 h-auto sm:w-44 md:w-52"
      />
    </div>
  );
};

export default SplashScreen;
