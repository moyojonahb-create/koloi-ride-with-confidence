import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import splashLogo from '@/assets/koloi-splash-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SplashScreen = ({ onComplete, duration = 3000 }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  // Keep the ref updated to avoid stale closures
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Stable complete function that only runs once
  const handleComplete = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    setIsVisible(false);
    onCompleteRef.current();
  }, []);

  // Remove the HTML instant splash as soon as React takes over
  useLayoutEffect(() => {
    const instantSplash = document.getElementById('instant-splash');
    if (instantSplash) {
      instantSplash.remove();
    }
  }, []);

  useEffect(() => {
    // Start fade slightly before completion
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, duration - 300);

    // Complete after duration
    const completeTimer = setTimeout(() => {
      handleComplete();
    }, duration);

    // Failsafe: force complete after max 4 seconds even if something goes wrong
    const failsafeTimer = setTimeout(() => {
      handleComplete();
    }, 4000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
      clearTimeout(failsafeTimer);
    };
  }, [duration, handleComplete]);

  // If image fails to load, still continue (don't block)
  const handleImageError = () => {
    console.warn('Splash logo failed to load, continuing anyway');
    setImageLoaded(true);
  };

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
        onLoad={() => setImageLoaded(true)}
        onError={handleImageError}
      />
    </div>
  );
};

export default SplashScreen;
