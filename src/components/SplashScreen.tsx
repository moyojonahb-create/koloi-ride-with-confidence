import { useState, useEffect, useLayoutEffect } from 'react';
import voyexLogo from '@/assets/voyex-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SplashScreen = ({ onComplete, duration = 6000 }: SplashScreenProps) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useLayoutEffect(() => {
    document.getElementById('instant-splash')?.remove();
  }, []);

  useEffect(() => {
    // Trigger entrance animation on next frame
    requestAnimationFrame(() => setVisible(true));

    const exitTimer = setTimeout(() => setExiting(true), duration - 700);
    const doneTimer = setTimeout(onComplete, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [duration, onComplete]);

  const handleGoOnline = () => {
    setExiting(true);
    setTimeout(onComplete, 500);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center min-h-screen min-h-dvh transition-opacity duration-700 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'linear-gradient(175deg, #081C38 0%, #0C2D5A 35%, #0E3468 60%, #0A2550 85%, #061228 100%)' }}
    >
      {/* ── Stars ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {STARS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: s.size,
              height: s.size,
              left: s.x,
              top: s.y,
              opacity: s.opacity,
              animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* ── Centered content ── */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full px-6 pb-[18vh]">

        {/* Emblem */}
        <div
          className={`transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            visible ? 'scale-100 opacity-100' : 'scale-[0.35] opacity-0'
          }`}
        >
          {/* Golden glow */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,193,7,0.18) 0%, rgba(255,193,7,0.05) 50%, transparent 75%)' }}
          />

          {/* Gold ring */}
          <div
            className="relative w-[210px] h-[210px] rounded-full p-[7px]"
            style={{
              background: 'conic-gradient(from 220deg, #FFD54F, #FFC107, #FFB300, #FFA000, #FFB300, #FFC107, #FFD54F)',
              boxShadow: '0 0 40px 8px rgba(255,193,7,0.25), 0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            {/* Dark inner disc */}
            <div
              className="w-full h-full rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(150deg, #0C2D5A, #0E3468, #082040)',
                boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.5), inset 0 -2px 8px rgba(30,70,140,0.25)',
              }}
            >
              {/* White logo circle */}
              <div className="w-[140px] h-[140px] rounded-full overflow-hidden bg-white flex items-center justify-center">
                <img
                  src={voyexLogo}
                  alt="Voyex"
                  className="w-[140px] h-[140px] object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Brand name */}
        <h1
          className={`mt-5 text-[46px] font-extrabold text-white tracking-wide leading-none transition-all duration-700 delay-200 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
          style={{ fontFamily: "'Segoe UI', 'SF Pro Display', system-ui, -apple-system, sans-serif", textShadow: '0 2px 15px rgba(0,0,0,0.35)' }}
        >
          Voyex
        </h1>

        {/* Tagline */}
        <p
          className={`mt-1.5 text-sm italic tracking-wide transition-all duration-700 delay-[400ms] ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
          style={{ color: '#FFC107', fontFamily: "'Segoe UI', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}
        >
          Move Smart Across Zimbabwe
        </p>
      </div>

      {/* ── CTA Button ── */}
      <div
        className={`relative z-10 w-full flex justify-center mb-[10vh] transition-all duration-700 delay-[600ms] ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <button
          onClick={handleGoOnline}
          className="active:scale-[0.97] transition-transform duration-150 rounded-full px-20 py-4 text-[17px] font-bold min-h-[52px]"
          style={{
            color: '#0B2E5C',
            background: 'linear-gradient(180deg, #FFD54F 0%, #FFC107 50%, #FFB300 100%)',
            boxShadow: '0 4px 18px rgba(255,193,7,0.35), 0 2px 6px rgba(0,0,0,0.2)',
            fontFamily: "'Segoe UI', 'SF Pro Display', system-ui, -apple-system, sans-serif",
          }}
        >
          Go Online
        </button>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
};

/* Pre-generate star positions so they don't change on re-render */
const STARS = Array.from({ length: 30 }, () => ({
  size: Math.random() * 2.5 + 1,
  x: `${5 + Math.random() * 90}%`,
  y: `${5 + Math.random() * 90}%`,
  opacity: Math.random() * 0.35 + 0.08,
  dur: 3 + Math.random() * 5,
  delay: Math.random() * 3,
}));

export default SplashScreen;
