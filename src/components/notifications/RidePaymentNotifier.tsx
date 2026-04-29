import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { createElement } from 'react';

/**
 * Global listener that subscribes to `rides` updates for the current user
 * (as either rider OR driver) and emits a toast whenever a ride's payment
 * status flips to "successful" (wallet_paid) or "failed" (payment_failed).
 *
 * Mounted once near the root so notifications show across the whole app.
 */
export default function RidePaymentNotifier() {
  const { user } = useAuth();
  // Track previous payment state per ride to detect transitions only.
  const seenRef = useRef<Map<string, { paid: boolean; failed: boolean }>>(new Map());
  // De-dupe across re-fires (realtime can deliver the same update twice).
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    const handleRow = (row: any, role: 'rider' | 'driver') => {
      if (!row?.id) return;
      const prev = seenRef.current.get(row.id);
      const paid = !!row.wallet_paid;
      const failed = !!row.payment_failed;
      const reason: string | null = row.payment_failure_reason ?? null;
      const fare = Number(row.fare ?? 0);

      // Initial snapshot — store baseline without notifying.
      if (!prev) {
        seenRef.current.set(row.id, { paid, failed });
        return;
      }

      // Payment Successful transition
      if (!prev.paid && paid && !failed) {
        const key = `${row.id}:paid`;
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);
          toast.success('Payment Successful', {
            description:
              role === 'driver'
                ? `You received $${fare.toFixed(2)} in your wallet.`
                : `Your payment of $${fare.toFixed(2)} was completed.`,
            icon: createElement(CheckCircle2, { className: 'w-4 h-4' }),
            duration: 5000,
          });
        }
      }

      // Payment Failed transition
      if (!prev.failed && failed) {
        const key = `${row.id}:failed`;
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);
          toast.error('Payment Failed', {
            description: reason
              ? reason
              : role === 'driver'
                ? "Rider's payment could not be processed."
                : 'Your wallet payment could not be completed. Please top up.',
            icon: createElement(AlertTriangle, { className: 'w-4 h-4' }),
            duration: 8000,
          });
        }
      }

      seenRef.current.set(row.id, { paid, failed });
    };

    const riderChannel = supabase
      .channel(`ride-payments-rider-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `user_id=eq.${user.id}` },
        (payload) => handleRow(payload.new, 'rider'),
      )
      .subscribe();

    const driverChannel = supabase
      .channel(`ride-payments-driver-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `driver_id=eq.${user.id}` },
        (payload) => handleRow(payload.new, 'driver'),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(riderChannel);
      supabase.removeChannel(driverChannel);
    };
  }, [user?.id]);

  return null;
}
