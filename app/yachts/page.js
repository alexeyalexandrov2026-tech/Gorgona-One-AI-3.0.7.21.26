import Link from 'next/link';
import { getYachts } from '../../lib/yachtsData';
import { getServerTranslation } from '../../lib/serverLocale';
import { Reveal, Parallax } from '../components/Motion';

export const dynamic = 'force-dynamic';

// Yacht Rentals — Arc reference: an industrial white gallery suspended above
// midnight water. 99% achromatic + two near-black teals, weight-300 display
// type, photography in generously rounded frames, skeletal ghost controls.
// The interface stays still — the boats are the only thing that moves.

export default function YachtsPage() {
  const yachts = getYachts();
  const { t } = getServerTranslation();

  const totalGuests = yachts.reduce((sum, y) => sum + (y.capacity || 0), 0);
  const marinas = [...new Set(yachts.map((y) => y.location))];

  return (
    <main className="flex-1 theme-yacht">
      {/* ===== Aerial marine hero — the boats are the only thing that
           moves. Real footage (public/videos/yachts-hero.mp4, H.264 21s
           loop); the still photograph doubles as poster while it streams. ===== */}
      <section className="lux-hero full-bleed -mt-[60px] flex min-h-[92svh] items-end bg-yacht-current">
        <div className="lux-hero__bg">
          <Parallax distance={60} className="h-full">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=2400&q=80"
              className="h-[115%] w-full object-cover"
            >
              <source src="/videos/yachts-hero.mp4" type="video/mp4" />
            </video>
          </Parallax>
        </div>
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(180deg,rgba(3,30,37,0.6)_0%,rgba(3,30,37,0.15)_32%,rgba(0,0,0,0.25)_64%,rgba(3,30,37,0.92)_100%)]" />
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(80deg,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.2)_40%,rgba(0,0,0,0)_64%)]" />
        <div className="lux-grain" />

        <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-40 sm:px-6 lg:px-8">
          <Reveal>
            <p className="lux-eyebrow">{t.yachts.pill}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-3xl font-display text-5xl font-light leading-[1.02] tracking-tight text-white [text-shadow:0_4px_44px_rgba(0,0,0,0.5)] sm:text-6xl lg:text-7xl">
              {t.yachts.title}
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-xl font-serif text-lg italic leading-relaxed text-white/95 [text-shadow:0_2px_18px_rgba(0,0,0,0.65)] sm:text-xl">
              {t.yachts.subtitle}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== White gallery — the fleet as exhibits ===== */}
      <section className="full-bleed bg-white text-yacht-charcoal">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h2 className="max-w-xl font-display text-4xl font-light leading-[1.1] tracking-tight sm:text-5xl">
              The charter fleet
            </h2>
            <p className="max-w-md text-base leading-relaxed text-yacht-charcoal/60">
              Every vessel is fully crewed, provisioned, and staged from its home marina — step aboard and the water
              does the rest.
            </p>
          </div>

          <div className="mt-16 space-y-20 lg:space-y-28">
            {yachts.map((item, index) => (
              <article
                key={item.id}
                className={`grid items-center gap-8 lg:grid-cols-5 lg:gap-14 ${
                  index % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
                }`}
              >
                <Link
                  href={`/yachts/${item.slug}`}
                  className="group relative block overflow-hidden rounded-[32px] lg:col-span-3"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="aspect-[16/10] w-full object-cover transition-transform duration-150 group-hover:scale-[1.02]"
                  />
                </Link>
                <div className="lg:col-span-2">
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-yacht-charcoal/50">
                    {String(index + 1).padStart(2, '0')} · {item.length}
                  </p>
                  <h3 className="mt-3 font-display text-3xl font-light tracking-tight sm:text-4xl">{item.title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-yacht-charcoal/70">{item.description}</p>

                  <dl className="mt-8 border-t border-yacht-bone text-sm">
                    {[
                      [t.yachts.company, item.company],
                      [t.yachts.location, item.location],
                      [t.yachts.capacity, `${item.capacity} ${t.yachts.guests}`],
                      [t.yachts.length, item.length],
                      [t.yachts.price, item.price]
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-baseline justify-between border-b border-yacht-bone py-3">
                        <dt className="text-yacht-charcoal/50">{label}</dt>
                        <dd className="font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href={`/yachts/${item.slug}`}
                      className="rounded-[5px] border border-yacht-charcoal px-6 py-3 text-sm font-medium transition-colors duration-150 hover:bg-yacht-charcoal hover:text-white"
                    >
                      {t.common.viewDetails}
                    </Link>
                    <Link
                      href="/partner"
                      className="rounded-[5px] border border-yacht-charcoal/25 px-6 py-3 text-sm font-medium text-yacht-charcoal/70 transition-colors duration-150 hover:border-yacht-charcoal hover:text-yacht-charcoal"
                    >
                      {t.yachts.reserve}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Midnight teal band — the rhythmic counterpoint ===== */}
      <section className="full-bleed bg-yacht-current text-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="max-w-2xl font-display text-3xl font-light leading-[1.15] tracking-tight sm:text-4xl">
                Open water, handled end to end — crew, provisioning, and a concierge on the dock.
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-6 lg:grid-cols-1">
              {[
                [String(yachts.length).padStart(2, '0'), 'Vessels'],
                [String(totalGuests), 'Guest capacity'],
                [String(marinas.length).padStart(2, '0'), 'Home marinas']
              ].map(([value, label]) => (
                <div key={label}>
                  <p className="font-display text-4xl font-light">{value}</p>
                  <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-white/50">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-14 flex flex-wrap gap-3">
            <Link
              href="/partner"
              className="rounded-[5px] border border-white px-7 py-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-white hover:text-yacht-current"
            >
              {t.yachts.reserve}
            </Link>
            <Link
              href="/concierge"
              className="rounded-[5px] border border-white/25 px-7 py-3 text-sm font-medium text-white/70 transition-colors duration-150 hover:border-white hover:text-white"
            >
              Ask the Concierge
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
