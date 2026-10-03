"use client";

import { useCallback } from 'react';
import { useAiDock } from '../ai/AiDockProvider';
import { useConciergeChat } from '../ai/ChatProvider';

// Opens the concierge dock and sends the question, so everything asked on
// the homepage continues in the same conversation as the dock and /discovery.
export function useAskConcierge() {
  const { open } = useAiDock();
  const { send } = useConciergeChat();
  return useCallback((text) => {
    open();
    if (text && text.trim()) send(text.trim());
  }, [open, send]);
}
