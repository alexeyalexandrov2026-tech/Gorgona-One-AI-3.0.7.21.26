import { getYachts } from '../../lib/yachtsData';
import { getServerTranslation } from '../../lib/serverLocale';
import { getWorldsCopy, displayValue, largeImage } from '../../lib/worldsCopy';
import { fill } from '../../lib/homeCopy';
import { WorldHero, ListingCard, Steps } from '../components/g1/ui';

export const dynamic = 'force-dynamic';

export default function YachtsPage() {
  const yachts = getYachts();
  const { t, locale } = getServerTranslation();
  const copy = getWorldsCopy(locale);
  const hero = yachts.find((y) => y.featured) || yachts[0];

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <WorldHero
        eyebrow={fill(copy.yachts.eyebrow, { n: yachts.length })}
        title={copy.yachts.title}
        lede={copy.yachts.lede}
        img={largeImage(hero.image)}
        alt={hero.title}
      />

      <section className="pb-10" aria-label={t.yachts.pill}>
        <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {yachts.map((yacht, i) => (
            <ListingCard
              key={yacht.slug}
              href={`/yachts/${yacht.slug}`}
              img={yacht.image}
              alt={yacht.title}
              title={yacht.title}
              meta={`${yacht.length} · ${yacht.location}`}
              note={yacht.description}
              rate={`${t.yachts.price}: ${displayValue(yacht.price, copy)}`}
              priority={i < 3}
            />
          ))}
        </div>
      </section>

      <Steps title={copy.howItWorks} steps={copy.yachts.steps} />
    </main>
  );
}
