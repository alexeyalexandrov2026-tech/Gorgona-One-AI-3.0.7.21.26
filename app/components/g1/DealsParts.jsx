// Pieces shared by the Stores, category and Coupons pages.
import Link from 'next/link';
import { categories } from '../../../lib/dealsData';
import { isBettingCategory, getCategoryDeals } from '../../../lib/storeDirectory';
import { getHomeCopy, intlLocale } from '../../../lib/homeCopy';
import DealTicket from './DealTicket';
import { chipClass } from './ui';

export const camelize = (slug) => slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

export function categoryLabel(t, category) {
  return t.categories[camelize(category.slug)] || category.label;
}

// Every category as a chip with its offer count. Betting points to the
// sportsbook section, and Restaurants is a venue guide, so neither shows a
// coupon count; the current category is marked.
export function CategoryChips({ t, current, label }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const betting = isBettingCategory(category.slug);
        const count = betting || category.slug === 'restaurants' ? null : getCategoryDeals(category.slug).length;
        return (
          <Link
            key={category.slug}
            href={betting ? '/sportsbook' : `/stores/${category.slug}`}
            aria-current={category.slug === current ? 'page' : undefined}
            className={chipClass}
          >
            {categoryLabel(t, category)}
            {count !== null && <span className="font-g1mono text-[0.74rem] opacity-70">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

// A grid of deal tickets with the labels each ticket needs.
export function DealGrid({ deals, t, locale }) {
  const copy = getHomeCopy(locale);
  const ends = new Intl.DateTimeFormat(intlLocale(locale), { month: 'short', day: 'numeric' });
  const endsLabel = (deal) => (deal.expirationDate ? ends.format(new Date(`${deal.expirationDate}T12:00:00`)) : '');
  return (
    <div className="grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
      {deals.map((deal) => (
        <DealTicket
          key={deal.id}
          deal={deal}
          copy={copy}
          categories={t.categories}
          endsLabel={endsLabel(deal)}
          storeLabel={t.buttons.visitStore}
          mapLabel={t.kosher.viewOnMap}
        />
      ))}
    </div>
  );
}
