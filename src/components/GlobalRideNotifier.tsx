import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { playNewRequestSound } from '@/lib/notificationSounds';
import { vibrateAlert, showBrowserNotification } from '@/lib/alerts';
import { toast } from 'sonner';

/**
 * Global component that listens for new ride requests 24/7.
 * Fires audio + vibration + browser notification for every new pending ride
 * as long as the user is an approved, online driver.
 */
export default function GlobalRideNotifier() {
  const { user } = useAuth();
  const isDriverOnlineRef = useRef(false);

  // Poll driver online status every 15s
  useEffect(() => {
    if (!user) return;

    const check = async () => {
      const { data } = await supabase
        .from('drivers')
        .select('is_online')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();
      isDriverOnlineRef.current = !!data?.is_online;
    };

    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Permanent realtime subscription for new rides
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

          // Skip if already expired
          const expiresAt = ride.expires_at ? new Date(ride.expires_at as string).getTime() : null;
          if (expiresAt && expiresAt <= Date.now()) return;

          // Skip driver's own rides
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
