import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useDriverStatus } from '@/hooks/useDriverStatus';
import { Loader2 } from 'lucide-react';

export default function MappRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { isApproved, loading: driverLoading } = useDriverStatus();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || roleLoading || driverLoading) return;

    if (!user) {
      navigate('/mapp/login', { replace: true });
      return;
    }

    if (isAdmin) {
      navigate('/mapp/admin', { replace: true });
    } else if (isApproved) {
      navigate('/mapp/driver', { replace: true });
    } else {
      navigate('/mapp/ride', { replace: true });
    }
  }, [user, authLoading, isAdmin, roleLoading, isApproved, driverLoading, navigate]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
