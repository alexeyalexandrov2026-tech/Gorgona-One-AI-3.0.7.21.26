import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSportsbookBySlug } from '../../../lib/sportsbooksData';
import { sportsbookDescriptions, getContentText } from '../../../lib/contentTranslations';
import { getServerTranslation } from '../../../lib/serverLocale';

export const dynamic = 'force-dynamic';

// Same mapping as /sportsbook - see that file for details.
const SPORTSBOOK_LOGOS = {
  'hard-rock-bet': '/images/brands/hard-rock-bet-betting.svg',
  draftkings: '/images/brands/draftkings-betting.svg',
  fanduel: '/images/brands/fanduel-betting.svg',
  betmgm: '/images/brands/betmgm-betting.svg',
  'caesars': '/images/brands/caesars-sportsbook-betting.svg',
  'fanatics': '/images/brands/fanatics-sportsbook-betting.svg',
  bet365: '/images/brands/bet365-betting.svg',
  betrivers: '/images/brands/betrivers-betting.svg',
  'espn-bet': '/images/brands/espn-bet-betting.svg',
  'bally-bet': '/images/brands/bally-bet-betting.svg'
};

// Approved prototype rollout (see prototypes/hard-rock-bet-profile-mockup.html),
// now extended to every sportsbook. Same transparent-cutout logos already
// approved on the Sportsbook directory card (public/images/brands/*-integrated.png,
// untouched here) and the same per-brand radial gradient/glow pairs used
// there, just carried into a full-width hero instead of a card banner.
const PROFILE_HERO_LOGOS = {
  'hard-rock-bet': '/images/brands/hard-rock-bet-integrated.png',
  draftkings: '/images/brands/draftkings-integrated.png',
  fanduel: '/images/brands/fanduel-integrated.png',
  betmgm: '/images/brands/betmgm-integrated.png',
  caesars: '/images/brands/caesars-integrated.png',
  fanatics: '/images/brands/fanatics-integrated.png',
  bet365: '/images/brands/bet365-integrated.png',
  betrivers: '/images/brands/betrivers-integrated.png',
  'espn-bet': '/images/brands/espn-bet-integrated.png',
  'bally-bet': '/images/brands/bally-bet-integrated.png'
};

const PROFILE_HERO_STYLES = {
  'hard-rock-bet': {
    gradient: 'radial-gradient(70% 90% at 18% 32%, #8a68ff 0%, #6d3fdb 22%, #4a2fb0 42%, #21123f 68%, #050208 100%)',
    glow: 'rgba(200,170,255,0.42)'
  },
  draftkings: {
    gradient: 'radial-gradient(70% 90% at 18% 32%, #63c26a 0%, #3f9a46 22%, #235c29 42%, #122e15 68%, #030803 100%)',
    glow: 'rgba(150,225,140,0.4)'
  },
  fanduel: {
    gradient: 'radial-gradient(70% 90% at 18% 32%, #5aa8ff 0%, #2c78e8 22%, #164a9c 42%, #0b2a56 68%, #030c1e 100%)',
    glow: 'rgba(140,190,255,0.42)'
  },
  betmgm: {
    gradient: 'radial-gradient(70% 90% at 18% 32%, #4a3d1c 0%, #2e2510 22%, #191408 42%, #0c0a05 68%, #030202 100%)',
    glow: 'rgba(224,192,130,0.34)'
  },
  caesars: {
    gradient: 'radial-gradient(70% 90% at 18% 32%, #4f8f63 0%, #326241 22%, #1e3f28 42%, #102015 68%, #030a05 100%)',
    glow: 'rgba(216,190,130,0.32)'
  },
  fanatics: {
    gradient: 'radial-gradient(70% 90% at 18% 32%, #b1382f 0%, #7c211c 22%, #481210 42%, #200807 68%, #050202 100%)',
    glow: 'rgba(255,120,110,0.32)'
  },
  bet365: {
    gradient: 'radial-gradient(70% 90% at 18% 32%, #2fbf83 0%, #17925f 22%, #0c5e3d 42%, #073924 68%, #020e08 100%)',
    glow: 'rgba(150,235,190,0.38)'
  },
  betrivers: {
    gradient: 'radial-gradient(70% 90% at 18% 32%, #4f8fdb 0%, #2e63ab 22%, #1c3f70 42%, #10233f 68%, #030a16 100%)',
    glow: 'rgba(230,190,110,0.3)'
  },
  'espn-bet': {
    gradient: 'radial-gradient(70% 90% at 18% 32%, #3f66b0 0%, #274680 22%, #172c53 42%, #0c182e 68%, #02060f 100%)',
    glow: 'rgba(140,225,205,0.34)'
  },
  'bally-bet': {
    gradient: 'radial-gradient(70% 90% at 18% 32%, #d066e0 0%, #a13cb8 22%, #6a2380 42%, #38134a 68%, #0c0413 100%)',
    glow: 'rgba(235,150,225,0.38)'
  }
};

// Same trust/feature strip copy for every sportsbook - purely decorative,
// not sportsbook-specific data, matching the approved Hard Rock Bet
// prototype.
const PROFILE_FEATURES = [
  { title: 'Trusted Brand', sub: 'Official sportsbook', d: 'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z' },
  { title: 'Promotions', sub: 'Exclusive offers', d: 'M3 8h18v13H3zM12 8v13M3 12h18M12 8c-1.5-3-5-4-5-1.5S9 8 12 8Zm0 0c1.5-3 5-4 5-1.5S15 8 12 8Z' },
  { title: 'Mobile Betting', sub: 'Bet on the go', d: 'M6 2h12v20H6zM11 18h2' },
  { title: 'Secure & Safe', sub: 'Your privacy matters', d: 'M4 11h16v10H4zM8 11V7a4 4 0 0 1 8 0v4' }
];

