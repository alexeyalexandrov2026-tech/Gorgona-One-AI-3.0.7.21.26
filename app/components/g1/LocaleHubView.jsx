import Link from 'next/link';
import { getRentals } from '../../../lib/data/listings';
import { carThumb } from '../../../lib/homeSections.mjs';
import { GEO_GUIDES } from '../../../lib/geo/guidesData.mjs';
import { SITE_URL, faqJsonLd, itemListJsonLd } from '../../../lib/seo.mjs';
import JsonLd from '../JsonLd';
import { WorldHero, SectionHead, ListingCard, Specs, btn, sectionY, chipClass } from './ui';

const FEATURED_SLUGS = [
  'lamborghini-urus-se',
  'sunset-2023-lamborghini-urus',
  'sunset-2024-rolls-royce-cullinan',
  'mercedes-amg-cle-53-cabriolet',
  'sunset-2023-mercedes-benz-g-class-amg-g-63',
  'bmw-x5-white-brown'
];

export default async function LocaleHubView({ hub }) {
  const allCars = await getRentals({ editorial: true });
  const picked = [];
  const seen = new Set();
  for (const slug of FEATURED_SLUGS) {
    const match = allCars.find((car) => car.slug === slug);
    if (match && !seen.has(match.slug)) {
      seen.add(match.slug);
      picked.push(match);
    }
  }
  for (const car of allCars) {
    if (picked.length >= 6) break;
    if (!seen.has(car.slug)) {
      seen.add(car.slug);
      picked.push(car);
    }
  }

  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_URL}${hub.path}#webpage`,
    url: `${SITE_URL}${hub.path}`,
    name: hub.metaTitle,
    description: hub.metaDescription,
    inLanguage: hub.lang,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` }
  };

  const carsListSchema = itemListJsonLd({
    name: hub.fleetTitle,
    path: hub.path,
    items: picked.map((car) => ({ name: car.title, path: `/rentals/${car.slug}` }))
  });

  return (
    <main lang={hub.lang} className="flex-1 font-g1sans text-g1-ink">
      <JsonLd data={[pageSchema, faqJsonLd(hub.faqs), carsListSchema]} />

      <WorldHero
        eyebrow={hub.eyebrow}
        title={hub.heroTitle}
        lede={hub.heroLede}
        img={hub.heroImage}
        alt={hub.heroAlt}
      >
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link href={hub.primaryCta.href} className={`${btn.base} ${btn.primary}`}>
            {hub.primaryCta.label}
          </Link>
          <a
            href={hub.telegramCta.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn.base} ${btn.ink}`}
          >
            {hub.telegramCta.label}
          </a>
          <a
            href={hub.whatsappCta.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn.base} ${btn.ghost} border-g1-ink/35 bg-g1-card`}
          >
            {hub.whatsappCta.label}
          </a>
        </div>
      </WorldHero>

      <section className="pb-8" aria-label={hub.eyebrow}>
        <Specs items={hub.stats} />
      </section>

      <section className={`border-t border-g1-rule ${sectionY}`} aria-label={hub.worldsTitle}>
        <SectionHead title={hub.worldsTitle} sub={hub.worldsSub} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hub.worlds.map((world) => (
            <article
              key={world.href}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-g1-rule bg-g1-card p-5"
            >
              <div className="grid gap-2">
                <p className="font-g1mono text-[0.7rem] uppercase tracking-[0.12em] text-g1-accent">{world.meta}</p>
                <h3 className="font-g1display text-[1.3rem] font-medium leading-tight text-g1-ink">
                  <Link href={world.href} className="hover:text-g1-accent">{world.title}</Link>
                </h3>
                <p className="text-[0.92rem] leading-relaxed text-g1-soft">{world.desc}</p>
              </div>
              <Link
                href={world.href}
                className="inline-flex w-fit items-center gap-1.5 border-b border-g1-rule pb-0.5 text-sm font-medium text-g1-ink hover:border-g1-accent hover:text-g1-accent"
              >
                {world.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className={`border-t border-g1-rule ${sectionY}`} aria-label={hub.pricingTitle}>
        <SectionHead title={hub.pricingTitle} sub={hub.pricingSub} />
        <div className="overflow-x-auto rounded-2xl border border-g1-rule bg-g1-card">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-g1-rule bg-g1-paper/60">
                {hub.pricingHeaders.map((header) => (
                  <th key={header} className="px-5 py-3.5 font-g1mono text-[0.72rem] uppercase tracking-[0.12em] text-g1-soft">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hub.pricingRows.map((row) => (
                <tr key={row[0]} className="border-b border-g1-rule/70 last:border-b-0">
                  <td className="px-5 py-3.5 font-medium text-g1-ink">{row[0]}</td>
                  <td className="px-5 py-3.5 text-g1-soft">{row[1]}</td>
                  <td className="px-5 py-3.5 font-medium text-g1-ink">{row[2]}</td>
                  <td className="px-5 py-3.5 text-g1-soft">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {picked.length > 0 && (
        <section className={`border-t border-g1-rule ${sectionY}`} aria-label={hub.fleetTitle}>
          <SectionHead title={hub.fleetTitle} href="/rentals" cta={hub.fleetCta} />
          <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {picked.map((car, idx) => (
              <ListingCard
                key={car.slug}
                href={`/rentals/${car.slug}`}
                img={carThumb(car)}
                alt={car.title}
                title={car.title}
                meta={`${car.category || ''}${car.location ? ` · ${car.location}` : ''}`}
                rate={`${hub.dailyLabel}: ${car.dailyPrice}`}
                priority={idx < 3}
              />
            ))}
          </div>
        </section>
      )}

      <section className={`border-t border-g1-rule ${sectionY}`} aria-label={hub.guidesTitle}>
        <SectionHead title={hub.guidesTitle} href="/guides" cta={hub.guidesCta} />
        <div className="grid gap-4 sm:grid-cols-2">
          {GEO_GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="grid gap-2 rounded-2xl border border-g1-rule bg-g1-card p-5 transition hover:border-g1-ink"
            >
              <span className="font-g1mono text-[0.7rem] uppercase tracking-[0.14em] text-g1-accent">{guide.category}</span>
              <span className="font-g1display text-xl font-medium leading-snug text-g1-ink">{guide.title}</span>
              <span className="text-sm text-g1-soft">{guide.metaDescription}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={`border-t border-g1-rule ${sectionY}`} aria-label={hub.faqTitle}>
        <SectionHead title={hub.faqTitle} />
        <div className="grid gap-4 md:grid-cols-2">
          {hub.faqs.map((item) => (
            <article key={item.question} className="grid content-start gap-2 rounded-2xl border border-g1-rule bg-g1-card p-5">
              <h3 className="font-g1display text-lg font-medium leading-snug text-g1-ink">{item.question}</h3>
              <p className="text-sm leading-relaxed text-g1-soft">{item.answer}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-g1-soft">{hub.switchLabel}</span>
          {hub.switchLinks.map((link) => (
            <Link key={link.href} href={link.href} className={chipClass}>
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
