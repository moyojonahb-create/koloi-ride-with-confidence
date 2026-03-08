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
      <main className="flex-1">
        <Outlet />
      </main>

    </div>
  );
}
