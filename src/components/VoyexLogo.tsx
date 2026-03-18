import voyexLogo from '@/assets/voyex-logo-new.png';

interface VoyexLogoProps {
  className?: string;
  variant?: 'default' | 'inverted' | 'light';
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  iconOnly?: boolean;
}

const VoyexLogo = ({ 
  className = '', 
  variant = 'default', 
  showTagline = false,
  size = 'md',
  iconOnly = false
}: VoyexLogoProps) => {
  const isLight = variant === 'inverted' || variant === 'light';
  
  // Circle container sizes for iconOnly mode
  const circleSizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  };

  // Full logo display sizes
  const fullLogoSizeClasses = {
    sm: 'h-10',
    md: 'h-12',
    lg: 'h-14',
    xl: 'h-24'
  };

  if (iconOnly) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`${circleSizeClasses[size]} rounded-full bg-card overflow-hidden flex items-center justify-center shadow-sm ring-1 ring-border/20`}>
          <img 
            src={voyexLogo} 
            alt="Voyex" 
            className="w-[85%] h-[85%] object-contain"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={voyexLogo} 
        alt="Voyex" 
        className={`${fullLogoSizeClasses[size]} w-auto object-contain`}
      />
      
      {showTagline && (
        <span className={`text-xs ${isLight ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          Your ride, your way.
        </span>
      )}
    </div>
  );
};

export default VoyexLogo;
