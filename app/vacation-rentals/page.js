import { getVacationRentals } from '../../lib/vacationRentalsData';
import { getServerTranslation } from '../../lib/serverLocale';
import { getWorldsCopy, displayValue, largeImage } from '../../lib/worldsCopy';
import { fill } from '../../lib/homeCopy';
import { WorldHero, ListingCard, Steps } from '../components/g1/ui';

export const dynamic = 'force-dynamic';

export default function VacationRentalsPage() {
  const stays = getVacationRentals();
  const { t, locale } = getServerTranslation();
  const copy = getWorldsCopy(locale);
  const hero = stays.find((s) => s.featured) || stays[0];

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <WorldHero
        eyebrow={fill(copy.stays.eyebrow, { n: stays.length })}
        title={copy.stays.title}
        lede={copy.stays.lede}
        img={largeImage(hero.image)}
        alt={hero.title}
      />

      <section className="pb-10" aria-label={t.vacationRentals.pill}>
        <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {stays.map((stay, i) => (
            <ListingCard
              key={stay.slug}
              href={`/vacation-rentals/${stay.slug}`}
              img={stay.image}
              alt={stay.title}
              title={stay.title}
              meta={`${stay.location} · ${t.vacationRentals.bedrooms}: ${stay.bedrooms}`}
              note={stay.description}
              rate={`${t.vacationRentals.nightlyRate}: ${displayValue(stay.nightlyRate, copy)}`}
              priority={i < 3}
            />
          ))}
        </div>
      </section>

      <Steps title={copy.howItWorks} steps={copy.stays.steps} />
    </main>
  );
}
