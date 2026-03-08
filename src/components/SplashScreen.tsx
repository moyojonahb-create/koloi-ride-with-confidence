import { useState, useEffect, useLayoutEffect } from 'react';
import voyexLogo from '@/assets/voyex-logo-transparent.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SplashScreen = ({ onComplete, duration = 6000 }: SplashScreenProps) => {
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

    const t1 = setTimeout(() => setPhase('visible'), 80);
    const t2 = setTimeout(() => setPhase('fade-out'), duration - 700);
    const t3 = setTimeout(complete, duration);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [duration, onComplete]);

  const handleGoOnline = () => {
    setPhase('fade-out');
    setTimeout(onComplete, 500);
  };

  if (phase === 'done') return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center overflow-hidden transition-opacity duration-700 ${
        phase === 'fade-out' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(175deg, #0A1E3D 0%, #0C2D5A 30%, #0E3468 55%, #0B2850 80%, #061530 100%)',
      }}
    >
      {/* Subtle star particles */}
      {Array.from({ length: 25 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `rgba(255, 255, 255, ${Math.random() * 0.4 + 0.1})`,
            animation: `splashTwinkle ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 2}s infinite`,
          }}
        />
      ))}

      {/* Content — pushed up from center to match reference */}
      <div className="relative z-10 flex flex-col items-center mt-auto mb-auto" style={{ paddingBottom: '15vh' }}>
        {/* Voyex emblem — the actual logo with golden glow */}
        <div
          className={`relative transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            phase === 'enter' ? 'scale-[0.4] opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          {/* Golden ambient glow behind logo */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 260,
              height: 260,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(255,193,7,0.2) 0%, rgba(255,193,7,0.08) 40%, transparent 70%)',
            }}
          />

          {/* Logo image */}
          <img
            src={voyexLogo}
            alt="Voyex"
            className="relative z-10"
            style={{
              width: 200,
              height: 200,
              objectFit: 'contain',
              filter: 'drop-shadow(0 8px 30px rgba(0,0,0,0.4)) drop-shadow(0 0 40px rgba(255,193,7,0.15))',
            }}
          />
        </div>

        {/* Brand name — large bold white */}
        <h1
          className={`transition-all duration-800 delay-200 ${
            phase === 'enter' ? 'opacity-0 translate-y-5' : 'opacity-100 translate-y-0'
          }`}
          style={{
            marginTop: 16,
            fontFamily: "'Segoe UI', 'SF Pro Display', system-ui, -apple-system, sans-serif",
            fontSize: 48,
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '1.5px',
            textShadow: '0 2px 20px rgba(0,0,0,0.3)',
            lineHeight: 1,
          }}
        >
          Voyex
        </h1>

        {/* Tagline — golden italic */}
        <p
          className={`transition-all duration-800 delay-400 ${
            phase === 'enter' ? 'opacity-0 translate-y-5' : 'opacity-100 translate-y-0'
          }`}
          style={{
            marginTop: 8,
            fontFamily: "'Segoe UI', 'SF Pro Display', system-ui, -apple-system, sans-serif",
            fontSize: 14,
            fontWeight: 400,
            fontStyle: 'italic',
            color: '#FFC107',
            letterSpacing: '0.5px',
          }}
        >
          Move Smart Across Zimbabwe
        </p>
      </div>

      {/* Go Online button — pinned toward bottom like reference */}
      <div
        className={`relative z-10 w-full flex justify-center transition-all duration-800 delay-600 ${
          phase === 'enter' ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
        }`}
        style={{ marginBottom: '12vh' }}
      >
        <button
          onClick={handleGoOnline}
          className="active:scale-[0.97] transition-transform duration-150"
          style={{
            fontFamily: "'Segoe UI', 'SF Pro Display', system-ui, -apple-system, sans-serif",
            fontSize: 17,
            fontWeight: 700,
            color: '#0B2E5C',
            background: 'linear-gradient(180deg, #FFD54F 0%, #FFC107 50%, #FFB300 100%)',
            border: 'none',
            borderRadius: 50,
            padding: '15px 72px',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(255,193,7,0.35), 0 2px 8px rgba(0,0,0,0.2)',
            letterSpacing: '0.3px',
            minHeight: 52,
          }}
        >
          Go Online
        </button>
      </div>

      <style>{`
        @keyframes splashTwinkle {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
