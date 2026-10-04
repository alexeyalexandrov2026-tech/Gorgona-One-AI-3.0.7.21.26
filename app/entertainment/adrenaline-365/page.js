import Link from 'next/link';
import { getServerTranslation } from '../../../lib/serverLocale';

export const dynamic = 'force-dynamic';

// Same premium hero/feature-strip/deal-card presentation system as the
// Sportsbook profile pages (see app/sportsbook/[slug]/page.js) and the
// Ovago Travel profile (app/travel/ovago/page.js), reusing the existing
// .sportsbook-banner/.market-card/.market-button styles as-is - just
// carried over for Adrenaline 365's Entertainment profile.
const ADRENALINE_HERO_STYLE = {
  gradient: 'radial-gradient(70% 90% at 18% 32%, #ff6b5e 0%, #e8362a 22%, #a5201a 42%, #3f0d0a 68%, #050202 100%)',
  glow: 'rgba(255,150,140,0.4)'
};

const ADRENALINE_FEATURES = [
  { title: 'Trusted Brand', sub: 'Established adventure operator', d: 'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z' },
  { title: 'Adventure Deals', sub: 'Exclusive experience offers', d: 'M3 8h18v13H3zM12 8v13M3 12h18M12 8c-1.5-3-5-4-5-1.5S9 8 12 8Zm0 0c1.5-3 5-4 5-1.5S15 8 12 8Z' },
  { title: 'Book Anywhere', sub: 'Fast mobile-friendly booking', d: 'M6 2h12v20H6zM11 18h2' },
  { title: 'Secure & Safe', sub: 'Your privacy matters', d: 'M4 11h16v10H4zM8 11V7a4 4 0 0 1 8 0v4' }
];

// Every field below (name, image, affiliate link) comes directly from the
// deal's own supplied source file - not invented, not shared across deals.
const ADRENALINE_DEALS = [
  {
    name: 'Skydive',
    image: '/images/adrenaline365/skydive.jpg',
    href: 'https://www.dpbolvw.net/click-101825540-15824305'
  },
  {
    name: 'Indoor Skydiving',
    image: '/images/adrenaline365/indoor-skydiving.jpg',
    href: 'https://www.kqzyfj.com/click-101825540-15824283'
  },
  {
    name: 'Helicopter Tour',
    image: '/images/adrenaline365/helicopter-tour.png',
    href: 'https://www.kqzyfj.com/click-101825540-15824288'
  },
  {
    name: 'Hot Air Balloon',
    image: '/images/adrenaline365/hot-air-balloon.jpg',
    href: 'https://www.anrdoezrs.net/click-101825540-15824289'
  }
];

export const metadata = {
  title: 'Adrenaline 365 Deals | GORGONA ONE',
  description: 'Adrenaline 365 adventure deals - skydiving, indoor skydiving, helicopter tours, and hot air balloon rides.'
};

export default function Adrenaline365ProfilePage() {
  const { t } = getServerTranslation();
  const categoryLabel = t.categories.entertainment;

  return (
    <main className="flex-1 py-10">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-premium">
        <div
          className="sportsbook-banner relative flex flex-col items-center gap-10 px-8 py-12 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left lg:px-14 lg:py-16"
          style={{ '--sb-gradient': ADRENALINE_HERO_STYLE.gradient, '--sb-glow': ADRENALINE_HERO_STYLE.glow }}
        >
          <div className="relative z-[2] max-w-lg">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">{categoryLabel} Profile</p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white">Adrenaline 365</h1>
            <p className="mt-4 text-base leading-relaxed text-zinc-300">Adventure experience deals, including skydiving, indoor skydiving, helicopter tours, and hot air balloon rides.</p>
          </div>
          <div className="relative z-[2] w-3/4 max-w-[380px] rounded-2xl bg-white p-6 sm:w-[42%]">
            <img src="/images/brands/adrenaline-365-entertainment.png" alt="Adrenaline 365" className="w-full drop-shadow-[0_18px_40px_rgba(0,0,0,0.6)]" />
          </div>
        </div>

        <div className="grid grid-cols-2 border-y border-white/10 lg:grid-cols-4">
          {ADRENALINE_FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3 border-r border-white/10 p-5 last:border-r-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-[22px] w-[22px] shrink-0 text-brand-gold">
                <path d={f.d} />
              </svg>
              <div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="text-sm text-zinc-500">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 lg:p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Adrenaline 365 Deals</p>
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {ADRENALINE_DEALS.map((deal) => (
              <article key={deal.name} className="market-card flex flex-col overflow-hidden rounded-2xl">
                <div className="flex items-center justify-center bg-black/40 p-4">
                  <img src={deal.image} alt={deal.name} className="max-h-40 w-full object-contain" />
                </div>
                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{deal.name}</h2>
                    <p className="mt-3 text-sm text-zinc-400">{t.category.dealDescriptionTemplate.replace('{name}', deal.name).replace('{category}', categoryLabel)}</p>
                  </div>
                  <Link href={deal.href} className="market-button mt-6 inline-flex justify-center">
                    {t.buttons.getDeal}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
