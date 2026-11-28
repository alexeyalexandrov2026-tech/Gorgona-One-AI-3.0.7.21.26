import Link from 'next/link';
import { GEO_GUIDES, GUIDES_UI } from '../../lib/geo/guidesData.mjs';
import { CAR_BRAND_PAGES } from '../../lib/geo/carBrandsData.mjs';
import { itemListJsonLd, pageMetadata, sectionJsonLd, withBrand } from '../../lib/seo.mjs';
import JsonLd from '../components/JsonLd';
import { Crumbs, SectionHead, chipClass, eyebrowClass, sectionY } from '../components/g1/ui';

export const revalidate = 3600;

export const metadata = pageMetadata({
  title: GUIDES_UI.indexTitle,
  fullTitle: withBrand('Miami Luxury Travel, Pricing & Planning Guides (2026)'),
  description: GUIDES_UI.indexLede,
  path: '/guides'
});

export default function GuidesIndexPage() {
  const itemList = itemListJsonLd({
    name: GUIDES_UI.indexTitle,
    path: '/guides',
    items: GEO_GUIDES.map((g) => ({ name: g.title, path: `/guides/${g.slug}` }))
  });

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <JsonLd
        data={[
          ...sectionJsonLd({ name: GUIDES_UI.indexTitle, description: GUIDES_UI.indexLede, path: '/guides' }),
          itemList
        ]}
      />
      <Crumbs items={[[GUIDES_UI.home, '/'], [GUIDES_UI.guides]]} />

      <header className="grid max-w-4xl gap-4 py-10">
        <p className={eyebrowClass}>{GUIDES_UI.indexEyebrow}</p>
        <h1 className="g1-display font-g1display text-[clamp(2.2rem,3.4vw+1rem,4.1rem)] font-medium leading-[1.03] tracking-[-0.015em] text-g1-ink [text-wrap:balance]">
          {GUIDES_UI.indexTitle}
        </h1>
        <p className="max-w-[62ch] text-[1.1rem] leading-relaxed text-g1-soft">{GUIDES_UI.indexLede}</p>
      </header>

      <section className="pb-12" aria-label={GUIDES_UI.guides}>
        <div className="grid gap-5 md:grid-cols-2">
          {GEO_GUIDES.map((guide) => (
            <article
              key={guide.slug}
              className="flex flex-col justify-between gap-5 rounded-2xl border border-g1-rule bg-g1-card p-6 transition hover:border-g1-ink"
            >
              <div className="grid gap-3">
                <p className="font-g1mono text-[0.72rem] uppercase tracking-[0.14em] text-g1-accent">{guide.category}</p>
                <h2 className="font-g1display text-2xl font-medium leading-tight text-g1-ink">
                  <Link href={`/guides/${guide.slug}`} className="hover:text-g1-accent">{guide.title}</Link>
                </h2>
                <p className="text-sm leading-relaxed text-g1-soft">{guide.lede}</p>
              </div>
              <Link
                href={`/guides/${guide.slug}`}
                className="inline-flex w-fit items-center gap-1.5 border-b border-g1-rule pb-0.5 text-sm font-medium text-g1-ink hover:border-g1-accent hover:text-g1-accent"
              >
                {GUIDES_UI.readGuide}
              </Link>
            </article>
          ))}
        </div>
      </section>

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
    </main>
  );
}
