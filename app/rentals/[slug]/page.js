import { notFound } from 'next/navigation';
import { getRentals, getRentalBySlug } from '../../../lib/rentalsData';
import { rentalDescriptions, getContentText } from '../../../lib/contentTranslations';
import { getServerTranslation } from '../../../lib/serverLocale';
import { getWorldsCopy, displayValue } from '../../../lib/worldsCopy';
import { fill } from '../../../lib/homeCopy';
import { carThumb } from '../../../lib/homeData';
import BookingForm from '../../components/BookingForm';
import Gallery from '../../components/g1/Gallery';
import { Crumbs, ListingCard, SectionHead, Specs, eyebrowClass, sectionY } from '../../components/g1/ui';

export const dynamic = 'force-dynamic';

export default function RentalDetailPage({ params }) {
  const rental = getRentalBySlug(params.slug);
  if (!rental) notFound();

  const { t, locale } = getServerTranslation();
  const copy = getWorldsCopy(locale);
  const category = copy.categories[rental.category] || rental.category;
  const photos = [rental.image, ...(rental.gallery || []).filter((src) => src !== rental.image)];
  const more = getRentals().filter((car) => car.slug !== rental.slug && car.category === rental.category).slice(0, 3);

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
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
