"use client";

import { createContext, useContext, useMemo, useState } from 'react';

const AiDockContext = createContext(null);

export function AiDockProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v)
    }),
    [isOpen]
  );

  return <AiDockContext.Provider value={value}>{children}</AiDockContext.Provider>;
}

export function useAiDock() {
  const ctx = useContext(AiDockContext);
  if (!ctx) throw new Error('useAiDock must be used within AiDockProvider');
  return ctx;
}
