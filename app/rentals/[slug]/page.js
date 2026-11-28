import { notFound } from 'next/navigation';
import { getRentals, getRentalBySlug } from '../../../lib/data/listings';
import { rentalDescriptions, getContentText } from '../../../lib/contentTranslations';
import { getServerTranslation } from '../../../lib/serverLocale';
import { getWorldsCopy, displayValue } from '../../../lib/worldsCopy';
import { fill } from '../../../lib/homeCopy';
import { carThumb } from '../../../lib/homeSections.mjs';
import BookingForm from '../../components/BookingForm';
import SaveButton from '../../components/SaveButton';
import AskButton from '../../components/g1/AskButton';
import UsTrustStrip from '../../components/g1/UsTrustStrip';
import Gallery from '../../components/g1/Gallery';
import PartnerSpecs from '../../components/g1/PartnerSpecs';
import SupplierVehicleDetails from '../../components/g1/SupplierVehicleDetails';
import { getSunsetCopy } from '../../../lib/sunsetCopy.mjs';
import { askAboutCarCopy } from '../../../lib/ai/stage2Copy.mjs';
import { rentalSearchText, breadcrumbJsonLd, carJsonLd, vehicleJsonLd } from '../../../lib/seo.mjs';
import JsonLd from '../../components/JsonLd';
import { Crumbs, ListingCard, SectionHead, Specs, btn, eyebrowClass, sectionY } from '../../components/g1/ui';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}) {
  const {slug}=await params;
  const rental=await getRentalBySlug(slug,{editorial:true});
  if(!rental)return {};
  const url=`https://gorgona-one.com/rentals/${rental.slug}`;
  const search=rentalSearchText(rental);
  const images=rental.image?[rental.image]:undefined;
  return {
    title:search.title,
    description:search.description,
    alternates:{canonical:url},
    openGraph:{title:search.title,description:search.description,url,images},
    twitter:{card:'summary_large_image',title:search.title,description:search.description,images}
  };
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

  const carAsk = askAboutCarCopy(locale, rental.title);

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <JsonLd data={[breadcrumbJsonLd([{ name: t.nav.cars, path: '/rentals' }, { name: rental.title, path: `/rentals/${rental.slug}` }]), carJsonLd(rental) || vehicleJsonLd(rental)]} />
      <Crumbs items={[[t.nav.cars, '/rentals'], [rental.title]]} />

      <div className="grid items-start gap-[clamp(24px,4vw,56px)] py-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Gallery key={rental.slug} images={photos} thumbnails={rental.galleryThumbnails} originals={rental.originalPhotos} originalLabel={supplierCopy.original} initialIndex={supplier?photos.indexOf(rental.image):0} title={rental.title} copy={copy} />

        <div className="grid min-w-0 gap-5 lg:sticky lg:top-24">
          <p className={eyebrowClass}>{supplier?`${rental.supplier} · ${displayValue(rental.location,copy)}`:fill(copy.cars.ourFleet, { place: rental.location })}</p>
          <h1 className="font-g1display text-[clamp(2rem,2.4vw+1rem,3.3rem)] font-medium leading-[1.04] text-g1-ink [text-wrap:balance]">{rental.title}</h1>
          <div className="flex flex-wrap items-center gap-2.5">
            <SaveButton href={`/rentals/${rental.slug}`} kind="car" title={rental.title} subtitle={`${category} · ${displayValue(rental.location, copy)}`} image={carThumb(rental)} />
            <AskButton variant="ghost" className={btn.sm} prompt={carAsk.prompt}>{carAsk.label}</AskButton>
          </div>
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
          <UsTrustStrip locale={locale} mode="cars" compact />
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
                action={<SaveButton overlay href={`/rentals/${car.slug}`} kind="car" title={car.title} subtitle={`${copy.categories[car.category]||car.category} · ${displayValue(car.location,copy)}`} image={carThumb(car)} />}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
