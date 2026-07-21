"use client";

import { useAI } from './AIProvider';
import { useAITheme } from '../ThemeProvider';
import DiscoveryRoom from './DiscoveryRoom';

// ===========================================================================
// Persistent AI dock (Phase 3).
//
// A floating entry point rendered on EVERY route (mounted in the layout). The
// user is always one tap from returning to Gorgona One AI and their Discovery
// Room — the AI travels with them through the ecosystem and never disappears.
// Lightweight by design: just a luminous button (the heavy particle sphere only
// renders on the home / AI surfaces), plus the Discovery Room drawer it opens.
// ===========================================================================

export default function AIDock() {
  const { toggleRoom, roomOpen, saved, history, hydrated } = useAI();
  const { theme } = useAITheme();

  // A subtle count of what's waiting in the room.
  const count = (saved?.length || 0) + (history?.length || 0);

  return (
    <>
      <button
        type="button"
        className={`aidock ${roomOpen ? 'is-open' : ''}`}
        data-ai-theme={theme}
        onClick={toggleRoom}
        aria-label={roomOpen ? 'Close Gorgona One AI' : 'Open Gorgona One AI'}
        aria-expanded={roomOpen}
      >
        <span className="aidock__orb" aria-hidden="true">
          <span className="aidock__core" />
        </span>
        <span className="aidock__label">AI</span>
        {hydrated && count > 0 && !roomOpen && <span className="aidock__badge">{count > 99 ? '99+' : count}</span>}
      </button>

      <DiscoveryRoom />

      <style jsx>{`
        .aidock {
          position: fixed; right: 20px; bottom: 20px; z-index: 55;
          display: inline-flex; align-items: center; gap: 9px;
          padding: 10px 16px 10px 11px; border-radius: 999px; cursor: pointer;
          font-family: "Space Mono", ui-monospace, monospace; font-size: 11px;
          letter-spacing: 0.16em; text-transform: uppercase;
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          transition: transform 0.25s ease, box-shadow 0.25s ease, opacity 0.25s ease;
        }
        .aidock[data-ai-theme="dark"] {
          background: rgba(26, 22, 15, 0.7); border: 1px solid rgba(216, 180, 120, 0.4); color: #ece4d4;
          box-shadow: 0 12px 30px -12px rgba(0, 0, 0, 0.7), 0 0 22px rgba(216, 180, 120, 0.14);
        }
        .aidock[data-ai-theme="light"] {
          background: rgba(255, 253, 248, 0.85); border: 1px solid rgba(198, 160, 94, 0.45); color: #2c281f;
          box-shadow: 0 12px 30px -14px rgba(60, 45, 12, 0.4);
        }
        .aidock:hover { transform: translateY(-2px); }
        .aidock:focus-visible { outline: 2px solid #c6a05e; outline-offset: 3px; }
        .aidock.is-open { opacity: 0.85; }

        .aidock__orb {
          position: relative; width: 22px; height: 22px; border-radius: 50%;
          background: radial-gradient(circle at 34% 30%, #fffdf6 0%, #d8b478 55%, #8a6528 100%);
          box-shadow: 0 0 12px rgba(216, 180, 120, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
          display: flex; align-items: center; justify-content: center;
        }
        .aidock__core {
          width: 8px; height: 8px; border-radius: 50%;
          background: radial-gradient(circle, #fffef7, #f0d49a);
          animation: aidockPulse 2.6s ease-in-out infinite;
        }
        @keyframes aidockPulse { 0%, 100% { transform: scale(0.7); opacity: 0.75; } 50% { transform: scale(1.05); opacity: 1; } }

        .aidock__badge {
          position: absolute; top: -6px; right: -4px; min-width: 18px; height: 18px; padding: 0 5px;
          border-radius: 999px; background: #c6a05e; color: #201810;
          font-size: 10px; letter-spacing: 0; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
        }

        @media (prefers-reduced-motion: reduce) { .aidock__core { animation: none; } .aidock { transition: none; } }
      `}</style>
    </>
  );
}
