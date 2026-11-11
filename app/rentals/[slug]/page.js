import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getRentals } from '../../../lib/data/listings';
import { rentalDescriptions, getContentText } from '../../../lib/contentTranslations';
import { getServerTranslation } from '../../../lib/serverLocale';
import { getWorldsCopy, displayValue } from '../../../lib/worldsCopy';
import { fill } from '../../../lib/homeCopy';
import { carThumb } from '../../../lib/homeData';
import BookingForm from '../../components/BookingForm';
import Gallery from '../../components/g1/Gallery';
import PartnerSpecs from '../../components/g1/PartnerSpecs';
import { Crumbs, ListingCard, SectionHead, Specs, eyebrowClass, sectionY } from '../../components/g1/ui';
import JsonLd from '../../components/JsonLd';
import { pageMetadata, listingJsonLd, breadcrumbJsonLd } from '../../../lib/seo.mjs';

export const dynamic = 'force-dynamic';

// One inventory read per request, shared by the metadata and the page.
const loadRentals = cache(() => getRentals({editorial:true}));

export async function generateMetadata({ params }) {
  params = await params;
  const rental = (await loadRentals()).find((car) => car.slug === params.slug);
  if (!rental) return {};
  const { t, locale } = await getServerTranslation();
  return pageMetadata({
    title: `${rental.title} · ${t.nav.cars} · ${rental.location}`,
    description: getContentText(rentalDescriptions, locale, rental.id, rental.description),
    path: `/rentals/${rental.slug}`,
    image: rental.image
  });
}

export default async function RentalDetailPage({ params }) {
  params = await params;
  const rentals = await loadRentals();
  const rental = rentals.find((car) => car.slug === params.slug);
  if (!rental) notFound();

  const { t, locale } = await getServerTranslation();
  const copy = getWorldsCopy(locale);
  const category = copy.categories[rental.category] || rental.category;
  const photos = [rental.image, ...(rental.gallery || []).filter((src) => src !== rental.image)];
  const more = rentals.filter((car) => car.slug !== rental.slug && car.category === rental.category).slice(0, 3);
  const path = `/rentals/${rental.slug}`;

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <JsonLd data={[listingJsonLd('car', rental, path), breadcrumbJsonLd([[t.nav.cars, '/rentals'], [rental.title, path]])]} />
      <Crumbs items={[[t.nav.cars, '/rentals'], [rental.title]]} />

      <div className="grid items-start gap-[clamp(24px,4vw,56px)] py-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Gallery images={photos} title={rental.title} copy={copy} />

        <div className="grid min-w-0 gap-5 lg:sticky lg:top-24">
          <p className={eyebrowClass}>{fill(copy.cars.ourFleet, { place: rental.location })}</p>
          <h1 className="font-g1display text-[clamp(2rem,2.4vw+1rem,3.3rem)] font-medium leading-[1.04] text-g1-ink [text-wrap:balance]">{rental.title}</h1>
          <p className="text-[1.05rem] text-g1-soft">{getContentText(rentalDescriptions, locale, rental.id, rental.description)}</p>
          <Specs
            items={[
              [t.rentals.location, rental.location],
              [copy.cars.filterLabel, category],
              [t.rentals.daily, displayValue(rental.dailyPrice, copy)],
              [t.rentals.weekly, displayValue(rental.weeklyPrice, copy)]
            ]}
          />
          <BookingForm rentalSlug={rental.slug} rentalTitle={rental.title} kind="car" />
          {rental.partner&&<PartnerSpecs specs={rental.specs}/>}
        </div>
      </div>

      {more.length > 0 && (
        <section className={`border-t border-g1-rule ${sectionY}`}>
          <SectionHead title={copy.cars.more} href="/rentals" cta={copy.seeAll} />
          <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((car) => (
              <ListingCard
                key={car.slug}
                href={`/rentals/${car.slug}`}
                img={carThumb(car)}
                alt={car.title}
                title={car.title}
                meta={`${category} · ${car.location}`}
                rate={`${t.rentals.daily}: ${displayValue(car.dailyPrice, copy)}`}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
