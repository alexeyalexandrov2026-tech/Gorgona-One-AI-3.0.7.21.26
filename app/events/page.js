import Link from 'next/link';
import { getServerTranslation } from '../../lib/serverLocale';
import { Reveal, Stagger, StaggerItem, Parallax } from '../components/Motion';

export const metadata = {
  title: 'Tickets & Events | GORGONA ONE',
  description: 'Sports tickets and concert tickets from trusted providers, all in one place.'
};

const ArrowIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function EventsMarketplacePage() {
  const { t } = getServerTranslation();

  const eventCategories = [
    {
      title: 'Sport Tickets',
      copy: 'Access the most exclusive seating for premium sporting events worldwide.',
      href: '/events/category/sports',
      image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1400&q=80',
      tag: 'Sports'
    },
    {
      title: 'Concert and Events Tickets',
      copy: 'Premium VIP access to sold-out concerts, festivals, and cultural events.',
      href: '/events/category/concerts',
      image: 'https://images.unsplash.com/photo-1540039155732-d68832a8a101?auto=format&fit=crop&w=1400&q=80',
      tag: 'Concerts'
    }
  ];

  return (
    <main className="flex-1 theme-events">
      {/* Hero — matching the dark premium travel theme but for events */}
      <section className="lux-hero full-bleed -mt-[60px] flex min-h-[92svh] items-end bg-travel-void">
        <div className="lux-hero__bg">
          <Parallax distance={70} className="h-full">
            <img
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
            <h1 className="mt-6 font-serif text-6xl italic leading-[0.95] text-white sm:text-7xl lg:text-8xl">
              Experience the<br />
              <span className="text-brand-gold">extraordinary.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="lux-lede mt-8 text-lg">
              {t.events.marketplaceSubtitle || 'Curated VIP access to the world\'s most exclusive sports and concert events.'}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Experience grid */}
      <section className="py-20 lg:py-28">
        <Reveal>
          <p className="font-mono text-2xl font-medium uppercase leading-none tracking-[0.3em] text-white/25 sm:text-4xl">
            Categories
          </p>
          <h2 className="lux-display mt-6 max-w-2xl text-4xl sm:text-5xl">Select your next experience.</h2>
        </Reveal>
        <Stagger className="mt-12 grid gap-4 md:grid-cols-2" gap={0.08}>
          {eventCategories.map((item) => (
            <StaggerItem key={item.title}>
              <Link href={item.href} className="lux-tile group flex h-[360px] flex-col justify-end p-7">
                <div className="lux-tile__media">
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                </div>
                <div className="lux-tile__scrim" />
                <div className="lux-tile__glow" />
                <div className="relative">
                  <p className="lux-caption-upper">{item.tag}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <h3 className="font-serif text-3xl italic text-white">{item.title}</h3>
                    <ArrowIcon className="h-5 w-5 shrink-0 text-white/70 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
                  </div>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-300/90">{item.copy}</p>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </main>
  );
}
