import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

interface DriverStatus {
  isDriver: boolean;
  isApproved: boolean;
  isPending: boolean;
  driverId: string | null;
  loading: boolean;
}

export function useDriverStatus(): DriverStatus {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<DriverStatus>({
    isDriver: false,
    isApproved: false,
    isPending: false,
    driverId: null,
    loading: true,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setState({
        isDriver: false,
        isApproved: false,
        isPending: false,
        driverId: null,
        loading: false,
      });
      return;
    }

    const checkDriverStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .select('id, status')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking driver status:', error);
          setState(prev => ({ ...prev, loading: false }));
          return;
        }

        if (data) {
          setState({
            isDriver: true,
            isApproved: data.status === 'approved',
            isPending: data.status === 'pending',
            driverId: data.id,
            loading: false,
          });
        } else {
          setState({
            isDriver: false,
            isApproved: false,
            isPending: false,
            driverId: null,
            loading: false,
          });
        }
      } catch (err) {
        console.error('Error checking driver status:', err);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    checkDriverStatus();
  }, [user, authLoading]);

  return state;
}