export default async function SportsbookProfilePage({ params }) {
  const sportsbook = await getSportsbookBySlug(params.slug);

  if (!sportsbook) {
    notFound();
  }

  const { t, locale } = getServerTranslation();

  // Approved prototype rollout, extended to every sportsbook with a
  // hero style defined above. Falls through to the original layout below
  // only if a slug somehow has no style entry (defensive, shouldn't
  // happen for the current 10 sportsbooks).
  const heroStyle = PROFILE_HERO_STYLES[sportsbook.slug];
  const heroLogo = PROFILE_HERO_LOGOS[sportsbook.slug];
  if (heroStyle) {
    return (
      <main className="flex-1 py-10">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-premium">
          <div
            className="sportsbook-banner relative flex flex-col items-center gap-10 px-8 py-12 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left lg:px-14 lg:py-16"
            style={{ '--sb-gradient': heroStyle.gradient, '--sb-glow': heroStyle.glow }}
          >
            <div className="relative z-[2] max-w-lg">
              <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">{t.sportsbookPage.pill} Profile</p>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white">{sportsbook.name}</h1>
              <p className="mt-4 text-base leading-relaxed text-zinc-300">{getContentText(sportsbookDescriptions, locale, sportsbook.slug, sportsbook.description)}</p>
              <Link
                href={sportsbook.website}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-brand-gold px-6 py-3.5 text-sm font-bold text-black transition hover:brightness-110"
              >
                Visit Official Website
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14 21 3" /></svg>
              </Link>
            </div>
            {heroLogo && (
              <div className="relative z-[2] w-3/4 max-w-[380px] sm:w-[42%]">
                <img src={heroLogo} alt={sportsbook.name} className="w-full drop-shadow-[0_18px_40px_rgba(0,0,0,0.6)]" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 border-y border-white/10 lg:grid-cols-4">
            {PROFILE_FEATURES.map((f) => (
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

          <div className="grid gap-6 p-8 lg:grid-cols-2 lg:p-10">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Offer overview</p>
              <div className="mt-4 space-y-4 text-sm text-zinc-400">
                <p><span className="text-white">Website:</span> {sportsbook.website}</p>
                <p><span className="text-white">State availability:</span> {sportsbook.state_availability}</p>
                <p><span className="text-white">{t.kosher.promoCode}:</span> {sportsbook.promo_code || 'Empty and ready for future updates'}</p>
                <p><span className="text-white">Bonus offer:</span> {sportsbook.bonus_offer}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Responsible Gambling</p>
              <p className="mt-4 text-sm text-zinc-400">Play responsibly. Review terms and conditions before placing any wager. Promotional promises and bonus details should be verified directly with the operator.</p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">Terms & Conditions</p>
                <p className="mt-2 text-sm text-zinc-400">All offers are subject to regional availability and official operator terms.</p>
              </div>
            </div>
          </div>

          <div className="mx-8 mb-8 rounded-2xl border border-dashed border-brand-gold/30 bg-black/20 p-6 lg:mx-10 lg:mb-10">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Affiliate Program</p>
            <p className="mt-3 text-sm text-zinc-400">
              This section is reserved for {sportsbook.name}'s affiliate tracking link and exclusive promo terms. The button above currently points to the operator's official website - affiliate links will be added here once approved.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {SPORTSBOOK_LOGOS[sportsbook.slug] && (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-gold/15">
                <img src={SPORTSBOOK_LOGOS[sportsbook.slug]} alt={sportsbook.name} className="h-full w-full object-contain" />
              </div>
            )}
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">{t.sportsbookPage.pill} Profile</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">{sportsbook.name}</h1>
              <p className="mt-3 max-w-2xl text-zinc-400">{getContentText(sportsbookDescriptions, locale, sportsbook.slug, sportsbook.description)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-brand-gold/20 bg-brand-gold/10 px-4 py-3">
            <p className="text-sm text-zinc-400">{t.category.categoryLabel}</p>
            <p className="font-semibold text-white">{t.sportsbookPage.pill}</p>
          </div>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Offer overview</p>
            <div className="mt-4 space-y-4 text-sm text-zinc-400">
              <p><span className="text-white">Website:</span> {sportsbook.website}</p>
              <p><span className="text-white">State availability:</span> {sportsbook.state_availability}</p>
              <p><span className="text-white">{t.kosher.promoCode}:</span> {sportsbook.promo_code || 'Empty and ready for future updates'}</p>
              <p><span className="text-white">Bonus offer:</span> {sportsbook.bonus_offer}</p>
            </div>
            <Link
              href={sportsbook.website}
              className="market-button mt-6 inline-flex"
            >
              Visit Official Website
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Responsible Gambling</p>
            <p className="mt-4 text-sm text-zinc-400">Play responsibly. Review terms and conditions before placing any wager. Promotional promises and bonus details should be verified directly with the operator.</p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Terms & Conditions</p>
              <p className="mt-2 text-sm text-zinc-400">All offers are subject to regional availability and official operator terms.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-brand-gold/30 bg-black/20 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Affiliate Program</p>
          <p className="mt-3 text-sm text-zinc-400">
            This section is reserved for {sportsbook.name}'s affiliate tracking link and exclusive promo terms. The button above currently points to the operator's official website - affiliate links will be added here once approved.
          </p>
        </div>
      </div>
    </main>
  );
}
