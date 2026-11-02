"use client";
import { useSavedText } from "../LocalizedText";

import { useAI } from './AIProvider';
import { useAITheme } from '../ThemeProvider';
import DiscoveryRoom from './DiscoveryRoom';
import {useLocaleReady} from '../LocaleProvider';

// ===========================================================================
// Persistent AI dock (Phase 3).
//
// A floating entry point rendered on EVERY route (mounted in the layout). The
// user is always one tap from returning to Miami Elio AI and their Discovery
// Room — the AI travels with them through the ecosystem and never disappears.
// Lightweight by design: just a luminous button (the heavy particle sphere only
// renders on the home / AI surfaces), plus the Discovery Room drawer it opens.
// ===========================================================================

export default function AIDock() {
  const msg = useSavedText();
  const { toggleRoom, roomOpen, saved, history, hydrated } = useAI();
  const { theme, ready:themeReady } = useAITheme();
  const localeReady=useLocaleReady();
  const ready = hydrated && themeReady && localeReady;

  // A subtle count of what's waiting in the room.
  const count = (saved?.length || 0) + (history?.length || 0);

  return (
    <>
      <button
        type="button"
        disabled={!ready}
        className={`aidock ${roomOpen ? "is-open" : ''}`}
        data-ai-theme={theme}
        onClick={(event)=>{event.currentTarget.focus({preventScroll:true});toggleRoom();}}
        aria-label={roomOpen ? msg("Close Miami Elio AI") : msg("Open Miami Elio AI")}
        aria-expanded={roomOpen}
      >
        <span className="aidock__orb" aria-hidden="true">
          <span className="aidock__core" />
        </span>
        <span className="aidock__label">AI</span>
        {hydrated && count > 0 && !roomOpen && <span className="aidock__badge">{count > 99 ? '99+' : count}</span>}
      </button>

      <DiscoveryRoom />

    </>
  );
}
