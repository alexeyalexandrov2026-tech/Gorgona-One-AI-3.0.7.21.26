"use client";

import Link from 'next/link';
import { SearchBar } from '../../components/SearchBar';
import { categories } from '../../../lib/dealsData';
import { getTranslation } from '../../../lib/i18n';
import { useLocale } from '../../components/LocaleProvider';

function camelizeSlug(slug) {
  return slug.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

const TRUST_BADGES = [
  { title: 'Verified offers', detail: 'Handpicked & tested', icon: <path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5l-8-3Zm-1.2 13.6-3.4-3.4 1.4-1.4 2 2 4.6-4.6 1.4 1.4-6 6Z" /> },
  { title: 'Exclusive codes', detail: 'Members-only savings', icon: <path d="M12.6 2 22 11.4l-9.4 9.4a2 2 0 0 1-2.8 0L2 13V4a2 2 0 0 1 2-2h8.6ZM7 5.5A1.5 1.5 0 1 0 7 8.5 1.5 1.5 0 0 0 7 5.5Z" /> },
  { title: 'Trusted partners', detail: 'Top brands you love', icon: <path d="m12 2 2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17l-6.1 3.5 1.5-6.8L2.2 9l6.9-.7L12 2Z" /> },
  { title: 'All in one place', detail: 'Save time & money', icon: <path d="M20 7h-3.2a3 3 0 0 0-9.6 0H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h.5v8a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-8h.5a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1ZM12 4a2 2 0 0 1 1.87 1.3h-3.74A2 2 0 0 1 12 4Z" /> }
];

// Featured Deals row data - reuses the same lead image already used for
// each category's own featured listing, matching the approved homepage
// layout (app/page.js) card for card: icon, title, value, description,
// full-bleed image, and accent-colored chevron.
const FEATURED_DEALS = [
  {
    title: 'Car Rentals',
    value: 'Premium Miami vehicles',
    description: 'High-end cars with concierge pickup and airport delivery.',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    href: '/rentals',
    accent: '#d4af37',
    glow: 'rgba(212, 175, 55, 0.4)',
    icon: (
      <>
        <path d="M18.92 6.01A1.5 1.5 0 0 0 17.5 5h-11c-.66 0-1.24.42-1.45 1.01L3 12v6.5A1.5 1.5 0 0 0 4.5 20H5a1 1 0 0 0 1-1v-.5h12v.5a1 1 0 0 0 1 1h.5a1.5 1.5 0 0 0 1.5-1.5V12l-2.08-5.99ZM5 11l1.5-4.5h11L19 11H5Z" />
        <circle cx="6.7" cy="15" r="1.4" fill="#000" />
        <circle cx="17.3" cy="15" r="1.4" fill="#000" />
      </>
    )
  },
  {
    title: 'Yacht Rentals',
    value: 'Sunset cruising',
    description: 'Private yacht experiences for nightlife, events, and luxury outings.',
    image: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1200&q=80',
    href: '/yachts',
    accent: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.4)',
    icon: (
      <>
        <path d="M3.5 15.5h17L18.5 20h-13l-2-4.5Z" />
        <path d="M10.5 4h1v6.5h4l-3.2-5.3.9-.5 4 6.6a.7.7 0 0 1-.6 1.1H8a.7.7 0 0 1-.6-1l2.2-4.4-.7-.3.9-1.8.7.3V4Z" />
      </>
    )
  },
  {
    title: 'Sportsbook Bonuses',
    value: 'Top-tier offers',
    description: 'Verified sportsbook promos and referral-only bonuses.',
    image: '/images/featured/sportsbook-bonuses-hard-rock-bet.png',
    href: '/sportsbook',
    accent: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.4)',
    icon: (
      <path d="M8 3h8v3.5a4 4 0 0 1-8 0V3Zm-2 .5H3v1.8A4.2 4.2 0 0 0 6.8 9.5M18 3.5h3v1.8A4.2 4.2 0 0 1 17.2 9.5M11 14.5h2v3.5h-2zM8 20.5h8l-1.2-2.5H9.2L8 20.5Z" />
    )
  },
  {
    title: 'Vacation Rentals',
    value: 'Luxury stays',
    description: 'Short-term stays, villas, and premium residences in key markets.',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    href: '/vacation-rentals',
    accent: '#d4af37',
    glow: 'rgba(212, 175, 55, 0.4)',
    icon: (
      <>
        <path d="M5 20V9.5L11 6v14H5Z" />
        <rect x="6.4" y="11" width="1.6" height="1.6" fill="#000" />
        <rect x="6.4" y="14" width="1.6" height="1.6" fill="#000" />
        <path d="M12 20V9l3.5 4.5V20H12Z" />
        <path d="M11.5 6c1.5-.8 2-2.4 1.7-3.8 1.4.4 2.6 1.7 2.3 3.3-.2 1.2-1.3 1.9-2.3 2.1L11.5 6Z" />
      </>
    )
  }
];

