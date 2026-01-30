import { useState } from 'react';
import { Menu, X, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KoloiLogo from '@/components/KoloiLogo';
import UserMenu from '@/components/UserMenu';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
  onFavoritesClick: () => void;
  onHistoryClick: () => void;
}

const Header = ({ onLoginClick, onSignupClick, onFavoritesClick, onHistoryClick }: HeaderProps) => {
  const { user, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Ride', href: '#ride' },
    { label: 'Drive', href: '#drive' },
    { label: 'Business', href: '#business' },
    { label: 'About', href: '#about' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-sm border-b border-primary-foreground/10">
      <div className="koloi-container">
        <nav className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a href="/" className="shrink-0">
            <KoloiLogo variant="light" />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1 ml-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 px-4 py-2 rounded-full transition-all duration-200"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Desktop Right Side */}
          <div className="hidden lg:flex items-center gap-2">
            <button className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 px-4 py-2 rounded-full transition-all duration-200 flex items-center gap-1">
              <Globe className="w-4 h-4" />
              <span>EN</span>
            </button>
            <a href="#help" className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 px-4 py-2 rounded-full transition-all duration-200">
              Help
            </a>
            {!loading && (
              user ? (
                <UserMenu 
                  onFavoritesClick={onFavoritesClick}
                  onHistoryClick={onHistoryClick}
                  variant="light"
                />
              ) : (
                <>
                  <button 
                    onClick={onLoginClick}
                    className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 px-4 py-2 rounded-full transition-all duration-200"
                  >
                    Log in
                  </button>
                  <Button 
                    onClick={onSignupClick}
                    className="h-10 px-6 bg-accent text-accent-foreground font-semibold rounded-full hover:brightness-110"
                  >
                    Sign up
                  </Button>
                </>
              )
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 hover:bg-primary-foreground/10 text-primary-foreground rounded-lg transition-colors"
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
          <div className="lg:hidden py-4 border-t border-primary-foreground/10 animate-slide-down">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-4 py-3 text-primary-foreground font-medium hover:bg-primary-foreground/10 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="border-t border-primary-foreground/10 my-2" />
              <a
                href="#help"
                className="px-4 py-3 text-primary-foreground font-medium hover:bg-primary-foreground/10 rounded-lg transition-colors"
              >
                Help
              </a>
              <button className="px-4 py-3 text-primary-foreground font-medium hover:bg-primary-foreground/10 rounded-lg transition-colors text-left flex items-center gap-2">
                <Globe className="w-4 h-4" />
                English
              </button>
              <div className="border-t border-primary-foreground/10 my-2" />
              {!loading && (
                user ? (
                  <div className="px-4">
                    <UserMenu 
                      onFavoritesClick={() => {
                        setIsMobileMenuOpen(false);
                        onFavoritesClick();
                      }}
                      onHistoryClick={() => {
                        setIsMobileMenuOpen(false);
                        onHistoryClick();
                      }}
                      variant="light"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 px-4">
                    <Button 
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onLoginClick();
                      }}
                      variant="outline"
                      className="w-full h-12 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                    >
                      Log in
                    </Button>
                    <Button 
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onSignupClick();
                      }}
                      className="w-full h-12 bg-accent text-accent-foreground font-semibold hover:brightness-110"
                    >
                      Sign up
                    </Button>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
