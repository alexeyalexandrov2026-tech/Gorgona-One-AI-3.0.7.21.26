"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { getSession, signOut as authSignOut } from '../../lib/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession().then(session => setSessionState(session)).catch(() => setSessionState(null)).finally(() => setLoading(false));
  }, []);

  function refresh() {
    getSession().then(session => setSessionState(session));
  }

  function signOut() {
    authSignOut();
    setSessionState(null);
  }

  return (
    <AuthContext.Provider value={{ session, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
