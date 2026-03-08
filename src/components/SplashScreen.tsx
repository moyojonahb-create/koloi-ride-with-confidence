import { useState, useEffect, useLayoutEffect } from 'react';
import voyexLogo from '@/assets/voyex-logo.png';

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

  /* ── Reference-matched layout ──
     Dark navy gradient bg · star particles
     Logo in yellow-bordered circle · "Voyex" large white bold
     "Move Smart Across Zimbabwe" italic gold
     Yellow pill "Go Online" button near bottom
  */

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center overflow-hidden transition-opacity duration-700 ${
        phase === 'fade-out' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(175deg, #081C38 0%, #0C2D5A 35%, #0E3468 60%, #0A2550 85%, #061228 100%)',
      }}
    >
      {/* Star particles */}
      {Array.from({ length: 30 }).map((_, i) => {
        const size = Math.random() * 2.5 + 1;
        return (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: size,
              height: size,
              left: `${5 + Math.random() * 90}%`,
              top: `${5 + Math.random() * 90}%`,
              background: 'white',
              opacity: Math.random() * 0.35 + 0.08,
              animation: `splashTwinkle ${3 + Math.random() * 5}s ease-in-out ${Math.random() * 3}s infinite`,
            }}
          />
        );
      })}

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center w-full flex-1 justify-center" style={{ paddingBottom: '18vh' }}>

        {/* Emblem: yellow ring → dark inner circle → logo */}
        <div
          className={`relative transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            phase === 'enter' ? 'scale-[0.35] opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          {/* Ambient golden glow */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: 280,
              height: 280,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,193,7,0.18) 0%, rgba(255,193,7,0.06) 50%, transparent 75%)',
            }}
          />

          {/* Yellow outer ring */}
          <div
            style={{
              width: 210,
              height: 210,
              borderRadius: '50%',
              background: 'conic-gradient(from 220deg, #FFD54F, #FFC107, #FFB300, #FFA000, #FFB300, #FFC107, #FFD54F)',
              padding: 7,
              boxShadow: '0 0 40px 8px rgba(255,193,7,0.25), 0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            {/* Dark blue inner disc */}
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'linear-gradient(150deg, #0C2D5A, #0E3468, #082040)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.5), inset 0 -2px 8px rgba(30,70,140,0.25)',
                overflow: 'hidden',
              }}
            >
              {/* Glossy top highlight */}
              <div
                className="absolute top-0 left-0 w-full pointer-events-none"
                style={{
                  height: '45%',
                  borderRadius: '50% 50% 0 0',
                  background: 'linear-gradient(180deg, rgba(80,140,220,0.12) 0%, transparent 100%)',
                }}
              />
              {/* Voyex logo — the actual brand mark */}
              <img
                src={voyexLogo}
                alt="Voyex"
                style={{
                  width: 140,
                  height: 140,
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>
        </div>

        {/* Brand name */}
        <h1
          className={`transition-all duration-700 delay-200 ${
            phase === 'enter' ? 'opacity-0 translate-y-5' : 'opacity-100 translate-y-0'
          }`}
          style={{
            marginTop: 20,
            fontFamily: "'Segoe UI', 'SF Pro Display', system-ui, -apple-system, sans-serif",
            fontSize: 46,
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '1px',
            textShadow: '0 2px 15px rgba(0,0,0,0.35)',
            lineHeight: 1.1,
          }}
        >
          Voyex
        </h1>

        {/* Tagline */}
        <p
          className={`transition-all duration-700 delay-400 ${
            phase === 'enter' ? 'opacity-0 translate-y-5' : 'opacity-100 translate-y-0'
          }`}
          style={{
            marginTop: 6,
            fontFamily: "'Segoe UI', 'SF Pro Display', system-ui, -apple-system, sans-serif",
            fontSize: 14,
            fontWeight: 400,
            fontStyle: 'italic',
            color: '#FFC107',
            letterSpacing: '0.4px',
          }}
        >
          Move Smart Across Zimbabwe
        </p>
      </div>

      {/* Go Online button */}
      <div
        className={`relative z-10 w-full flex justify-center transition-all duration-700 delay-600 ${
          phase === 'enter' ? 'opacity-0 translate-y-6' : 'opacity-100 translate-y-0'
        }`}
        style={{ marginBottom: '10vh' }}
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
            padding: '15px 80px',
            cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(255,193,7,0.35), 0 2px 6px rgba(0,0,0,0.2)',
            letterSpacing: '0.3px',
            minHeight: 52,
          }}
        >
          Go Online
        </button>
      </div>

      <style>{`
        @keyframes splashTwinkle {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
