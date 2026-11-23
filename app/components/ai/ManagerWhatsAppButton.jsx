"use client";

import { useAI } from './AIProvider';
import { useAiDock } from './AiDockProvider';
import { useAITheme } from '../ThemeProvider';
import { useLocale, useLocaleReady } from '../LocaleProvider';
import { getTranslation } from '../../../lib/i18n';
import { configuredManagerWhatsApp } from '../../../lib/managerContact.mjs';

// Direct chat-only WhatsApp line to a live manager, stacked quietly above the
// Telegram chip. Renders nothing until NEXT_PUBLIC_MANAGER_WHATSAPP (or
// MANAGER_WHATSAPP in lib/managerContact.mjs) is configured.
const href = configuredManagerWhatsApp();

function WhatsAppIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3Z" />
      <path d="M9.4 9.1c.2-.4.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.7c.1.2.1.5-.1.7l-.5.6c-.1.2-.2.4 0 .6.4.8 1.2 1.5 2 1.9.2.1.5.1.6-.1l.6-.5c.2-.2.5-.2.7-.1l1.6.7c.3.1.4.3.4.5v.5c0 .4-.2.8-.6 1-.5.3-1.2.4-1.9.2-1.9-.5-4.3-2.6-5.1-4.8-.3-.8-.2-1.5.1-2Z" />
    </svg>
  );
}

export default function ManagerWhatsAppButton() {
  const { roomOpen, hydrated } = useAI();
  const { isOpen } = useAiDock();
  const { theme, ready: themeReady } = useAITheme();
  const locale = useLocale();
  const localeReady = useLocaleReady();
  if (!href) return null;
  const t = getTranslation(locale);
  const label = t.ai?.liveManagerWhatsApp || 'Message a live manager on WhatsApp';
  const hidden = isOpen || roomOpen || !(hydrated && themeReady && localeReady);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`aiwa${hidden ? ' is-hidden' : ''}`}
      data-ai-theme={theme}
      data-floating-launcher
      aria-label={label}
      title={label}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
    >
      <WhatsAppIcon className="aiwa__icon" />
    </a>
  );
}
