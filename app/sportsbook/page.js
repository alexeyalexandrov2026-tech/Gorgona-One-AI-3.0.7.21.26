import React from 'react';
import Link from 'next/link';

// Per-brand CSS corrections for source artwork that doesn't read well on the
// dark gradient cards. Applied only to the named brands; every other logo
// renders untouched.
const LOGO_FIXES = {
  // Navy "CAESARS" wordmark is near-invisible on the dark card.
  caesars: 'brightness-200 contrast-125',
  // Source mark is much smaller than the others.
  'bally-bet': 'scale-150'
};

// Transparent-cutout brand marks already shipped in public/images/brands/,
// derived from the source *-betting.svg logos for use on gradient cards.
const BrandLogo = ({ slug, name }) => (
  <img
    src={`/images/brands/${slug}-integrated.png`}
    alt={name}
    className={`h-24 w-auto max-w-[75%] object-contain ${LOGO_FIXES[slug] || ''}`}
  />
);

export default function SportsbookDirectoryFinal() {
  const sportsbooks = [
    {
      name: "Hard Rock Bet",
      slug: "hard-rock-bet",
      description: "Official sportsbook of Hard Rock. Bet on sports with confidence.",
      gradient: "bg-gradient-to-br from-[#2a0845] via-black/80 to-black",
      logo: "HARD ROCK BET"
    },
    {
      name: "DraftKings Sportsbook",
      slug: "draftkings",
      description: "The leader in daily fantasy and sports betting.",
      gradient: "bg-gradient-to-br from-[#0f3b21] via-black/80 to-black",
      logo: "DRAFT KINGS"
    },
    {
      name: "FanDuel Sportsbook",
      slug: "fanduel",
      description: "America's #1 sportsbook and trusted betting experience.",
      gradient: "bg-gradient-to-br from-[#0f2027] via-[#111928] to-black",
      logo: "FANDUEL"
    },
    {
      name: "BetMGM Sportsbook",
      slug: "betmgm",
      description: "Established sportsbook combining casino and sports promotions.",
      gradient: "bg-gradient-to-br from-[#1c1c1c] via-black/90 to-black",
      logo: "BETMGM"
    },
    {
      name: "Caesars Sportsbook",
      slug: "caesars",
      description: "Premium sportsbook with strong brand integration and loyalty benefits.",
      gradient: "bg-gradient-to-br from-[#141814] via-[#101010] to-black",
      logo: "CAESARS"
    },
    {
      name: "Fanatics Sportsbook",
      slug: "fanatics",
      description: "Sportsbook focused on fan engagement and live event experiences.",
      gradient: "bg-gradient-to-br from-[#2a0a0a] via-black/90 to-black",
      logo: "FANATICS"
    },
    {
      name: "bet365 Sportsbook",
      slug: "bet365",
      description: "Global sportsbook known for extensive betting markets and live odds.",
      gradient: "bg-gradient-to-br from-[#002f24] via-[#0a0a0a] to-black",
      logo: "BET365"
    },
    {
      name: "BetRivers Sportsbook",
      slug: "betrivers",
      description: "User-friendly sportsbook with a broad range of sports coverage.",
      gradient: "bg-gradient-to-b from-[#d3d9e0] via-[#4a5568] to-[#050505]",
      logo: "BETRIVERS"
    },
    {
      name: "ESPN BET",
      slug: "espn-bet",
      description: "Sports media-led sportsbook experience with modern betting tools.",
      gradient: "bg-gradient-to-br from-[#0f172a] via-black/90 to-black",
      logo: "ESPN BET"
    },
    {
      name: "Bally Bet",
      slug: "bally-bet",
      description: "A streamlined sportsbook tailored to simple, mobile-first wagering.",
      gradient: "bg-gradient-to-br from-[#4a0e17] via-black to-black",
      logo: "BALLY BET"
    }
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans p-6 md:p-10">
      <div className="max-w-[1400px] mx-auto">

        {/* Header Section */}
        <div className="mb-10">
          <p className="text-[#d4af37] text-xs md:text-sm font-extrabold tracking-[0.25em] uppercase mb-4">
            Sports Betting
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">
            Premium sportsbook directory
          </h1>
          <p className="text-gray-400 max-w-3xl text-sm md:text-base leading-relaxed">
            Explore the major sportsbook companies with dedicated profile pages, state availability, and future-ready promo code sections.
          </p>
        </div>

        {/* Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sportsbooks.slice(0, 9).map((book, index) => (
            <div
              key={index}
              className={`relative border border-[#d4af37]/30 rounded-3xl p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:border-[#d4af37]/60 group ${book.gradient}`}
            >
              {/* Badge */}
              <div className="absolute top-5 right-5 border border-[#d4af37]/50 text-[#d4af37] text-xs font-bold px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-sm z-10 tracking-wide">
                Sports Betting
              </div>

              {/* Logo Area */}
              <div className="h-28 md:h-36 w-full flex items-center justify-center mb-8 relative z-10">
                <BrandLogo slug={book.slug} name={book.name} />
              </div>

              {/* Card Content */}
              <div className="relative z-10 flex-grow flex flex-col justify-end">
                <h3 className="text-2xl font-bold mb-3 text-white tracking-tight">
                  {book.name}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed mb-7 flex-grow">
                  {book.description}
                </p>
                <div>
                  <Link href={`/sportsbook/${book.slug}`} className="inline-block border border-[#d4af37]/70 text-[#d4af37] px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#d4af37]/10 transition-colors shadow-lg">
                    View Profile
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Single Centered Bottom Card */}
        <div className="mt-6 flex justify-center">
            <div className={`relative border border-[#d4af37]/30 rounded-3xl p-7 flex flex-col justify-between overflow-hidden shadow-2xl group w-full md:max-w-md ${sportsbooks[9].gradient}`}>
              {/* Badge */}
              <div className="absolute top-5 right-5 border border-[#d4af37]/50 text-[#d4af37] text-xs font-bold px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-sm z-10 tracking-wide">
                Sports Betting
              </div>

              {/* Logo Area */}
              <div className="h-28 md:h-36 w-full flex items-center justify-center mb-8 relative z-10">
                <BrandLogo slug={sportsbooks[9].slug} name={sportsbooks[9].name} />
              </div>

              {/* Card Content */}
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-3 text-white tracking-tight">
                  {sportsbooks[9].name}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed mb-7">
                  {sportsbooks[9].description}
                </p>
                <div className="text-center">
                  <Link href={`/sportsbook/${sportsbooks[9].slug}`} className="inline-block border border-[#d4af37]/70 text-[#d4af37] px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#d4af37]/10 transition-colors shadow-lg">
                    View Profile
                  </Link>
                </div>
              </div>
            </div>
        </div>

      </div>
    </div>
  );
}
