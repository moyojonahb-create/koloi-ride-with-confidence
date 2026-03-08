import { useNavigate, useLocation } from 'react-router-dom';
import { Home, History, CreditCard, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  id: string;
  icon: typeof Home;
  label: string;
  path: string;
  authRequired?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', icon: Home, label: 'Home', path: '/ride' },
  { id: 'trips', icon: History, label: 'Trips', path: '/profile', authRequired: true },
  { id: 'wallet', icon: CreditCard, label: 'Wallet', path: '/profile', authRequired: true },
  { id: 'profile', icon: User, label: 'Profile', path: '/profile', authRequired: true },
];

interface RiderBottomNavProps {
  activeTab?: 'home' | 'trips' | 'wallet' | 'profile';
}

export default function RiderBottomNav({ activeTab }: RiderBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Auto-detect active tab from path if not explicitly set
  const currentTab = activeTab || (() => {
    const path = location.pathname;
    if (path === '/ride' || path === '/') return 'home';
    if (path === '/profile') return 'profile';
    return 'home';
  })();

  const handleNav = (item: typeof NAV_ITEMS[number]) => {
    if (item.authRequired && !user) {
      navigate('/auth');
      return;
    }
    navigate(item.path);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[55] px-3"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 6px)' }}
    >
      <nav className="glass-card-heavy rounded-[28px] flex items-center justify-around py-2.5 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-2xl transition-all duration-200 active:scale-95 min-w-[56px]',
                isActive
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5 transition-colors', isActive && 'stroke-[2.5]')} />
              <span className={cn(
                'text-[10px] font-semibold transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
