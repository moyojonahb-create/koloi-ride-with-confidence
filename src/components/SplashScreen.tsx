import { useState, useEffect, useLayoutEffect } from 'react';
import voyexLogo from '@/assets/voyex-logo-clean.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SplashScreen = ({ onComplete, duration = 4000 }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'enter' | 'glow' | 'fade-out' | 'done'>('enter');

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

    const t1 = setTimeout(() => setPhase('glow'), 400);
    const t2 = setTimeout(() => setPhase('fade-out'), duration - 600);
    const t3 = setTimeout(complete, duration);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [duration, onComplete]);

  if (phase === 'done') return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-600 ${
        phase === 'fade-out' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(160deg, hsl(215 80% 12%) 0%, hsl(215 70% 8%) 40%, hsl(220 60% 5%) 100%)',
      }}
    >
      {/* Ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${4 + i * 2}px`,
              height: `${4 + i * 2}px`,
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 25}%`,
              background: i % 2 === 0
                ? 'hsl(215 80% 50% / 0.3)'
                : 'hsl(45 100% 55% / 0.25)',
              animation: `splashFloat ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* Outer glow rings */}
      <div className="relative flex items-center justify-center">
        {/* Ring 1 — large soft glow */}
        <div
          className={`absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full transition-all duration-1000 ${
            phase === 'enter' ? 'scale-50 opacity-0' : 'scale-100 opacity-100'
          }`}
          style={{
            background: 'radial-gradient(circle, hsl(215 80% 40% / 0.12) 0%, transparent 70%)',
            animation: phase === 'glow' ? 'splashPulse 2.5s ease-in-out infinite' : 'none',
          }}
        />

        {/* Ring 2 — accent gold ring */}
        <div
          className={`absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full transition-all duration-700 ${
            phase === 'enter' ? 'scale-75 opacity-0' : 'scale-100 opacity-100'
          }`}
          style={{
            border: '1.5px solid hsl(45 100% 55% / 0.15)',
            animation: phase === 'glow' ? 'splashRingSpin 8s linear infinite' : 'none',
          }}
        />

        {/* Ring 3 — blue inner ring */}
        <div
          className={`absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full transition-all duration-500 ${
            phase === 'enter' ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
          }`}
          style={{
            border: '1px solid hsl(215 80% 50% / 0.2)',
            animation: phase === 'glow' ? 'splashPing 3s ease-in-out infinite' : 'none',
          }}
        />

        {/* Logo */}
        <img
          src={voyexLogo}
          alt="Voyex"
          className={`w-36 h-auto sm:w-44 md:w-52 relative z-10 transition-all duration-700 drop-shadow-2xl ${
            phase === 'enter'
              ? 'scale-75 opacity-0 translate-y-4'
              : 'scale-100 opacity-100 translate-y-0'
          }`}
          style={{
            filter: 'drop-shadow(0 0 30px hsl(215 80% 50% / 0.3))',
          }}
        />
      </div>

      {/* Tagline */}
      <p
        className={`mt-8 text-sm sm:text-base font-medium tracking-[0.2em] uppercase transition-all duration-700 delay-300 ${
          phase === 'enter'
            ? 'opacity-0 translate-y-3'
            : phase === 'fade-out'
              ? 'opacity-0'
              : 'opacity-70 translate-y-0'
        }`}
        style={{ color: 'hsl(215 30% 70%)' }}
      >
        Your ride, your way
      </p>

      {/* Loading bar */}
      <div
        className={`mt-6 h-[2px] rounded-full overflow-hidden transition-all duration-500 ${
          phase === 'enter' ? 'w-0 opacity-0' : 'w-32 sm:w-40 opacity-100'
        }`}
        style={{ background: 'hsl(215 30% 20%)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, hsl(215 80% 50%), hsl(45 100% 55%))',
            animation: phase !== 'enter' ? `splashLoad ${duration - 800}ms ease-out forwards` : 'none',
          }}
        />
      </div>

      <style>{`
        @keyframes splashPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes splashPing {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.05); opacity: 0.15; }
        }
        @keyframes splashRingSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes splashFloat {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.3); opacity: 0.6; }
        }
        @keyframes splashLoad {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
