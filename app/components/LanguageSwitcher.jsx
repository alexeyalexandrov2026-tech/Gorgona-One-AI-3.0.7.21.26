"use client";

import { useEffect, useRef, useState } from 'react';
import { SUPPORTED_LANGUAGES } from '../../lib/languages';
import { useLocaleController } from './LocaleProvider';

const MENU_WIDTH = 256;
const VIEWPORT_MARGIN = 12;

export function LanguageSwitcher() {
  const controller = useLocaleController();
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const locale = controller ? controller.locale : 'en';
  const active = SUPPORTED_LANGUAGES.find((language) => language.code === locale) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current && !menuRef.current.contains(event.target) &&
        buttonRef.current && !buttonRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    function updatePosition() {
      const rect = buttonRef.current.getBoundingClientRect();
      const maxLeft = window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN;
      const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.right - MENU_WIDTH, maxLeft));
      setMenuStyle({ position: 'fixed', top: rect.bottom + 8, left, width: MENU_WIDTH });
    }
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  function handleSelect(code) {
    if (controller) {
      controller.setLocale(code);
    }
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none transition hover:border-brand-gold"
      >
        <span aria-hidden="true">{active.flag}</span>
        <span className="hidden sm:inline">{active.nativeLabel}</span>
        <span aria-hidden="true" className="text-xs text-zinc-400">▾</span>
      </button>
      {open && menuStyle && (
        <div
          ref={menuRef}
          role="listbox"
          style={menuStyle}
          className="z-50 max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-[#050505] p-2 shadow-premium"
        >
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language.code}
              type="button"
              role="option"
              aria-selected={language.code === locale}
              onClick={() => handleSelect(language.code)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                language.code === locale ? 'bg-brand-gold/10 text-brand-gold' : 'text-zinc-300 hover:bg-white/5 hover:text-brand-gold'
              }`}
            >
              <span aria-hidden="true" className="text-base">{language.flag}</span>
              <span className="flex flex-col">
                <span className="font-medium">{language.nativeLabel}</span>
                <span className="text-xs text-zinc-500">{language.label}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
