import Link from 'next/link';
import { getSportsbooks } from '../../lib/sportsbooksData';
import { sportsbookDescriptions, getContentText } from '../../lib/contentTranslations';
import { getServerTranslation } from '../../lib/serverLocale';
import { SectionHero } from '../components/SectionHero';

export const dynamic = 'force-dynamic';

// Integrated marks for the sportsbook directory cards only: each source
// logo (public/images/brands/*-betting.svg, still used unchanged by
// Coupons/Stores/search/profile pages) had its own baked-in flat or
// textured backing color, which read as a pasted rectangle once dropped
// onto a branded gradient. These derived cutouts keep only the logo's
// actual mark/wordmark with a transparent background (built from the
// approved Hard Rock Bet prototype's technique), so the logo can sit
// directly in the gradient instead of floating on top of it.
const SPORTSBOOK_LOGOS = {
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

// Each brand gets its own radial gradient (bright accent fading through
// the brand's mid-tone into near-black) plus a matching soft glow color
// that sits behind the logo and echoes in its drop-shadow - the same
// two-layer treatment approved on the Hard Rock Bet prototype, tuned per
// brand instead of reusing one purple palette everywhere.
const SPORTSBOOK_BANNER_STYLES = {
  'hard-rock-bet': {
    gradient: 'radial-gradient(85% 65% at 30% 22%, #b98bff 0%, #8b52ee 20%, #5c28b8 40%, #24103f 66%, #050208 100%)',
    glow: 'rgba(210,175,255,0.4)'
  },
  draftkings: {
    gradient: 'radial-gradient(85% 65% at 30% 22%, #63c26a 0%, #3f9a46 20%, #235c29 42%, #122e15 68%, #030803 100%)',
    glow: 'rgba(150,225,140,0.38)'
  },
  fanduel: {
    gradient: 'radial-gradient(85% 65% at 30% 22%, #5aa8ff 0%, #2c78e8 20%, #164a9c 42%, #0b2a56 68%, #030c1e 100%)',
    glow: 'rgba(140,190,255,0.4)'
  },
  betmgm: {
    gradient: 'radial-gradient(85% 65% at 30% 22%, #4a3d1c 0%, #2e2510 20%, #191408 42%, #0c0a05 68%, #030202 100%)',
    glow: 'rgba(224,192,130,0.32)'
  },
  caesars: {
    gradient: 'radial-gradient(85% 65% at 30% 22%, #4f8f63 0%, #326241 20%, #1e3f28 42%, #102015 68%, #030a05 100%)',
    glow: 'rgba(216,190,130,0.3)'
  },
  fanatics: {
    gradient: 'radial-gradient(85% 65% at 30% 22%, #b1382f 0%, #7c211c 20%, #481210 42%, #200807 68%, #050202 100%)',
    glow: 'rgba(255,120,110,0.3)'
  },
  bet365: {
    gradient: 'radial-gradient(85% 65% at 30% 22%, #2fbf83 0%, #17925f 20%, #0c5e3d 42%, #073924 68%, #020e08 100%)',
    glow: 'rgba(150,235,190,0.35)'
  },
  betrivers: {
    gradient: 'radial-gradient(85% 65% at 30% 22%, #4f8fdb 0%, #2e63ab 20%, #1c3f70 42%, #10233f 68%, #030a16 100%)',
    glow: 'rgba(230,190,110,0.28)'
  },
  'espn-bet': {
    gradient: 'radial-gradient(85% 65% at 30% 22%, #3f66b0 0%, #274680 20%, #172c53 42%, #0c182e 68%, #02060f 100%)',
    glow: 'rgba(140,225,205,0.32)'
  },
  'bally-bet': {
    gradient: 'radial-gradient(85% 65% at 30% 22%, #d066e0 0%, #a13cb8 20%, #6a2380 42%, #38134a 68%, #0c0413 100%)',
    glow: 'rgba(235,150,225,0.35)'
  }
};

export default async function SportsbookPage() {
  const sportsbooks = await getSportsbooks();
  const { t, locale } = getServerTranslation();

  return (
    <main className="flex-1 theme-sportsbook">
      <SectionHero
        eyebrow={t.sportsbookPage.pill}
        title={t.sportsbookPage.title}
        subtitle={t.sportsbookPage.subtitle}
        image="https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=2400&q=80"
      />
      <div className="grid gap-6 py-8 md:grid-cols-2 xl:grid-cols-3">
        {sportsbooks.map((book) => {
          const style = SPORTSBOOK_BANNER_STYLES[book.slug];
          return (
            <article key={book.id} className="market-card overflow-hidden rounded-3xl">
              <div
                className="sportsbook-banner flex h-48 items-center justify-center"
                style={style ? { '--sb-gradient': style.gradient, '--sb-glow': style.glow } : { background: 'rgba(255,255,255,0.05)' }}
              >
                {SPORTSBOOK_LOGOS[book.slug] ? (
                  <img src={SPORTSBOOK_LOGOS[book.slug]} alt={book.name} className="h-24 w-auto max-w-[75%] object-contain" />
                ) : (
                  <span className="relative z-[2] text-sm font-semibold text-brand-gold">{book.logo}</span>
                )}
                <span className="absolute right-4 top-4 z-[3] rounded-full bg-brand-gold px-3 py-1 text-xs font-semibold text-black/80 shadow-sm">{t.sportsbookPage.pill}</span>
              </div>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-white">{book.name}</h2>
                <p className="mt-3 text-sm text-zinc-400">{getContentText(sportsbookDescriptions, locale, book.slug, book.description)}</p>
                <Link href={`/sportsbook/${book.slug}`} className="mt-6 inline-flex rounded-full border border-brand-gold/40 px-4 py-2 text-sm font-medium text-brand-gold transition hover:bg-brand-gold hover:text-black">{t.sportsbookPage.viewProfile}</Link>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
