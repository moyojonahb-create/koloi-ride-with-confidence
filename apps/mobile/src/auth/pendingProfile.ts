/**
 * Durable "write this phone number to the profile once we have a session".
 *
 * **Why this exists rather than a straight call after signUp.**
 * Web does this instead (`src/pages/Auth.tsx`):
 *
 *     const { data: authData } = await supabase.auth.getUser();
 *     if (authData?.user) {
 *       await updateMyProfile({ phone: formattedPhone });
 *     }
 *
 * When `signUp()` does not return a session — which is what happens with email
 * confirmation enabled — `getUser()` resolves to `null`, the guard is false,
 * and the write is skipped **with no error, no log, and no retry**. Signup
 * still shows its success toast and navigates, so the failure is invisible.
 *
 * **This is a latent defect, not the cause of the current null phones.**
 * Verified against the database: email confirmation was ON in March (a user
 * took 193s to confirm) and OFF by June (0.033s, auto-confirmed). It is off
 * today, so web's guard passes and its write should be firing. Neither existing
 * user has a phone in `raw_user_meta_data` and the June account has no
 * `full_name` either — neither went through the phone-signup path at all, so
 * their null phones evidence nothing about the write.
 *
 * The backend is not the problem either — `PATCH /api/profiles/me` explicitly
 * accepts `phone` (`only(payload, "full_name", "phone", …)` in
 * `backend/internal/business/handler.go`).
 *
 * **So the real justification for queueing is robustness to that setting
 * changing underneath us** — and it demonstrably does change on this project,
 * having been flipped once already. A fire-and-forget write is correct only
 * while confirmation stays off; queueing is correct either way. That is a
 * stronger argument than "signup-then-confirm-later", and unlike it, it is
 * backed by evidence from this specific project.
 *
 * If a session exists the flush happens immediately; if not, it survives until
 * one does, including across an app restart.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getBackend } from '../core/backend';

const PENDING_PHONE_KEY = 'cruixe.pendingProfilePhone';

/** Records a phone number to be written to the profile at the next opportunity. */
export async function queueProfilePhone(phone: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_PHONE_KEY, phone);
  } catch (error) {
    // Storage failure must not break signup; the number is still in auth
    // metadata, so this is recoverable later rather than lost outright.
    console.warn('Could not queue profile phone write:', error);
  }
}

/**
 * Writes any queued phone number, clearing it only on success.
 *
 * Safe to call on every sign-in: it is a no-op when nothing is queued, and the
 * upsert is idempotent. Called with a session already in hand, so the token
 * read cannot race hydration.
 */
export async function flushPendingProfilePhone(): Promise<void> {
  let phone: string | null = null;
  try {
    phone = await AsyncStorage.getItem(PENDING_PHONE_KEY);
  } catch {
    return;
  }
  if (!phone) return;

  try {
    await getBackend().patch('/api/profiles/me', { phone });
    await AsyncStorage.removeItem(PENDING_PHONE_KEY);
  } catch (error) {
    // Deliberately left queued. A failed write retries on the next sign-in
    // rather than being dropped the way web drops it.
    console.warn('Profile phone write failed, will retry next session:', error);
  }
}
