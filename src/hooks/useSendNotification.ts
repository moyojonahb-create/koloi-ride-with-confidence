/**
 * Hook for sending push notifications through the edge function.
 * Wraps the send-notification edge function with typed helpers.
 */

import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

type NotificationType =
  | 'ride_requested'
  | 'ride_accepted'
  | 'driver_arrived'
  | 'ride_completed'
  | 'ride_cancelled'
  | 'new_offer'
  | 'deposit_approved';

interface SendNotificationParams {
  type: NotificationType;
  title?: string;
  message?: string;
  targetUserId?: string;
  rideId?: string;
}

export function useSendNotification() {
  const { session } = useAuth();

  const send = useCallback(async (params: SendNotificationParams): Promise<boolean> => {
    if (!session?.access_token) return false;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!res.ok) {
        console.warn('[Notification] Failed to send:', await res.text());
        return false;
      }

      return true;
    } catch (err) {
      console.warn('[Notification] Error:', err);
      return false;
    }
  }, [session]);

  return { send };
}
