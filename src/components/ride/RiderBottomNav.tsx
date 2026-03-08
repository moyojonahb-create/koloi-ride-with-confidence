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
  { id: 'trips', icon: History, label: 'Trips', path: '/history', authRequired: true },
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

  const currentTab = activeTab || (() => {
    const path = location.pathname;
    if (path === '/ride' || path === '/') return 'home';
    if (path === '/profile') return 'profile';
    return 'home';
  })();

  const handleNav = (item: typeof NAV_ITEMS[number]) => {
    if (item.authRequired && !user) { navigate('/auth'); return; }
    navigate(item.path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[55] px-2 sm:px-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 4px)' }}>
      <nav className="glass-card-heavy flex items-center justify-around py-2 px-1" style={{ borderRadius: 24 }}>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 sm:px-5 py-2 rounded-2xl transition-all duration-200 active:scale-95 min-w-[48px]',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5 transition-colors', isActive && 'stroke-[2.5]')} />
              <span className={cn('text-[10px] font-medium transition-colors leading-tight', isActive ? 'text-primary' : 'text-muted-foreground')}>
                {item.label}
              </span>
              {isActive && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
