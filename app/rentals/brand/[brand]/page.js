import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRentals } from '../../../../lib/data/listings';
import { extractCarBrand } from '../../../../lib/sunsetFleet.mjs';
import { carThumb } from '../../../../lib/homeSections.mjs';
import { CAR_BRAND_PAGES, CAR_BRAND_UI, getCarBrandPage } from '../../../../lib/geo/carBrandsData.mjs';
import {
  breadcrumbJsonLd,
  dailyPriceNumber,
  faqJsonLd,
  itemListJsonLd,
  pageMetadata,
  sectionJsonLd,
  withBrand
} from '../../../../lib/seo.mjs';
import JsonLd from '../../../components/JsonLd';
import SaveButton from '../../../components/SaveButton';
import UsTrustStrip from '../../../components/g1/UsTrustStrip';
import { Crumbs, ListingCard, SectionHead, Specs, WorldHero, btn, chipClass, sectionY } from '../../../components/g1/ui';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return CAR_BRAND_PAGES.map((b) => ({ brand: b.slug }));
}

export async function generateMetadata({ params }) {
  const { brand } = await params;
  const info = getCarBrandPage(brand);
  if (!info) return {};
  return pageMetadata({
    title: info.title,
    fullTitle: withBrand(info.title),
    description: info.metaDescription,
    path: `/rentals/brand/${info.slug}`
  });
}

export default async function CarBrandPage({ params }) {
  const { brand } = await params;
  const info = getCarBrandPage(brand);
  if (!info) notFound();

  const allCars = await getRentals({ editorial: true });
  const matching = allCars.filter((car) => extractCarBrand(car) === info.brandName);
  const priced = matching
    .map((car) => dailyPriceNumber(car.dailyPrice))
    .filter((n) => n !== null)
    .sort((a, b) => a - b);

  const rateRange = priced.length
    ? `$${priced[0].toLocaleString('en-US')} – $${priced[priced.length - 1].toLocaleString('en-US')}/day`
    : CAR_BRAND_UI.onRequestLabel;

  const heroCar = matching[0] || allCars[0];
  const path = `/rentals/brand/${info.slug}`;

  const schemas = [
    ...sectionJsonLd({ name: info.headline, description: info.metaDescription, path }),
    breadcrumbJsonLd([
      { name: CAR_BRAND_UI.home, path: '/' },
      { name: CAR_BRAND_UI.cars, path: '/rentals' },
      { name: info.brandName, path }
    ]),
    itemListJsonLd({
      name: info.headline,
      path,
      items: matching.slice(0, 12).map((car) => ({ name: car.title, path: `/rentals/${car.slug}` }))
    }),
    faqJsonLd(info.faqs)
  ].filter(Boolean);

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <JsonLd data={schemas} />
      <Crumbs items={[[CAR_BRAND_UI.home, '/'], [CAR_BRAND_UI.cars, '/rentals'], [info.brandName]]} />

      <WorldHero
        eyebrow={info.eyebrow}
        title={info.headline}
        lede={info.lede}
        img={heroCar?.image || '/images/home/hero-tower.webp'}
        alt={heroCar?.title || info.headline}
      >
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link href="/discovery" className={`${btn.base} ${btn.primary}`}>
            {CAR_BRAND_UI.askElioLabel}
          </Link>
          <a
            href="https://t.me/MIAMI_ELIO"
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn.base} ${btn.ink}`}
          >
            {CAR_BRAND_UI.telegramLabel}
          </a>
        </div>
      </WorldHero>

      <section className="pb-8" aria-label={info.headline}>
        <Specs
          items={[
            [CAR_BRAND_UI.availableLabel, String(matching.length)],
            [CAR_BRAND_UI.rateRangeLabel, rateRange],
            [CAR_BRAND_UI.deliveryLabel, CAR_BRAND_UI.deliveryValue],
            [CAR_BRAND_UI.supportLabel, CAR_BRAND_UI.supportValue]
          ]}
        />
      </section>

      <section className="pb-6" aria-label={CAR_BRAND_UI.otherBrandsTitle}>
        <div className="flex flex-wrap gap-2">
          <Link href="/rentals" className={chipClass}>{CAR_BRAND_UI.allBrands}</Link>
          {CAR_BRAND_PAGES.map((b) => (
            <Link
              key={b.slug}
              href={`/rentals/brand/${b.slug}`}
              aria-current={b.slug === info.slug ? 'page' : undefined}
              className={chipClass}
            >
              {b.brandName}
            </Link>
          ))}
        </div>
      </section>

      <section className="pb-12" aria-label={info.brandName}>
        <UsTrustStrip locale="en" mode="cars" />
        <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {matching.map((car, i) => (
            <ListingCard
              key={car.slug}
              href={`/rentals/${car.slug}`}
              img={carThumb(car)}
              alt={car.title}
              title={car.title}
              meta={`${car.category || ''}${car.location ? ` · ${car.location}` : ''}${car.supplier ? ` · ${car.supplier}` : ''}`}
              note={car.description}
              rate={`${CAR_BRAND_UI.dailyLabel}: ${car.dailyPrice}`}
              priority={i < 3}
              action={
                <SaveButton
                  overlay
                  href={`/rentals/${car.slug}`}
                  kind="car"
                  title={car.title}
                  subtitle={`${car.category || ''} · ${car.location || ''}`}
                  image={carThumb(car)}
                />
              }
            />
          ))}
        </div>
      </section>

      <section className={`border-t border-g1-rule ${sectionY}`} aria-label={CAR_BRAND_UI.highlightsTitle}>
        <SectionHead title={CAR_BRAND_UI.highlightsTitle} href="/rentals" cta={CAR_BRAND_UI.browseAllLabel} />
        <ul className="grid gap-3 rounded-2xl border border-g1-rule bg-g1-card p-6 text-sm leading-relaxed text-g1-soft">
          {info.highlights.map((line) => (
            <li key={line} className="flex gap-2.5">
              <span aria-hidden="true" className="text-g1-accent">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={`border-t border-g1-rule ${sectionY}`} aria-label={CAR_BRAND_UI.faqTitle}>
        <SectionHead title={CAR_BRAND_UI.faqTitle} />
        <div className="grid gap-4 md:grid-cols-2">
          {info.faqs.map((item) => (
            <article key={item.question} className="grid content-start gap-2 rounded-2xl border border-g1-rule bg-g1-card p-5">
              <h3 className="font-g1display text-lg font-medium leading-snug text-g1-ink">{item.question}</h3>
              <p className="text-sm leading-relaxed text-g1-soft">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
