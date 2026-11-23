import Link from 'next/link';
import {LocalizedListing} from './LocalizedText';
import DiningPhoto from './dining/DiningPhoto';
import BookingButton from './dining/BookingButton';
import SaveButton from './SaveButton';

// No licensed photo yet: a typographic header in the same frame, so the grid stays even.
function TextHeader({venue}) {
 return <div aria-hidden="true" className="flex aspect-[16/9] items-end justify-between gap-4 rounded-t-[22px] border-b border-g1-rule bg-gradient-to-br from-g1-rule/70 to-transparent p-5 sm:p-6">
  <span className="font-g1display text-7xl leading-none text-g1-ink/80">{venue.name.replace(/^(the|l[’']|le|la|los)\s*/i,'').charAt(0)}</span>
  {venue.neighborhood&&<span className="pb-1 text-end text-[10px] font-medium uppercase tracking-[0.18em] text-g1-soft">{venue.neighborhood}</span>}
 </div>;
}

export function VenueCard({venue,t,styles={},locale='en',handoff}) {
 const kind=venue.category==='restaurant'?t.restaurantsNightlife.restaurants:t.restaurantsNightlife.nightlife;
 const chips=[venue.price,venue.michelin&&handoff?.[venue.michelin]].filter(Boolean);
 return <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-g1-rule bg-g1-card transition-colors hover:border-g1-soft">
  <div className="relative">
   {venue.photo?<DiningPhoto venue={venue} locale={locale}/>:<TextHeader venue={venue}/>}
   <SaveButton overlay href={`/restaurants-nightlife/${venue.slug}`} kind={venue.category==='nightlife'?'nightlife':'dining'} title={venue.name} subtitle={[venue.cuisine,venue.neighborhood].filter(Boolean).join(' · ')} image={venue.image||undefined}/>
  </div>
  <div className="flex flex-1 flex-col p-5 pt-4 sm:p-6 sm:pt-4">
  <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-g1-soft">{kind}</p>
  <h2 className="mb-3 font-g1display text-[clamp(1.65rem,2vw,2.2rem)] leading-tight"><Link prefetch={false} className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" href={`/restaurants-nightlife/${venue.slug}`}>{venue.name}</Link></h2>
  <p className="text-sm text-g1-soft">{[venue.cuisine,venue.neighborhood].filter(Boolean).join(' · ')}</p>
  {handoff&&<BookingButton venue={venue} copy={handoff} compact className="mt-4"/>}
  {chips.length>0&&<ul className="mt-4 flex flex-wrap gap-1.5">{chips.map(chip=><li key={chip} className="rounded-full border border-g1-rule px-2.5 py-1 text-[11px] font-medium text-g1-soft">{chip}</li>)}</ul>}
  <p className="mt-3 text-xs uppercase tracking-wide text-g1-soft">{venue.features.filter(feature=>styles[feature]).map(feature=>styles[feature]).join(' · ')}</p>
  {venue.description&&<p className="mb-6 mt-4 text-[0.95rem] leading-relaxed text-g1-soft"><LocalizedListing itemId={venue.id} source={venue.description}/></p>}
  <Link prefetch={false} className="mt-auto flex min-h-[46px] items-center justify-between border-t border-g1-rule pt-3 text-sm font-medium underline-offset-4 hover:underline" href={`/restaurants-nightlife/${venue.slug}`}>{t.common.viewDetails}<span aria-hidden="true">→</span></Link>
  </div>
 </article>;
}
