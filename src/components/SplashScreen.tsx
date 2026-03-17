import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import voyexSplash from '@/assets/voyex-splash.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SPLASH_KEY = '__voyex_splash_shown';

const SplashScreen = ({ onComplete, duration = 1200 }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');
  const calledRef = useRef(false);

  useLayoutEffect(() => {
    document.getElementById('instant-splash')?.remove();
  }, []);

  useEffect(() => {
    // Prevent double-fire in StrictMode
    if (calledRef.current) return;
    calledRef.current = true;

    // If splash already shown this session, skip immediately
    if (sessionStorage.getItem(SPLASH_KEY)) {
      onComplete();
      return;
    }

    sessionStorage.setItem(SPLASH_KEY, '1');
    const exitTimer = setTimeout(() => setPhase('exit'), duration - 300);
    const doneTimer = setTimeout(onComplete, duration);
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [duration, onComplete]);

  // If already shown, render nothing
  if (sessionStorage.getItem(SPLASH_KEY) && phase === 'enter' && calledRef.current) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-300 ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <img
        src={voyexSplash}
        alt="Voyex"
        className="w-56 h-56 object-contain animate-[splash-pop_0.4s_ease-out_both]"
      />
    </div>
  );
};

export default SplashScreen;
