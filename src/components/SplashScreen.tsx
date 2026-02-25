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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === 'fade-out' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'linear-gradient(160deg, #0b3b78 0%, #0a2f5c 60%, #081e3a 100%)' }}
    >
      {/* Subtle radial glow behind logo */}
      <div
        className="absolute w-72 h-72 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(247,198,0,0.5) 0%, transparent 70%)',
        }}
      />

      {/* Logo */}
      <img
        src={splashLogo}
        alt="Koloi"
        className={`w-40 h-auto sm:w-52 md:w-60 relative z-10 transition-all duration-700 ease-out ${
          phase === 'logo-enter'
            ? 'opacity-0 scale-75'
            : 'opacity-100 scale-100'
        }`}
      />

      {/* Tagline */}
      <p
        className={`mt-4 text-white/70 text-sm font-medium tracking-widest uppercase relative z-10 transition-all duration-700 delay-200 ${
          phase === 'logo-enter'
            ? 'opacity-0 translate-y-3'
            : 'opacity-100 translate-y-0'
        }`}
      >
        Ride with Koloi
      </p>

      {/* Loading dots */}
      <div className="flex gap-1.5 mt-8 relative z-10">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-white/40"
            style={{
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
