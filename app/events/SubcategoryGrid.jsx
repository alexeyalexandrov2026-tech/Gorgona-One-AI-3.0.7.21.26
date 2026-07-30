import Link from 'next/link';
import { CategoryGlyph } from './CategoryGlyph';

// Per-emblem corrections for source artwork whose framing differs from the
// rest of the set. Everything else renders untouched inside the shared box.
const LOGO_FIXES = {
  // Very wide wordmarks read oversized next to the shield marks.
  ufc: 'max-h-7',
  nascar: 'max-h-6',
  'formula-1': 'max-h-8',
  // Source files carry a lot of internal padding.
  mls: 'scale-110',
  nba: 'max-h-9'
};

const COLUMN_CLASSES = {
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
};

// Compact directory of the subcategories inside one Events pillar. Sits inside
// the existing gazette container on the category page - it replaces the old
// emoji chip row without changing anything around it.
export function SubcategoryGrid({ categories, activeSlug, columns = 6 }) {
  if (!categories.length) return null;

  return (
    <div className={`grid gap-3 ${COLUMN_CLASSES[columns] || COLUMN_CLASSES[6]}`}>
      {categories.map((category) => {
        const isActive = activeSlug === category.slug;

        return (
          <Link
            key={category.slug}
            href={`/events/category/${category.slug}`}
            aria-current={isActive ? 'page' : undefined}
            className={`
              group flex flex-col items-center justify-start gap-3 rounded-2xl border bg-white px-3 py-5
              transition-all duration-500 ease-out hover:-translate-y-1
              ${isActive
                ? 'border-brand-gold shadow-[0_10px_30px_rgba(212,175,55,0.25)]'
                : 'border-villa-obsidian/10 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-brand-gold hover:shadow-[0_14px_34px_rgba(0,0,0,0.12)]'}
            `}
          >
            <span className="flex h-12 w-full items-center justify-center">
              {category.logo ? (
                <img
                  src={category.logo}
                  alt=""
                  aria-hidden="true"
                  className={`max-h-12 w-auto max-w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105 ${LOGO_FIXES[category.slug] || ''}`}
                />
              ) : (
                <CategoryGlyph
                  slug={category.slug}
                  className="h-10 w-10 text-villa-graphite transition-colors duration-500 group-hover:text-villa-obsidian"
                />
              )}
            </span>
            <span
              className={`text-center font-fira text-[0.6rem] font-medium uppercase leading-tight tracking-[0.14em] transition-colors duration-500 ${
                isActive ? 'text-brand-gold' : 'text-villa-ash group-hover:text-villa-obsidian'
              }`}
            >
              {category.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
