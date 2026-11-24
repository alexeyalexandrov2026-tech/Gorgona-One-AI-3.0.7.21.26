
import { LocalizedText, LocalizedElement } from "../components/LocalizedText";
import Link from 'next/link';
import { Reveal, Stagger, StaggerItem, Parallax } from '../components/Motion';
import JsonLd from '../components/JsonLd';
import { pageMetadata, sectionJsonLd } from '../../lib/seo.mjs';

export const metadata = pageMetadata({
  title: 'Travel, Flights & Stays',
  fullTitle: 'Travel, Flights & Stays | Miami Elio Travel',
  description: 'Explore destinations, flights and stays in the Miami Elio Travel section. Browse partner travel offers and plan your next trip.',
  path: '/travel',
  image: '/images/experiences/miami-coast.webp'
});

const experiences = [
  {
    title: 'Exclusive Destinations',
    copy: 'Hand-picked escapes across coastlines, capitals and hidden retreats.',
    href: '/exclusive-destinations',
    image: '/images/home/travel-beach.webp',
    tag: 'Destinations'
  },
  {
    title: 'Flights & Airfare',
    copy: 'Business-class fares, last-minute deals and flexible routing with Ovago.',
    href: '/travel/ovago',
    image: '/images/ovago/business-class-flights.jpg',
    tag: 'Flights'
  },
  {
    title: 'Hotels & Stays',
    copy: 'From city landmarks to private villas — verified travel offers.',
    href: '/vacation-rentals',
    image: '/images/home/deco-hotel.jpg',
    tag: 'Hotels'
  },
  {
    title: 'Dining & Nightlife',
    copy: 'Reserve tables and after-dark experiences in the world\u2019s great cities.',
    href: '/restaurants-nightlife',
    image: '/images/dining/amara-at-paraiso.jpg',
    tag: 'Dining'
  }
];

const ArrowIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function TravelLandingPage() {
  return (
    <main className="flex-1 theme-travel">
      <JsonLd data={sectionJsonLd({ name: 'Travel, Flights & Stays', description: metadata.description, path: '/travel' })} />
      {/* Hero — Miami ocean horizon with warm champagne-gold accents */}
      <section className="lux-hero full-bleed -mt-[60px] flex min-h-[92svh] items-end bg-[#011c26]">
        <div className="lux-hero__bg">
          <Parallax distance={70} className="h-full">
            <img
              src="/images/experiences/miami-coast.webp"
              alt=""
              aria-hidden="true"
              className="lux-kenburns h-[115%] w-full object-cover opacity-85"
            />
          </Parallax>
        </div>
        {/* z-[-1] keeps the washes above the photo (bg sits at z-[-2]). */}
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(180deg,rgba(1,28,38,0.68)_0%,rgba(1,28,38,0.28)_34%,rgba(1,24,33,0.48)_64%,rgba(1,16,23,0.95)_100%)]" />
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(80deg,rgba(1,20,29,0.64)_0%,rgba(1,24,33,0.28)_44%,rgba(1,24,33,0)_68%)]" />
        <div
          className="pointer-events-none absolute -left-36 top-20 z-[-1] h-[520px] w-[520px] rounded-full opacity-45 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.34), rgba(20,184,166,0.16) 46%, transparent 68%)' }}
        />
        <div className="lux-grain" />
        <div className="lux-hero__grain" />

        <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-40 sm:px-6 lg:px-8">
          <p className="lux-eyebrow"><LocalizedText source="Travel · Exclusive destinations" /></p>
          <h1 className="mt-6 font-serif text-6xl italic leading-[0.95] text-white sm:text-7xl lg:text-8xl"><LocalizedText source="Go somewhere{break}{highlight}" values={{ break: <br />, highlight: <span className="text-[#f0d37a]"><LocalizedText source="extraordinary." /></span> }} />
          </h1>
          <p className="lux-lede mt-8 text-lg text-[#e7edf0]/90"><LocalizedText source="ELIO+ Guide for travel — luxury destinations, curated flights, and stays, wrapped in a single premium experience." /></p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/experiences" className="lux-btn"><LocalizedText source="Explore experiences " /><ArrowIcon className="h-4 w-4" /></Link>
            <Link href="/travel/ovago" className="lux-btn-ghost"><LocalizedText source="Find flights" /></Link>
          </div>
        </div>
      </section>

      {/* Departures board — Miami coastal ocean-glass terminal */}
      <section className="full-bleed border-y border-white/12 bg-[#011821]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between font-mono text-[0.64rem] uppercase tracking-[0.28em]">
            <span className="text-[#e7edf0]/80"><LocalizedText source="Departures — MIA · Miami Intl" /></span>
            <span className="text-[#e6c567]"><LocalizedText source="Live" /></span>
          </div>
          <div className="mt-4 divide-y divide-white/10 font-mono">
            {[
              ['MIA', 'Exclusive destinations', '/experiences', 'Boarding'],
              ['MIA', 'Flights & airfare — Ovago', '/travel/ovago', 'On time'],
              ['MIA', 'Hotels & stays', '/vacation-rentals', 'On time'],
              ['MIA', 'Dining & nightlife', '/restaurants-nightlife', 'Now seating']
            ].map(([code, dest, href, status]) => (
              <Link
                key={dest}
                href={href}
                className="group grid grid-cols-[3rem_1fr_auto] items-baseline gap-4 py-3.5 text-[0.72rem] uppercase tracking-[0.18em] sm:grid-cols-[4rem_1fr_auto]"
              >
                <span className="text-teal-200/60">{code}</span>
                <span className="text-[#f4f1ea] transition-colors group-hover:text-[#f0d37a]"><LocalizedText source={dest} /></span>
                <span className="text-[#e6c567]"><LocalizedText source={status} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Experience grid */}
      <section className="py-20 lg:py-28">
        <Reveal>
          <p className="font-mono text-2xl font-medium uppercase leading-none tracking-[0.3em] text-[#d4af37]/35 sm:text-4xl"><LocalizedText source="The Journey" /></p>
          <h2 className="lux-display mt-6 max-w-2xl text-4xl sm:text-5xl"><LocalizedText source="Every part of the trip, elevated." /></h2>
        </Reveal>
        <Stagger className="mt-12 grid gap-4 md:grid-cols-2" gap={0.08}>
          {experiences.map((item) => (
            <StaggerItem key={item.title}>
              <Link href={item.href} className="lux-tile group flex h-[360px] flex-col justify-end p-7">
                <div className="lux-tile__media">
                  <LocalizedElement as="img" src={item.image} alt={item.title} className="h-full w-full object-cover" />
                </div>
                <div className="lux-tile__scrim" />
                <div className="lux-tile__glow" />
                <div className="relative">
                  <p className="lux-caption-upper text-[#f0d37a]"><LocalizedText source={item.tag} /></p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <h3 className="font-serif text-3xl italic text-white"><LocalizedText source={item.title} /></h3>
                    <ArrowIcon className="h-5 w-5 shrink-0 text-white/70 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#f0d37a]" />
                  </div>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-200/90"><LocalizedText source={item.copy} /></p>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Closing band */}
      <section className="pb-8">
        <Reveal>
          <div className="lux-hero relative overflow-hidden rounded-3xl border border-[#d4af37]/30 bg-[linear-gradient(135deg,rgba(1,33,44,0.92),rgba(2,18,26,0.96))] px-8 py-16 text-center sm:px-16">
            <div className="lux-hero__grain" />
            <p className="lux-eyebrow justify-center"><LocalizedText source="Ovago flight deals" /></p>
            <h2 className="mx-auto mt-5 max-w-2xl font-serif text-4xl italic text-white"><LocalizedText source="Your next flight, at a better fare." /></h2>
            <p className="lux-lede mx-auto mt-5 text-base text-[#e7edf0]/85"><LocalizedText source="Business class, cheap fares and last-minute routes — curated and affiliate-verified." /></p>
            <div className="mt-8 flex justify-center">
              <Link href="/travel/ovago" className="lux-btn"><LocalizedText source="View Ovago deals " /><ArrowIcon className="h-4 w-4" /></Link>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
