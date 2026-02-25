import { useEffect, useState } from 'react';

interface Props {
  message?: string;
  onClose?: () => void;
}

export default function CarLoadingSpinner({ message = 'Processing...', onClose }: Props) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 2) % 360);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  // Car position along a circular arc
  const radius = 100;
  const angleRad = (rotation * Math.PI) / 180;
  const carX = 150 + radius * Math.cos(angleRad);
  const carY = 150 + radius * Math.sin(angleRad);
  const carRotation = rotation + 90; // car faces forward along the arc

  // Arc: draw the trail behind the car
  const trailLength = 270; // degrees of trail
  const trailStart = rotation - trailLength;

  const polarToCart = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: 150 + radius * Math.cos(rad), y: 150 + radius * Math.sin(rad) };
  };

  const start = polarToCart(trailStart);
  const end = polarToCart(rotation);
  const largeArc = trailLength > 180 ? 1 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-sm"
        >
          Close
        </button>
      )}

      <div className="w-[300px] h-[300px] relative">
        <svg viewBox="0 0 300 300" className="w-full h-full">
          {/* Gradient for the arc */}
          <defs>
            <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.1" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Trail arc */}
          <path
            d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`}
            fill="none"
            stroke="url(#arcGradient)"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>

        {/* Car emoji positioned on the arc */}
        <div
          className="absolute w-8 h-8 flex items-center justify-center text-2xl"
          style={{
            left: carX - 16,
            top: carY - 16,
            transform: `rotate(${carRotation}deg)`,
          }}
        >
          🚗
        </div>
      </div>

      <p className="text-center text-muted-foreground mt-6 max-w-xs text-lg leading-relaxed">
        {message}
      </p>
    </div>
  );
}
