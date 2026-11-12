import Link from 'next/link';
import {experienceImageUrl} from '../../lib/experienceCards.mjs';

export default function ExperienceCard({item,copy,labels,locale,eager=false,regionAnchor}){
 const external=item.kind!=='headout';
 const CardLink=external?'a':Link;
 const title=locale==='ru'&&item.titleRu?item.titleRu:item.title;
 const action=item.kind==='official'?(item.ticketLink?labels.officialTickets:labels.official):copy.choose;
 return <article id={'experience-'+item.id} data-supplier={item.supplier} data-section={item.section} className="relative flex h-full min-w-0 scroll-mt-40 flex-col overflow-hidden rounded-2xl border border-g1-rule bg-g1-paper">
  {regionAnchor&&<span id={regionAnchor} className="absolute top-0 scroll-mt-40" aria-hidden="true"/>}
  <CardLink href={item.href} {...(external?{target:'_blank',rel:item.kind==='official'?'noopener noreferrer':'sponsored noopener noreferrer'}:{prefetch:false})} className="group flex flex-1 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-g1-accent">
   <div className="relative aspect-[4/3] overflow-hidden">
    <img src={experienceImageUrl(item)} alt={item.imageAlt||item.title} loading={eager?'eager':'lazy'} fetchPriority={eager?'high':'auto'} decoding="async" width="960" height="720" className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"/>
    {item.illustrative&&<span className="absolute bottom-3 left-3 rounded-full bg-black/75 px-3 py-1 text-[11px] text-white">{labels.illustration}</span>}
   </div>
   <div className="flex min-h-[240px] flex-1 flex-col items-start p-5">
    <h3 className="min-h-[3.6em] font-g1display text-2xl leading-[1.2]">{title}</h3>
    <p className="mb-5 mt-2 text-sm text-g1-soft">{[item.location,item.supplier].filter(Boolean).join(' · ')}</p>
    {item.coasters?.length>0&&<p className="mb-5 text-sm text-g1-soft">{item.coasters.join(' · ')}</p>}
    <span className="mt-auto inline-flex max-w-full items-center gap-3 rounded-full border border-g1-rule px-5 py-2 text-start text-sm leading-snug transition group-hover:border-g1-ink">{action}<span aria-hidden="true">↗</span></span>
   </div>
  </CardLink>
  <div className="flex min-h-8 items-center border-t border-g1-rule px-5 py-2 text-[11px] text-g1-soft">
   {item.imageCredit?<a href={item.imageSource} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{item.imageCredit+' / Unsplash'}</a>:<span>{item.supplier}</span>}
  </div>
 </article>;
}
