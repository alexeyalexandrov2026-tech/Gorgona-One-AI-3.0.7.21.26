"use client";

import Link from 'next/link';
import { useFavorites } from './FavoritesProvider';
import { useSavedText } from './LocalizedText';
import { useLocale } from './LocaleProvider';
import { useAuth } from './AuthProvider';
import { displayName } from '../../lib/aiSuggestions';
import { FAVORITE_ROOTS } from '../../lib/favoriteRules.mjs';

/** The heart on a yacht, villa, car or restaurant: adds it to "My Miami" or takes it out. */
export function FavoriteButton({ kind, slug, title, subtitle, image, className = '' }) {
  const favorites = useFavorites();
  const msg = useSavedText();
  const on = favorites.has(kind, slug);
  const label = on ? msg('Remove from favorites') : msg('Save to favorites');
  return (
    <button
      type="button"
      onClick={() => favorites.toggle({ kind, slug, title, subtitle, image })}
      disabled={!favorites.ready}
      aria-pressed={on}
      aria-label={label}
      title={label}
      data-favorite={kind + ':' + slug}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${on ? 'border-g1-accent bg-g1-accent-wash text-g1-accent' : 'border-g1-rule text-g1-soft hover:border-g1-accent/60 hover:text-g1-ink'} ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.7 3.6 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.4 0 5.6 3.2 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4z" />
      </svg>
    </button>
  );
}

/** The favourites part of "My Miami": the same list on the site and in the app. */
export function FavoritesBoard() {
  const favorites = useFavorites();
  const msg = useSavedText();
  const locale = useLocale();
  const auth = useAuth();
  const count = favorites.items.length;
  return (
    <section className="my-10 min-w-0 border-t border-g1-rule pt-8" aria-label={msg('Favorites')} data-favorites>
      <h2 className="mb-2 font-display text-3xl text-g1-ink">{msg('Favorites')}{count ? ` · ${count}` : ''}</h2>
      {!favorites.ready ? (
        <p role="status" className="py-6 text-g1-soft">{msg('Loading...')}</p>
      ) : !count ? (
        <p className="py-6 text-g1-soft">{msg('Tap the heart on a yacht, villa, car or restaurant to keep it here.')}</p>
      ) : (
        <>
          {!auth?.session && <p className="mb-4 text-sm text-g1-soft">{msg('Saved on this device. Sign in to see them in the app and on every device.')}</p>}
          <ul className="grid gap-3 sm:grid-cols-2">
            {favorites.items.map((item) => (
              <li key={item.kind + ':' + item.slug} className="flex min-w-0 items-center gap-3 rounded-2xl border border-g1-rule bg-g1-card p-3">
                {item.image
                  ? <img src={item.image} alt="" loading="lazy" decoding="async" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  : <span aria-hidden="true" className="h-16 w-16 shrink-0 rounded-xl bg-g1-band" />}
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-g1-soft">{displayName(FAVORITE_ROOTS[item.kind], locale) || ''}</p>
                  <Link href={item.href} className="block font-medium text-g1-ink [overflow-wrap:anywhere] hover:underline">{item.title}</Link>
                  {item.subtitle && <p className="text-xs text-g1-soft [overflow-wrap:anywhere]">{item.subtitle}</p>}
                </div>
                <FavoriteButton {...item} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
