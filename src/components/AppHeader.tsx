import { Link } from "react-router-dom";
import PickMeLogo from "@/components/PickMeLogo";

/**
 * Slim, consistent white header with the 3x PickMe logo.
 *
 * Used on marketing / static / auth screens that don't have their own
 * full-screen chrome (map shells like /ride, /driver/dashboard intentionally
 * skip this so the map stays edge-to-edge).
 *
 * The logo scales down on phone & tablet so it never crowds out the page.
 */
const AppHeader = () => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-border/20 shadow-sm">
      <div className="pickme-container">
        <div className="flex items-center h-20 sm:h-24 md:h-28 lg:h-32">
          <Link to="/" aria-label="PickMe home" className="flex items-center -ml-2">
            <PickMeLogo size="lg" variant="default" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
