import DiningPhoto from '../dining/DiningPhoto';
import BookingButton from '../dining/BookingButton';
import {LocalizedText} from '../LocalizedText';
import {getDiningCopy,getDiningStyles,getDiningHandoffCopy} from '../../../lib/dining/copy.mjs';
import {getServerLocale} from '../../../lib/serverLocale';
import Link from 'next/link';
import { VENUE_CATEGORIES } from '../../../lib/restaurantsNightlifeData';
import {diningCatalogue} from '../../../lib/server/diningCatalogue.mjs';
import {PROVIDERS} from '../../../lib/dining/gateway.mjs';
import {COLLECTIONS,VIBES,MICHELIN_LEVELS} from '../../../lib/dining/editorial.mjs';
import {readDiningParams,filterVenues,diningHref,hasActiveFilters,PRICE_LEVELS} from '../../../lib/dining/filters.mjs';
import { VenueCard } from '../VenueCard';
import { chipClass, eyebrowClass, sectionY } from './ui';

// The dining and nightlife guide. Collections (?collection=) and filters narrow one
// catalogue; every venue leads to its own booking page, never a Miami Elio booking.
export default async function VenueDirectory({ basePath, searchParams, t, eyebrow, title, lede }) {
  const params = readDiningParams(searchParams);
  const active = params.category || 'all';
  const locale = await getServerLocale(), copy = getDiningCopy(locale), styles = getDiningStyles(locale), handoff = getDiningHandoffCopy(locale);
  const verified = (await diningCatalogue(process.env,fetch,{strict:true})).filter(venue=>venue.status==='verified');
  const allVenues = filterVenues(verified, {category:params.category});
  const heroVenue = allVenues.find(venue=>venue.id === (active==='nightlife'?'liv':'komodo')) || allVenues.find(venue=>venue.photo);
  const venues = filterVenues(verified, params);
  const filtered = hasActiveFilters(params);
  const picks = filtered ? [] : allVenues.filter(venue=>venue.conciergePick).slice(0,6);
  const options = field => [...new Set(allVenues.map(venue=>venue[field]).filter(Boolean))].sort();
  const providerIds = new Set(allVenues.flatMap(venue=>venue.channels.map(channel=>channel.provider)).filter(id=>id!=='venue'));
  const providers = PROVIDERS.filter(provider=>providerIds.has(provider.id));
  const fieldClass = 'min-h-[46px] w-full min-w-0 rounded-xl border border-g1-rule bg-g1-card px-3 text-base text-g1-ink';
  const filters = [['all', t.restaurantsNightlife.all], ...VENUE_CATEGORIES.map((c) => [c.slug, c.slug === 'restaurant' ? t.restaurantsNightlife.restaurants : t.restaurantsNightlife.nightlife])];
  const advanced = Boolean(params.cuisine||params.experience||params.provider||params.price||params.vibe||params.michelin);

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <header className="grid items-center gap-6 pb-8 pt-[clamp(24px,4vw,56px)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
       <div className="grid min-w-0 content-center gap-4">
        <p className={eyebrowClass}>{eyebrow}</p>
        <h1 className="g1-display font-g1display text-[clamp(2.1rem,3vw+1rem,4rem)] font-medium leading-none tracking-[-0.015em] text-g1-ink [text-wrap:balance]">{title}</h1>
        <p className="max-w-[60ch] text-[1.08rem] text-g1-soft">{lede}</p>
        <nav aria-label={eyebrow} className="flex flex-wrap gap-2">
          {filters.map(([slug, label]) => (
            <Link
              key={slug}
              href={diningHref(basePath, params, {category: slug === 'all' ? '' : slug})}
              scroll={false}
              aria-current={slug === active ? 'page' : undefined}
              className={chipClass}
            >
              {label}
            </Link>
          ))}
        </nav>
       </div>
       {heroVenue&&<DiningPhoto venue={heroVenue} locale={locale} hero priority/>}
      </header>

      <nav aria-label={handoff.collections} className="mb-6 grid gap-3">
        <p className={eyebrowClass}>{handoff.collections}</p>
        <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {COLLECTIONS.map(collection => (
            <li key={collection} className="shrink-0">
              <Link
                href={diningHref(basePath, params, {collection: params.collection === collection ? '' : collection})}
                scroll={false}
                aria-current={params.collection === collection ? 'page' : undefined}
                className={chipClass}
              >
                {handoff[collection]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {picks.length>0&&<section aria-labelledby="concierge-picks" className="mb-8 grid gap-4 rounded-[22px] border border-g1-rule p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="concierge-picks" className="font-g1display text-2xl">{handoff.conciergePicks}</h2>
          <p className="text-xs text-g1-soft">{handoff.picksNote}</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map(venue => (
            <li key={venue.id} className="grid min-w-0 content-start gap-2 border-t border-g1-rule pt-4">
              <Link prefetch={false} href={`/restaurants-nightlife/${venue.slug}`} className="font-g1display text-xl leading-tight underline-offset-4 hover:underline">{venue.name}</Link>
              <p className="text-sm text-g1-soft">{[venue.cuisine,venue.neighborhood,venue.price].filter(Boolean).join(' · ')}</p>
              <BookingButton venue={venue} copy={handoff} compact/>
            </li>
          ))}
        </ul>
      </section>}

      <form action={basePath} className="mb-8 grid gap-4 rounded-[22px] border border-g1-rule p-5 sm:grid-cols-2 lg:grid-cols-3">
        {params.category&&<input type="hidden" name="category" value={params.category}/>}
        {params.collection&&<input type="hidden" name="collection" value={params.collection}/>}
        <label className="grid gap-2 text-sm">{copy.search}<input className={fieldClass} type="search" name="q" maxLength={120} defaultValue={params.q}/></label>
        <label className="grid gap-2 text-sm">{copy.neighborhood}<select className={fieldClass} name="neighborhood" defaultValue={params.neighborhood}><option value="">{copy.all}</option>{options('neighborhood').map(item=><option key={item} value={item}>{item}</option>)}</select></label>
        <button type="submit" className="min-h-[46px] self-end rounded-full bg-g1-ink px-5 text-g1-paper">{copy.search}</button>
        <details className="min-w-0 border-t border-g1-rule pt-3 sm:col-span-2 lg:col-span-3" open={advanced}>
         <summary className="min-h-[36px] cursor-pointer text-sm font-medium text-g1-soft">{copy.filters}</summary>
         <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-2 text-sm">{handoff.price}<select className={fieldClass} name="price" defaultValue={params.price}><option value="">{copy.all}</option>{PRICE_LEVELS.map(level=><option key={level} value={level}>{level}</option>)}</select></label>
          <label className="grid gap-2 text-sm">{handoff.vibe}<select className={fieldClass} name="vibe" defaultValue={params.vibe}><option value="">{copy.all}</option>{VIBES.map(vibe=><option key={vibe} value={vibe}>{handoff[vibe]}</option>)}</select></label>
          <label className="grid gap-2 text-sm">{handoff.michelinGuide}<select className={fieldClass} name="michelin" defaultValue={params.michelin}><option value="">{copy.all}</option>{MICHELIN_LEVELS.map(level=><option key={level} value={level}>{handoff[level]}</option>)}</select></label>
          <label className="grid gap-2 text-sm">{copy.cuisine}<select className={fieldClass} name="cuisine" defaultValue={params.cuisine}><option value="">{copy.all}</option>{options('cuisine').map(item=><option key={item} value={item}>{item}</option>)}</select></label>
          <label className="grid gap-2 text-sm">{copy.style}<select className={fieldClass} name="experience" defaultValue={params.experience}><option value="">{copy.all}</option>{Object.entries({...styles,vip:copy.vip,private:copy.private}).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm">{copy.channels}<select className={fieldClass} name="provider" defaultValue={params.provider}><option value="">{copy.all}</option>{providers.map(provider=><option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>
         </div>
        </details>
        {filtered&&<Link href={diningHref(basePath,{category:params.category})} scroll={false} className="w-fit border-b border-g1-rule pb-0.5 text-sm text-g1-soft sm:col-span-2 lg:col-span-3">{handoff.clear}</Link>}
      </form>
      <section className={`border-t border-g1-rule ${sectionY}`}>
        {!venues.length&&<p role="status" className="py-8 text-g1-soft">{copy.empty}</p>}
        <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => <VenueCard key={venue.id} venue={venue} t={t} styles={styles} locale={locale} handoff={handoff}/>)}
        </div>
        <aside className="mt-10 grid gap-3 border-t border-g1-rule pt-6"><h2 className="font-g1display text-2xl"><LocalizedText source="Eatwith"/></h2><p className="max-w-[65ch] text-sm text-g1-soft">{copy.handoff}</p><a href="https://www.eatwith.com/" target="_blank" rel="noopener noreferrer" className="w-fit border-b border-g1-rule pb-1 text-sm">{copy.continue}</a></aside>
      </section>
    </main>
  );
}
