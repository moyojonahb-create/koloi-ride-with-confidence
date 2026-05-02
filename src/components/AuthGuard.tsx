import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import PageSkeleton from '@/components/PageSkeleton';

interface Props {
  children: ReactNode;
}

/** Pick a skeleton variant that matches the route the user is trying to reach. */
function variantForPath(path: string): 'ride' | 'wallet' | 'profile' | 'admin' | 'generic' {
  if (path.includes('/wallet')) return 'wallet';
  if (path.includes('profile')) return 'profile';
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/ride') || path.startsWith('/driver') || path === '/app') return 'ride';
  return 'generic';
}

export default function AuthGuard({ children }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Skeleton-first: never blank, never a centred spinner.
    return <PageSkeleton variant={variantForPath(location.pathname)} />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
