"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getSession, signOut as authSignOut } from '../../lib/auth';
import { sessionLoader } from '../../lib/authSession.mjs';
import { supabase } from '../../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ session: null, loading: true, error: null });
  const controller = useRef(null);
  const identity = useRef(null);

  useEffect(() => {
    const loader = sessionLoader(getSession, (session, loading, error) => { identity.current=session?.id||null; setState({ session, loading, error }); });
    controller.current = loader;
    let timer;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      clearTimeout(timer);
      if (['TOKEN_REFRESHED','SIGNED_IN'].includes(event) && session?.user?.id === identity.current) {
        timer = setTimeout(() => loader.refresh(true), 0);
        return;
      }
      loader.clear();
      if (event !== 'SIGNED_OUT') {
        setState({ session: null, loading: true, error: null });
        // Defer API calls until Supabase releases the auth callback lock.
        timer = setTimeout(() => loader.refresh(), 0);
      }
    });
    loader.refresh();
    return () => { clearTimeout(timer); subscription.unsubscribe(); loader.dispose(); controller.current = null; };
  }, []);

  const value = useMemo(() => ({ ...state,
    refresh: () => controller.current?.refresh(),
    signOut: async () => {
      controller.current?.clear();
      try { await authSignOut(); return true; }
      catch { await controller.current?.refresh(); return false; }
    }
  }), [state]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
