import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const AppDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth', { replace: true });
      } else {
        navigate('/ride', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  // Render nothing — instant redirect, no loading screen
  return null;
};

export default AppDashboard;
