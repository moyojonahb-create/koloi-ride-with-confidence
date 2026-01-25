import { MapPin, Wifi, Car } from 'lucide-react';

interface KoloiLogoProps {
  className?: string;
  variant?: 'default' | 'inverted';
  showTagline?: boolean;
}

const KoloiLogo = ({ className = '', variant = 'default', showTagline = false }: KoloiLogoProps) => {
  const textColor = variant === 'inverted' ? 'text-primary-foreground' : 'text-foreground';
  const accentColor = variant === 'inverted' ? 'text-accent' : 'text-accent';
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Icon */}
      <div className={`relative w-10 h-10 ${textColor}`}>
        {/* Outer pin shape */}
        <svg 
          viewBox="0 0 40 48" 
          fill="none" 
          className="w-full h-full"
        >
          {/* Pin outline */}
          <path 
            d="M20 0C8.954 0 0 8.954 0 20c0 14.545 18.667 27.333 20 28 1.333-.667 20-13.455 20-28C40 8.954 31.046 0 20 0z" 
            fill="currentColor"
            opacity="0.1"
          />
          <path 
            d="M20 2C10.059 2 2 10.059 2 20c0 12.667 16.5 24.5 18 25.5 1.5-1 18-12.833 18-25.5C38 10.059 29.941 2 20 2z" 
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          {/* Car icon */}
          <rect x="10" y="16" width="20" height="10" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="14" cy="26" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="26" cy="26" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M12 16l2-4h12l2 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
          {/* Wifi waves */}
          <path d="M16 10c2.5-1.5 5.5-1.5 8 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M14 7c4-2.5 8-2.5 12 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
      
      {/* Logo Text */}
      <div className="flex flex-col">
        <span className={`text-2xl font-bold tracking-tight ${textColor}`}>
          Koloi
        </span>
        {showTagline && (
          <span className={`text-xs ${variant === 'inverted' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            Get picked. Get moving.
          </span>
        )}
      </div>
    </div>
  );
};

export default KoloiLogo;
