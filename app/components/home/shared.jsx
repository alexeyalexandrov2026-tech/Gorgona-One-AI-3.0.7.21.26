"use client";

import { useCallback } from 'react';
import { useAiDock } from '../ai/AiDockProvider';
import { useConciergeChat } from '../ai/ChatProvider';

// Opens the concierge dock and sends the question, so everything asked on
// the homepage continues in the same conversation as the dock and /discovery.
export function useAskConcierge() {
  const { open } = useAiDock();
  const { send,hydrated,isLoading } = useConciergeChat();
  return useCallback((text) => {
    if(text&&text.trim()&&(!hydrated||isLoading||text.trim().length>4000))return false;
    open();
    if (text && text.trim()) send(text.trim());
    return true;
  }, [open, send, hydrated, isLoading]);
}