function palmFrond(cx, cy, angleDeg, length, width) {
  const angle = (angleDeg * Math.PI) / 180;
  const tipX = cx + Math.cos(angle) * length;
  const tipY = cy + Math.sin(angle) * length;
  const midX = cx + Math.cos(angle) * length * 0.52;
  const midY = cy + Math.sin(angle) * length * 0.52;
  const perp = angle + Math.PI / 2;
  const perpX = Math.cos(perp) * width;
  const perpY = Math.sin(perp) * width;
  return `M ${cx} ${cy} Q ${midX + perpX} ${midY + perpY} ${tipX} ${tipY} Q ${midX - perpX} ${midY - perpY} ${cx} ${cy} Z`;
}

const PALM_ANGLES = [-175, -150, -125, -100, -75, -50, -25, -5, 15, -195];

function PalmTree({ baseX, baseY, trunkHeight, scale = 1, lean = -10 }) {
  const topX = baseX + Math.sin((lean * Math.PI) / 180) * trunkHeight;
  const topY = baseY - trunkHeight;
  return (
    <g>
      <path
        d={`M ${baseX - 8} ${baseY} Q ${baseX + lean * 1.3} ${baseY - trunkHeight * 0.55} ${topX} ${topY}`}
        stroke="#050403"
        strokeWidth={10 * scale}
        fill="none"
        strokeLinecap="round"
      />
      {PALM_ANGLES.map((angle, i) => (
        <path key={i} d={palmFrond(topX, topY, angle, 105 * scale, 15 * scale)} fill="#050403" />
      ))}
      <circle cx={topX} cy={topY} r={8 * scale} fill="#050403" />
    </g>
  );
}

const BUILDINGS = [
  { x: 0, y: 440, w: 22, h: 110, top: 'flat' },
  { x: 24, y: 410, w: 18, h: 140, top: 'flat' },
  { x: 44, y: 450, w: 20, h: 100, top: 'flat' },
  { x: 66, y: 390, w: 26, h: 160, top: 'setback' },
  { x: 94, y: 425, w: 18, h: 125, top: 'flat' },
  { x: 114, y: 355, w: 30, h: 195, top: 'spire' },
  { x: 146, y: 415, w: 20, h: 135, top: 'flat' },
  { x: 168, y: 320, w: 34, h: 230, top: 'crown' },
  { x: 204, y: 405, w: 22, h: 145, top: 'flat' },
  { x: 228, y: 365, w: 28, h: 185, top: 'setback' },
  { x: 258, y: 420, w: 18, h: 130, top: 'flat' },
  { x: 278, y: 375, w: 26, h: 175, top: 'flat' }
];

function Building({ x, y, w, h, top }) {
  const windows = [];
  const rows = Math.max(3, Math.floor(h / 22));
  const cols = Math.max(2, Math.floor(w / 12));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if ((r + c) % 3 === 0) continue;
      const lit = r < 2 || (r + c) % 4 === 1;
      windows.push(
        <rect
          key={`${r}-${c}`}
          x={x + 4 + c * (w / cols)}
          y={y + 10 + r * 21}
          width="3.5"
          height="6"
          fill="#d4af37"
          opacity={lit ? 0.2 + ((r * c) % 4) * 0.14 : 0.05}
        />
      );
    }
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#0c0904" />
      {top === 'crown' && <rect x={x} y={y} width={w} height={16} fill="#d4af37" opacity="0.45" />}
      {top === 'setback' && <rect x={x + w * 0.2} y={y - 18} width={w * 0.6} height={18} fill="#0c0904" />}
      {top === 'spire' && <rect x={x + w / 2 - 1.5} y={y - 40} width="3" height="40" fill="#d4af37" opacity="0.6" />}
      {windows}
    </g>
  );
}

function SkylineIllustration() {
  return (
    <svg viewBox="0 0 700 560" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
      <defs>
        <radialGradient id="dp-glow" cx="12%" cy="78%" r="55%">
          <stop offset="0%" stopColor="#6b3f06" />
          <stop offset="35%" stopColor="#3a2308" />
          <stop offset="70%" stopColor="#140c03" />
          <stop offset="100%" stopColor="#050505" />
        </radialGradient>
        <linearGradient id="dp-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2308" />
          <stop offset="100%" stopColor="#050505" />
        </linearGradient>
        <linearGradient id="dp-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#050505" stopOpacity="0" />
          <stop offset="34%" stopColor="#050505" stopOpacity="0.35" />
          <stop offset="62%" stopColor="#050505" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#050505" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="700" height="560" fill="#050505" />
      <rect x="0" y="0" width="700" height="560" fill="url(#dp-glow)" />
      {BUILDINGS.map((b, i) => <Building key={i} {...b} />)}
      <rect x="0" y="550" width="300" height="10" fill="url(#dp-water)" />
      <rect x="0" y="550" width="300" height="2" fill="#d4af37" opacity="0.4" />
      <g opacity="0.2" transform="translate(0,552) scale(1,-1)">
        {BUILDINGS.filter((_, i) => i % 2 === 0).map((b, i) => (
          <rect key={i} x={b.x} y={-(b.h * 0.5)} width={b.w} height={b.h * 0.5} fill="#d4af37" />
        ))}
      </g>
      <PalmTree baseX={30} baseY={565} trunkHeight={330} scale={1.5} lean={-10} />
      <PalmTree baseX={125} baseY={565} trunkHeight={250} scale={1.05} lean={16} />
      <PalmTree baseX={-10} baseY={568} trunkHeight={170} scale={0.7} lean={-24} />
      <rect x="0" y="0" width="700" height="560" fill="url(#dp-fade)" />
    </svg>
  );
}

