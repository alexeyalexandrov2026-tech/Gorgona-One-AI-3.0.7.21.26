"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSession, signOut as authSignOut } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(null);
  // True until the first session lookup settles. Guarded pages (/admin,
  // /partner) wait on it so a signed-in user is not redirected to /login
  // while their session is still loading.
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setSessionState(await getSession());
    } catch {
      setSessionState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Follow sign-ins and sign-outs that happen elsewhere (another tab, an
    // expired refresh token). Supabase warns against calling its own APIs
    // inside this callback, so the refresh is deferred to the next tick.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setTimeout(refresh, 0);
      }
    });
    return () => data?.subscription?.unsubscribe();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await authSignOut();
    } finally {
      setSessionState(null);
    }
  }, []);

  const value = useMemo(() => ({ session, loading, refresh, signOut }), [session, loading, refresh, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
