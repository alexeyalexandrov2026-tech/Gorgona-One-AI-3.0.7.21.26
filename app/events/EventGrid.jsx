import Link from 'next/link';
import { Logo } from '../components/Logo';
import { getLeagueBySlug, getEventCategoryBySlug } from '../../lib/eventsData';

export function EventGrid({ events, emptyMessage, t }) {
  if (events.length === 0) {
    return (
      <div className="market-card rounded-[1.5rem] p-6">
        <p className="text-sm text-zinc-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {events.map((event) => {
        const league = event.league ? getLeagueBySlug(event.league) : null;
        const category = getEventCategoryBySlug(event.category);
        const logoSlug = league ? league.slug : event.teams?.[0];

        return (
          <article key={event.id} className="market-card rounded-[1.5rem] p-6">
            <div className="flex items-center justify-between gap-3">
              <Logo slug={logoSlug} alt={league?.name || event.artist || event.name} className="h-12 w-12 rounded-2xl object-contain bg-white/5 p-1" />
              <span className="rounded-full bg-brand-gold/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-brand-gold">
                {t.events.categoryLabels[category?.slug] || category?.label}
              </span>
            </div>
            <h2 className="mt-6 text-xl font-semibold text-white">{event.name}</h2>
            <p className="mt-3 text-sm text-zinc-400">{event.venue} — {event.city}, {event.state || event.country}</p>
            <p className="mt-1 text-sm text-zinc-500">{event.date} · {event.time}</p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{t.events.priceRange}</p>
              <p className="mt-2 text-sm font-semibold text-white">{event.priceRange}</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/events/${event.slug}`} className="market-button">{t.common.viewDetails}</Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
