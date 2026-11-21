'use client';
import Link from 'next/link';
import {useLocale} from '../components/LocaleProvider';
import {getHeadoutCopy} from '../../lib/headoutCopy.mjs';
import {getExperienceCopy} from '../../lib/experienceCopy.mjs';
import {getViatorCopy,VIATOR_MIAMI} from '../../lib/viatorCatalogue.mjs';
import {getExperienceSection,getViatorExperience} from '../../lib/experienceCards.mjs';

// The same guarded frame as the Headout gallery: the partner's own document,
// able to open its checkout in a new window and nothing more.
const SANDBOX='allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation';
const FRAME='w-full rounded-2xl border border-g1-rule bg-white';

function Widget({src,title,eager=false,className=''}){
 return <iframe key={src} src={src} title={title} loading={eager?'eager':'lazy'} referrerPolicy="strict-origin-when-cross-origin" sandbox={SANDBOX} className={FRAME+' '+className}/>;
}

/**
 * One Viator experience on our own page: Viator's official widget for it,
 * the other Viator offers of its section, and Viator's Miami selection,
 * so a guest sees a list of offers without leaving the site.
 */
export default function ViatorCollection({slug}){
 const locale=useLocale(),copy=getViatorCopy(locale),labels=getExperienceCopy(locale),headout=getHeadoutCopy(locale);
 // Resolve the registry entry again; route input never becomes a remote URL.
 const item=getViatorExperience(slug);
 if(!item)return null;
 const name=card=>locale==='ru'&&card.titleRu?card.titleRu:card.title;
 const titles={parks:labels.parks,water:labels.water,family:labels.family,nature:labels.nature,boats:labels.boats,'florida-flights':labels.floridaFlights,helicopters:headout.flights};
 const more=getExperienceSection(item.section).filter(card=>card.kind==='viator'&&card.slug!==item.slug);
 return <main className="min-w-0 flex-1 pb-10 font-g1sans text-g1-ink">
  <Link href="/exclusive-destinations" className="mt-6 inline-flex text-sm text-g1-soft hover:text-g1-ink">← {labels.exclusiveTitle}</Link>
  <header className="pb-8 pt-8">
   <h1 className="font-g1display text-[clamp(2.5rem,5vw,5rem)] leading-none">{name(item)}</h1>
   <p className="mt-5 max-w-[68ch] text-g1-soft">{copy.availability}</p>
   <a href={item.partnerHref} target="_blank" rel="sponsored noopener noreferrer" className="mt-6 inline-flex rounded-full border border-g1-rule px-6 py-3 hover:border-g1-ink">{copy.open} ↗</a>
  </header>
  <section aria-label={name(item)} className="max-w-xl">
   <Widget src={item.src} title={name(item)+' — Viator'} eager className="h-[520px]"/>
  </section>
  {more.length>0&&<section aria-labelledby="viator-more" className="mt-12">
   <h2 id="viator-more" className="font-g1display text-3xl">{titles[item.section]}</h2>
   <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{more.map(card=><li key={card.slug} data-viator={card.slug}>
    <Widget src={card.src} title={name(card)+' — Viator'} className="h-[520px]"/>
   </li>)}</ul>
  </section>}
  <section aria-labelledby="viator-miami" className="mt-12">
   <h2 id="viator-miami" className="font-g1display text-3xl">{copy.live}</h2>
   <Widget src={VIATOR_MIAMI.src} title={copy.live+' — Viator'} className="mt-6 h-[560px]"/>
   <p className="mt-4 text-sm text-g1-soft">{copy.fallback} <a href={item.partnerHref} target="_blank" rel="sponsored noopener noreferrer" className="underline underline-offset-4">{copy.open} ↗</a></p>
   <a href={VIATOR_MIAMI.href} target="_blank" rel="sponsored noopener noreferrer" className="mt-6 inline-flex rounded-full border border-g1-rule px-6 py-3 hover:border-g1-ink">{copy.catalogue} ↗</a>
  </section>
  <p className="mt-8 border-t border-g1-rule pt-6 text-sm text-g1-soft">{copy.disclosure}</p>
 </main>;
}
