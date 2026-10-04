"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { getSession, signOut as authSignOut } from '../../lib/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(null);

  useEffect(() => {
    getSession().then(session => setSessionState(session));
  }, []);

  function refresh() {
    getSession().then(session => setSessionState(session));
  }

  function signOut() {
    authSignOut();
    setSessionState(null);
  }

  return (
    <AuthContext.Provider value={{ session, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
