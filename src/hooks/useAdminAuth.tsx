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
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const checkAdminRole = async () => {
      if (authLoading) return;

      if (!user || !session) {
        setState({ isAdmin: false, isLoading: false, error: 'Not authenticated' });
        navigate('/');
        return;
      }

      try {
        // Server-side validation via edge function
        // This uses the service role to verify admin status, preventing client-side manipulation
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api?action=verify_admin`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({}),
          }
        );
        
        const data = await response.json();

        // Check for HTTP errors
        if (!response.ok) {
          console.log('Admin access denied:', data?.error || response.statusText);
          setState({ isAdmin: false, isLoading: false, error: 'Access denied' });
          navigate('/');
          return;
        }
        if (data?.error) {
          console.log('Admin access denied:', data.error);
          setState({ isAdmin: false, isLoading: false, error: 'Access denied' });
          navigate('/');
          return;
        }

        // If we got here with isAdmin: true, server confirmed admin role
        if (data?.isAdmin === true) {
          console.log('Admin verified server-side at:', data.verifiedAt);
          setState({ isAdmin: true, isLoading: false, error: null });
        } else {
          setState({ isAdmin: false, isLoading: false, error: 'Access denied' });
          navigate('/');
        }
      } catch (err) {
        console.error('Error verifying admin role:', err);
        setState({ isAdmin: false, isLoading: false, error: 'Failed to verify permissions' });
        navigate('/');
      }
    };

    checkAdminRole();
  }, [user, session, authLoading, navigate]);

  return state;
};

export default useAdminAuth;
