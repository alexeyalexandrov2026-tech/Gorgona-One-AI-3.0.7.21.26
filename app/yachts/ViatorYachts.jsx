'use client';
import {useLocale} from '../components/LocaleProvider';
import {getHeadoutCopy} from '../../lib/headoutCopy.mjs';
import {getExperienceCopy} from '../../lib/experienceCopy.mjs';
import {getViatorCopy} from '../../lib/viatorCatalogue.mjs';
import {getViatorYachtCopy} from '../../lib/viatorYachtCopy.mjs';
import {VIATOR_YACHT_CITIES,getViatorYachts} from '../../lib/viatorYachts.mjs';
import ExperienceCard from '../experiences/ExperienceCard';

// Private yacht and boat charters from Viator under the YATR catalogue, grouped
// by city from Key West to Palm Beach. Each card is the same card as on
// /experiences: a sponsored link to Viator with the product's own photo.
export default function ViatorYachts(){
 const locale=useLocale(),copy=getHeadoutCopy(locale),labels=getExperienceCopy(locale),viatorCopy=getViatorCopy(locale),text=getViatorYachtCopy(locale);
 return <section id="viator-yachts" aria-labelledby="viator-yachts-title" className="mt-12 min-w-0 border-t border-g1-rule pt-10">
  <h2 id="viator-yachts-title" className="font-g1display text-4xl sm:text-5xl">{text.title}</h2>
  <p className="mt-4 max-w-[65ch] text-lg text-g1-soft">{text.lead}</p>
  <nav aria-label={text.cities} className="mt-6 flex gap-3 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
   {VIATOR_YACHT_CITIES.map(city=><a key={city.id} href={'#yachts-'+city.id} className="shrink-0 whitespace-nowrap rounded-full border border-g1-rule px-5 py-2 text-sm transition hover:border-g1-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-g1-accent">{`${city.name} · ${getViatorYachts(city.id).length}`}</a>)}
  </nav>
  {VIATOR_YACHT_CITIES.map(city=><div key={city.id} id={'yachts-'+city.id} className="scroll-mt-28 py-7 sm:py-10">
   <h3 className="mb-7 font-g1display text-3xl sm:text-4xl">{city.name}</h3>
   <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">{getViatorYachts(city.id).map(item=><ExperienceCard key={item.id} item={item} copy={copy} labels={labels} locale={locale}/>)}</div>
  </div>)}
  <p className="mt-2 max-w-[85ch] text-[0.82rem] leading-relaxed text-g1-soft">{viatorCopy.disclosure}</p>
 </section>;
}
