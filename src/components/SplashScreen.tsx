import { useState, useEffect, useLayoutEffect } from 'react';

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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 ${
        phase === 'fade-out' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(170deg, #061A3A 0%, #0B2E5C 25%, #0D3B7A 50%, #0A2D5E 75%, #051530 100%)',
      }}
    >
      {/* Ambient glow top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
        style={{
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(30,90,180,0.25) 0%, transparent 70%)',
          top: -100,
        }}
      />

      {/* Wave overlays */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 390 844" preserveAspectRatio="none">
        <path
          d="M0,300 Q100,260 195,280 Q290,300 390,270 L390,844 L0,844 Z"
          fill="rgba(20,70,150,0.12)"
        />
        <path
          d="M0,380 Q120,340 200,360 Q300,390 390,350 L390,844 L0,844 Z"
          fill="rgba(15,55,120,0.10)"
        />
        <path
          d="M0,500 Q80,470 190,490 Q310,510 390,480 L390,844 L0,844 Z"
          fill="rgba(10,40,100,0.08)"
        />
      </svg>

      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: Math.random() * 4 + 1.5,
            height: Math.random() * 4 + 1.5,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `rgba(255, 255, 255, ${Math.random() * 0.35 + 0.08})`,
            boxShadow: `0 0 ${Math.random() * 6 + 2}px rgba(255,255,255,${Math.random() * 0.2 + 0.05})`,
            animation: `splashFloat ${4 + Math.random() * 6}s ease-in-out ${Math.random() * 3}s infinite`,
          }}
        />
      ))}

      {/* Main content container */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full px-8">
        {/* Emblem */}
        <div
          className={`relative transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            phase === 'enter' ? 'scale-[0.4] opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          {/* Outer glow */}
          <div
            className="absolute rounded-full"
            style={{
              width: 220,
              height: 220,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 80px 25px rgba(255,193,7,0.25), 0 0 160px 50px rgba(255,193,7,0.08)',
            }}
          />

          {/* Yellow outer ring */}
          <div
            className="relative flex items-center justify-center rounded-full"
            style={{
              width: 200,
              height: 200,
              background: 'conic-gradient(from 0deg, #FFD54F, #FFC107, #FFB300, #FFC107, #FFD54F, #FFC107)',
              padding: 6,
              boxShadow: '0 4px 30px rgba(255,193,7,0.35), inset 0 1px 2px rgba(255,255,255,0.3)',
            }}
          >
            {/* Dark blue inner core */}
            <div
              className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, #0A2D5E, #0D3B7A, #082348)',
                boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.4), inset 0 -2px 10px rgba(30,80,160,0.3)',
              }}
            >
              {/* Glossy highlight */}
              <div
                className="absolute top-0 left-0 w-full h-1/2 rounded-t-full pointer-events-none"
                style={{
                  background: 'linear-gradient(180deg, rgba(100,160,255,0.15) 0%, transparent 100%)',
                }}
              />

              {/* Car icon */}
              <svg width="90" height="65" viewBox="0 0 90 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Car body */}
                <path
                  d="M15,42 L20,25 Q22,20 28,18 L62,18 Q68,20 70,25 L75,42"
                  fill="white"
                  stroke="white"
                  strokeWidth="1"
                />
                {/* Car roof */}
                <path
                  d="M28,18 L32,8 Q34,5 38,5 L52,5 Q56,5 58,8 L62,18"
                  fill="white"
                  stroke="white"
                  strokeWidth="1"
                />
                {/* Window */}
                <path
                  d="M32,17 L35,9 Q36,7 39,7 L51,7 Q54,7 55,9 L58,17"
                  fill="rgba(30,80,160,0.7)"
                  stroke="rgba(30,80,160,0.5)"
                  strokeWidth="0.5"
                />
                {/* Body lower */}
                <rect x="10" y="38" width="70" height="14" rx="4" fill="white" />
                {/* Headlights */}
                <rect x="12" y="40" width="10" height="5" rx="2" fill="#FFD54F" />
                <rect x="68" y="40" width="10" height="5" rx="2" fill="#FFD54F" />
                {/* Grille */}
                <rect x="32" y="42" width="26" height="4" rx="2" fill="rgba(30,80,160,0.4)" />
                {/* Wheels */}
                <circle cx="25" cy="52" r="7" fill="#1a1a1a" />
                <circle cx="25" cy="52" r="4" fill="#555" />
                <circle cx="25" cy="52" r="2" fill="#888" />
                <circle cx="65" cy="52" r="7" fill="#1a1a1a" />
                <circle cx="65" cy="52" r="4" fill="#555" />
                <circle cx="65" cy="52" r="2" fill="#888" />
              </svg>
            </div>
          </div>

          {/* Spinning accent ring */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 216,
              height: 216,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              border: '2px solid transparent',
              borderTopColor: 'rgba(255,213,79,0.6)',
              borderRightColor: 'rgba(255,213,79,0.2)',
              animation: 'splashSpin 3s linear infinite',
            }}
          />
        </div>

        {/* Brand name */}
        <h1
          className={`mt-8 transition-all duration-800 delay-200 ${
            phase === 'enter' ? 'opacity-0 translate-y-6' : 'opacity-100 translate-y-0'
          }`}
          style={{
            fontFamily: "'Segoe UI', 'SF Pro Display', system-ui, -apple-system, sans-serif",
            fontSize: 52,
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '2px',
            textShadow: '0 2px 30px rgba(255,193,7,0.25), 0 4px 15px rgba(0,0,0,0.3)',
          }}
        >
          Voyex
        </h1>

        {/* Tagline */}
        <p
          className={`mt-3 transition-all duration-800 delay-400 ${
            phase === 'enter' ? 'opacity-0 translate-y-6' : 'opacity-100 translate-y-0'
          }`}
          style={{
            fontFamily: "'Segoe UI', 'SF Pro Display', system-ui, -apple-system, sans-serif",
            fontSize: 16,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: '2.5px',
            textTransform: 'uppercase',
          }}
        >
          Smart Social Ridesharing
        </p>
      </div>

      {/* Go Online button */}
      <div
        className={`relative z-10 mb-20 sm:mb-24 transition-all duration-800 delay-600 ${
          phase === 'enter' ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
        }`}
      >
        <button
          onClick={handleGoOnline}
          className="active:scale-[0.97] transition-transform duration-150"
          style={{
            fontFamily: "'Segoe UI', 'SF Pro Display', system-ui, -apple-system, sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: '#0B2E5C',
            background: 'linear-gradient(180deg, #FFD54F 0%, #FFC107 50%, #FFB300 100%)',
            border: 'none',
            borderRadius: 50,
            padding: '16px 64px',
            cursor: 'pointer',
            boxShadow: '0 6px 25px rgba(255,193,7,0.4), 0 2px 10px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.4)',
            letterSpacing: '0.5px',
            minHeight: 52,
          }}
        >
          Go Online
        </button>
      </div>

      {/* Bottom loading bar */}
      <div
        className={`absolute bottom-8 sm:bottom-10 h-[3px] rounded-full overflow-hidden transition-all duration-600 delay-700 ${
          phase === 'enter' ? 'w-0 opacity-0' : 'w-20 opacity-60'
        }`}
        style={{ background: 'rgba(255,255,255,0.1)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #FFC107, #FFD54F)',
            animation: phase !== 'enter' ? `splashBar ${duration - 1000}ms ease-out forwards` : 'none',
          }}
        />
      </div>

      <style>{`
        @keyframes splashBar {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes splashSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes splashFloat {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-15px) scale(1.3); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
