"use client";

import Link from 'next/link';
import { getTranslation } from '../lib/i18n';
import { useLocale } from './components/LocaleProvider';
import { getHomeCopy, fill, intlLocale } from '../lib/homeCopy';
import { BRAND_COUNT, FLEET, YACHTS, STAYS, HOME_YACHTS, HOME_STAYS, HOME_BOOKS, carThumb, getHomeCodes } from '../lib/homeData';
import HomeHero from './components/home/HomeHero';
import DealTicket from './components/g1/DealTicket';
import SeasonShelf from './components/home/SeasonShelf';
import A1ALine from './components/home/A1ALine';
import ConciergeBand from './components/home/ConciergeBand';
import { SectionHead, ListingCard, btn } from './components/g1/ui';
import Icon from './components/g1/icons';
import GamblingNotice from './components/GamblingNotice';

const CODES = getHomeCodes();

const WORLDS = [
  { id: 'deals', href: '/coupons', img: 'deals-bags', count: (c) => fill(c.brands, { n: BRAND_COUNT }) },
  { id: 'travel', href: '/travel', img: 'travel-wing', count: (c) => c.flights },
  { id: 'stays', href: '/vacation-rentals', img: 'stay-miami-beach', count: (c) => fill(c.homes, { n: STAYS.length }) },
  { id: 'yachts', href: '/yachts', img: 'yacht-princess', count: (c) => fill(c.charters, { n: YACHTS.length }) },
  { id: 'cars', href: '/rentals', img: null, count: (c) => fill(c.cars, { n: FLEET.length }) },
  { id: 'events', href: '/events', img: 'events-stage', count: (c) => c.tickets },
  { id: 'sportsbooks', href: '/sportsbook', img: 'sports-arena', count: (c) => fill(c.operators, { n: HOME_BOOKS.length }) },
  { id: 'concierge', href: '/discovery', img: 'deco-street', count: (c) => c.ai }
];
const worldImage = (world) => (world.img ? `/images/home/worlds/${world.img}.jpg` : carThumb(FLEET[0]));

