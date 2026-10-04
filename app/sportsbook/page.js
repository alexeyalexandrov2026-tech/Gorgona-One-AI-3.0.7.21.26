import React from 'react';
import Link from 'next/link';
import GamblingNotice, { SportsbookAvailability } from '../components/GamblingNotice';
import { SPORTSBOOK_DIRECTORY } from '../../lib/sportsbookDirectory';
import { getServerLocale } from '../../lib/serverLocale';

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
// theScore Bet has no licensed artwork in the repo yet, so its name is set
// in type rather than borrowing another brand's mark.
const NO_ARTWORK = new Set(['thescore-bet']);

const BrandLogo = ({ slug, name }) => NO_ARTWORK.has(slug) ? (
  <span className="text-4xl font-extrabold tracking-tight text-white">{name}</span>
) : (
  <img
    src={`/images/brands/${slug}-integrated.png`}
    alt={name}
    className={`h-24 w-auto max-w-[75%] object-contain ${LOGO_FIXES[slug] || ''}`}
  />
);

export default function SportsbookDirectoryFinal() {
  const sportsbooks = SPORTSBOOK_DIRECTORY;
  const locale = getServerLocale();

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
            Explore the major sportsbook companies with dedicated profile pages, where-it-is-legal sources, and future-ready promo code sections.
          </p>
          <GamblingNotice locale={locale} className="mt-6 max-w-3xl" />
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
                <SportsbookAvailability slug={book.slug} locale={locale} className="-mt-4 mb-6" />
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
                <SportsbookAvailability slug={sportsbooks[9].slug} locale={locale} className="-mt-4 mb-6" />
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
