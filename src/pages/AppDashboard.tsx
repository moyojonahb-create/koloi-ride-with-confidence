import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const AppDashboard = () => {
  const { user, loading } = useAuth();

  if (!loading) {
    if (!user) {
      return <Navigate to="/auth?redirect=%2Fapp" replace />;
    }
    return <Navigate to="/ride" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  );
};

export default AppDashboard;
