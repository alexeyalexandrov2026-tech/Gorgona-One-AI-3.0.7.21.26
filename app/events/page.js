
import { LocalizedText, LocalizedElement } from "../components/LocalizedText";
import { getServerTranslation } from '../../lib/serverLocale';
import { Reveal, Stagger, StaggerItem, Parallax } from '../components/Motion';
import { TicketNetworkCatalogue } from './TicketNetworkCatalogue';
import { EventPass } from './EventPass';
import { getEventCategoriesByGroup } from '../../lib/mockEventsData';
import JsonLd from '../components/JsonLd';
import { pageMetadata, sectionJsonLd } from '../../lib/seo.mjs';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata({
  title: 'Miami Concerts, Sports & VIP Event Tickets',
  fullTitle: 'Miami Concerts, Sports & VIP Event Tickets | Miami Elio',
  description: 'Get tickets to Miami concerts, NBA, NHL, F1, Art Basel, and nightlife events. Secure seats and VIP access through Miami Elio.',
  path: '/events',
  image: '/images/events/concerts-pass.jpg'
});

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
      <JsonLd data={sectionJsonLd({ name: 'Miami Concerts, Sports & VIP Event Tickets', description: metadata.description, path: '/events' })} />
      {/* Hero — compact ocean-gold above-the-fold header so tickets and categories surface immediately */}
      <section className="lux-hero full-bleed -mt-[60px] flex min-h-[52svh] items-end bg-[#011c26] sm:min-h-[56svh]">
        <div className="lux-hero__bg">
          <Parallax distance={40} className="h-full">
            <LocalizedElement as="img"
              src="/images/events/concerts-pass.jpg"
              alt="Events"
              className="lux-kenburns h-[115%] w-full object-cover opacity-80"
            />
          </Parallax>
        </div>
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(180deg,rgba(1,28,38,0.68)_0%,rgba(1,28,38,0.34)_34%,rgba(1,22,30,0.62)_68%,rgba(1,16,23,0.96)_100%)]" />
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(80deg,rgba(1,20,29,0.64)_0%,rgba(1,24,33,0.28)_44%,rgba(1,24,33,0)_68%)]" />
        <div
          className="pointer-events-none absolute -left-36 top-16 z-[-1] h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.34), transparent 62%)' }}
        />
        <div className="lux-grain" />
        <div className="lux-hero__grain" />

        <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-28 sm:px-6 sm:pb-16 sm:pt-32 lg:px-8">
          <Reveal>
            <p className="lux-eyebrow">{t.events.marketplaceTitle}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-4 font-serif text-5xl italic leading-[0.95] text-white sm:text-6xl lg:text-7xl"><LocalizedText source="Experience the{break}{highlight}" values={{ break: <>{' '}<br /></>, highlight: <span className="text-brand-gold"><LocalizedText source="extraordinary." /></span> }} />
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="lux-lede mt-5 text-base sm:text-lg">
              {t.events.marketplaceSubtitle || <LocalizedText source={"Curated VIP access to the world's most exclusive sports and concert events."} />}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Experience grid */}
      <section className="py-12 lg:py-16">
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
