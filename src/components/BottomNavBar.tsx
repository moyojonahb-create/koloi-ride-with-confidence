import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Clock, Wallet, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { haptic } from '@/lib/haptics';

const tabs = [
  { label: 'Home', icon: Home, path: '/ride' },
  { label: 'Trips', icon: Clock, path: '/history' },
  { label: 'Wallet', icon: Wallet, path: '/wallet' },
  { label: 'Profile', icon: User, path: '/profile' },
];

const pathAliases: Record<string, string[]> = {
  '/history': ['/history', '/ride-history'],
  '/wallet': ['/wallet'],
  '/profile': ['/profile', '/edit-profile'],
};

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
      '/history': '/mapp/ride-history',
      '/wallet': '/mapp/wallet',
      '/profile': '/mapp/profile',
    };
    navigate(isMapp ? mappPaths[path] || path : (path === '/history' ? '/ride-history' : path));
  };

  const isActive = (path: string) => {
    if (path === '/ride') return location.pathname === '/ride' || location.pathname === '/mapp/ride';
    const aliases = pathAliases[path] || [path];
    return aliases.some(p => location.pathname.startsWith(p) || location.pathname.startsWith(`/mapp${p}`));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[55] glass-card-heavy border-t border-border/20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-[60px]">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => { haptic('light'); handleNav(tab.path); }}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-5 py-1.5 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-[1px] left-3 right-3 h-[3px] rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <motion.div
                animate={active ? { scale: 1, y: 0 } : { scale: 0.9, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <tab.icon className={cn("w-5 h-5", active && "stroke-[2.5px]")} />
              </motion.div>
              <span className={cn(
                "text-[10px] transition-all",
                active ? "font-bold" : "font-medium"
              )}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
