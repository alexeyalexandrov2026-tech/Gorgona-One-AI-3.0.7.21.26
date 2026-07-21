'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { getAllEvents, getEventCategories, getProviders } from '../../lib/eventsData';
import { useLocale } from '../components/LocaleProvider';
import { getTranslation } from '../../lib/i18n';

export function EventsSearch() {
  const t = getTranslation(useLocale());
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [provider, setProvider] = useState('all');

  const allEvents = getAllEvents();
  const categories = getEventCategories();
  const providers = getProviders();

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return allEvents.filter((event) => {
      const matchesQuery = !normalized || [
        event.name, event.artist, event.venue, event.city, event.state, event.country
      ].filter(Boolean).join(' ').toLowerCase().includes(normalized);
      const matchesCategory = category === 'all' || event.category === category;
      const matchesProvider = provider === 'all' || event.providers.includes(provider);
      return matchesQuery && matchesCategory && matchesProvider;
    });
  }, [allEvents, query, category, provider]);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-premium sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.events.searchPlaceholder}
          className="flex-1 rounded-full border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none"
        />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-full border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none">
          <option value="all">{t.events.allCategories}</option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>{t.events.categoryLabels[cat.slug] || cat.label}</option>
          ))}
        </select>
        <select value={provider} onChange={(event) => setProvider(event.target.value)} className="rounded-full border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none">
          <option value="all">{t.events.allProviders}</option>
          {providers.map((p) => (
            <option key={p.slug} value={p.slug}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-gold">{t.search.results}</p>
        {filtered.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">{t.search.noResults}</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {filtered.slice(0, 6).map((event) => (
              <Link key={event.id} href={`/events/${event.slug}`} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{event.name}</p>
                  <span className="rounded-full bg-brand-gold/15 px-2 py-1 text-xs text-brand-gold">{t.events.categoryLabels[event.category]}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{event.venue} — {event.city}</p>
                <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
                  <span>{event.date}</span>
                  <span>{event.priceRange}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
