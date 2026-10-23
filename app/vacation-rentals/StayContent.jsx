'use client';

import { getTranslation } from '../../lib/i18n';
import { useLocale } from '../components/LocaleProvider';
import { getWorldsCopy, displayValue, largeImage } from '../../lib/worldsCopy';
import { fill } from '../../lib/homeCopy';
import { savedListing } from '../../lib/savedCopy';
import { getStay22Copy } from '../../lib/stay22Copy';
import { WorldHero, ListingCard, SectionHead, Steps } from '../components/g1/ui';
import Stay22Browse from './Stay22Browse';

// Keep this view mounted across locale changes: no route refresh, no locale
// keys and no conditional wrapper around either supplier iframe.
export default function StayContent({ stays }) {
  const locale = useLocale();
  const t = getTranslation(locale);
  const copy = getWorldsCopy(locale);
  const stay22 = getStay22Copy(locale);
  const hero = stays.find((s) => s.featured) || stays[0];

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <WorldHero
        eyebrow={fill(copy.stays.eyebrow, { n: stays.length })}
        title={copy.stays.title}
        lede={copy.stays.lede}
        img={largeImage(hero.image)}
        alt={savedListing(locale, hero, 'title')}
      />

      <section className="border-t border-g1-rule py-[clamp(36px,5vw,72px)]" aria-label={stay22.title}>
        <SectionHead title={stay22.title} sub={stay22.description} />
        <Stay22Browse labels={stay22} />
        <p className="mt-3 max-w-[75ch] text-[0.8rem] leading-relaxed text-g1-soft">{stay22.disclosure}</p>
      </section>

      <section className="pb-10" aria-label={t.vacationRentals.pill}>
        <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {stays.map((stay, i) => (
            <ListingCard
              key={stay.slug}
              href={`/vacation-rentals/${stay.slug}`}
              img={stay.image}
              alt={savedListing(locale, stay, 'title')}
              title={savedListing(locale, stay, 'title')}
              meta={`${stay.location} · ${t.vacationRentals.bedrooms}: ${stay.bedrooms}`}
              note={savedListing(locale, stay)}
              rate={`${t.vacationRentals.nightlyRate}: ${displayValue(stay.nightlyRate, copy)}`}
              priority={i < 3}
              booked={stay.availability === 'booked'}
            />
          ))}
        </div>
      </section>

      <Steps title={copy.howItWorks} steps={copy.stays.steps} />
    </main>
  );
}
