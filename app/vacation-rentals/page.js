import Link from 'next/link';
import { getVacationRentals } from '../../lib/vacationRentalsData';
import { getServerTranslation } from '../../lib/serverLocale';
import { Reveal, Parallax } from '../components/Motion';

export const dynamic = 'force-dynamic';

// Villas / Stays — Kobu reference: a monochrome travel gazette on warm
// parchment. The monumental wordmark stretches edge-to-edge, Fira Mono
// museum tags label everything, cards are image-first with no chrome, and
// the Miami architecture in the photography is the only color on the page.

export default function VacationRentalsPage() {
  const properties = getVacationRentals();
  const { t } = getServerTranslation();

  const neighborhoods = [...new Set(properties.map((p) => p.location))];
  const totalBedrooms = properties.reduce((sum, p) => sum + (p.bedrooms || 0), 0);
  const totalGuests = properties.reduce((sum, p) => sum + (p.guests || 0), 0);

  return (
    <main className="flex-1 theme-villa">
      {/* ===== Photographic overture — Miami architecture at dusk ===== */}
      <section className="lux-hero full-bleed -mt-[60px] flex min-h-[88svh] items-end bg-villa-charcoal">
        <div className="lux-hero__bg">
          <Parallax distance={60} className="h-full">
            <img
              src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=2400&q=80"
              alt=""
              className="lux-kenburns h-[115%] w-full object-cover"
            />
          </Parallax>
        </div>
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(180deg,rgba(7,7,7,0.6)_0%,rgba(7,7,7,0.16)_32%,rgba(7,7,7,0.28)_64%,rgba(7,7,7,0.92)_100%)]" />
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(80deg,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.2)_40%,rgba(0,0,0,0)_64%)]" />
        <div className="lux-grain" />

        <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-40 sm:px-6 lg:px-8">
          <Reveal>
            <p className="lux-eyebrow">{t.vacationRentals.pill}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-3xl font-display text-5xl font-light leading-[1.02] tracking-tight text-white [text-shadow:0_4px_44px_rgba(0,0,0,0.5)] sm:text-6xl lg:text-7xl">
              {t.vacationRentals.title}
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-xl font-serif text-lg italic leading-relaxed text-white/95 [text-shadow:0_2px_18px_rgba(0,0,0,0.65)] sm:text-xl">
              {t.vacationRentals.subtitle}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== The gazette — warm parchment, monumental wordmark ===== */}
      <section className="full-bleed bg-villa-parchment text-villa-obsidian">
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-28">
          {/* Museum tag row */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-villa-obsidian/20 pb-4 font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">
            <span>Vol. 01 — Miami, Florida</span>
            <span>{String(properties.length).padStart(2, '0')} residences</span>
          </div>

          {/* Monumental wordmark — the name is the visual statement */}
          <h2 className="mt-10 select-none font-display font-medium uppercase leading-[0.92] tracking-[-0.02em]">
            <span className="block text-[13.5vw] text-villa-ash/70 lg:text-[10.5rem]">Miami</span>
            <span className="block text-[13.5vw] text-villa-charcoal lg:text-[10.5rem]">Stays</span>
          </h2>

          <div className="mt-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <p className="max-w-xl text-base leading-relaxed text-villa-graphite">
              Private villas, penthouses, and waterfront estates across Miami&rsquo;s most exclusive
              neighborhoods — each one staged, serviced, and a short walk from the water.
            </p>
            <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">
              {neighborhoods.length} neighborhoods · {totalBedrooms} bedrooms · {totalGuests} guests
            </p>
          </div>

          {/* ===== Property cards — image-first, no chrome ===== */}
          <div className="mt-16 grid gap-x-10 gap-y-16 md:grid-cols-2">
            {properties.map((item, index) => (
              <article key={item.id} className="group">
                <Link href={`/vacation-rentals/${item.slug}`} className="relative block overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                  />
                  {item.featured && (
                    <span className="absolute left-2.5 top-2.5 rounded-[5px] border border-villa-obsidian bg-white px-2.5 py-1 font-fira text-[0.6rem] font-medium uppercase tracking-[0.183em] text-villa-obsidian">
                      · Featured
                    </span>
                  )}
                </Link>

                <div className="mt-5 flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-[1.35rem] font-medium tracking-tight text-villa-obsidian">
                    <Link href={`/vacation-rentals/${item.slug}`} className="hover:underline hover:underline-offset-4">
                      {item.title}
                    </Link>
                  </h3>
                  <p className="whitespace-nowrap font-fira text-[0.7rem] font-medium uppercase tracking-[0.167em] text-villa-obsidian">
                    {item.nightlyRate}
                  </p>
                </div>
                <p className="mt-1.5 font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">
                  {item.location} · {item.guests} {t.vacationRentals.guests} · {item.bedrooms} {t.vacationRentals.bedrooms}
                </p>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-villa-graphite">{item.description}</p>

                <div className="mt-5 flex items-center gap-6">
                  <Link
                    href={`/vacation-rentals/${item.slug}`}
                    className="border-b border-villa-obsidian pb-0.5 font-fira text-[0.66rem] font-medium uppercase tracking-[0.18em] text-villa-obsidian transition-opacity hover:opacity-60"
                  >
                    {t.common.viewDetails}
                  </Link>
                  <Link
                    href="/partner"
                    className="font-fira text-[0.66rem] font-medium uppercase tracking-[0.18em] text-villa-ash transition-colors hover:text-villa-obsidian"
                  >
                    {t.vacationRentals.reserve}
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* Gazette colophon */}
          <div className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-villa-obsidian/20 pt-6">
            <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">
              GORGONA ONE — Villas &amp; Stays, Miami FL
            </p>
            <Link
              href="/concierge"
              className="border-b border-villa-obsidian pb-0.5 font-fira text-[0.66rem] font-medium uppercase tracking-[0.18em] text-villa-obsidian transition-opacity hover:opacity-60"
            >
              Ask the Concierge
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
