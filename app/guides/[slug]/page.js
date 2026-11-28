import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GEO_GUIDES, GUIDES_UI, getGeoGuide } from '../../../lib/geo/guidesData.mjs';
import { CAR_BRAND_PAGES } from '../../../lib/geo/carBrandsData.mjs';
import { getVenueAudit } from '../../../lib/restaurantsNightlifeData.js';
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd, itemListJsonLd, pageMetadata, withBrand } from '../../../lib/seo.mjs';
import JsonLd from '../../components/JsonLd';
import { Crumbs, SectionHead, btn, chipClass, eyebrowClass, sectionY } from '../../components/g1/ui';

export const revalidate = 3600;

export function generateStaticParams() {
  return GEO_GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const guide = getGeoGuide(slug);
  if (!guide) return {};
  return pageMetadata({
    title: guide.title,
    fullTitle: withBrand(guide.title),
    description: guide.metaDescription,
    path: `/guides/${guide.slug}`,
    image: guide.heroImage
  });
}

export default async function GuideDetailPage({ params }) {
  const { slug } = await params;
  const guide = getGeoGuide(slug);
  if (!guide) notFound();

  const related = GEO_GUIDES.filter((item) => item.slug !== guide.slug);
  const verifiedVenues = guide.showVerifiedVenues
    ? getVenueAudit().filter((v) => v.status === 'verified').slice(0, 18)
    : [];

  const schemas = [
    breadcrumbJsonLd([
      { name: GUIDES_UI.home, path: '/' },
      { name: GUIDES_UI.guides, path: '/guides' },
      { name: guide.title, path: `/guides/${guide.slug}` }
    ]),
    articleJsonLd({
      headline: guide.title,
      description: guide.metaDescription,
      path: `/guides/${guide.slug}`,
      image: guide.heroImage
    }),
    faqJsonLd(guide.faqs),
    verifiedVenues.length
      ? itemListJsonLd({
          name: GUIDES_UI.venuesHeading,
          path: `/guides/${guide.slug}`,
          items: verifiedVenues.map((v) => ({ name: v.name, path: `/restaurants-nightlife/${v.slug}` }))
        })
      : null
  ].filter(Boolean);

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <JsonLd data={schemas} />
      <Crumbs items={[[GUIDES_UI.home, '/'], [GUIDES_UI.guides, '/guides'], [guide.title]]} />

      <article className="py-8">
        <header className="grid max-w-4xl gap-4 pb-8">
          <p className={eyebrowClass}>{`${guide.category} · ${GUIDES_UI.updatedLabel} ${GUIDES_UI.updatedDate}`}</p>
          <h1 className="g1-display font-g1display text-[clamp(2rem,3vw+1rem,3.6rem)] font-medium leading-[1.05] tracking-[-0.015em] text-g1-ink [text-wrap:balance]">
            {guide.title}
          </h1>
          <p className="max-w-[65ch] text-[1.08rem] leading-relaxed text-g1-soft">{guide.lede}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Link href={guide.primaryCta.href} className={`${btn.base} ${btn.primary}`}>
              {guide.primaryCta.label}
            </Link>
            <Link href="/discovery" className={`${btn.base} ${btn.ink}`}>
              {GUIDES_UI.askElio}
            </Link>
            <a
              href="https://t.me/MIAMI_ELIO"
              target="_blank"
              rel="noopener noreferrer"
              className={`${btn.base} ${btn.ghost} border-g1-ink/35 bg-g1-card`}
            >
              {GUIDES_UI.telegramCta}
            </a>
          </div>
        </header>

        <section className="mb-10 rounded-2xl border border-g1-rule bg-g1-card p-6" aria-label={GUIDES_UI.keyTakeaways}>
          <h2 className="mb-3 font-g1display text-2xl font-medium text-g1-ink">{GUIDES_UI.keyTakeaways}</h2>
          <ul className="grid gap-2.5 text-[0.98rem] leading-relaxed text-g1-soft">
            {guide.takeaways.map((point) => (
              <li key={point} className="flex gap-2.5">
                <span aria-hidden="true" className="text-g1-accent">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10" aria-label={guide.tableTitle}>
          <h2 className="mb-4 font-g1display text-2xl font-medium text-g1-ink">{guide.tableTitle}</h2>
          <div className="overflow-x-auto rounded-2xl border border-g1-rule bg-g1-card">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-g1-rule bg-g1-paper/60">
                  {guide.tableHeaders.map((header) => (
                    <th key={header} className="px-5 py-3.5 font-g1mono text-[0.72rem] uppercase tracking-[0.12em] text-g1-soft">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guide.tableRows.map((row) => (
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

        <div className="grid max-w-4xl gap-8 pb-10">
          {guide.sections.map((sec) => (
            <section key={sec.heading} className="grid gap-3">
              <h2 className="font-g1display text-2xl font-medium text-g1-ink">{sec.heading}</h2>
              {sec.paragraphs.map((para) => (
                <p key={para} className="text-[1rem] leading-relaxed text-g1-soft">{para}</p>
              ))}
            </section>
          ))}
        </div>

        {guide.showBrandGrid && (
          <section className={`border-t border-g1-rule ${sectionY}`} aria-label={GUIDES_UI.brandsHeading}>
            <SectionHead title={GUIDES_UI.brandsHeading} />
            <div className="flex flex-wrap gap-2.5">
              {CAR_BRAND_PAGES.map((brand) => (
                <Link key={brand.slug} href={`/rentals/brand/${brand.slug}`} className={chipClass}>
                  {brand.brandName}
                </Link>
              ))}
            </div>
          </section>
        )}

        {verifiedVenues.length > 0 && (
          <section className={`border-t border-g1-rule ${sectionY}`} aria-label={GUIDES_UI.venuesHeading}>
            <SectionHead title={GUIDES_UI.venuesHeading} href="/restaurants-nightlife" cta={guide.primaryCta.label} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {verifiedVenues.map((venue) => (
                <Link
                  key={venue.slug}
                  href={`/restaurants-nightlife/${venue.slug}`}
                  className="grid gap-1 rounded-xl border border-g1-rule bg-g1-card p-4 transition hover:border-g1-ink"
                >
                  <span className="font-g1display text-lg font-medium text-g1-ink">{venue.name}</span>
                  <span className="text-xs text-g1-soft">
                    {[venue.neighborhood, venue.cuisine, venue.price].filter(Boolean).join(' · ')}
                  </span>
                  <span className="mt-1 text-xs font-medium text-g1-accent">{GUIDES_UI.reserveLabel}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className={`border-t border-g1-rule ${sectionY}`} aria-label={GUIDES_UI.faqTitle}>
          <SectionHead title={GUIDES_UI.faqTitle} />
          <div className="grid gap-4 md:grid-cols-2">
            {guide.faqs.map((item) => (
              <article key={item.question} className="grid content-start gap-2 rounded-2xl border border-g1-rule bg-g1-card p-5">
                <h3 className="font-g1display text-lg font-medium leading-snug text-g1-ink">{item.question}</h3>
                <p className="text-sm leading-relaxed text-g1-soft">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`border-t border-g1-rule ${sectionY}`} aria-label={GUIDES_UI.relatedTitle}>
          <SectionHead title={GUIDES_UI.relatedTitle} href="/guides" cta={GUIDES_UI.guides} />
          <div className="grid gap-4 md:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/guides/${item.slug}`}
                className="grid gap-2 rounded-2xl border border-g1-rule bg-g1-card p-5 transition hover:border-g1-ink"
              >
                <span className="font-g1mono text-[0.68rem] uppercase tracking-[0.14em] text-g1-accent">{item.category}</span>
                <span className="font-g1display text-lg font-medium leading-snug text-g1-ink">{item.title}</span>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}
