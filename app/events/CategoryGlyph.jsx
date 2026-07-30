// Line glyphs for the Events subcategories that do not ship an official
// emblem in public/images/events/leagues (every concert genre, plus Boxing
// and Other Leagues). Drawn on a 24x24 grid with `currentColor` strokes so a
// tile can tint them the same way it tints its label.

const GLYPHS = {
  // ---- Sports ----
  boxing: (
    <>
      <path d="M6.4 9A4.6 4.6 0 0 1 11 4.4h3.1a4.4 4.4 0 0 1 4.4 4.4v2.4a3.4 3.4 0 0 1-3.4 3.4H9.8a3.4 3.4 0 0 1-3.4-3.4z" />
      <path d="M6.4 12.4h-.9a2.1 2.1 0 0 1 0-4.2h.9" />
      <path d="M8.4 14.6v3.1a1.9 1.9 0 0 0 1.9 1.9h4.1a1.9 1.9 0 0 0 1.9-1.9v-3.1" />
      <path d="M8.4 17.2h7.9" />
    </>
  ),
  'other-leagues': (
    <>
      <path d="M8 4h8v5.2a4 4 0 0 1-8 0z" />
      <path d="M8 5.8H5.6a2.6 2.6 0 0 0 2.6 4.6M16 5.8h2.4a2.6 2.6 0 0 1-2.6 4.6" />
      <path d="M12 13.2V16" />
      <path d="M9.6 20l.5-4h3.8l.5 4z" />
      <path d="M8.4 20h7.2" />
    </>
  ),

  // ---- Concerts & live shows ----
  'pop-rock': (
    <>
      <path d="M12 8.4c-2.4 0-3.9 1.4-3.9 3s.6 1.6.6 2.2c0 .8-1.3 1.4-1.3 3.4 0 2.4 2 4.4 4.6 4.4s4.6-2 4.6-4.4c0-2-1.3-2.6-1.3-3.4 0-.6.6-1.2.6-2.2 0-1.6-1.5-3-3.9-3z" />
      <circle cx="12" cy="15.2" r="1.6" />
      <path d="M10.9 8.4V3.8h2.2v4.6" />
      <path d="M10.1 3.8h3.8V2.2h-3.8z" />
      <path d="M10.2 18.6h3.6" />
    </>
  ),
  'hip-hop-rnb': (
    <>
      <rect x="2.4" y="4.8" width="19.2" height="14.4" rx="2" />
      <circle cx="9.6" cy="12" r="4.6" />
      <circle cx="9.6" cy="12" r="1.3" />
      <path d="M18.2 7.6v5l-2.4 2.6" />
    </>
  ),
  'jazz-blues': (
    <>
      <path d="M2.9 11.2v3.2" />
      <path d="M2.9 12.8h10.9" />
      <path d="M13.8 8.8v8l6.4 2.8V6z" />
      <path d="M6.6 12.8V8.6M9.4 12.8V8.6M12.2 12.8V8.6" />
    </>
  ),
  'electronic-edm': (
    <>
      <path d="M6 3.6v16.8M12 3.6v16.8M18 3.6v16.8" />
      <circle cx="6" cy="9" r="1.9" />
      <circle cx="12" cy="15" r="1.9" />
      <circle cx="18" cy="7.4" r="1.9" />
    </>
  ),
  'classical-opera': (
    <>
      <rect x="3" y="5.4" width="18" height="13.2" rx="2" />
      <path d="M8.2 5.4v7.6M12 5.4v7.6M15.8 5.4v7.6" />
      <path d="M3 13h18" />
    </>
  ),
  country: (
    <>
      <path d="M6.6 13.4c0-4.4.7-7.6 2.2-7.6.9 0 1.5.7 3.2.7s2.3-.7 3.2-.7c1.5 0 2.2 3.2 2.2 7.6" />
      <path d="M3 14.2c2.3 1.8 5.5 2.8 9 2.8s6.7-1 9-2.8c0 2.5-4 4.4-9 4.4s-9-1.9-9-4.4z" />
    </>
  ),
  'comedy-standup': (
    <>
      <rect x="9" y="2.6" width="6" height="9.4" rx="3" />
      <path d="M5.8 11a6.2 6.2 0 0 0 12.4 0" />
      <path d="M12 17.2v3.2M8.4 20.4h7.2" />
    </>
  ),
  'theater-broadway': (
    <>
      <path d="M2.4 3.4h19.2" />
      <path d="M6.6 3.4c0 7.4-2.2 9.4-2.2 16.2h5.2c1.1-6.2 1.1-11.6 1.1-16.2" />
      <path d="M17.4 3.4c0 7.4 2.2 9.4 2.2 16.2h-5.2c-1.1-6.2-1.1-11.6-1.1-16.2" />
      <path d="M12 3.4v16.2" />
    </>
  ),
  festivals: (
    <>
      <path d="M12 2.4v3.2" />
      <path d="M3 20.4 12 5.8l9 14.6z" />
      <path d="M9 20.4c0-3.2 1.3-5.2 3-5.2s3 2 3 5.2" />
    </>
  ),
  'other-live': (
    <>
      <path d="M3.2 9.2V7.4a1.2 1.2 0 0 1 1.2-1.2h15.2a1.2 1.2 0 0 1 1.2 1.2v1.8a2.8 2.8 0 0 0 0 5.6v1.8a1.2 1.2 0 0 1-1.2 1.2H4.4a1.2 1.2 0 0 1-1.2-1.2v-1.8a2.8 2.8 0 0 0 0-5.6z" />
      <path d="M14.4 6.2v11.6" strokeDasharray="2 2.2" />
    </>
  )
};

export function hasGlyph(slug) {
  return Boolean(GLYPHS[slug]);
}

export function CategoryGlyph({ slug, className }) {
  const glyph = GLYPHS[slug];
  if (!glyph) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {glyph}
    </svg>
  );
}
