import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Clock, Wallet, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const tabs = [
  { label: 'Home', icon: Home, path: '/ride' },
  { label: 'Trips', icon: Clock, path: '/history' },
  { label: 'Wallet', icon: Wallet, path: '/wallet' },
  { label: 'Profile', icon: User, path: '/profile' },
];

export default function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isMapp = location.pathname.startsWith('/mapp');

  const handleNav = (path: string) => {
    if (path === '/ride') {
      navigate(isMapp ? '/mapp/ride' : '/ride');
      return;
    }
    if (!user) {
      navigate(isMapp ? '/mapp/login' : '/auth');
      return;
    }
    const mappPaths: Record<string, string> = {
      '/history': '/mapp/ride',
      '/wallet': '/mapp/ride',
      '/profile': '/mapp/profile',
    };
    navigate(isMapp ? mappPaths[path] || path : path);
  };

  const isActive = (path: string) => {
    if (path === '/ride') return location.pathname === '/ride' || location.pathname === '/mapp/ride';
    return location.pathname.startsWith(path) || location.pathname.startsWith(`/mapp${path}`);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[55] glass-card-heavy border-t border-border/20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => handleNav(tab.path)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
