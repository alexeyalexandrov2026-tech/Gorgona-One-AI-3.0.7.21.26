'use client';
import {useLocale} from '../components/LocaleProvider';
import {getHeadoutCopy} from '../../lib/headoutCopy.mjs';
import {HEADOUT_CATALOGUE_URL} from '../../lib/headoutCatalog.mjs';
import {getExperienceSection,EXPERIENCE_SECTION_IDS} from '../../lib/experienceCards.mjs';
import {getExperienceCopy} from '../../lib/experienceCopy.mjs';
import {getViatorCopy,VIATOR_MIAMI} from '../../lib/viatorCatalogue.mjs';
import ExperienceCard from './ExperienceCard';

export default function ExperiencesContent(){
 const locale=useLocale(),copy=getHeadoutCopy(locale),labels=getExperienceCopy(locale),viatorCopy=getViatorCopy(locale);
 const titles={parks:labels.parks,water:labels.water,family:labels.family,nature:labels.nature,boats:labels.boats,'florida-flights':labels.floridaFlights,helicopters:copy.flights};
 const sections=EXPERIENCE_SECTION_IDS.map(id=>({id,title:titles[id],items:getExperienceSection(id)})).filter(section=>section.items.length);
 const firstRegion=new Map();
 for(const section of sections)for(const item of section.items)if(['miami','orlando'].includes(item.region)&&!firstRegion.has(item.region))firstRegion.set(item.region,item.id);
 return <main className="min-w-0 flex-1 pb-10 font-g1sans text-g1-ink">
  <header className="pb-6 pt-8 sm:pt-12">
   <h1 className="g1-display max-w-[22ch] font-g1display text-[clamp(2.5rem,5vw,5rem)] font-medium leading-none">{copy.title}</h1>
   <p className="mt-5 max-w-[65ch] text-lg text-g1-soft">{copy.subtitle}</p>
   <nav aria-label={copy.nav} className="mt-8 flex gap-3 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">{sections.map(section=><a key={section.id} href={'#'+section.id} className="shrink-0 whitespace-nowrap rounded-full border border-g1-rule px-5 py-2 text-sm transition hover:border-g1-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-g1-accent">{section.title}</a>)}</nav>
  </header>
  {sections.map((section,sectionIndex)=><section key={section.id} id={section.id} className="scroll-mt-28 py-7 sm:py-10" aria-labelledby={'heading-'+section.id}>
   <h2 id={'heading-'+section.id} className="mb-7 font-g1display text-4xl sm:text-5xl">{section.title}</h2>
   <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">{section.items.map((item,index)=><ExperienceCard key={item.id} item={item} copy={copy} labels={labels} locale={locale} eager={sectionIndex===0&&index===0} regionAnchor={firstRegion.get(item.region)===item.id?item.region:undefined}/>)}</div>
  </section>)}
  <aside className="mt-8 border-t border-g1-rule py-7 text-sm leading-relaxed text-g1-soft">
   <p>{copy.disclosure}</p><p className="mt-2">{viatorCopy.disclosure}</p>
   <div className="mt-5 flex flex-wrap gap-3"><a href={HEADOUT_CATALOGUE_URL} target="_blank" rel="sponsored noopener noreferrer" className="inline-flex rounded-full border border-g1-rule px-6 py-3 text-g1-ink hover:border-g1-ink">{copy.catalogue} ↗</a><a href={VIATOR_MIAMI.href} target="_blank" rel="sponsored noopener noreferrer" className="inline-flex rounded-full border border-g1-rule px-6 py-3 text-g1-ink hover:border-g1-ink">{viatorCopy.catalogue} ↗</a></div>
  </aside>
 </main>;
}
