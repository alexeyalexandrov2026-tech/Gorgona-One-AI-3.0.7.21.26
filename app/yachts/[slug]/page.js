import { notFound } from 'next/navigation';
import { getYachts, getYachtBySlug } from '../../../lib/yachtsData';
import { getServerTranslation } from '../../../lib/serverLocale';
import { getWorldsCopy, displayValue, largeImage } from '../../../lib/worldsCopy';
import BookingForm from '../../components/BookingForm';
import { Crumbs, ListingCard, SectionHead, Specs, eyebrowClass, sectionY } from '../../components/g1/ui';

export const dynamic = 'force-dynamic';

export default function YachtDetailPage({ params }) {
  const yacht = getYachtBySlug(params.slug);
  if (!yacht) notFound();

  const { t, locale } = getServerTranslation();
  const copy = getWorldsCopy(locale);
  const more = getYachts().filter((y) => y.slug !== yacht.slug).slice(0, 3);

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <Crumbs items={[[t.nav.yachts, '/yachts'], [yacht.title]]} />

      <div className="grid items-start gap-[clamp(24px,4vw,56px)] py-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <figure className="aspect-[3/2] overflow-hidden rounded-[26px] bg-g1-rule">
          <img src={largeImage(yacht.image)} alt={yacht.title} width="1600" height="1067" fetchPriority="high" className="h-full w-full object-cover" />
        </figure>

        <div className="grid min-w-0 gap-5 lg:sticky lg:top-24">
          <p className={eyebrowClass}>{yacht.length} · {yacht.location}</p>
          <h1 className="font-g1display text-[clamp(2rem,2.4vw+1rem,3.3rem)] font-medium leading-[1.04] text-g1-ink [text-wrap:balance]">{yacht.title}</h1>
          <p className="text-[1.05rem] text-g1-soft">{yacht.description}</p>
          <Specs
            items={[
              [t.yachts.location, yacht.location],
              [t.yachts.length, yacht.length],
              [t.yachts.capacity, displayValue(yacht.capacity, copy)],
              [t.yachts.price, displayValue(yacht.price, copy)]
            ]}
          />
          <BookingForm rentalSlug={yacht.slug} rentalTitle={yacht.title} kind="yacht" />
        </div>
      </div>

      {more.length > 0 && (
        <section className={`border-t border-g1-rule ${sectionY}`}>
          <SectionHead title={copy.yachts.more} href="/yachts" cta={copy.seeAll} />
          <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((y) => (
              <ListingCard
                key={y.slug}
                href={`/yachts/${y.slug}`}
                img={y.image}
                alt={y.title}
                title={y.title}
                meta={`${y.length} · ${y.location}`}
                rate={`${t.yachts.price}: ${displayValue(y.price, copy)}`}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
