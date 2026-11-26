"use client";

import { usePathname } from 'next/navigation';
import { useAI } from './AIProvider';
import { useAiDock } from './AiDockProvider';
import { useAITheme } from '../ThemeProvider';
import { useLocale, useLocaleReady } from '../LocaleProvider';
import { getTranslation } from '../../../lib/i18n';
import { configuredManagerTelegram } from '../../../lib/managerContact.mjs';

// A direct line to a live manager, next to the AI concierge. It shares the
// AI pill's dark-gold surface and sits above it in the bottom-right stack.
// Nothing is rendered until a Telegram username is configured
// (lib/managerContact.mjs), and it steps aside while the concierge chat or the
// Discovery Room is open so it never covers them.
const href = configuredManagerTelegram();

function TelegramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M21.2 3.6 2.9 10.7c-.9.4-.9 1.6 0 1.9l4.6 1.5 1.8 5.4c.3.8 1.3 1 1.9.4l2.6-2.5 4.6 3.4c.7.5 1.7.1 1.9-.7L22.6 4.9c.2-.9-.6-1.6-1.4-1.3Z" />
      <path d="m7.5 14.1 10-7.1-7.6 8.4" />
    </svg>
  );
}

export default function ManagerTelegramButton() {
  const { roomOpen, hydrated } = useAI();
  const { isOpen } = useAiDock();
  const { theme, ready: themeReady } = useAITheme();
  const locale = useLocale();
  const localeReady = useLocaleReady();
  if (!href) return null;
  const t = getTranslation(locale);
  const label = t.ai?.liveManager || 'Message a live manager on Telegram';
  const pathname = usePathname() || '';
  const isFullGuideRoute = pathname === '/discovery' || pathname === '/concierge' || pathname.startsWith('/pay/');
  const hidden = isOpen || roomOpen || isFullGuideRoute || !(hydrated && themeReady && localeReady);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`aitg${hidden ? ' is-hidden' : ''}`}
      data-ai-theme={theme}
      data-floating-launcher
      aria-label={label}
      title={label}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
    >
      <TelegramIcon className="aitg__icon" />
    </a>
  );
}
