interface KoloiLogoProps {
  className?: string;
  variant?: 'default' | 'inverted';
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const KoloiLogo = ({ 
  className = '', 
  variant = 'default', 
  showTagline = false,
  size = 'md' 
}: KoloiLogoProps) => {
  const textColor = variant === 'inverted' ? 'text-primary-foreground' : 'text-foreground';
  const accentColor = 'text-accent';
  
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  };
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Logo Text with Amber underline on 'o' */}
      <div className="flex flex-col">
        <span className={`${sizeClasses[size]} font-display font-bold tracking-tight ${textColor}`}>
          Kol
          <span className="relative">
            o
            <span className={`absolute -bottom-0.5 left-0 right-0 h-1 bg-accent rounded-full`}></span>
          </span>
          i
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
