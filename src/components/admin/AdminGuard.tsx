import { ReactNode } from 'react';
import { ShieldX } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import PageSkeleton from '@/components/PageSkeleton';

const ADMIN_EMAIL = 'moyojonahb@gmail.com';

interface AdminGuardProps {
  children: ReactNode;
}

const AdminGuard = ({ children }: AdminGuardProps) => {
  const { isAdmin, isLoading, error } = useAdminAuth();
  const { user, loading: authLoading } = useAuth();

  // Hard gate: only the designated admin email can ever access
  const emailAllowed = user?.email?.toLowerCase() === ADMIN_EMAIL;

  if (authLoading || isLoading) {
    // Skeleton-first instead of full-screen spinner.
    return <PageSkeleton variant="admin" />;
  }

  if (!emailAllowed || !isAdmin || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You do not have permission to access the admin dashboard.
          </p>
          <Button asChild>
            <Link to="/ride">Return to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;
