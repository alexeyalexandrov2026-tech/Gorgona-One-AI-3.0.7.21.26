import DiningPhoto from '../dining/DiningPhoto';
import {LocalizedText} from '../LocalizedText';
import {getDiningCopy,getDiningStyles} from '../../../lib/dining/copy.mjs';
import {getServerLocale} from '../../../lib/serverLocale';
import Link from 'next/link';
import { VENUE_CATEGORIES } from '../../../lib/restaurantsNightlifeData';
import {diningCatalogue} from '../../../lib/server/diningCatalogue.mjs';
import { VenueCard } from '../VenueCard';
import { chipClass, eyebrowClass, sectionY } from './ui';

// The dining and nightlife guide, filtered by ?category=. It is shown at
// /restaurants-nightlife and as the Restaurants category of Stores.
export default async function VenueDirectory({ basePath, searchParams, t, eyebrow, title, lede }) {
  const active = ['restaurant', 'nightlife'].includes(searchParams?.category) ? searchParams.category : 'all';
  const locale = await getServerLocale(), copy = getDiningCopy(locale), styles = getDiningStyles(locale);
  const allVenues = (await diningCatalogue(process.env,fetch,{strict:true})).filter(venue=>venue.status==='verified'&&(active==='all'||venue.category===active));
  const heroVenue = allVenues.find(venue=>venue.id === (active==='nightlife'?'liv':'komodo')) || allVenues[0];
  const text = typeof searchParams?.q === 'string' ? searchParams.q.slice(0,120).trim().toLocaleLowerCase() : '';
  const neighborhood = typeof searchParams?.neighborhood === 'string' ? searchParams.neighborhood : '';
  const cuisine = typeof searchParams?.cuisine === 'string' ? searchParams.cuisine : '';
  const experience = typeof searchParams?.experience === 'string' ? searchParams.experience : '';
  const provider = typeof searchParams?.provider === 'string' ? searchParams.provider : '';
  const venues = allVenues.filter(venue => (!text || [venue.name,venue.neighborhood,venue.cuisine].join(' ').toLocaleLowerCase().includes(text))
    && (!neighborhood || venue.neighborhood === neighborhood) && (!cuisine || venue.cuisine === cuisine)
    && (!experience || venue.features.includes(experience)) && (!provider || venue.channels.some(channel=>channel.provider===provider)));
  const options = field => [...new Set(allVenues.map(venue=>venue[field]).filter(Boolean))].sort();
  const fieldClass = 'min-h-[46px] w-full min-w-0 rounded-xl border border-g1-rule bg-g1-card px-3 text-base text-g1-ink';
  const filters = [['all', t.restaurantsNightlife.all], ...VENUE_CATEGORIES.map((c) => [c.slug, c.slug === 'restaurant' ? t.restaurantsNightlife.restaurants : t.restaurantsNightlife.nightlife])];

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
              href={slug === 'all' ? basePath : `${basePath}?category=${slug}`}
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

      <form action={basePath} className="mb-8 grid gap-4 rounded-[22px] border border-g1-rule p-5 sm:grid-cols-2 lg:grid-cols-3">
        {active!=='all'&&<input type="hidden" name="category" value={active}/>}
        <label className="grid gap-2 text-sm">{copy.search}<input className={fieldClass} type="search" name="q" maxLength={120} defaultValue={text}/></label>
        <label className="grid gap-2 text-sm">{copy.neighborhood}<select className={fieldClass} name="neighborhood" defaultValue={neighborhood}><option value="">{copy.all}</option>{options('neighborhood').map(item=><option key={item} value={item}>{item}</option>)}</select></label>
        <button type="submit" className="min-h-[46px] self-end rounded-full bg-g1-ink px-5 text-g1-paper">{copy.search}</button>
        <details className="min-w-0 border-t border-g1-rule pt-3 sm:col-span-2 lg:col-span-3" open={Boolean(cuisine||experience||provider)}>
         <summary className="min-h-[36px] cursor-pointer text-sm font-medium text-g1-soft">{copy.filters}</summary>
         <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-2 text-sm">{copy.cuisine}<select className={fieldClass} name="cuisine" defaultValue={cuisine}><option value="">{copy.all}</option>{options('cuisine').map(item=><option key={item} value={item}>{item}</option>)}</select></label>
          <label className="grid gap-2 text-sm">{copy.style}<select className={fieldClass} name="experience" defaultValue={experience}><option value="">{copy.all}</option>{Object.entries({...styles,vip:copy.vip,private:copy.private}).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm">{copy.channels}<select className={fieldClass} name="provider" defaultValue={provider}><option value="">{copy.all}</option>{[['opentable','OpenTable'],['sevenrooms','SevenRooms'],['discotech','Discotech'],['tablelistpro','TablelistPro']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
         </div>
        </details>
      </form>
      <section className={`border-t border-g1-rule ${sectionY}`}>
        {!venues.length&&<p role="status" className="py-8 text-g1-soft">{copy.empty}</p>}
        <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => <VenueCard key={venue.id} venue={venue} t={t} styles={styles} locale={locale}/>)}
        </div>
        <aside className="mt-10 grid gap-3 border-t border-g1-rule pt-6"><h2 className="font-g1display text-2xl"><LocalizedText source="Eatwith"/></h2><p className="max-w-[65ch] text-sm text-g1-soft">{copy.handoff}</p><a href="https://www.eatwith.com/" target="_blank" rel="noopener noreferrer" className="w-fit border-b border-g1-rule pb-1 text-sm">{copy.continue}</a></aside>
      </section>
    </main>
  );
}
