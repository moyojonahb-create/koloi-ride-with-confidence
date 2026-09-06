/**
 * Session state for the mobile app.
 *
 * Mirrors the web app's `useAuth` contract so screens ported later find the
 * same API, with three deliberate differences:
 *
 *  1. `window.setTimeout` → `setTimeout`. The 800 ms safety timeout is kept:
 *     without it a Supabase client that never settles leaves the app on a
 *     splash forever, which on a device reads as a hang rather than an error.
 *  2. Session storage is AsyncStorage, injected through core (see
 *     `core/supabase.ts`) rather than the web app's Lovable preview broker.
 *  3. `authReady` is exposed as a promise. Core's `createSupabaseAuthProvider`
 *     accepts it so the Go backend and socket clients cannot read a token
 *     before the session has hydrated and fire a spurious 401. Web has the
 *     same mechanism in `lib/authReady.ts`; this is its mobile equivalent.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { requireSupabase } from '../core/supabase';
import { isNetworkError, loginIdentifierToEmail } from './identity';
import { flushPendingProfilePhone, queueProfilePhone } from './pendingProfile';

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Resolves once the initial session read has settled, successfully or not. */
  authReady: Promise<void>;
  /** Accepts an email, a nickname, or a phone number — resolved before sign-in. */
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    extra?: { nickname?: string; phone?: string },
  ) => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Created once, resolved by whichever path settles the initial session first.
  const readyRef = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);
  if (readyRef.current === null) {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    readyRef.current = { promise, resolve };
  }
  const ready = readyRef.current;

  useEffect(() => {
    const supabase = requireSupabase();
    let mounted = true;

    // Never leave the app on a splash screen because the client never settled.
    const safetyTimeout = setTimeout(() => {
      if (!mounted) return;
      setLoading(false);
      ready.resolve();
    }, 800);

    // Listener first, then the read — the same ordering as web. Registering
    // after the read can miss a transition that lands between the two.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
      ready.resolve();

      // A session is exactly the condition a queued profile write was waiting
      // for, and the token is hydrated by the time this fires — so this is the
      // one place the write cannot race auth. Failures stay queued.
      if (nextSession) void flushPendingProfilePhone();
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          // A stale or corrupt persisted session otherwise re-throws forever.
          // Local scope only: this must not revoke tokens server-side.
          console.warn('Session error, clearing:', error.message);
          void supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        }
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);
        ready.resolve();
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        console.error('Failed to restore auth session:', err);
        setSession(null);
        setUser(null);
        setLoading(false);
        ready.resolve();
      });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [ready]);

  const value = useMemo<AuthContextValue>(() => {
    const resolveNickname = async (nickname: string): Promise<string | null> => {
      // Untyped until the generated `Database` type is ported; the web app
      // casts here for the same reason. `rpc()` returns a PostgrestFilterBuilder
      // — thenable but not a Promise — so the cast must go through `unknown`
      // and land on PromiseLike rather than Promise.
      const rpc = requireSupabase().rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => PromiseLike<{ data: unknown }>;

      const { data } = await rpc('email_for_nickname', { _nickname: nickname });
      return (data as string | null) ?? null;
    };

    return {
      user,
      session,
      loading,
      authReady: ready.promise,

      async signIn(identifier, password) {
        const supabase = requireSupabase();
        const email = await loginIdentifierToEmail(identifier, resolveNickname);

        let lastError: Error | null = null;
        // Retry transient network failures only. A rejected credential must
        // never be retried — three attempts at a wrong password is how an
        // account gets rate-limited or locked.
        for (let attempt = 0; attempt < 3; attempt++) {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (!error) return { error: null };
          lastError = error as Error;
          if (!isNetworkError(error)) break;
          await new Promise((r) => setTimeout(r, 400 * 2 ** attempt)); // 400ms, 800ms
        }
        return { error: lastError };
      },

      async signUp(email, password, fullName, extra) {
        const { data, error } = await requireSupabase().auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              nickname: extra?.nickname ?? null,
              phone: extra?.phone ?? null,
            },
          },
        });
        if (error) return { error: error as Error };

        // `handle_new_user()` copies only full_name, and no trigger populates
        // phone — so without this the column stays null. Queued rather than
        // written inline: signUp returns no session when email confirmation is
        // on, which is precisely where web's equivalent silently does nothing.
        if (extra?.phone) {
          await queueProfilePhone(extra.phone);
          if (data.session) await flushPendingProfilePhone();
        }
        return { error: null };
      },

      async signInWithPhone(phone) {
        const { error } = await requireSupabase().auth.signInWithOtp({ phone });
        return { error: (error as Error | null) ?? null };
      },

      async verifyOtp(phone, token) {
        const { error } = await requireSupabase().auth.verifyOtp({
          phone,
          token,
          type: 'sms',
        });
        return { error: (error as Error | null) ?? null };
      },

      async signOut() {
        await requireSupabase().auth.signOut({ scope: 'local' });
      },
    };
  }, [user, session, loading, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
