
import { LocalizedText, LocalizedElement } from "../components/LocalizedText";
import { getServerTranslation } from '../../lib/serverLocale';
import { Reveal, Stagger, StaggerItem, Parallax } from '../components/Motion';
import { TicketNetworkCatalogue } from './TicketNetworkCatalogue';
import { EventPass } from './EventPass';
import { getEventCategoriesByGroup } from '../../lib/mockEventsData';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tickets & Events | MIAMI ELIO',
  description: 'Sports tickets and concert tickets from trusted providers, all in one place.'
};

export default async function EventsMarketplacePage() {
  const { t } = await getServerTranslation();

  // Both photos ship with the build, so neither ticket depends on an outside
  // address. `group` is the Events pillar whose subcategories fill the stub.
  const eventCategories = [
    {
      title: 'Sport Tickets',
      copy: 'Access the most exclusive seating for premium sporting events worldwide.',
      href: '/events/category/sports',
      image: '/images/events/sports-pass.jpg',
      tag: 'Sports',
      group: 'sports'
    },
    {
      title: 'Concert and Events Tickets',
      copy: 'Premium VIP access to sold-out concerts, festivals, and cultural events.',
      href: '/events/category/concerts',
      image: '/images/events/concerts-pass.jpg',
      tag: 'Concerts',
      group: 'concerts'
    }
  ];

  return (
    <main className="flex-1 theme-events">
      {/* Hero — matching the dark premium travel theme but for events */}
      <section className="lux-hero full-bleed -mt-[60px] flex min-h-[92svh] items-end bg-travel-void">
        <div className="lux-hero__bg">
          <Parallax distance={70} className="h-full">
            <LocalizedElement as="img"
              src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=2400&q=80"
              alt="Events"
              className="lux-kenburns h-[115%] w-full object-cover opacity-80"
            />
          </Parallax>
        </div>
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(180deg,rgba(9,9,9,0.62)_0%,rgba(9,9,9,0.2)_30%,rgba(9,9,9,0.32)_62%,rgba(5,5,5,0.94)_100%)]" />
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(80deg,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.2)_40%,rgba(0,0,0,0)_64%)]" />
        <div
          className="pointer-events-none absolute -left-40 top-24 z-[-1] h-[520px] w-[520px] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(255,180,80,0.35), transparent 60%)' }}
        />
        <div className="lux-grain" />
        <div className="lux-hero__grain" />

        <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-40 sm:px-6 lg:px-8">
          <Reveal>
            <p className="lux-eyebrow">{t.events.marketplaceTitle}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 font-serif text-6xl italic leading-[0.95] text-white sm:text-7xl lg:text-8xl"><LocalizedText source="Experience the{break}{highlight}" values={{ break: <br />, highlight: <span className="text-brand-gold"><LocalizedText source="extraordinary." /></span> }} />
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="lux-lede mt-8 text-lg">
              {t.events.marketplaceSubtitle || <LocalizedText source={"Curated VIP access to the world's most exclusive sports and concert events."} />}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Experience grid */}
      <section className="py-20 lg:py-28">
        <Reveal>
          <p className="font-mono text-2xl font-medium uppercase leading-none tracking-[0.3em] text-white/25 sm:text-4xl"><LocalizedText source="Categories" /></p>
          <h2 className="lux-display mt-6 max-w-2xl text-4xl sm:text-5xl"><LocalizedText source="Select your next experience." /></h2>
        </Reveal>
        <Stagger className="mt-12 grid gap-5 md:grid-cols-2" gap={0.08}>
          {eventCategories.map((item, index) => (
            <StaggerItem key={item.title} className="min-w-0">
              <EventPass
                item={item}
                index={index}
                total={eventCategories.length}
                categories={getEventCategoriesByGroup(item.group)}
              />
            </StaggerItem>
          ))}
        </Stagger>
      </section>
      <section className="full-bleed bg-villa-parchment text-villa-obsidian">
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-1 sm:px-6 lg:px-8">
          <TicketNetworkCatalogue category="events" />
        </div>
      </section>
    </main>
  );
}
