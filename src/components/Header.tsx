import { useState } from "react";
import { Menu, X, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import KoloiLogo from "@/components/KoloiLogo";
import UserMenu from "@/components/UserMenu";
import { useAuth } from "@/hooks/useAuth";

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
    { label: "Ride", href: "#ride" },
    { label: "Drive", href: "#drive" },
    { label: "Business", href: "#business" },
    { label: "About", href: "#about" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-border/40 shadow-sm">
      <div className="koloi-container">
        <nav className="flex items-center justify-between h-[60px] lg:h-[64px]">
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
                className="text-[15px] font-semibold text-foreground/70 hover:text-foreground hover:bg-muted px-5 py-2.5 rounded-full transition-all duration-150"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Desktop Right Side */}
          <div className="hidden lg:flex items-center gap-3">
            <button className="text-[15px] font-medium text-foreground/70 hover:text-foreground hover:bg-muted px-4 py-2.5 rounded-full transition-all duration-150 flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              <span>EN</span>
            </button>
            <a
              href="#help"
              className="text-[15px] font-medium text-foreground/70 hover:text-foreground hover:bg-muted px-4 py-2.5 rounded-full transition-all duration-150"
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
                    className="text-[15px] font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 px-4 py-2.5 rounded-full transition-all duration-150"
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
            className="lg:hidden p-3 hover:bg-primary-foreground/10 text-primary-foreground rounded-2xl active:scale-90 transition-all"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-5 border-t border-primary-foreground/10 animate-slide-down">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-5 py-4 text-[15px] text-primary-foreground font-semibold hover:bg-primary-foreground/10 rounded-2xl transition-colors active:scale-[0.98]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="border-t border-primary-foreground/10 my-3" />
              <a
                href="#help"
                className="px-4 py-3.5 text-primary-foreground font-medium hover:bg-primary-foreground/10 rounded-2xl transition-colors"
              >
                Help
              </a>
              <button className="px-4 py-3.5 text-primary-foreground font-medium hover:bg-primary-foreground/10 rounded-2xl transition-colors text-left flex items-center gap-2">
                <Globe className="w-4 h-4" />
                English
              </button>
              <div className="border-t border-primary-foreground/10 my-3" />
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
                      variant="light"
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
                      className="w-full border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
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
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />;
