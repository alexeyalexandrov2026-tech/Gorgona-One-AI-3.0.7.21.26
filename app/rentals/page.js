import Link from 'next/link';
import { getRentals } from '../../lib/rentalsData';
import { rentalDescriptions, getContentText } from '../../lib/contentTranslations';
import { getServerTranslation } from '../../lib/serverLocale';
import { getWorldsCopy, displayValue } from '../../lib/worldsCopy';
import { fill } from '../../lib/homeCopy';
import { carThumb } from '../../lib/homeData';
import { WorldHero, ListingCard, Steps, chipClass } from '../components/g1/ui';

export const dynamic = 'force-dynamic';

// Our own fleet: filter by body type with ?type=, so it works without JS.
export default function RentalsPage({ searchParams }) {
  const rentals = getRentals();
  const { t, locale } = getServerTranslation();
  const copy = getWorldsCopy(locale);
  const types = [...new Set(rentals.map((car) => car.category))];
  const type = types.includes(searchParams?.type) ? searchParams.type : null;
  const shown = type ? rentals.filter((car) => car.category === type) : rentals;
  const hero = rentals.find((car) => car.slug === 'lamborghini-urus-se') || rentals[0];

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <WorldHero
        eyebrow={fill(copy.cars.eyebrow, { n: rentals.length })}
        title={copy.cars.title}
        lede={copy.cars.lede}
        img={hero.image}
        alt={hero.title}
      />

      <section className="pb-10" aria-label={t.rentals.fleet}>
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label={copy.cars.filterLabel}>
            {[null, ...types].map((value) => {
              const count = value ? rentals.filter((car) => car.category === value).length : rentals.length;
              return (
                <Link
                  key={value || 'all'}
                  href={value ? `/rentals?type=${encodeURIComponent(value)}` : '/rentals'}
                  scroll={false}
                  aria-current={value === type ? 'page' : undefined}
                  className={chipClass}
                >
                  {value ? copy.categories[value] || value : copy.all}
                  <span className="font-g1mono text-[0.74rem] opacity-70">{count}</span>
                </Link>
              );
            })}
          </div>
          <p className="text-[0.82rem] text-g1-soft">{copy.cars.delivery}</p>
        </div>

        <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((car, i) => (
            <ListingCard
              key={car.slug}
              href={`/rentals/${car.slug}`}
              img={carThumb(car)}
              alt={car.title}
              title={car.title}
              meta={`${copy.categories[car.category] || car.category} · ${car.location}`}
              note={getContentText(rentalDescriptions, locale, car.id, car.description)}
              rate={`${t.rentals.daily}: ${displayValue(car.dailyPrice, copy)}`}
              priority={i < 3}
            />
          ))}
        </div>
      </section>

      <Steps title={copy.howItWorks} steps={copy.cars.steps} />
    </main>
  );
}