export default function HomePage() {
  const locale = useLocale();
  const t = getTranslation(locale);
  const copy = getHomeCopy(locale);
  const endsFormat = new Intl.DateTimeFormat(intlLocale(locale), { month: 'short', day: 'numeric' });
  const endsLabel = (deal) => (deal.expirationDate ? endsFormat.format(new Date(`${deal.expirationDate}T12:00:00`)) : '');
  const rule = 'border-t border-g1-rule';

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <HomeHero copy={copy} categories={t.categories} endsLabel={endsLabel} />

      <section className={`${rule} py-[clamp(36px,5vw,72px)]`}>
        <SectionHead title={copy.codes} sub={copy.codesSub} href="/coupons" cta={copy.seeAll} />
        <div className="g1-shelf" tabIndex={0} aria-label={copy.codes}>
          {CODES.map((deal) => (
            <DealTicket key={deal.id} deal={deal} copy={copy} categories={t.categories} endsLabel={endsLabel(deal)} />
          ))}
        </div>
      </section>

      <section className="py-[clamp(36px,5vw,72px)]">
        <SectionHead title={copy.season} sub={copy.seasonSub} href="/events" cta={t.nav.events} />
        <SeasonShelf copy={copy} locale={locale} />
      </section>

      <section className={`${rule} py-[clamp(36px,5vw,72px)]`}>
        <SectionHead
          title={copy.line.split('A1A').flatMap((part, i) => (i ? [<span key={i} className="g1-road">A1A</span>, part] : [part]))}
          sub={copy.lineSub}
        />
        <A1ALine copy={copy} locale={locale} />
      </section>

      <section className={`${rule} py-[clamp(52px,7vw,110px)]`}>
        <SectionHead title={copy.worlds} sub={copy.worldsSub} />
        <ul className="border-b border-g1-rule">
          {WORLDS.map((world) => {
            const [name, desc] = copy.worldItems[world.id];
            return (
              <li key={world.id} className="border-t border-g1-rule">
                <Link href={world.href} className="g1-dir-row">
                  <img className="g1-dir-thumb" src={worldImage(world)} alt="" loading="lazy" />
                  <span className="g1-dir-name">{name}</span>
                  <span className="g1-dir-desc text-[0.98rem] text-g1-soft">{desc}</span>
                  <span className="g1-dir-count whitespace-nowrap font-g1mono text-[0.9rem] text-g1-soft">{world.count(copy.counts)}</span>
                  <span className="g1-dir-arrow"><Icon name="arrow" className="g1-flip h-5 w-5" /></span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="py-[clamp(36px,5vw,72px)]">
        <SectionHead title={copy.fleet} sub={fill(copy.fleetSub, { n: FLEET.length })} href="/rentals" cta={copy.seeAll} />
        <div className="g1-shelf" tabIndex={0} aria-label={copy.fleet}>
          {FLEET.slice(0, 8).map((car) => (
            <ListingCard
              key={car.slug}
              href={`/rentals/${car.slug}`}
              img={carThumb(car)}
              title={car.title}
              meta={`${car.category} · ${car.location}`}
              rate={<>{copy.ratesOnRequest}<small className="block text-[0.76rem] font-normal text-g1-soft">{copy.delivered}</small></>}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-[clamp(26px,4vw,56px)] py-[clamp(36px,5vw,72px)] md:grid-cols-2">
        <div>
          <SectionHead title={copy.water} href="/yachts" cta={copy.seeAll} />
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2">
            {HOME_YACHTS.map((yacht) => (
              <ListingCard
                key={yacht.slug}
                href={`/yachts/${yacht.slug}`}
                img={yacht.image}
                title={yacht.title}
                meta={`${yacht.length} · ${yacht.location}`}
                note={yacht.description}
                rate={copy.ratesOnRequest}
              />
            ))}
          </div>
        </div>
        <div>
          <SectionHead title={copy.stays} href="/vacation-rentals" cta={copy.seeAll} />
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2">
            {HOME_STAYS.map((stay) => (
              <ListingCard
                key={stay.slug}
                href={`/vacation-rentals/${stay.slug}`}
                img={stay.image}
                title={stay.title}
                meta={stay.location}
                note={stay.description}
                rate={copy.ratesOnRequest}
              />
            ))}
          </div>
        </div>
      </section>

      <ConciergeBand copy={copy} locale={locale} />

      <section className="py-[clamp(36px,5vw,72px)]">
        <SectionHead title={copy.books} sub={copy.booksSub} href="/sportsbook" cta={copy.seeAll} />
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {HOME_BOOKS.map((book) => (
            <li key={book.slug}>
              <Link
                href={`/sportsbook/${book.slug}`}
                aria-label={book.name}
                className="grid h-[84px] place-items-center rounded-[14px] border border-g1-rule bg-g1-card p-3 transition-colors hover:border-g1-ink"
              >
                {book.logo ? (
                  <img src={book.logo} alt="" loading="lazy" className="max-h-[54px] max-w-full rounded-lg object-contain" />
                ) : (
                  <span className="text-center text-[1.05rem] font-semibold leading-tight tracking-[-0.01em] text-g1-ink">{book.name}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
        <GamblingNotice locale={locale} className="mt-4" />
      </section>

      <section className="grid items-center gap-[clamp(26px,4vw,56px)] pb-8 pt-[clamp(52px,7vw,110px)] md:grid-cols-2">
        <figure className="aspect-[4/3] overflow-hidden rounded-[26px] bg-g1-rule">
          <img src="/images/home/deco-hotel.jpg" alt="Art Deco hotel facade on Ocean Drive" loading="lazy" width="1600" height="2400" className="h-full w-full object-cover" />
        </figure>
        <div className="grid gap-[18px]">
          <p className="font-g1sans text-[0.74rem] font-medium uppercase tracking-[0.2em] text-g1-soft">{copy.partnersEyebrow}</p>
          <h2 className="font-g1display text-[clamp(2rem,2.4vw+1rem,3.3rem)] font-medium leading-[1.04] text-g1-ink [text-wrap:balance]">{copy.partners}</h2>
          <p className="max-w-[58ch] text-[1.08rem] text-g1-soft">{copy.partnersSub}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/partner" className={`${btn.base} ${btn.ink}`}>{copy.becomePartner}</Link>
            <Link href="/login" className={`${btn.base} ${btn.ghost}`}>{copy.partnerSignIn}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
