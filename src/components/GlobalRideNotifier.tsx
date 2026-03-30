import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { playNewRequestSound } from '@/lib/notificationSounds';
import { vibrateAlert, showBrowserNotification } from '@/lib/alerts';
import { toast } from 'sonner';

/**
 * Global component that listens for new ride requests 24/7.
 * Uses pure realtime — no polling — for scalability.
 */
export default function GlobalRideNotifier() {
  const { user } = useAuth();
  const isDriverOnlineRef = useRef(false);

  // Subscribe to driver's own online status via realtime (no polling)
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    const fetchStatus = async () => {
      const { data } = await supabase
        .from('drivers')
        .select('is_online')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();
      isDriverOnlineRef.current = !!data?.is_online;
    };
    fetchStatus();

    // Listen for changes to this driver's record
    const channel = supabase
      .channel(`driver-status-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          isDriverOnlineRef.current = row.status === 'approved' && !!row.is_online;
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Permanent realtime subscription for new rides (no polling)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`global-ride-notifier-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rides' },
        (payload) => {
          if (!isDriverOnlineRef.current) return;
          const ride = payload.new as Record<string, unknown>;
          if (ride.status !== 'pending') return;

          const expiresAt = ride.expires_at ? new Date(ride.expires_at as string).getTime() : null;
          if (expiresAt && expiresAt <= Date.now()) return;
          if (ride.user_id === user.id) return;

          playNewRequestSound();
          vibrateAlert();
          showBrowserNotification(
            '🚗 New Ride Request',
            `${ride.pickup_address} → ${ride.dropoff_address}`,
            '/driver'
          );
          toast.info('🚗 NEW RIDE REQUEST!', {
            description: 'A rider is looking for a driver — respond quickly!',
            duration: 15000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}
