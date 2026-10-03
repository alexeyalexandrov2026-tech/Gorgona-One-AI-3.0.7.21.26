// The ten sportsbooks on /sportsbook, in display order. The order and the
// operators are fixed; edit copy here, not in the page.
//
// theScore Bet is the former ESPN BET: PENN Entertainment ended the ESPN
// agreement and rebranded the sportsbook on December 1, 2025. It keeps the
// same position in the list.
export const SPORTSBOOK_DIRECTORY = [
  {
    name: 'Hard Rock Bet',
    slug: 'hard-rock-bet',
    description: 'Official sportsbook of Hard Rock. Bet on sports with confidence.',
    gradient: 'bg-gradient-to-br from-[#2a0845] via-black/80 to-black',
    logo: 'HARD ROCK BET'
  },
  {
    name: 'DraftKings Sportsbook',
    slug: 'draftkings',
    description: 'The leader in daily fantasy and sports betting.',
    gradient: 'bg-gradient-to-br from-[#0f3b21] via-black/80 to-black',
    logo: 'DRAFT KINGS'
  },
  {
    name: 'FanDuel Sportsbook',
    slug: 'fanduel',
    description: "America's #1 sportsbook and trusted betting experience.",
    gradient: 'bg-gradient-to-br from-[#0f2027] via-[#111928] to-black',
    logo: 'FANDUEL'
  },
  {
    name: 'BetMGM Sportsbook',
    slug: 'betmgm',
    description: 'Established sportsbook combining casino and sports promotions.',
    gradient: 'bg-gradient-to-br from-[#1c1c1c] via-black/90 to-black',
    logo: 'BETMGM'
  },
  {
    name: 'Caesars Sportsbook',
    slug: 'caesars',
    description: 'Premium sportsbook with strong brand integration and loyalty benefits.',
    gradient: 'bg-gradient-to-br from-[#141814] via-[#101010] to-black',
    logo: 'CAESARS'
  },
  {
    name: 'Fanatics Sportsbook',
    slug: 'fanatics',
    description: 'Sportsbook focused on fan engagement and live event experiences.',
    gradient: 'bg-gradient-to-br from-[#2a0a0a] via-black/90 to-black',
    logo: 'FANATICS'
  },
  {
    name: 'bet365 Sportsbook',
    slug: 'bet365',
    description: 'Global sportsbook known for extensive betting markets and live odds.',
    gradient: 'bg-gradient-to-br from-[#002f24] via-[#0a0a0a] to-black',
    logo: 'BET365'
  },
  {
    name: 'BetRivers Sportsbook',
    slug: 'betrivers',
    description: 'User-friendly sportsbook with a broad range of sports coverage.',
    gradient: 'bg-gradient-to-b from-[#d3d9e0] via-[#4a5568] to-[#050505]',
    logo: 'BETRIVERS'
  },
  {
    name: 'theScore Bet',
    slug: 'thescore-bet',
    description: 'Sports media-led sportsbook experience with modern betting tools.',
    gradient: 'bg-gradient-to-br from-[#0f172a] via-black/90 to-black',
    logo: 'THESCORE BET'
  },
  {
    name: 'Bally Bet',
    slug: 'bally-bet',
    description: 'A streamlined sportsbook tailored to simple, mobile-first wagering.',
    gradient: 'bg-gradient-to-br from-[#4a0e17] via-black to-black',
    logo: 'BALLY BET'
  }
];

// Old slugs that moved. /sportsbook/espn-bet redirects (next.config.js), and
// the database row is renamed by database/03_rename_espn_bet.sql.
export const RENAMED_SPORTSBOOKS = {
  'thescore-bet': { from: 'espn-bet', name: 'theScore Bet', website: 'https://thescore.bet' }
};
