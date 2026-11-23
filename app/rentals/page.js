import Link from 'next/link';
import { getRentals } from '../../lib/data/listings';
import { rentalDescriptions, getContentText } from '../../lib/contentTranslations';
import { getServerTranslation } from '../../lib/serverLocale';
import { getWorldsCopy, displayValue } from '../../lib/worldsCopy';
import { fill } from '../../lib/homeCopy';
import { carThumb } from '../../lib/homeData';
import { WorldHero, ListingCard, Steps, chipClass, btn } from '../components/g1/ui';
import SaveButton from '../components/SaveButton';
import { getSunsetCopy } from '../../lib/sunsetCopy.mjs';
import { rentalPage, rentalBrands } from '../../lib/sunsetFleet.mjs';
import JsonLd from '../components/JsonLd';
import { pageMetadata, sectionJsonLd } from '../../lib/seo.mjs';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata({
  title: 'Exotic and luxury car rentals in Miami',
  description: 'Exotic, luxury and SUV rentals in Miami, with photos, daily rates and ELIO+ Guide to help you choose the car.',
  path: '/rentals'
});

const ALLOWED_SORTS = new Set(['price-asc', 'price-desc']);

// Our own fleet: filter by body type, city, brand, search query and price sort via URL params (zero extra JS).
export default async function RentalsPage({ searchParams }) {
  searchParams = await searchParams;
  const rentals = await getRentals({ editorial: true });
  const { t, locale } = await getServerTranslation();
  const copy = getWorldsCopy(locale);
  const catalogue = getSunsetCopy(locale);

  const types = [...new Set(rentals.map((car) => car.category))];
  const type = types.includes(searchParams?.type) ? searchParams.type : null;
  const locations = [...new Set(rentals.map((car) => car.location))];
  const location = locations.includes(searchParams?.location) ? searchParams.location : null;

  const allBrands = rentalBrands(rentals);
  const brandNames = new Set(allBrands.map((b) => b.name));
  const brand = typeof searchParams?.brand === 'string' && brandNames.has(searchParams.brand) ? searchParams.brand : null;
  const q = typeof searchParams?.q === 'string' ? searchParams.q.trim().slice(0, 80) : '';
  const sort = ALLOWED_SORTS.has(searchParams?.sort) ? searchParams.sort : '';

  const scopedForBrands = rentals.filter((car) => (!type || car.category === type) && (!location || car.location === location));
  const brandList = rentalBrands(scopedForBrands);
  const featuredBrands = brandList.slice(0, 12);
  if (brand && !featuredBrands.some((b) => b.name === brand)) {
    const active = brandList.find((b) => b.name === brand) || { name: brand, count: 0 };
    featuredBrands.push(active);
  }

  const page = rentalPage(rentals, { type, location, brand, q, sort, page: searchParams?.page });
  const shown = page.cars;
  const hasFilters = Boolean(type || location || brand || q || sort);

  const href = ({ nextType = type, nextLocation = location, nextBrand = brand, nextQ = q, nextSort = sort, nextPage = 1 } = {}) => {
    const query = new URLSearchParams();
    if (nextType) query.set('type', nextType);
    if (nextLocation) query.set('location', nextLocation);
    if (nextBrand) query.set('brand', nextBrand);
    if (nextQ) query.set('q', nextQ);
    if (nextSort) query.set('sort', nextSort);
    if (nextPage > 1) query.set('page', String(nextPage));
    return '/rentals' + (query.size ? '?' + query : '');
  };

  const hero = rentals.find((car) => car.slug === 'lamborghini-urus-se') || rentals[0];

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <JsonLd data={sectionJsonLd({ name: 'Exotic and luxury car rentals in Miami', description: metadata.description, path: '/rentals' })} />
      <WorldHero
        eyebrow={`${catalogue.catalogue} · ${rentals.length}`}
        title={catalogue.title}
        lede={catalogue.lede}
        img={hero.image}
        alt={hero.title}
      />

      <section className="pb-10" aria-label={t.rentals.fleet}>
        {/* Search & price sort bar (pure SSR form, zero client JS) */}
        <form
          method="GET"
          action="/rentals"
          className="mb-7 grid gap-3 border-y border-g1-rule py-5 sm:grid-cols-[1fr_auto_auto] sm:items-center"
        >
          {type && <input type="hidden" name="type" value={type} />}
          {location && <input type="hidden" name="location" value={location} />}
          {brand && <input type="hidden" name="brand" value={brand} />}
          <label className="min-w-0">
            <span className="sr-only">{catalogue.searchPlaceholder}</span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              maxLength={80}
              placeholder={catalogue.searchPlaceholder}
              className="min-h-[44px] w-full rounded-full border border-g1-rule bg-g1-card px-4 text-sm text-g1-ink outline-none transition placeholder:text-g1-soft focus:border-g1-accent"
            />
          </label>
          <label className="min-w-0">
            <span className="sr-only">{catalogue.sortLabel}</span>
            <select
              name="sort"
              defaultValue={sort}
              aria-label={catalogue.sortLabel}
              className="min-h-[44px] w-full rounded-full border border-g1-rule bg-g1-card px-4 text-sm text-g1-ink outline-none transition focus:border-g1-accent"
            >
              <option value="">{catalogue.sortFeatured}</option>
              <option value="price-asc">{catalogue.sortLowHigh}</option>
              <option value="price-desc">{catalogue.sortHighLow}</option>
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className={`${btn.base} ${btn.ink} ${btn.sm}`}>
              {catalogue.searchGo}
            </button>
            {hasFilters && (
              <Link href="/rentals" scroll={false} className={`${btn.base} ${btn.ghost} ${btn.sm}`}>
                {catalogue.clearFilters}
              </Link>
            )}
          </div>
        </form>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label={copy.cars.filterLabel}>
            {[null, ...types].map((value) => {
              const localCars = location ? rentals.filter((car) => car.location === location) : rentals;
              const count = value ? localCars.filter((car) => car.category === value).length : localCars.length;
              return (
                <Link
                  key={value || 'all'}
                  href={href({ nextType: value, nextBrand: null })}
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

        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label={catalogue.brandLabel}>
          <Link
            href={href({ nextBrand: null })}
            scroll={false}
            aria-current={brand === null ? 'page' : undefined}
            className={chipClass}
          >
            {catalogue.allBrands}
          </Link>
          {featuredBrands.map((item) => (
            <Link
              key={item.name}
              href={href({ nextBrand: item.name })}
              scroll={false}
              aria-current={item.name === brand ? 'page' : undefined}
              className={chipClass}
            >
              {item.name}
              <span className="font-g1mono text-[0.74rem] opacity-70">{item.count}</span>
            </Link>
          ))}
        </div>

        <div className="mb-7 flex flex-wrap gap-2" role="group" aria-label={catalogue.city}>
          {[null, ...locations].map((value) => (
            <Link
              key={value || 'all'}
              href={href({ nextLocation: value, nextBrand: null })}
              scroll={false}
              aria-current={value === location ? 'page' : undefined}
              className={chipClass}
            >
              {value ? displayValue(value, copy) : catalogue.allLocations}
            </Link>
          ))}
        </div>

        <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {shown.length === 0 && (
            <div className="py-10 text-g1-soft">
              <p className="mb-4">{catalogue.empty}</p>
              <Link className={chipClass} href="/rentals">{copy.all}</Link>
            </div>
          )}
          {shown.map((car, i) => (
            <ListingCard
              key={car.slug}
              href={`/rentals/${car.slug}`}
              img={carThumb(car)}
              alt={car.title}
              title={car.title}
              meta={`${copy.categories[car.category] || car.category} · ${displayValue(car.location, copy)}${car.supplier ? ` · ${car.supplier}` : ''}`}
              note={getContentText(rentalDescriptions, locale, car.id, car.description)}
              rate={`${t.rentals.daily}: ${displayValue(car.dailyPrice, copy)}`}
              priority={i < 3}
              action={<SaveButton overlay href={`/rentals/${car.slug}`} kind="car" title={car.title} subtitle={`${copy.categories[car.category] || car.category} · ${displayValue(car.location, copy)}`} image={carThumb(car)} />}
            />
          ))}
        </div>
        {page.totalPages > 1 && (
          <nav className="mt-9 flex flex-wrap items-center justify-center gap-4" aria-label={catalogue.catalogue}>
            {page.current > 1 && <Link className={chipClass} rel="prev" href={href({ nextPage: page.current - 1 })}>{catalogue.previous}</Link>}
            <span className="text-sm text-g1-soft" aria-current="page">{fill(catalogue.pages, { n: page.current, total: page.totalPages })}</span>
            {page.current < page.totalPages && <Link className={chipClass} rel="next" href={href({ nextPage: page.current + 1 })}>{catalogue.next}</Link>}
          </nav>
        )}
      </section>

      <Steps title={copy.howItWorks} steps={copy.cars.steps} />
    </main>
  );
}
