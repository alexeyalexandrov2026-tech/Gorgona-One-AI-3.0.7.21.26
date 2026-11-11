'use client';
import Link from 'next/link';
import {useLocale} from '../components/LocaleProvider';
import {getHeadoutCopy} from '../../lib/headoutCopy.mjs';
import {getHeadoutCollection,headoutGalleryUrl} from '../../lib/headoutCatalog.mjs';
import {getFloridaParkGuide} from '../../lib/floridaParks.mjs';
import {getExperienceCopy} from '../../lib/experienceCopy.mjs';

export default function HeadoutCollection({item}){
 const locale=useLocale(),copy=getHeadoutCopy(locale),labels=getExperienceCopy(locale),guide=getFloridaParkGuide(item.slug);
 // Resolve the registry entry again; route/query input never becomes a remote URL.
 const gallery=headoutGalleryUrl(getHeadoutCollection(item.slug));
 return <main className="min-w-0 flex-1 pb-10 font-g1sans text-g1-ink">
  <Link href="/experiences" className="mt-6 inline-flex text-sm text-g1-soft hover:text-g1-ink">← {copy.back}</Link>
  <header className="pb-8 pt-8"><h1 className="font-g1display text-[clamp(2.5rem,5vw,5rem)] leading-none">{item.title}</h1><p className="mt-5 max-w-[68ch] text-g1-soft">{copy.availability}</p><a href={item.href} target="_blank" rel="sponsored noopener noreferrer" className="mt-6 inline-flex rounded-full border border-g1-rule px-6 py-3 hover:border-g1-ink">{copy.open} ↗</a></header>
  {guide&&<section className="mb-8 rounded-2xl border border-g1-rule p-5 sm:p-7" aria-labelledby="park-rides">
   <h2 id="park-rides" className="font-g1display text-3xl">{labels.rides}</h2>
   <p className="mt-2 text-sm text-g1-soft">{guide.location}</p>
   {(guide.coasters.length>0||guide.other?.length>0)&&<ul className="mt-5 grid list-inside list-disc gap-x-8 gap-y-2 sm:grid-cols-2">{[...guide.coasters,...(guide.other||[])].map(ride=><li key={ride}>{ride}</li>)}</ul>}
   <a href={guide.source} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex underline underline-offset-4">{labels.official} ↗</a>
   {guide.related?.map(park=><div key={park.href} className="mt-6 border-t border-g1-rule pt-5"><h3 className="font-g1display text-2xl">{park.title}</h3><ul className="mt-3 grid list-inside list-disc gap-x-8 gap-y-2 sm:grid-cols-2">{park.coasters.map(ride=><li key={ride}>{ride}</li>)}</ul><a href={park.href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex underline underline-offset-4">{labels.officialTickets} ↗</a></div>)}
   <p className="mt-5 text-sm leading-relaxed text-g1-soft">{labels.rideNote}</p>
  </section>}
  {gallery?<section aria-label={copy.live}>
   <iframe key={gallery} src={gallery} title={item.title+' — Headout'} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" className="h-[980px] w-full rounded-2xl border border-g1-rule bg-white sm:h-[1050px]"/>
   <p className="mt-4 text-sm text-g1-soft">{copy.fallback} <a href={item.href} target="_blank" rel="sponsored noopener noreferrer" className="underline underline-offset-4">{copy.open} ↗</a></p>
  </section>:<a href={item.href} target="_blank" rel="sponsored noopener noreferrer"><img src={item.image} alt={item.title} width="1200" height="800" className="max-h-[560px] w-full rounded-2xl object-cover"/></a>}
  <p className="mt-8 border-t border-g1-rule pt-6 text-sm text-g1-soft">{copy.disclosure}</p>
 </main>;
}
