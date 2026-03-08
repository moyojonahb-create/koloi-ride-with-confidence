import { useState, useEffect, useLayoutEffect } from 'react';
import voyexLogo from '@/assets/voyex-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SplashScreen = ({ onComplete, duration = 3200 }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'fade-out' | 'done'>('enter');

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

    const t1 = setTimeout(() => setPhase('visible'), 100);
    const t2 = setTimeout(() => setPhase('fade-out'), duration - 500);
    const t3 = setTimeout(complete, duration);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [duration, onComplete]);

  if (phase === 'done') return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
        phase === 'fade-out' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Logo with spring entrance */}
      <div
        className={`relative transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          phase === 'enter'
            ? 'scale-[0.6] opacity-0'
            : 'scale-100 opacity-100'
        }`}
      >
        <img
          src={voyexLogo}
          alt="Voyex"
          className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 object-contain"
        />
      </div>


      {/* Minimal loading indicator — thin gold line */}
      <div
        className={`absolute bottom-16 sm:bottom-20 h-[2px] rounded-full overflow-hidden transition-all duration-500 delay-300 ${
          phase === 'enter' ? 'w-0 opacity-0' : 'w-20 sm:w-24 opacity-100'
        }`}
        style={{ background: '#E5E7EB' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #0B3D91, #FFC107)',
            animation: phase !== 'enter' ? `splashBar ${duration - 600}ms ease-out forwards` : 'none',
          }}
        />
      </div>

      <style>{`
        @keyframes splashBar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
