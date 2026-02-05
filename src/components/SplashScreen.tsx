import { useState, useEffect, useLayoutEffect } from 'react';
import splashLogo from '@/assets/koloi-splash-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SplashScreen = ({ onComplete, duration = 5000 }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  // Remove the HTML instant splash as soon as React takes over
  useLayoutEffect(() => {
    const instantSplash = document.getElementById('instant-splash');
    if (instantSplash) {
      instantSplash.remove();
    }
  }, []);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, duration - 300);

    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-koloi-white flex items-center justify-center transition-opacity duration-300 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <img 
        src="/icons/koloi-launch.png" 
        alt="Koloi" 
        className="w-48 h-auto sm:w-64 md:w-72 animate-fade-in animate-pulse"
        style={{ animationDuration: '2s' }}
      />
    </div>
  );
};

export default SplashScreen;
