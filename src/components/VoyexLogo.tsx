import voyexLogo from '@/assets/voyex-logo.png';

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
  
  const iconSizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-11 w-11',
    xl: 'h-16 w-16'
  };

  const fullLogoSizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
    xl: 'h-20'
  };

  const sizeClass = iconOnly ? iconSizeClasses[size] : fullLogoSizeClasses[size];
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={voyexLogo} 
        alt="Voyex" 
        className={`${sizeClass} w-auto object-contain`}
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
