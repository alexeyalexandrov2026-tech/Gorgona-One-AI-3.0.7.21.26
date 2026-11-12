import {getDiningPhotoCopy} from '../../../lib/dining/copy.mjs';

/** Source, copyright licence and editorial/venue distinction remain attached to every image. */
export default function DiningPhoto({venue,locale='en',priority=false,hero=false,wide=false}) {
 const photo=venue.photo;
 if(!photo)return null;
 const copy=getDiningPhotoCopy(locale),label=photo.kind==='venue'?copy.venue:copy.editorial;
 return <figure className="min-w-0">
  <div className={`relative overflow-hidden ${hero?(wide?'aspect-[16/11] rounded-[24px] sm:aspect-[21/9]':'aspect-[16/11] rounded-[24px] sm:aspect-[16/10]'):'aspect-[16/11] rounded-t-[22px]'} bg-g1-rule`}>
   <img src={photo.src} alt={photo.kind==='venue'?venue.name:copy.editorial} width="1200" height="825" loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100"/>
   <span className="absolute bottom-3 start-3 max-w-[calc(100%-24px)] rounded-full bg-black/70 px-3 py-1.5 text-[10px] font-medium leading-tight tracking-wide text-white">{label}</span>
  </div>
  <figcaption className={`flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-[10px] leading-relaxed text-g1-soft ${hero?'pt-2':'px-5 pt-2 sm:px-6'}`}>
   <a href={photo.source} target="_blank" rel="noopener noreferrer" aria-label={copy.credits} className="break-words underline decoration-current/30 underline-offset-2">{photo.author}</a>
   <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-current/30 underline-offset-2">{photo.license}</a>
   {photo.license.startsWith('CC ')&&<span>{copy.crop}</span>}
  </figcaption>
 </figure>;
}
