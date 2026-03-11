/**
 * Hook for server-side wallet PIN operations.
 * All PIN hashing and verification happens on the server — 
 * the PIN never leaves the client in plaintext except during the API call.
 */

import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

export function useWalletPin() {
  const { user, session } = useAuth();
  const [hasPin, setHasPin] = useState(false);
  const [loading, setLoading] = useState(true);

  const callPinApi = useCallback(async (action: string, pin?: string) => {
    if (!session?.access_token) throw new Error('Not authenticated');

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallet-pin`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, pin }),
      }
    );

    const data = await res.json();
    if (!res.ok && res.status === 429) {
      throw new Error(data.error || 'Too many attempts');
    }
    if (!res.ok) {
      throw new Error(data.error || 'PIN operation failed');
    }
    return data;
  }, [session]);

  const checkPin = useCallback(async () => {
    if (!user || !session) {
      setLoading(false);
      return;
    }
    try {
      const data = await callPinApi('check');
      setHasPin(data.hasPin);
    } catch {
      // Fallback: assume no PIN
      setHasPin(false);
    } finally {
      setLoading(false);
    }
  }, [user, session, callPinApi]);

  useEffect(() => {
    checkPin();
  }, [checkPin]);

  const setPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const data = await callPinApi('set', pin);
      if (data.ok) {
        setHasPin(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [callPinApi]);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const data = await callPinApi('verify', pin);
      return data.ok === true;
    } catch (err) {
      // Re-throw rate limit errors so UI can show lockout message
      if (err instanceof Error && err.message.includes('Too many attempts')) {
        throw err;
      }
      return false;
    }
  }, [callPinApi]);

  return { hasPin, loading, setPin, verifyPin, refresh: checkPin };
}
