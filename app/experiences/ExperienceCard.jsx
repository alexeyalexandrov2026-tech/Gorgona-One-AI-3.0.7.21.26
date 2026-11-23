import Link from 'next/link';
import {experienceImageUrl} from '../../lib/experienceCards.mjs';

export default function ExperienceCard({item,copy,labels,locale,eager=false,regionAnchor,compact=false}){
 // Headout and Viator cards open our own pages with the partner's listing;
 // only the parks' official sites are links out.
 const external=item.kind==='official'||item.direct===true;
 const CardLink=external?'a':Link;
 const title=locale==='ru'&&item.titleRu?item.titleRu:item.title;
 const action=item.kind==='official'?(item.ticketLink?labels.officialTickets:labels.official):copy.choose;
 const imgStyle=item.imagePosition?{objectPosition:item.imagePosition}:undefined;
 return <article id={'experience-'+item.id} data-supplier={item.supplier} data-section={item.section} className={`relative flex h-full min-w-0 scroll-mt-40 flex-col overflow-hidden border border-g1-rule bg-g1-paper ${compact?'rounded-xl':'rounded-2xl'}`}>
  {regionAnchor&&<span id={regionAnchor} className="absolute top-0 scroll-mt-40" aria-hidden="true"/>}
  <CardLink href={item.href} {...(external?{target:'_blank',rel:item.direct?'sponsored noopener noreferrer':'noopener noreferrer'}:{prefetch:false})} className="group flex flex-1 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-g1-accent">
   <div className={`relative overflow-hidden ${compact?'aspect-[16/10]':'aspect-[4/3]'}`}>
    <img src={experienceImageUrl(item)} alt={item.imageAlt||item.title} style={imgStyle} loading={eager?'eager':'lazy'} fetchPriority={eager?'high':'auto'} decoding="async" width="960" height="720" className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"/>
    {item.illustrative&&<span className="absolute bottom-3 left-3 rounded-full bg-black/75 px-3 py-1 text-[11px] text-white">{labels.illustration}</span>}
   </div>
   <div className={compact?'flex flex-1 flex-col items-start p-3 sm:p-3.5':'flex min-h-[240px] flex-1 flex-col items-start p-5'}>
    <h3 className={compact?'min-h-[2.4em] font-g1display text-[0.98rem] leading-[1.22] sm:text-[1.12rem]':'min-h-[3.6em] font-g1display text-2xl leading-[1.2]'}>{title}</h3>
    <p className={compact?'mb-2.5 mt-1 text-[11px] text-g1-soft sm:mb-3 sm:mt-1.5 sm:text-xs':'mb-5 mt-2 text-sm text-g1-soft'}>{[item.location,item.supplier].filter(Boolean).join(' · ')}</p>
    {item.coasters?.length>0&&<p className="mb-5 text-sm text-g1-soft">{item.coasters.join(' · ')}</p>}
    <span className={`mt-auto inline-flex max-w-full items-center gap-2 rounded-full border border-g1-rule text-start leading-snug transition group-hover:border-g1-ink ${compact?'px-3 py-1 text-[11px] sm:px-3.5 sm:py-1.5 sm:text-xs':'gap-3 px-5 py-2 text-sm'}`}>{action}<span aria-hidden="true">↗</span></span>
   </div>
  </CardLink>
  <div className={`flex items-center border-t border-g1-rule text-[10px] text-g1-soft sm:text-[11px] ${compact?'min-h-6 px-3 py-1 sm:px-3.5':'min-h-8 px-5 py-2'}`}>
   {item.imageCredit&&item.imageSource?.startsWith('https://unsplash.com/')?<a href={item.imageSource} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{item.imageCredit+' / Unsplash'}</a>:<span>{item.imageCredit?'Photo: '+item.imageCredit:item.supplier}</span>}
  </div>
 </article>;
}
