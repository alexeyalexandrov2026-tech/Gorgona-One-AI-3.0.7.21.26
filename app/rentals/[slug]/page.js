import { notFound } from 'next/navigation';
import { getRentals, getRentalBySlug } from '../../../lib/data/listings';
import { rentalDescriptions, getContentText } from '../../../lib/contentTranslations';
import { getServerTranslation } from '../../../lib/serverLocale';
import { getWorldsCopy, displayValue } from '../../../lib/worldsCopy';
import { fill } from '../../../lib/homeCopy';
import { carThumb } from '../../../lib/homeData';
import BookingForm from '../../components/BookingForm';
import Gallery from '../../components/g1/Gallery';
import PartnerSpecs from '../../components/g1/PartnerSpecs';
import SupplierVehicleDetails from '../../components/g1/SupplierVehicleDetails';
import { getSunsetCopy } from '../../../lib/sunsetCopy.mjs';
import { Crumbs, ListingCard, SectionHead, Specs, eyebrowClass, sectionY } from '../../components/g1/ui';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}) {
  const {slug}=await params;
  const rental=await getRentalBySlug(slug,{editorial:true});
  if(!rental)return {};
  const url=`https://gorgona-one.com/rentals/${rental.slug}`;
  return {title:`${rental.title} | MIAMI ELIO`,description:rental.description.slice(0,160),
    alternates:{canonical:url},openGraph:{title:rental.title,description:rental.description.slice(0,160),url,images:[rental.image]}};
}

export default async function RentalDetailPage({ params }) {
  params = await params;
  const rental = await getRentalBySlug(params.slug,{editorial:true});
  if (!rental) notFound();

  const { t, locale } = await getServerTranslation();
  const copy = getWorldsCopy(locale);
  const supplierCopy = getSunsetCopy(locale);
  const supplier = rental.supplier === 'Sunset Exotics';
  const category = copy.categories[rental.category] || rental.category;
  const photos = supplier ? rental.gallery : [rental.image, ...(rental.gallery || []).filter((src) => src !== rental.image)];
  const more = (await getRentals({editorial:true})).filter((car) => car.slug !== rental.slug && car.category === rental.category).slice(0, 3);

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <Crumbs items={[[t.nav.cars, '/rentals'], [rental.title]]} />

      <div className="grid items-start gap-[clamp(24px,4vw,56px)] py-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Gallery key={rental.slug} images={photos} thumbnails={rental.galleryThumbnails} originals={rental.originalPhotos} originalLabel={supplierCopy.original} initialIndex={supplier?photos.indexOf(rental.image):0} title={rental.title} copy={copy} />

        <div className="grid min-w-0 gap-5 lg:sticky lg:top-24">
          <p className={eyebrowClass}>{supplier?`${rental.supplier} · ${displayValue(rental.location,copy)}`:fill(copy.cars.ourFleet, { place: rental.location })}</p>
          <h1 className="font-g1display text-[clamp(2rem,2.4vw+1rem,3.3rem)] font-medium leading-[1.04] text-g1-ink [text-wrap:balance]">{rental.title}</h1>
          <p lang={supplier?'en':undefined} className="text-[1.05rem] text-g1-soft">{getContentText(rentalDescriptions, locale, rental.id, rental.description)}</p>
          <Specs
            items={[
              [t.rentals.location, displayValue(rental.location,copy)],
              [copy.cars.filterLabel, category],
              [t.rentals.daily, displayValue(rental.dailyPrice, copy)],
              [t.rentals.weekly, displayValue(rental.weeklyPrice, copy)],
              ...(supplier?[[supplierCopy.monthly,displayValue(rental.monthlyPrice,copy)],[supplierCopy.deposit,displayValue(rental.securityDeposit,copy)]]:[])
            ]}
          />
          {supplier && <p className="rounded-xl border border-g1-rule p-4 text-sm leading-relaxed text-g1-soft">{supplierCopy.notice}</p>}
          <BookingForm rentalSlug={rental.slug} rentalTitle={supplier?`${rental.title} · ${rental.supplier}`:rental.title} pickupLocation={supplier?rental.location:undefined} kind="car" />
          {rental.partner&&<PartnerSpecs specs={rental.specs}/>}
        </div>
      </div>

      {supplier && <SupplierVehicleDetails rental={rental} copy={supplierCopy}/>}

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
                meta={`${copy.categories[car.category]||car.category} · ${displayValue(car.location,copy)}${car.supplier?` · ${car.supplier}`:''}`}
                rate={`${t.rentals.daily}: ${displayValue(car.dailyPrice, copy)}`}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
