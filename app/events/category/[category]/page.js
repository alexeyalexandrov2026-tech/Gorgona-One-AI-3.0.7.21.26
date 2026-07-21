import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerTranslation } from '../../../../lib/serverLocale';
import { EVENT_CATEGORY_GROUPS } from '../../../../lib/mockEventsData';
import {
  getEventCategories,
  getEventCategoryBySlug,
  getAllEvents,
  getEventsByCategory
} from '../../../../lib/eventsData';
import { Reveal, Parallax } from '../../../components/Motion';

export const dynamic = 'force-dynamic';

export default function EventsCategoryPage({ params }) {
  const { category: categoryParam } = params;
  const { t } = getServerTranslation();

  // Determine if we are viewing a group ('sports', 'concerts') or a specific subcategory ('basketball', etc.)
  const group = EVENT_CATEGORY_GROUPS.find(g => g.slug === categoryParam);
  const specificCategory = getEventCategoryBySlug(categoryParam);

  if (!group && !specificCategory) {
    notFound();
  }

  // Get subcategories to display (either all in the group, or siblings of the specific category)
  const currentGroupSlug = group ? group.slug : specificCategory.group;
  const subcategories = getEventCategories().filter(c => c.group === currentGroupSlug);

  // Get events
  let displayedEvents = [];
  if (group) {
    // Show all events for all subcategories in this group
    const validCategorySlugs = new Set(subcategories.map(c => c.slug));
    displayedEvents = getAllEvents().filter(e => validCategorySlugs.has(e.category));
  } else {
    displayedEvents = getEventsByCategory(categoryParam);
  }

  const pageTitle = group ? group.label : specificCategory.label;
  const titleParts = pageTitle.split(' ');
  const firstWord = titleParts[0];
  const restWords = titleParts.slice(1).join(' ');

  return (
    <main className="flex-1 theme-villa">
      {/* ===== Photographic overture ===== */}
      <section className="lux-hero full-bleed -mt-[60px] flex min-h-[70svh] items-end bg-villa-charcoal">
        <div className="lux-hero__bg">
          <Parallax distance={50} className="h-full">
            <img
              src={group && group.slug === 'concerts'
                ? 'https://images.unsplash.com/photo-1540039155732-d68832a8a101?auto=format&fit=crop&w=2400&q=80'
                : 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=2400&q=80'
              }
              alt=""
              className="lux-kenburns h-[115%] w-full object-cover"
            />
          </Parallax>
        </div>
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(180deg,rgba(7,7,7,0.6)_0%,rgba(7,7,7,0.16)_32%,rgba(7,7,7,0.28)_64%,rgba(7,7,7,0.92)_100%)]" />
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(80deg,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.2)_40%,rgba(0,0,0,0)_64%)]" />
        <div className="lux-grain" />

        <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-40 sm:px-6 lg:px-8">
          <Reveal>
            <p className="lux-eyebrow">Events · {group ? 'Categories' : group?.label || 'Tickets'}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-3xl font-display text-5xl font-light leading-[1.02] tracking-tight text-white [text-shadow:0_4px_44px_rgba(0,0,0,0.5)] sm:text-6xl lg:text-7xl">
              {pageTitle}
            </h1>
          </Reveal>
        </div>
      </section>

      {/* ===== The gazette (Villas design) ===== */}
      <section className="full-bleed bg-villa-parchment text-villa-obsidian">
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-28">
          
          {/* Museum tag row */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-villa-obsidian/20 pb-4 font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">
            <span>Vol. 02 — Premium Experiences</span>
            <span>{String(displayedEvents.length).padStart(2, '0')} events</span>
          </div>

          {/* Monumental wordmark */}
          <h2 className="mt-10 select-none font-display font-medium uppercase leading-[0.92] tracking-[-0.02em]">
            <span className="block text-[13.5vw] text-villa-ash/70 lg:text-[10.5rem]">{firstWord}</span>
            {restWords && <span className="block text-[13.5vw] text-villa-charcoal lg:text-[10.5rem]">{restWords}</span>}
          </h2>

          <div className="mt-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <p className="max-w-xl text-base leading-relaxed text-villa-graphite">
              Exclusive VIP access, premium seating, and curated experiences for the world's most sought-after events.
            </p>
          </div>

          {/* Glossy Subcategories - Smaller version of Sportsbooks style but integrated */}
          <div className="mt-12 flex flex-wrap gap-4">
            {subcategories.map((cat) => {
              const isActive = specificCategory && specificCategory.slug === cat.slug;
              return (
                <Link
                  key={cat.slug}
                  href={`/events/category/${cat.slug}`}
                  className={`
                    group relative flex items-center justify-center gap-2 rounded-xl border px-5 py-3
                    transition-all duration-500 ease-out hover:-translate-y-1
                    ${isActive 
                      ? 'border-brand-gold bg-gradient-to-br from-black to-zinc-900 shadow-[0_4px_20px_rgba(212,175,55,0.2)]' 
                      : 'border-villa-obsidian/20 bg-white/40 shadow-sm hover:border-brand-gold hover:bg-black hover:shadow-[0_8px_30px_rgba(212,175,55,0.15)]'}
                  `}
                >
                  <span className="text-xl drop-shadow-md">{cat.icon}</span>
                  <span className={`font-serif text-sm font-medium tracking-wide transition-colors ${isActive ? 'text-brand-gold' : 'text-villa-obsidian group-hover:text-brand-gold'}`}>
                    {cat.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* ===== Event cards — image-first, no chrome (Villas style) ===== */}
          {displayedEvents.length > 0 ? (
            <div className="mt-16 grid gap-x-10 gap-y-16 md:grid-cols-2">
              {displayedEvents.map((item) => (
                <article key={item.id} className="group">
                  <div className="relative block overflow-hidden bg-black">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80'}
                      alt={item.name}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                    />
                    {item.featured && (
                      <span className="absolute left-2.5 top-2.5 rounded-[5px] border border-villa-obsidian bg-white px-2.5 py-1 font-fira text-[0.6rem] font-medium uppercase tracking-[0.183em] text-villa-obsidian">
                        · Featured
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex items-baseline justify-between gap-4">
                    <h3 className="font-display text-[1.35rem] font-medium tracking-tight text-villa-obsidian">
                      {item.name}
                    </h3>
                    <p className="whitespace-nowrap font-fira text-[0.7rem] font-medium uppercase tracking-[0.167em] text-villa-obsidian">
                      {item.priceRange}
                    </p>
                  </div>
                  <p className="mt-1.5 font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">
                    {item.date} · {item.city}, {item.country}
                  </p>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-villa-graphite">{item.description}</p>

                  <div className="mt-5 flex items-center gap-6">
                    <Link
                      href="/partner"
                      className="border-b border-villa-obsidian pb-0.5 font-fira text-[0.66rem] font-medium uppercase tracking-[0.18em] text-villa-obsidian transition-opacity hover:opacity-60"
                    >
                      Book Tickets
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-16 py-20 text-center">
              <p className="font-serif text-xl italic text-villa-graphite">No events found for this category.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
