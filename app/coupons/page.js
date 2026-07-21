import { allDeals } from '../../lib/dealsData';
import { SearchBar } from '../components/SearchBar';
import { DealCard } from '../components/DealCard';
import { getServerTranslation } from '../../lib/serverLocale';

export const dynamic = 'force-dynamic';

// Stores is the primary directory now, so every brand there is a
// duplicate here and is left out - except these three, which are kept
// visible in Coupons on purpose even though they're no longer in Stores.
const COUPONS_VISIBLE = ['Disney+', 'DoorDash', 'Uber Eats'];

export default function CouponsPage() {
  const { t } = getServerTranslation();

  return (
    <main className="flex-1 py-10">
      <div className="market-shell mb-8 rounded-[2rem] p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">{t.category.couponSystem}</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{t.category.verifiedDeals}</h1>
      </div>

      <div className="mb-8">
        <SearchBar />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {allDeals.filter((deal) => COUPONS_VISIBLE.includes(deal.name)).map((deal) => (
          <DealCard key={deal.id} deal={deal} t={t} />
        ))}
      </div>
    </main>
  );
}