export default function HomepagePreviewDraft() {
  const locale = useLocale();
  const t = getTranslation(locale);

  return (
    <main className="flex-1">
      <div className="sticky top-0 z-50 -mx-4 mb-6 border-b border-brand-gold/30 bg-black/90 px-4 py-3 text-center backdrop-blur sm:-mx-6 lg:-mx-8 lg:px-8">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-gold">
          Draft preview — not the live homepage
        </p>
      </div>

      <section className="market-shell relative overflow-hidden rounded-[2rem] border-brand-gold/20">
        <SkylineIllustration />

        <div className="relative z-10 min-h-[400px] px-6 py-12 sm:px-10 sm:py-14 lg:min-h-[480px] lg:px-16 lg:py-16">
          <p className="market-pill mb-5">Global deals • Promo codes • Lifestyle offers</p>
          <h1 className="market-title text-3xl sm:text-4xl lg:text-5xl">
            Premium deals for every lifestyle{' '}
            <span className="font-serif italic text-brand-gold">in Miami,</span> 🌴
          </h1>
          <p className="market-subtitle text-lg">
            Verified discounts • Exclusive promo codes • Shopping • Travel • Dining • Entertainment • Miami
          </p>
          <p className="mt-3 flex items-center gap-2 text-base text-zinc-200">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-brand-gold">
              <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
            </svg>
            <span className="font-semibold text-brand-gold">Miami, Florida</span>
            <span className="text-zinc-400">• Our home. Your advantage.</span>
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/stores" className="market-button">Explore Marketplace</Link>
            <Link href="/coupons" className="market-button-secondary border-brand-gold/40 text-brand-gold hover:bg-brand-gold hover:text-black">Browse Deals</Link>
            <Link href="/partner" className="market-button-secondary border-brand-gold/40 text-brand-gold hover:bg-brand-gold hover:text-black">Join as Partner</Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
            {TRUST_BADGES.map((badge) => (
              <div key={badge.title} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-gold/40 text-brand-gold">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">{badge.icon}</svg>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{badge.title}</p>
                  <p className="text-xs text-zinc-400">{badge.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-gold">{t.home.featured}</p>
        <div className="mt-6 space-y-5">
          {FEATURED_DEALS.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="featured-deal-card group relative flex flex-col overflow-hidden rounded-2xl sm:h-52 sm:flex-row sm:items-stretch"
              style={{ '--fd-accent': item.accent, '--fd-glow': item.glow }}
            >
              <div className="flex flex-1 items-center gap-5 px-6 py-7 sm:px-8">
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2"
                  style={{ borderColor: item.accent, color: item.accent }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                    {item.icon}
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-white sm:text-2xl">{item.title}</p>
                  <p className="mt-1 text-base font-medium sm:text-lg" style={{ color: item.accent }}>{item.value}</p>
                  <p className="mt-2 line-clamp-2 max-w-md text-sm text-zinc-400">{item.description}</p>
                </div>
              </div>
              <div className="relative h-40 w-full shrink-0 sm:h-full sm:w-[42%]">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.05]"
                />
              </div>
              <span
                className="absolute right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border bg-black/60 backdrop-blur sm:flex"
                style={{ borderColor: item.accent, color: item.accent }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-6">
        <SearchBar />
      </section>

      <section className="py-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Popular categories</h2>
          <Link href="/stores" className="text-sm text-brand-gold">Browse all</Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link key={category.slug} href={`/stores/${category.slug}`} className="market-card rounded-2xl p-5">
              <p className="text-2xl">{category.icon}</p>
              <p className="mt-3 font-semibold text-white">{t.categories[camelizeSlug(category.slug)] || category.label}</p>
              <p className="mt-2 text-sm text-zinc-400">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: 'User accounts', body: 'Register, save favorites, track promo codes, and manage profile activity.', href: '/login' },
            { title: 'Partner portal', body: 'Apply as a merchant, publish offers, manage multiple locations, and track performance.', href: '/partner' },
            { title: 'Admin control', body: 'Approve partners, manage offers, monitor analytics, and keep content compliant.', href: '/admin' },
            { title: 'Legal framework', body: 'Terms, privacy, affiliate disclosure, and cookie policy pages ready for rollout.', href: '/terms' }
          ].map((item) => (
            <Link key={item.title} href={item.href} className="market-card rounded-2xl p-5">
              <p className="font-semibold text-white">{item.title}</p>
              <p className="mt-2 text-sm text-zinc-400">{item.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
