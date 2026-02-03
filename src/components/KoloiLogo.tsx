import koloiLogoImage from '@/assets/koloi-logo-official.png';

interface KoloiLogoProps {
  className?: string;
  variant?: 'default' | 'inverted' | 'light';
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const KoloiLogo = ({ 
  className = '', 
  variant = 'default', 
  showTagline = false,
  size = 'md' 
}: KoloiLogoProps) => {
  const isLight = variant === 'inverted' || variant === 'light';
  const textColor = isLight ? 'text-primary-foreground' : 'text-foreground';
  
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12'
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  };
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Image */}
      <img 
        src={koloiLogoImage} 
        alt="Koloi" 
        className={`${sizeClasses[size]} w-auto`}
      />
      
      {/* Logo Text - hidden since new logo includes text */}
      {showTagline && (
        <span className={`text-xs ${isLight ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          Get picked. Get moving.
        </span>
      )}
    </div>
  );
};

export default KoloiLogo;
