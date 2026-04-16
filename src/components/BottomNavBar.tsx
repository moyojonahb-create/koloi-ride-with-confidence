import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Clock, User, Car } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { haptic } from '@/lib/haptics';

const tabs = [
  { label: 'Home', icon: Home, path: '/ride' },
  { label: 'Trips', icon: Clock, path: '/history' },
  { label: 'Drive', icon: Car, path: '/driver' },
  { label: 'Profile', icon: User, path: '/profile' },
];

const pathAliases: Record<string, string[]> = {
  '/history': ['/history'],
  '/driver': ['/driver'],
  '/profile': ['/profile', '/edit-profile'],
};

const BottomNavBar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function BottomNavBar(_props, ref) {
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
      '/driver': '/mapp/driver',
      '/profile': '/mapp/profile',
    };
    navigate(isMapp ? mappPaths[path] || path : path);
  };

  const isActive = (path: string) => {
    if (path === '/ride') return location.pathname === '/ride' || location.pathname === '/mapp/ride';
    const aliases = pathAliases[path] || [path];
    return aliases.some(p => location.pathname.startsWith(p) || location.pathname.startsWith(`/mapp${p}`));
  };

  return (
    <nav
      ref={ref}
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 safe-area-bottom"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map(tab => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => {
                haptic('light');
                handleNav(tab.path);
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl transition-all relative',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {active && (
                <motion.div
                  layoutId="bottomNav"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <tab.icon className={cn('h-5 w-5 relative z-10', active && 'stroke-[2.5px]')} />
              <span className={cn('text-[10px] font-medium relative z-10', active && 'font-bold')}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

export default BottomNavBar;
