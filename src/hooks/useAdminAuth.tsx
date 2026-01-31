import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

interface AdminAuthState {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAdminAuth = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const checkAdminRole = async () => {
      if (authLoading) return;

      if (!user) {
        setState({ isAdmin: false, isLoading: false, error: 'Not authenticated' });
        navigate('/');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setState({ isAdmin: false, isLoading: false, error: 'Access denied' });
          navigate('/');
          return;
        }

        setState({ isAdmin: true, isLoading: false, error: null });
      } catch (err) {
        console.error('Error checking admin role:', err);
        setState({ isAdmin: false, isLoading: false, error: 'Failed to verify permissions' });
        navigate('/');
      }
    };

    checkAdminRole();
  }, [user, authLoading, navigate]);

  return state;
};

export default useAdminAuth;
