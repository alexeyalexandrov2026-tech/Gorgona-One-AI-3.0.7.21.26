"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { allDeals, categories, getDealDescription } from '../../lib/dealsData';
import { getYachts } from '../../lib/yachtsData';
import { getVacationRentals } from '../../lib/vacationRentalsData';
import { getExperiences } from '../../lib/experiencesData';
import { getVenues } from '../../lib/restaurantsNightlifeData';
import { getTranslation } from '../../lib/i18n';
import { useLocale } from './LocaleProvider';

const POPULAR_SEARCH_LINKS = [
  { key: 'carRentals', href: '/rentals' },
  { key: 'yachtRentals', href: '/yachts' },
  { key: 'sportsbookBonuses', href: '/sportsbook' },
  { key: 'vacationRentals', href: '/vacation-rentals' },
  { key: 'miamiExperiences', href: '/experiences' },
  { key: 'restaurantsNightlife', href: '/restaurants-nightlife' }
];

function camelizeSlug(slug) {
  return slug.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Temporarily held out of the Search Results preview only - pending
// replacement brands. Left in lib/dealsData.js and every other section
// (Stores, Coupons, etc.) untouched.
// Best Buy: replaced in this preview by the Ovago card below (Best Buy
// stays fully intact in Stores and everywhere else). Ovago: added here too
// since it's a real lib/dealsData.js travel entry now - hiding it from this
// capped 6-item window avoids it duplicating the dedicated card below;
// its real listing still renders in full on /stores/travel.
const HIDDEN_FROM_SEARCH_RESULTS = ['Target', 'Newegg', 'Macy’s', 'Nordstrom', 'Best Buy', 'Ovago'];

// Fills one of the slots freed up above with the new KXC partner card.
// Scoped to the Search Results preview only, same as the hidden list.
const KXC_AFFILIATE_LINK = 'https://www.awin1.com/cread.php?awinmid=53985&awinaffid=2982101&ued=https%3A%2F%2Fkxclothing.com%2F';

function buildKxcDeal(t) {
  const category = t.categories.shopping;
  const name = 'Kinetix Casual Luxury (KXC)';
  return {
    id: 'kxc-shopping',
    name,
    logo: '/images/brands/kinetix-casual-luxury.svg',
    // KXC's mark is dark text - it needs the white backing plate to read
    // on the dark cards. Amazon/Best Buy/Newegg's marks already include
    // their own light/reversed colorway, so they sit directly on the card.
    logoOnSolid: true,
    description: t.category.dealDescriptionTemplate.replace('{name}', name).replace('{category}', category),
    category,
    promoCode: '',
    discount: 'New season styles',
    href: KXC_AFFILIATE_LINK
  };
}

// Fills the slot freed up by hiding Newegg above. Scoped to the Search
// Results preview only, same as the hidden list.
const RENTCARS_AFFILIATE_LINK = 'https://click.linksynergy.com/fs-bin/click?id=BsBQ7p%2fMcbE&offerid=1791245.3&type=3&subid=0';

function buildRentcarsDeal(t) {
  const category = t.categories.shopping;
  const name = 'Rentcars.com';
  return {
    id: 'rentcars-shopping',
    name,
    logo: '/images/brands/rentcars-shopping.webp',
    description: t.category.dealDescriptionTemplate.replace('{name}', name).replace('{category}', category),
    category,
    promoCode: '',
    discount: 'Worldwide car rental deals',
    href: RENTCARS_AFFILIATE_LINK
  };
}

// Fills the Search Results slot freed up by hiding Best Buy above. Scoped to
// the Search Results preview only, same as the hidden list. Links to
// Ovago's own profile page (below), which hosts its real deals and their
// individual affiliate links, rather than a single generic href here.
function buildOvagoDeal(t) {
  const category = t.categories.travel;
  const name = 'Ovago';
  return {
    id: 'ovago-travel',
    name,
    logo: '/images/brands/ovago-travel.svg',
    // Ovago's mark is dark on transparent, same situation as KXC above - it
    // needs the white backing plate to read on the dark cards.
    logoOnSolid: true,
    description: t.category.dealDescriptionTemplate.replace('{name}', name).replace('{category}', category),
    category,
    promoCode: '',
    discount: 'Flight deals and discounts',
    href: '/travel/ovago'
  };
}

// Logos for the Search Results preview only (the same brand's card in
// Stores/Coupons/etc. is untouched). Keyed by deal name so it only applies
// to these specific cards, not every brand that happens to pass through
// this component.
const SEARCH_RESULT_LOGOS = {
  Amazon: '/images/brands/amazon-shopping.svg',
  'Best Buy': '/images/brands/best-buy-shopping.svg',
  Newegg: '/images/brands/newegg-shopping.svg',
  'Hard Rock Bet': '/images/brands/hard-rock-bet-betting.svg',
  Bet365: '/images/brands/bet365-betting.svg',
  DraftKings: '/images/brands/draftkings-betting.svg',
  FanDuel: '/images/brands/fanduel-betting.svg',
  BetMGM: '/images/brands/betmgm-betting.svg',
  'Caesars Sportsbook': '/images/brands/caesars-sportsbook-betting.svg',
  'Fanatics Sportsbook': '/images/brands/fanatics-sportsbook-betting.svg',
  Betrivers: '/images/brands/betrivers-betting.svg',
  'ESPN BET': '/images/brands/espn-bet-betting.svg',
  'Bally Bet': '/images/brands/bally-bet-betting.svg'
};

// Sends every sportsbook's Search Results card to its dedicated profile
// page (lib/mockData.js `sportsbooks`) instead of the generic /deals/
// detail route used by every other brand - keyed by the dealsData betting
// brand name, which doesn't always match the mockData sportsbook slug.
const SPORTSBOOK_PROFILE_SLUGS = {
  'Hard Rock Bet': 'hard-rock-bet',
  Bet365: 'bet365',
  DraftKings: 'draftkings',
  FanDuel: 'fanduel',
  BetMGM: 'betmgm',
  'Caesars Sportsbook': 'caesars',
  'Fanatics Sportsbook': 'fanatics',
  Betrivers: 'betrivers',
  'ESPN BET': 'espn-bet',
  'Bally Bet': 'bally-bet'
};

// Non-deal catalogs (yachts, vacation rentals, experiences, restaurants &
// nightlife) live outside lib/dealsData.js, each with its own item shape and
// detail route. Normalized here to the fields the results list already
// renders (name/description/category/href) so they're searchable too,
// without touching how any of those pages themselves render.
function buildExtraCatalog(t) {
  return [
    ...getYachts().map((item) => ({
      id: `yacht-${item.id}`,
      name: item.title,
      description: item.description,
      category: t.search.popular.yachtRentals,
      promoCode: '',
      discount: item.price,
      href: `/yachts/${item.slug}`
    })),
    ...getVacationRentals().map((item) => ({
      id: `vacation-rental-${item.id}`,
      name: item.title,
      description: item.description,
      category: t.search.popular.vacationRentals,
      promoCode: '',
      discount: item.price,
      href: `/vacation-rentals/${item.slug}`
    })),
    ...getExperiences().map((item) => ({
      id: `experience-${item.id}`,
      name: item.title,
      description: item.description,
      category: t.search.popular.miamiExperiences,
      promoCode: '',
      discount: item.price,
      href: `/experiences/${item.slug}`
    })),
    ...getVenues().map((item) => ({
      id: `venue-${item.id}`,
      name: item.name,
      description: item.description,
      category: t.search.popular.restaurantsNightlife,
      promoCode: '',
      discount: item.location,
      href: `/restaurants-nightlife/${item.slug}`
    }))
  ];
}

export function SearchBar() {
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const t = getTranslation(locale);

  const filteredDeals = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const deals = allDeals.filter((deal) => {
      const matchesQuery = !normalized || [deal.name, deal.category, getDealDescription(deal, t), deal.discount, deal.promoCode].join(' ').toLowerCase().includes(normalized);
      const matchesCategory = activeCategory === 'all' || deal.category === activeCategory;
      return matchesQuery && matchesCategory;
    }).map((deal) => ({
      id: deal.id,
      name: deal.name,
      logo: SEARCH_RESULT_LOGOS[deal.name],
      description: getDealDescription(deal, t),
      category: t.categories[camelizeSlug(deal.category)] || deal.category,
      promoCode: deal.promoCode,
      discount: deal.discount,
      href: SPORTSBOOK_PROFILE_SLUGS[deal.name] ? `/sportsbook/${SPORTSBOOK_PROFILE_SLUGS[deal.name]}` : `/deals/${deal.slug}`
    }));

    // The extra catalogs (yachts/vacation rentals/experiences/restaurants)
    // aren't part of the Stores/Coupons category dropdown, so they only
    // participate when no specific category filter is active.
    const combined = activeCategory !== 'all'
      ? deals
      : [...deals, ...buildExtraCatalog(t).filter((item) => !normalized || [item.name, item.category, item.description].join(' ').toLowerCase().includes(normalized))];

    // Fixed top-6 window first, then hide pending-replacement brands from
    // it - so their slots stay empty instead of being backfilled by the
    // next result in line. Every other section still shows these brands.
    const windowed = combined.slice(0, 6).filter((item) => !HIDDEN_FROM_SEARCH_RESULTS.includes(item.name));

    const kxc = buildKxcDeal(t);
    const kxcMatches = (activeCategory === 'all' || activeCategory === 'shopping')
      && (!normalized || [kxc.name, kxc.category, kxc.description, kxc.discount].join(' ').toLowerCase().includes(normalized));

    const rentcars = buildRentcarsDeal(t);
    const rentcarsMatches = (activeCategory === 'all' || activeCategory === 'shopping')
      && (!normalized || [rentcars.name, rentcars.category, rentcars.description, rentcars.discount].join(' ').toLowerCase().includes(normalized));

    const ovago = buildOvagoDeal(t);
    const ovagoMatches = activeCategory === 'all'
      && (!normalized || [ovago.name, ovago.category, ovago.description, ovago.discount].join(' ').toLowerCase().includes(normalized));

    const withKxc = kxcMatches ? [...windowed, kxc] : windowed;
    const withRentcars = rentcarsMatches ? [...withKxc, rentcars] : withKxc;
    const withOvago = ovagoMatches ? [...withRentcars, ovago] : withRentcars;
    return withOvago.slice(0, 6);
  }, [activeCategory, query, t]);

  const popularSearches = POPULAR_SEARCH_LINKS.map((item) => ({ ...item, label: t.search.popular[item.key] }));

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-premium sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.search.placeholder}
          className="flex-1 rounded-full border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none"
        />
        <select value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)} className="rounded-full border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none">
          <option value="all">{t.category.allCategories}</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>{t.categories[camelizeSlug(category.slug)] || category.label}</option>
          ))}
        </select>
        <button className="rounded-full bg-brand-gold px-4 py-3 text-sm font-medium text-black">{t.buttons.search}</button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {popularSearches.map((search) => (
          <Link key={search.key} href={search.href} className="rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-brand-gold hover:text-brand-gold">
            {search.label}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-gold">{t.search.results}</p>
        {filteredDeals.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">{t.search.noResults}</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {filteredDeals.slice(0, 6).map((item) => (
              <Link key={item.id} href={item.href} className="flex h-full items-stretch gap-4 rounded-2xl border border-white/10 bg-black/40 p-4">
                {item.logo && (
                  <div className={`flex w-28 shrink-0 items-center justify-center rounded-xl ${item.logoOnSolid ? 'bg-white p-3' : 'p-1'}`}>
                    <img src={item.logo} alt={item.name} className="max-h-24 w-full object-contain" />
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{item.name}</p>
                      <span className="rounded-full bg-brand-gold/15 px-2 py-1 text-xs text-brand-gold">{item.category}</span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
                    <span>{item.promoCode || t.category.noCodeNeeded}</span>
                    <span>{item.discount}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
