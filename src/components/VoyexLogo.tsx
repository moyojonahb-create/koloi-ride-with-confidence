import voyexIcon from '@/assets/voyex-icon-only.png';

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
    sm: 'h-9 w-9',
    md: 'h-12 w-12',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20'
  };

  const fullLogoSizeClasses = {
    sm: 'h-10',
    md: 'h-12',
    lg: 'h-14',
    xl: 'h-24'
  };

  const sizeClass = iconOnly ? iconSizeClasses[size] : fullLogoSizeClasses[size];
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={voyexIcon} 
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
