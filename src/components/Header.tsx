import { useState } from 'react';
import { Menu, X, Globe, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KoloiLogo from '@/components/KoloiLogo';

interface HeaderProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

const Header = ({ onLoginClick, onSignupClick }: HeaderProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Ride', href: '#ride' },
    { label: 'Drive', href: '#drive' },
    { label: 'Business', href: '#business' },
    { label: 'About', href: '#about' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="koloi-container">
        <nav className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a href="/" className="shrink-0">
            <KoloiLogo />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1 ml-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="koloi-link-nav"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Desktop Right Side */}
          <div className="hidden lg:flex items-center gap-2">
            <button className="koloi-link-nav flex items-center gap-1">
              <Globe className="w-4 h-4" />
              <span>EN</span>
            </button>
            <a href="#help" className="koloi-link-nav">
              Help
            </a>
            <button 
              onClick={onLoginClick}
              className="koloi-link-nav"
            >
              Log in
            </button>
            <Button 
              onClick={onSignupClick}
              className="koloi-btn-primary h-10 px-4"
            >
              Sign up
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border animate-slide-down">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-4 py-3 text-foreground font-medium hover:bg-secondary rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="border-t border-border my-2" />
              <a
                href="#help"
                className="px-4 py-3 text-foreground font-medium hover:bg-secondary rounded-lg transition-colors"
              >
                Help
              </a>
              <button className="px-4 py-3 text-foreground font-medium hover:bg-secondary rounded-lg transition-colors text-left flex items-center gap-2">
                <Globe className="w-4 h-4" />
                English
              </button>
              <div className="border-t border-border my-2" />
              <div className="flex flex-col gap-2 px-4">
                <Button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLoginClick();
                  }}
                  variant="outline"
                  className="w-full h-12"
                >
                  Log in
                </Button>
                <Button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSignupClick();
                  }}
                  className="koloi-btn-primary w-full"
                >
                  Sign up
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
