import Link from 'next/link';
import { getRentals } from '../../lib/rentalsData';
import { rentalDescriptions, getContentText } from '../../lib/contentTranslations';
import { getServerTranslation } from '../../lib/serverLocale';
import { Reveal, Stagger, StaggerItem, Parallax } from '../components/Motion';

export const dynamic = 'force-dynamic';

// Car Rentals — Ferrari cinematic dark theatre above, BMW white gallery below.
// Ferrari: black voids, white uppercase wide tracking, red reserved for
// interaction, zero radii, full-bleed photography. BMW: the UI recedes, a
// 300-weight display whispers, and the cars are the only color.

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

function ArrowIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function RentalsPage() {
  const rentals = getRentals();
  const { t, locale } = getServerTranslation();

  const featured = rentals.find((item) => item.featured) || rentals[0];
  const categories = [...new Set(rentals.map((item) => item.category))];
  const byCategory = categories.map((category) => ({
    category,
    anchor: slugify(category),
    items: rentals.filter((item) => item.category === category)
  }));

  return (
    <main className="flex-1 theme-ferrari">
      {/* ===== Ferrari cinematic theatre — the car IS the layout ===== */}
      <section className="lux-hero full-bleed -mt-[60px] flex min-h-[92svh] items-end bg-black">
        <div className="lux-hero__bg">
          <Parallax distance={70} className="h-full">
            <img
              src={featured.image.replace('w=900', 'w=2400')}
              alt=""
              className="lux-kenburns h-[115%] w-full object-cover"
            />
          </Parallax>
        </div>
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(180deg,rgba(0,0,0,0.66)_0%,rgba(0,0,0,0.22)_30%,rgba(0,0,0,0.3)_62%,rgba(0,0,0,0.94)_100%)]" />
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(80deg,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.18)_42%,rgba(0,0,0,0)_66%)]" />
        <div className="lux-grain" />

        <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-40 sm:px-6 lg:px-8">
          <Reveal>
            <p className="lux-eyebrow">{t.rentals.pill}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 font-display text-4xl font-medium uppercase leading-[1.05] tracking-[0.12em] text-white [text-shadow:0_4px_44px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-7xl">
              {t.rentals?.fleet || 'The Fleet'}
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-xl font-serif text-lg italic leading-relaxed text-white/95 [text-shadow:0_2px_18px_rgba(0,0,0,0.65)] sm:text-xl">
              {t.rentals.subtitle}
            </p>
          </Reveal>

          {/* Ferrari section labels — text-only, underline on hover, zero radius */}
          <Reveal delay={0.24}>
            <nav className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              {byCategory.map(({ category, anchor, items }) => (
                <a
                  key={anchor}
                  href={`#${anchor}`}
                  className="group border-b border-transparent pb-1 font-mono text-[0.7rem] uppercase tracking-[0.24em] text-white/80 transition-colors hover:border-ferrari-rosso hover:text-white"
                >
                  {category}
                  <span className="ml-2 text-ferrari-rosso">{String(items.length).padStart(2, '0')}</span>
                </a>
              ))}
            </nav>
          </Reveal>
        </div>
      </section>

      {/* ===== Signal strip — hairline stats band ===== */}
      <section className="full-bleed border-y border-ferrari-grafite bg-black">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            [String(rentals.length).padStart(2, '0'), t.rentals.pill],
            [String(categories.length).padStart(2, '0'), t.rentals?.collections || 'Collections'],
            ['24/7', t.rentals?.conciergeDelivery || 'Concierge delivery'],
            ['Miami', t.rentals?.beyond || '& beyond']
          ].map(([value, label]) => (
            <div key={label} className="flex items-baseline gap-3 py-6">
              <span className="font-display text-2xl font-light text-white">{value}</span>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-ferrari-fumo">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== BMW white gallery — sculpted metal on a gallery wall ===== */}
      <section className="full-bleed bg-car-fog text-car-carbon">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="max-w-3xl font-display text-4xl font-light leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
              {t.rentals.title}
            </h2>
          </Reveal>

          {byCategory.map(({ category, anchor, items }) => (
            <div key={anchor} id={anchor} className="mt-16 scroll-mt-24 first-of-type:mt-14">
              <div className="flex items-baseline justify-between border-b border-car-concrete/60 pb-3">
                <h3 className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-car-carbon">{category}</h3>
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-car-concrete">
                  {String(items.length).padStart(2, '0')}
                </span>
              </div>

              <Stagger className="mt-8 grid gap-10 md:grid-cols-2 xl:grid-cols-3" gap={0.06}>
                {items.map((item) => (
                  <StaggerItem key={item.id}>
                    <article className="group flex h-full flex-col bg-white">
                      <Link href={`/rentals/${item.slug}`} className="relative block overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="aspect-[16/10] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                        />
                        <span className="absolute left-0 top-0 h-0.5 w-0 bg-ferrari-rosso transition-all duration-500 group-hover:w-full" />
                      </Link>
                      <div className="flex flex-1 flex-col p-6">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-display text-xl font-light tracking-tight">{item.title}</h4>
                          <span className="mt-1 whitespace-nowrap font-mono text-[0.6rem] uppercase tracking-[0.18em] text-car-concrete">
                            {item.availability}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-car-concrete">
                          {item.company} · {item.location}
                        </p>
                        <p className="mt-4 text-sm leading-relaxed text-car-carbon/80">
                          {getContentText(rentalDescriptions, locale, item.id, item.description)}
                        </p>
                        <div className="mt-6 grid grid-cols-2 gap-y-1 border-t border-car-fog pt-4 text-sm">
                          <span className="text-car-concrete">{t.rentals.daily}</span>
                          <span className="text-right font-medium">{item.dailyPrice}</span>
                          <span className="text-car-concrete">{t.rentals.weekly}</span>
                          <span className="text-right font-medium">{item.weeklyPrice}</span>
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-6">
                          <Link
                            href={`/rentals/${item.slug}`}
                            className="group/link inline-flex items-center gap-2 border-b border-car-carbon pb-0.5 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-car-carbon transition-colors hover:border-ferrari-rosso hover:text-ferrari-rosso"
                          >
                            {t.common.viewDetails}
                            <ArrowIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover/link:translate-x-1" />
                          </Link>
                          <Link
                            href="/partner"
                            className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-car-concrete transition-colors hover:text-ferrari-rosso"
                          >
                            {t.rentals.reserve}
                          </Link>
                        </div>
                      </div>
                    </article>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Ferrari closing panel — black void, red only on approach ===== */}
      <section className="full-bleed bg-black">
        <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <Reveal>
            <p className="lux-eyebrow justify-center">{t.rentals?.conciergeEyebrow || 'Concierge'}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mx-auto mt-6 max-w-2xl font-display text-3xl font-medium uppercase leading-[1.15] tracking-[0.12em] text-white sm:text-4xl">
              {t.rentals?.unforgettable || 'Arrive in something unforgettable'}
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-ferrari-fumo">
              {t.rentals?.whiteGlove || 'White-glove pickup, delivery to your villa or marina, and a concierge on call for every kilometre.'}
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/partner"
                className="border border-white px-8 py-3.5 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-white transition-colors hover:border-ferrari-rosso hover:text-ferrari-rosso"
              >
                {t.rentals.reserve}
              </Link>
              <Link
                href="/concierge"
                className="border border-transparent px-8 py-3.5 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-ferrari-fumo transition-colors hover:text-white"
              >
                {t.rentals?.askConcierge || 'Ask the Concierge'}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
