import Link from 'next/link';
import { sportsbookDescriptions, getContentText } from '../../lib/contentTranslations';

// Same visual treatment as the approved /sportsbook directory card - kept
// as its own component (rather than imported from app/sportsbook/page.js)
// so the directory page itself never needs touching. Only difference:
// the whole card is a single Link (directory page's is not), per this
// page's "fully clickable" requirement.
const SPORTSBOOK_LOGOS = {
  'hard-rock-bet': '/images/brands/hard-rock-bet-betting.svg',
  draftkings: '/images/brands/draftkings-betting.svg',
  fanduel: '/images/brands/fanduel-betting.svg',
  betmgm: '/images/brands/betmgm-betting.svg',
  caesars: '/images/brands/caesars-sportsbook-betting.svg',
  fanatics: '/images/brands/fanatics-sportsbook-betting.svg',
  bet365: '/images/brands/bet365-betting.svg',
  betrivers: '/images/brands/betrivers-betting.svg',
  'espn-bet': '/images/brands/espn-bet-betting.svg',
  'bally-bet': '/images/brands/bally-bet-betting.svg'
};

const SPORTSBOOK_BANNER_COLORS = {
  'hard-rock-bet': '#6a47f3',
  draftkings: '#ffffff',
  fanduel: '#ffffff',
  betmgm: '#ffffff',
  caesars: '#e8e3d5',
  fanatics: '#080303',
  bet365: '#035d48',
  betrivers: '#f9f9f9',
  'espn-bet': '#05122e',
  'bally-bet': '#fcfbfc'
};

export function SportsbookCard({ book, t, locale }) {
  return (
    <Link
      href={`/sportsbook/${book.slug}`}
      className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-premium transition hover:border-brand-gold/40"
    >
      <div
        className="relative flex h-40 items-center justify-center"
        style={{ backgroundColor: SPORTSBOOK_BANNER_COLORS[book.slug] || 'rgba(255,255,255,0.05)' }}
      >
        {SPORTSBOOK_LOGOS[book.slug] ? (
          <img src={SPORTSBOOK_LOGOS[book.slug]} alt={book.name} className="h-full w-full object-contain p-5" />
        ) : (
          <span className="text-sm font-semibold text-brand-gold">{book.logo}</span>
        )}
        <span className="absolute right-4 top-4 rounded-full bg-black/40 px-2 py-1 text-xs text-brand-gold backdrop-blur">{t.sportsbookPage.pill}</span>
      </div>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-white">{book.name}</h2>
        <p className="mt-3 text-sm text-zinc-400">{getContentText(sportsbookDescriptions, locale, book.slug, book.description)}</p>
      </div>
    </Link>
  );
}
