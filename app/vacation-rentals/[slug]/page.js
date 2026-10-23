import { savedListing } from '../../../lib/savedCopy';
import { LocalizedListing } from '../../components/LocalizedText';
import { notFound } from 'next/navigation';
import { getVacationRentals, getVacationRentalBySlug } from '../../../lib/data/listings';
import { getServerTranslation } from '../../../lib/serverLocale';
import { getWorldsCopy, displayValue, largeImage } from '../../../lib/worldsCopy';
import BookingForm from '../../components/BookingForm';
import Gallery from '../../components/g1/Gallery';
import PartnerSpecs from '../../components/g1/PartnerSpecs';
import BookedStatus from '../../components/g1/BookedStatus';
import { Crumbs, ListingCard, SectionHead, Specs, eyebrowClass, sectionY } from '../../components/g1/ui';

export const dynamic = 'force-dynamic';

export default async function VacationRentalDetailPage({ params }) {
  const stay = await getVacationRentalBySlug(params.slug,{editorial:true});
  if (!stay) notFound();

  const { t, locale } = getServerTranslation();
  const copy = getWorldsCopy(locale);
  const more = (await getVacationRentals({editorial:true})).filter((s) => s.slug !== stay.slug).slice(0, 3);

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <Crumbs items={[[t.nav.villas, '/vacation-rentals'], [savedListing(locale, stay, 'title')]]} />

      <div className="grid items-start gap-[clamp(24px,4vw,56px)] py-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {stay.partner?<Gallery images={stay.gallery} title={stay.title} copy={copy}/>:<figure className="relative aspect-[3/2] overflow-hidden rounded-[26px] bg-g1-rule">
          <img src={largeImage(stay.image)} alt={savedListing(locale, stay, 'title')} width="1600" height="1067" fetchPriority="high" className="h-full w-full object-cover" />
          {stay.availability === 'booked' && <BookedStatus overlay />}
        </figure>}

        <div className="grid min-w-0 gap-5 lg:sticky lg:top-24">
          <p className={eyebrowClass}>{stay.location}</p>
          <h1 className="font-g1display text-[clamp(2rem,2.4vw+1rem,3.3rem)] font-medium leading-[1.04] text-g1-ink [text-wrap:balance]">{savedListing(locale, stay, 'title')}</h1>
          <p className="text-[1.05rem] text-g1-soft"><LocalizedListing itemId={stay.id} source={stay.description} /></p>
          {stay.partner&&<PartnerSpecs specs={stay.specs}/>}
          <Specs
            items={[
              [t.vacationRentals.location, stay.location],
              [t.vacationRentals.bedrooms, stay.bedrooms],
              [t.vacationRentals.guests, displayValue(stay.guests, copy)],
              [t.vacationRentals.nightlyRate, displayValue(stay.nightlyRate, copy)]
            ]}
          />
          {stay.availability === 'booked'
            ? <div className="rounded-[22px] border border-g1-rule bg-g1-card px-5 py-7 text-center"><BookedStatus /></div>
            : <BookingForm rentalSlug={stay.slug} rentalTitle={stay.title} kind="stay" />}
        </div>
      </div>

      {more.length > 0 && (
        <section className={`border-t border-g1-rule ${sectionY}`}>
          <SectionHead title={copy.stays.more} href="/vacation-rentals" cta={copy.seeAll} />
          <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((s) => (
              <ListingCard
                key={s.slug}
                href={`/vacation-rentals/${s.slug}`}
                img={s.image}
                alt={savedListing(locale, s, 'title')}
                title={savedListing(locale, s, 'title')}
                meta={`${s.location} · ${t.vacationRentals.bedrooms}: ${s.bedrooms}`}
                rate={`${t.vacationRentals.nightlyRate}: ${displayValue(s.nightlyRate, copy)}`}
                booked={s.availability === 'booked'}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
