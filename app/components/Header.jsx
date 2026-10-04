"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LanguageSwitcher } from './LanguageSwitcher';
import { getTranslation } from '../../lib/i18n';
import { useLocale } from './LocaleProvider';
import { useAuth } from './AuthProvider';

// Unified GORGONA ONE ecosystem navigation. `key` maps to an existing
// translation in lib/i18n when available; `label` is the fallback for the
// new luxury sections that are not yet translated.
const navItems = [
  { key: 'home', href: '/', label: 'Home' },
  { key: 'travel', href: '/travel', label: 'Travel' },
  { key: 'stores', href: '/stores', label: 'Shopping' },
  { key: 'villas', href: '/vacation-rentals', label: 'Villas' },
  { key: 'yachts', href: '/yachts', label: 'Yachts' },
  { key: 'cars', href: '/rentals', label: 'Cars' },
  { key: 'sportsbook', href: '/sportsbook', label: 'Sportsbooks' },
  { key: 'events', href: '/events', label: 'Events' },
  { key: 'discovery', href: '/discovery', label: 'Discovery' }
];

export function Header() {
  const locale = useLocale();
  const t = getTranslation(locale);
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // True only once we know this tab actually has somewhere to go back to -
  // avoids showing a back arrow on a page opened fresh (a bookmark, a shared
  // link, or the installed PWA's own launch screen), where router.back()
  // would have nothing to return to.
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, [pathname]);

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push('/');
  }

  const labelFor = (item) => (item.key && t.nav[item.key]) || item.label;
  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header
      dir="ltr"
      className={`sticky top-0 z-40 border-b font-g1sans backdrop-blur-xl transition-colors duration-300 ${
        scrolled ? 'border-g1-rule bg-g1-paper/90' : 'border-transparent bg-g1-paper/60'
      }`}
    >
      <div className="flex items-center justify-between gap-2 py-3 sm:gap-4 sm:py-4">
        <div className="flex min-w-0 items-center gap-2">
          {/* Universal back navigation. Available on both mobile and desktop.
              Hidden on the homepage (nothing to go "back" from) and when 
              this tab has no history to return to. */}
          {pathname !== '/' && canGoBack && (
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-g1-rule text-g1-ink transition hover:border-g1-ink sm:h-10 sm:w-10"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <Link href="/" aria-label="Gorgona One, home" className="group flex items-baseline gap-2">
            <span className="font-g1display text-xl font-medium tracking-tight text-g1-ink sm:text-2xl">Gorgona</span>
            <span className="font-g1mono text-[0.62rem] uppercase tracking-[0.3em] text-g1-accent">One</span>
          </Link>
        </div>

        <nav className="hidden items-center gap-3.5 lg:flex xl:gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className="group relative whitespace-nowrap py-1 text-[0.9rem] font-medium text-g1-ink transition-colors hover:text-g1-accent"
            >
              {labelFor(item)}
              <span
                className={`absolute -bottom-0.5 left-0 h-0.5 rounded-full bg-g1-accent transition-all duration-300 ${
                  isActive(item.href) ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          {auth?.session ? (
            <button
              type="button"
              onClick={() => auth.signOut()}
              className="hidden min-h-[40px] items-center rounded-full border border-g1-rule px-4 text-sm font-medium text-g1-ink transition hover:border-g1-ink sm:inline-flex"
            >
              {t.auth.signOut}
            </button>
          ) : (
            <Link
              href="/login"
              className="hidden min-h-[40px] items-center rounded-full bg-g1-accent px-4 text-sm font-medium text-g1-on-accent transition hover:brightness-110 sm:inline-flex"
            >
              {t.auth.signInTab}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileNavOpen((value) => !value)}
            aria-expanded={mobileNavOpen}
            aria-label="Menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-g1-rule text-g1-ink transition hover:border-g1-ink sm:h-10 sm:w-10 lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileNavOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-g1-rule lg:hidden"
          >
            <div className="grid grid-cols-2 gap-1 py-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-base text-g1-ink transition hover:bg-g1-card hover:text-g1-accent"
                >
                  {labelFor(item)}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
