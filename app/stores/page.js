import Link from 'next/link';
import { categories, featuredDeals } from '../../lib/dealsData';
import { ZineStoreCard } from '../components/ZineStoreCard';
import { Reveal, Parallax } from '../components/Motion';
import { getServerTranslation } from '../../lib/serverLocale';

export const dynamic = 'force-dynamic';

// Shopping — entire studios reference: a concrete-walled fashion zine on
// warm bone paper. Two colors, one monospaced voice, zero-radius plates,
// and photography doing every emotional job. Business content (search,
// categories, verified deals with promo codes) is preserved intact.

function camelizeSlug(slug) {
  return slug.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// These stay fully in lib/dealsData.js (and keep their /deals/{slug} page)
// but are no longer listed in the Stores section itself.
const HIDDEN_FROM_STORES = ['Beit Yosef Grocery', 'Kosher Market Co.', 'Shalom Bistro', 'Mizrahi Grill', 'Disney+', 'DoorDash', 'Uber Eats'];

// Nike and Adidas are each featured in two categories (fashion and sport),
// which puts both brands on this page twice. Only the fashion entries are
// kept here; the sport-category ones (which land at the bottom of this
// grid) are hidden - they're unaffected on /stores/sport itself.
const HIDDEN_DUPLICATE_IDS = ['sport-1', 'sport-2'];

// New store, Stores-only: kept out of lib/dealsData.js entirely so it never
// reaches allDeals/featuredDeals (and therefore Coupons, search, or any
// other consumer of that catalog) - it only exists on this page, pinned to
// the front of the grid.
const ROWE_AND_TAYLOR_DEAL = {
  id: 'rowe-and-taylor-featured',
  name: 'Rowe & Taylor',
  slug: 'rowe-and-taylor',
  category: 'fashion',
  logo: '/images/brands/rowe-and-taylor.svg',
  image: '/images/brands/rowe-and-taylor.svg',
  promoCode: '',
  discount: 'Suits that outperform their price.',
  expirationDate: '2026-12-31',
  affiliateLink: 'https://click.linksynergy.com/fs-bin/click?id=BsBQ7p%2fMcbE&offerid=1949696.3&type=3&subid=0',
  website: 'https://click.linksynergy.com/fs-bin/click?id=BsBQ7p%2fMcbE&offerid=1949696.3&type=3&subid=0',
  featured: true
};

const TICKER_ITEMS = [
  'Verified offers',
  'Promo codes',
  'Fashion',
  'Technology',
  'Lifestyle',
  'Miami · Florida',
  'Editorial discovery'
];

export default function StoresPage() {
  const { t } = getServerTranslation();

  const deals = [
    ROWE_AND_TAYLOR_DEAL,
    ...featuredDeals.filter(
      (deal) =>
        deal.category !== 'betting' &&
        !HIDDEN_FROM_STORES.includes(deal.name) &&
        !HIDDEN_DUPLICATE_IDS.includes(deal.id)
    )
  ];

  return (
    <main className="flex-1 theme-shopping">
      {/* ===== Hero image plate — the photograph is the luxury ===== */}
      <section className="lux-hero full-bleed -mt-[60px] flex min-h-[88svh] items-end bg-black">
        <div className="lux-hero__bg">
          <Parallax distance={60} className="h-full">
            <img
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=2400&q=80"
              alt=""
              className="lux-kenburns h-[115%] w-full object-cover"
            />
          </Parallax>
        </div>
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(180deg,rgba(0,0,0,0.58)_0%,rgba(0,0,0,0.16)_30%,rgba(0,0,0,0.28)_62%,rgba(0,0,0,0.9)_100%)]" />
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(80deg,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.2)_40%,rgba(0,0,0,0)_64%)]" />
        <div className="lux-grain" />

        <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-40 sm:px-6 lg:px-8">
          {/* Brand overlay lockup — mono voice, hairline divider */}
          <Reveal>
            <p className="flex items-center gap-4 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-white/90 [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
              <span>Gorgona One</span>
              <span className="h-4 w-px bg-white/60" />
              <span>{t.category.storesDirectory}</span>
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-3xl font-display text-5xl font-light leading-[1.02] tracking-tight text-white [text-shadow:0_4px_44px_rgba(0,0,0,0.5)] sm:text-6xl lg:text-7xl">
              {t.category.exploreStores}
            </h1>
          </Reveal>
        </div>
      </section>

      {/* ===== Announcement bar — permanent black chrome, ticking ===== */}
      <section className="full-bleed overflow-hidden border-y border-white/10 bg-black py-3">
        <div className="zine-marquee">
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
              {TICKER_ITEMS.map((item) => (
                <span
                  key={`${copy}-${item}`}
                  className="flex items-center gap-6 pr-6 font-mono text-[0.66rem] uppercase tracking-[0.24em] text-white"
                >
                  {item}
                  <span className="text-white/40">·</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ===== Bone canvas — the zine spread ===== */}
      <section className="full-bleed bg-shop-bone text-black">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          {/* Table of contents — categories as an index */}
          <div className="flex items-baseline justify-between font-mono">
            <h2 className="text-base uppercase tracking-[0.2em]">Index</h2>
            <span className="text-[0.66rem] uppercase tracking-[0.18em] text-black/50">
              {String(categories.length).padStart(2, '0')} categories
            </span>
          </div>

          <div className="mt-6 grid gap-x-8 md:grid-cols-2 xl:grid-cols-4">
            {categories.map((category, index) => (
              <Link
                key={category.slug}
                href={`/stores/${category.slug}`}
                className="group border-t border-black/25 py-4 font-mono transition-colors hover:bg-black hover:text-shop-bone"
              >
                <span className="flex items-baseline justify-between px-1">
                  <span className="text-xs uppercase tracking-[0.15em]">
                    {t.categories[camelizeSlug(category.slug)] || category.label}
                  </span>
                  <span className="text-[0.62rem] text-black/40 transition-colors group-hover:text-shop-bone/60">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </span>
                <span className="mt-1.5 block px-1 text-[0.66rem] leading-relaxed text-black/50 transition-colors group-hover:text-shop-bone/70">
                  {t.categoryDescriptions[camelizeSlug(category.slug)] || category.description}
                </span>
              </Link>
            ))}
          </div>

          {/* The verified-deals spread */}
          <div className="mt-20 flex items-baseline justify-between font-mono">
            <h2 className="text-base uppercase tracking-[0.2em]">{t.home.featured}</h2>
            <span className="text-[0.66rem] uppercase tracking-[0.18em] text-black/50">
              {String(deals.length).padStart(2, '0')} stores
            </span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {deals.map((deal) => (
              <ZineStoreCard key={deal.id} deal={deal} t={t} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
