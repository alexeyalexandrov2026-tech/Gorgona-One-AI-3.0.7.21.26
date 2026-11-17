"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getSession, signOut as authSignOut } from '../../lib/auth';
import { isTemporarySessionError, sessionLoader } from '../../lib/authSession.mjs';
import { supabase } from '../../lib/supabase';
import {useHydratedValue} from './useHydratedValue';

const AuthContext = createContext(null);
const INITIAL_AUTH={session:null,loading:true,error:null,refresh(){},async signOut(){return false;}};

export function AuthProvider({ children }) {
  const [state, setState] = useState({ session: null, loading: true, error: null });
  const controller = useRef(null);
  const identity = useRef(null);

  useEffect(() => {
    let eventTimer;
    let retryTimer;
    let retries = 0;
    const loader = sessionLoader(getSession, (session, loading, error) => {
      clearTimeout(retryTimer);
      identity.current = session?.id ?? null;
      // Keep an already verified account visible through a temporary outage.
      setState({ session, loading, error: session ? null : error });
      if (isTemporarySessionError(error) && retries < 3) {
        retryTimer = setTimeout(() => loader.refresh(true), 2000 * 2 ** retries++);
      } else if (!error && !loading) {
        retries = 0;
      }
    });
    controller.current = loader;
    const resume = () => {
      retries = 0;
      void loader.refresh(true);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return; // The explicit initial load below also validates the profile.
      clearTimeout(eventTimer);
      if (event === 'SIGNED_OUT') {
        loader.clear();
        return;
      }
      const sameUser = Boolean(identity.current && session?.user?.id === identity.current);
      if (!sameUser) loader.clear();
      // Defer API calls until Supabase releases the auth callback lock.
      eventTimer = setTimeout(() => loader.refresh(sameUser), 0);
    });
    window.addEventListener('online', resume);
    void loader.refresh();
    return () => {
      clearTimeout(eventTimer);
      clearTimeout(retryTimer);
      window.removeEventListener('online', resume);
      subscription.unsubscribe();
      loader.dispose();
      controller.current = null;
    };
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
  const value=useContext(AuthContext);
  return useHydratedValue(value,value?INITIAL_AUTH:null);
}
