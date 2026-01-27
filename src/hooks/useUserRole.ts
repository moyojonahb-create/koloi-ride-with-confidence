import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserRoleState {
  isAdmin: boolean;
  isModerator: boolean;
  isLoading: boolean;
}

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<UserRoleState>({
    isAdmin: false,
    isModerator: false,
    isLoading: true,
  });

  useEffect(() => {
    const checkRoles = async () => {
      if (authLoading) return;

      if (!user) {
        setState({ isAdmin: false, isModerator: false, isLoading: false });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;

        const roles = data?.map(r => r.role) || [];

        setState({
          isAdmin: roles.includes('admin'),
          isModerator: roles.includes('moderator'),
          isLoading: false,
        });
      } catch (err) {
        console.error('Error checking user roles:', err);
        setState({ isAdmin: false, isModerator: false, isLoading: false });
      }
    };

    checkRoles();
  }, [user, authLoading]);

  return state;
};

export default useUserRole;
