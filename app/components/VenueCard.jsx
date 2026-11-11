import Link from 'next/link';
import {LocalizedListing} from './LocalizedText';
import DiningPhoto from './dining/DiningPhoto';
import SaveButton from './SaveButton';
export function VenueCard({venue,t,styles={},locale='en'}) {
 const kind=venue.category==='restaurant'?t.restaurantsNightlife.restaurants:t.restaurantsNightlife.nightlife;
 return <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-g1-rule bg-g1-card transition-colors hover:border-g1-soft">
  <div className="relative"><DiningPhoto venue={venue} locale={locale}/><SaveButton overlay href={`/restaurants-nightlife/${venue.slug}`} title={venue.name} image={venue.photo?.src}/></div>
  <div className="flex flex-1 flex-col p-5 pt-4 sm:p-6 sm:pt-4">
  <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-g1-soft">{kind}</p>
  <h2 className="mb-3 font-g1display text-[clamp(1.65rem,2vw,2.2rem)] leading-tight"><Link className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" href={`/restaurants-nightlife/${venue.slug}`}>{venue.name}</Link></h2>
  <p className="text-sm text-g1-soft">{[venue.cuisine,venue.neighborhood].filter(Boolean).join(' · ')}</p>
  <p className="mt-3 text-xs uppercase tracking-wide text-g1-soft">{venue.features.filter(feature=>styles[feature]).map(feature=>styles[feature]).join(' · ')}</p>
  <p className="mb-6 mt-4 text-[0.95rem] leading-relaxed text-g1-soft"><LocalizedListing itemId={venue.id} source={venue.description}/></p>
  <Link className="mt-auto flex min-h-[46px] items-center justify-between border-t border-g1-rule pt-3 text-sm font-medium underline-offset-4 hover:underline" href={`/restaurants-nightlife/${venue.slug}`}>{t.common.viewDetails}<span aria-hidden="true">↗</span></Link>
  </div>
 </article>;
}
