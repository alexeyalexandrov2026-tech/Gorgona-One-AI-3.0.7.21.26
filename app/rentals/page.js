import Link from 'next/link';
import { getRentals } from '../../lib/data/listings';
import { rentalDescriptions, getContentText } from '../../lib/contentTranslations';
import { getServerTranslation } from '../../lib/serverLocale';
import { getWorldsCopy, displayValue } from '../../lib/worldsCopy';
import { fill } from '../../lib/homeCopy';
import { carThumb } from '../../lib/homeData';
import { WorldHero, ListingCard, Steps, chipClass } from '../components/g1/ui';
import { getSunsetCopy } from '../../lib/sunsetCopy.mjs';
import { rentalPage } from '../../lib/sunsetFleet.mjs';

export const dynamic = 'force-dynamic';

// Our own fleet: filter by body type with ?type=, so it works without JS.
export default async function RentalsPage({ searchParams }) {
  searchParams = await searchParams;
  const rentals = await getRentals({editorial:true});
  const { t, locale } = await getServerTranslation();
  const copy = getWorldsCopy(locale);
  const catalogue = getSunsetCopy(locale);
  const types = [...new Set(rentals.map((car) => car.category))];
  const type = types.includes(searchParams?.type) ? searchParams.type : null;
  const locations = [...new Set(rentals.map(car => car.location))];
  const location = locations.includes(searchParams?.location) ? searchParams.location : null;
  const page = rentalPage(rentals, {type, location, page:searchParams?.page});
  const shown = page.cars;
  const href = (nextType=type,nextLocation=location,nextPage=1) => {
    const query = new URLSearchParams();
    if(nextType)query.set('type',nextType);
    if(nextLocation)query.set('location',nextLocation);
    if(nextPage>1)query.set('page',String(nextPage));
    return '/rentals'+(query.size?'?'+query:'');
  };
  const hero = rentals.find((car) => car.slug === 'lamborghini-urus-se') || rentals[0];

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <WorldHero
        eyebrow={`${catalogue.catalogue} · ${rentals.length}`}
        title={catalogue.title}
        lede={catalogue.lede}
        img={hero.image}
        alt={hero.title}
      />

      <section className="pb-10" aria-label={t.rentals.fleet}>
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label={copy.cars.filterLabel}>
            {[null, ...types].map((value) => {
              const localCars=location?rentals.filter(car=>car.location===location):rentals;
              const count = value ? localCars.filter((car) => car.category === value).length : localCars.length;
              return (
                <Link
                  key={value || 'all'}
                  href={href(value,location)}
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
          <p className="text-[0.82rem] text-g1-soft">{catalogue.delivery}</p>
        </div>

        <div className="mb-7 flex flex-wrap gap-2" role="group" aria-label={catalogue.city}>
          {[null,...locations].map(value => <Link key={value||'all'} href={href(type,value)} scroll={false} aria-current={value===location?'page':undefined} className={chipClass}>
            {value?displayValue(value,copy):catalogue.allLocations}
          </Link>)}
        </div>

        <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {shown.length===0 && <div className="py-10 text-g1-soft"><p className="mb-4">{catalogue.empty}</p><Link className={chipClass} href="/rentals">{copy.all}</Link></div>}
          {shown.map((car, i) => (
            <ListingCard
              key={car.slug}
              href={`/rentals/${car.slug}`}
              img={carThumb(car)}
              alt={car.title}
              title={car.title}
              meta={`${copy.categories[car.category] || car.category} · ${displayValue(car.location,copy)}${car.supplier ? ` · ${car.supplier}` : ''}`}
              note={getContentText(rentalDescriptions, locale, car.id, car.description)}
              rate={`${t.rentals.daily}: ${displayValue(car.dailyPrice, copy)}`}
              priority={i < 3}
            />
          ))}
        </div>
        {page.totalPages>1 && <nav className="mt-9 flex flex-wrap items-center justify-center gap-4" aria-label={catalogue.catalogue}>
          {page.current>1 && <Link className={chipClass} rel="prev" href={href(type,location,page.current-1)}>{catalogue.previous}</Link>}
          <span className="text-sm text-g1-soft" aria-current="page">{fill(catalogue.pages,{n:page.current,total:page.totalPages})}</span>
          {page.current<page.totalPages && <Link className={chipClass} rel="next" href={href(type,location,page.current+1)}>{catalogue.next}</Link>}
        </nav>}
      </section>

      <Steps title={copy.howItWorks} steps={copy.cars.steps} />
    </main>
  );
}
