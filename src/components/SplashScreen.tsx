import { useState, useEffect, useLayoutEffect } from 'react';
import splashLogo from '@/assets/koloi-splash-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SplashScreen = ({ onComplete, duration = 2500 }: SplashScreenProps) => {
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
    let completed = false;
    
    const complete = () => {
      if (completed) return;
      completed = true;
      setIsVisible(false);
      onComplete();
    };

    // Start fade
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, duration - 300);

    // Complete after duration
    const completeTimer = setTimeout(complete, duration);

    // Failsafe: force complete after 3 seconds no matter what
    const failsafeTimer = setTimeout(complete, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
      clearTimeout(failsafeTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-white flex items-center justify-center transition-opacity duration-300 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <img 
        src={splashLogo}
        alt="Koloi" 
        className="w-48 h-auto sm:w-64 md:w-72 animate-pulse"
        style={{ animationDuration: '2s' }}
      />
    </div>
  );
};

export default SplashScreen;
