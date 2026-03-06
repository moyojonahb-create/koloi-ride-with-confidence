import { useState, useEffect, useLayoutEffect } from 'react';
import voyexLogo from '@/assets/voyex-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SplashScreen = ({ onComplete, duration = 3500 }: SplashScreenProps) => {
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

    const t2 = setTimeout(() => setPhase('fade-out'), duration - 500);
    const t3 = setTimeout(complete, duration);

    return () => { clearTimeout(t2); clearTimeout(t3); };
  }, [duration, onComplete]);

  if (phase === 'done') return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-500 ${
        phase === 'fade-out' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Glow ring */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-48 h-48 sm:w-56 sm:h-56 rounded-full animate-pulse" 
          style={{ 
            background: 'radial-gradient(circle, hsl(215 80% 25% / 0.15) 0%, transparent 70%)',
            animation: 'splashGlow 2s ease-in-out infinite'
          }} 
        />
        <div className="absolute w-40 h-40 sm:w-48 sm:h-48 rounded-full border-2 border-primary/20 animate-ping" 
          style={{ animationDuration: '2s' }}
        />
        <img
          src={voyexLogo}
          alt="Voyex"
          className="w-32 h-auto sm:w-40 md:w-48 relative z-10 animate-scale-in"
        />
      </div>

      <style>{`
        @keyframes splashGlow {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
