import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import PickMeLogo from "@/components/PickMeLogo";
import UserMenu from "@/components/UserMenu";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
  onFavoritesClick: () => void;
  onHistoryClick: () => void;
  transparent?: boolean;
}

const Header = ({ onLoginClick, onSignupClick, onFavoritesClick, onHistoryClick, transparent = false }: HeaderProps) => {
  const { user, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Ride", href: "#ride" },
    { label: "Drive", href: "#drive" },
    { label: "Business", href: "#business" },
    { label: "About", href: "#about" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border/20 shadow-sm">
      <div className="pickme-container">
        <nav className="flex items-center justify-between h-[60px] lg:h-[64px] bg-destructive-foreground">
          {/* Logo */}
          <a href="/" className="shrink-0 -ml-2">
            <PickMeLogo size="lg" variant={transparent ? 'light' : 'default'} />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-0.5 ml-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`text-[15px] font-semibold px-5 py-2.5 rounded-xl transition-all duration-150 ${transparent ? 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10' : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'}`}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Desktop Right Side */}
          <div className="hidden lg:flex items-center gap-2">
            <LanguageSwitcher />
            <a
              href="#help"
              className={`text-[15px] font-medium px-4 py-2.5 rounded-xl transition-all duration-150 ${transparent ? 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10' : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'}`}
            >
              Help
            </a>
            {!loading &&
              (user ? (
                <UserMenu onFavoritesClick={onFavoritesClick} onHistoryClick={onHistoryClick} />
              ) : (
                <>
                  <button
                    onClick={onLoginClick}
                    className={`text-[15px] font-medium px-4 py-2.5 rounded-xl transition-all duration-150 ${transparent ? 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10' : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'}`}
                  >
                    Log in
                  </button>
                  <Button onClick={onSignupClick} variant="accent" size="sm" className="font-bold">
                    Sign up
                  </Button>
                </>
              ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden p-3 rounded-xl active:scale-90 transition-all ${transparent ? 'text-primary-foreground hover:bg-primary-foreground/10' : 'text-foreground hover:bg-muted/50'}`}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-5 border-t border-[var(--glass-border-subtle)] animate-slide-down">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-5 py-4 text-[15px] text-foreground font-semibold hover:bg-muted/50 rounded-xl transition-colors active:scale-[0.98]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="border-t border-[var(--glass-border-subtle)] my-3" />
              <a
                href="#help"
                className="px-4 py-3.5 text-foreground font-medium hover:bg-muted/50 rounded-xl transition-colors"
              >
                Help
              </a>
              <LanguageSwitcher />
              <div className="border-t border-[var(--glass-border-subtle)] my-3" />
              {!loading &&
                (user ? (
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
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 px-4">
                    <Button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onLoginClick();
                      }}
                      variant="outline"
                      size="lg"
                      className="w-full"
                    >
                      Log in
                    </Button>
                    <Button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onSignupClick();
                      }}
                      variant="accent"
                      size="lg"
                      className="w-full"
                    >
                      Sign up
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
