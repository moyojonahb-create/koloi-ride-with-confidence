import { useState, useEffect, useLayoutEffect } from 'react';
import voyexLogo from '@/assets/voyex-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SplashScreen = ({ onComplete, duration = 5000 }: SplashScreenProps) => {
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
        background: 'linear-gradient(160deg, #0a1628 0%, #0d2847 40%, #112d4e 70%, #0a1628 100%)',
      }}
    >
      {/* Glowing golden ring + logo */}
      <div
        className={`relative transition-all duration-900 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          phase === 'enter'
            ? 'scale-[0.5] opacity-0'
            : 'scale-100 opacity-100'
        }`}
      >
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            width: 200,
            height: 200,
            margin: 'auto',
            top: 0, left: 0, right: 0, bottom: 0,
            boxShadow: '0 0 60px 15px rgba(255, 193, 7, 0.3), 0 0 120px 40px rgba(255, 193, 7, 0.1)',
          }}
        />

        {/* Golden ring */}
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: 192,
            height: 192,
            background: 'conic-gradient(from 0deg, #FFC107, #FFD54F, #FFC107, #F9A825, #FFC107)',
            padding: 5,
          }}
        >
          {/* Inner dark circle */}
          <div
            className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #0d2847, #112d4e)',
            }}
          >
            <img
              src={voyexLogo}
              alt="Voyex"
              className="w-28 h-28 object-contain drop-shadow-lg"
            />
          </div>
        </div>

        {/* Spinning arc highlight */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            width: 192,
            height: 192,
            margin: 'auto',
            top: 0, left: 0, right: 0, bottom: 0,
            border: '3px solid transparent',
            borderTopColor: 'rgba(255, 213, 79, 0.8)',
            animation: 'splashSpin 2s linear infinite',
          }}
        />
      </div>

      {/* Brand name */}
      <h1
        className={`mt-8 text-4xl sm:text-5xl font-bold tracking-wide transition-all duration-700 delay-200 ${
          phase === 'enter'
            ? 'opacity-0 translate-y-4'
            : 'opacity-100 translate-y-0'
        }`}
        style={{
          color: '#FFFFFF',
          textShadow: '0 2px 20px rgba(255, 193, 7, 0.3)',
        }}
      >
        Voyex
      </h1>

      {/* Tagline */}
      <p
        className={`mt-3 text-sm sm:text-base tracking-widest uppercase transition-all duration-700 delay-400 ${
          phase === 'enter'
            ? 'opacity-0 translate-y-4'
            : 'opacity-100 translate-y-0'
        }`}
        style={{ color: 'rgba(255, 193, 7, 0.75)' }}
      >
        Move Smart Across Zimbabwe
      </p>

      {/* Loading bar */}
      <div
        className={`absolute bottom-16 sm:bottom-20 h-[3px] rounded-full overflow-hidden transition-all duration-500 delay-500 ${
          phase === 'enter' ? 'w-0 opacity-0' : 'w-24 sm:w-28 opacity-100'
        }`}
        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #FFC107, #FFD54F)',
            animation: phase !== 'enter' ? `splashBar ${duration - 800}ms ease-out forwards` : 'none',
          }}
        />
      </div>

      <style>{`
        @keyframes splashBar {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes splashSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
