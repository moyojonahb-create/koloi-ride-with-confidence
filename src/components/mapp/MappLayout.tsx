import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Car, HandshakeIcon, Shield, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useDriverStatus } from '@/hooks/useDriverStatus';
import { cn } from '@/lib/utils';
import VoyexLogo from '@/components/VoyexLogo';

export default function MappLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { isApproved } = useDriverStatus();

  const tabs = [
    { label: 'Ride', icon: Car, path: '/mapp/ride' },
    { label: 'Negotiate', icon: HandshakeIcon, path: '/mapp/negotiate/request' },
    { label: 'Safety', icon: Shield, path: '/mapp/safety' },
    { label: 'Profile', icon: User, path: '/mapp/profile' },
  ];

  // Add admin tab if admin
  const visibleTabs = isAdmin ? [...tabs, { label: 'Admin', icon: ShieldCheck, path: '/mapp/admin' }] : tabs;

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Main content area with bottom padding for nav */}
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      {/* Fixed bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-primary border-t border-primary-foreground/10 flex items-center justify-around px-1 safe-area-bottom">
        {visibleTabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-lg transition-colors',
                active
                  ? 'text-accent'
                  : 'text-primary-foreground/50 hover:text-primary-foreground/80'
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
