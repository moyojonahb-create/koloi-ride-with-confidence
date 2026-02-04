import koloiLogoFull from '@/assets/koloi-logo-full.png';
import koloiIcon from '@/assets/koloi-icon.png';

interface KoloiLogoProps {
  className?: string;
  variant?: 'default' | 'inverted' | 'light';
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  iconOnly?: boolean;
}

const KoloiLogo = ({ 
  className = '', 
  variant = 'default', 
  showTagline = false,
  size = 'md',
  iconOnly = false
}: KoloiLogoProps) => {
  const isLight = variant === 'inverted' || variant === 'light';
  
  // Size configurations for icon-only vs full logo
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

  // Use icon for small sizes or when explicitly requested
  const useIcon = iconOnly || size === 'sm';
  const logoSrc = useIcon ? koloiIcon : koloiLogoFull;
  const sizeClass = useIcon ? iconSizeClasses[size] : fullLogoSizeClasses[size];
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={logoSrc} 
        alt="Koloi" 
        className={`${sizeClass} ${useIcon ? 'rounded-full object-cover' : 'w-auto object-contain'}`}
      />
      
      {showTagline && (
        <span className={`text-xs ${isLight ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          Get picked. Get moving.
        </span>
      )}
    </div>
  );
};

export default KoloiLogo;
