import { notFound } from 'next/navigation';
import { getEventBySlug, getProviderBySlug, getEventCategoryBySlug, getLeagueBySlug } from '../../../lib/eventsData';
import { buildAffiliateUrl } from '../../../lib/providers';
import { Logo } from '../../components/Logo';
import { BuyTicketsButton } from '../BuyTicketsButton';
import { EventViewTracker } from '../EventViewTracker';
import { getServerTranslations, getServerLocale } from '../../../lib/serverLocale';
import { eventDescriptions, getContentText } from '../../../lib/contentTranslations';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const event = getEventBySlug(params.slug);
  if (!event) {
    return { title: 'Event not found | GORGONA ONE' };
  }
  const locale = getServerLocale();
  return {
    title: `${event.name} Tickets | ${event.venue}, ${event.city} | GORGONA ONE`,
    description: getContentText(eventDescriptions, locale, event.id, event.description)
  };
}

export default async function EventDetailPage({ params }) {
  const event = getEventBySlug(params.slug);

  if (!event) {
    notFound();
  }

  const { t, locale } = await getServerTranslations();
  const category = getEventCategoryBySlug(event.category);
  const league = event.league ? getLeagueBySlug(event.league) : null;
  const providers = event.providers.map((slug) => getProviderBySlug(slug)).filter(Boolean);

  return (
    <main className="flex-1 py-10">
      <EventViewTracker eventSlug={event.slug} />
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo slug={league?.slug || event.teams?.[0]} alt={league?.name || event.artist || event.name} className="h-14 w-14 rounded-2xl bg-white/5 object-contain p-2" />
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">{t.events.categoryLabels[category?.slug] || category?.label}</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">{event.name}</h1>
            </div>
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-zinc-400">{getContentText(eventDescriptions, locale, event.id, event.description)}</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">{t.events.eventDetails}</p>
            <div className="mt-4 grid gap-4 text-sm text-zinc-300 sm:grid-cols-2">
              <div><p className="text-zinc-500">{t.events.venue}</p><p className="mt-1 text-white">{event.venue}</p></div>
              <div><p className="text-zinc-500">{t.events.city}</p><p className="mt-1 text-white">{event.city}</p></div>
              <div><p className="text-zinc-500">{t.events.location}</p><p className="mt-1 text-white">{event.state || event.country}</p></div>
              <div><p className="text-zinc-500">{t.events.date}</p><p className="mt-1 text-white">{event.date}</p></div>
              <div><p className="text-zinc-500">{t.events.time}</p><p className="mt-1 text-white">{event.time}</p></div>
              <div><p className="text-zinc-500">{t.events.priceRange}</p><p className="mt-1 text-brand-gold">{event.priceRange}</p></div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">{t.events.ticketProviders}</p>
            <div className="mt-4 flex flex-col gap-3">
              {providers.map((provider) => (
                <BuyTicketsButton
                  key={provider.slug}
                  eventSlug={event.slug}
                  provider={provider}
                  href={buildAffiliateUrl(provider, event)}
                  label={t.events.buyTickets}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
