'use client';

import { useEffect, useState } from 'react';
import { readSavedLocale } from './components/LocaleProvider';
import { getLanguageDir } from '../lib/languages';
import { savedSource } from '../lib/savedCopy';

export default function GlobalError({ error, reset }) {
  // The root error boundary replaces the layout, including LocaleProvider.
  const [locale, setLocale] = useState('en');
  useEffect(() => { setLocale(readSavedLocale() || 'en'); }, []);
  const msg = (source) => savedSource(locale, source);
  return (
    <html lang={locale} dir={getLanguageDir(locale)}>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] p-8 text-center text-zinc-100">
          <h2 className="mb-4 font-display text-3xl font-medium tracking-wide">{msg('Critical Error')}</h2>
          <p className="mb-8 max-w-md text-sm text-zinc-400">
            {msg('A critical system error occurred. We have logged the issue and are working on it.')}
          </p>
          <button
            onClick={() => reset()}
            className="rounded-full bg-white px-8 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
          >
            {msg('Try again')}
          </button>
        </div>
      </body>
    </html>
  );
}
