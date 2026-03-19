/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let hasResolvedInitialSession = false;

    const finishAuth = (nextSession: Session | null) => {
      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    const safetyTimeout = window.setTimeout(() => {
      if (!mounted) return;
      console.warn('Auth initialization timeout, continuing without blocking UI');
      setLoading(false);
    }, 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      console.log('[Auth event]', event, nextSession?.user?.id ?? null);

      // During bootstrap, getSession() is the source of truth.
      // Ignore early duplicate INITIAL_SESSION emissions until bootstrap resolves.
      if (!hasResolvedInitialSession && event === 'INITIAL_SESSION') {
        return;
      }

      finishAuth(nextSession);
    });

    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.warn('Session error, clearing local session:', error.message);
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          hasResolvedInitialSession = true;
          finishAuth(null);
          return;
        }

        hasResolvedInitialSession = true;
        finishAuth(data.session ?? null);
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to restore auth session:', err);
        hasResolvedInitialSession = true;
        finishAuth(null);
      } finally {
        window.clearTimeout(safetyTimeout);
      }
    };

    initAuth();

    return () => {
      mounted = false;
      hasResolvedInitialSession = false;
      window.clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    return { error: error as Error | null };
  };

  const verifyOtp = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setLoading(false);

    await supabase.auth.signOut({ scope: 'local' });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithPhone,
        verifyOtp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};