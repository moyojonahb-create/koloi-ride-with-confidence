import pickmeLogo from '@/assets/pickme-logo.png';

interface PickMeLogoProps {
  className?: string;
  variant?: 'default' | 'inverted' | 'light';
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  iconOnly?: boolean;
}

const sizeClasses = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-32',     // 3x — header logo
  xl: 'h-40',
};

const PickMeLogo = ({ 
  className = '', 
  variant = 'default', 
  showTagline = false,
  size = 'md',
}: PickMeLogoProps) => {
  const isLight = variant === 'inverted' || variant === 'light';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={pickmeLogo} 
        alt="PickMe" 
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
      
      {showTagline && (
        <span className={`text-xs ${isLight ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          Your ride, your way.
        </span>
      )}
    </div>
  );
};

export default PickMeLogo;
