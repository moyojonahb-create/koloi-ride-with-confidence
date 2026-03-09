import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Clock, Wallet, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const tabs = [
{ label: 'Home', icon: Home, path: '/ride' },
{ label: 'Trips', icon: Clock, path: '/history' },
{ label: 'Wallet', icon: Wallet, path: '/wallet' },
{ label: 'Profile', icon: User, path: '/profile' }];


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
    // Auth-gate non-home tabs
    if (!user) {
      navigate(isMapp ? '/mapp/login' : '/auth');
      return;
    }
    const mappPaths: Record<string, string> = {
      '/history': '/mapp/ride',
      '/wallet': '/mapp/ride',
      '/profile': '/mapp/profile'
    };
    navigate(isMapp ? mappPaths[path] || path : path);
  };

  const isActive = (path: string) => {
    if (path === '/ride') return location.pathname === '/ride' || location.pathname === '/mapp/ride';
    return location.pathname.startsWith(path) || location.pathname.startsWith(`/mapp${path}`);
  };

  return;
























}