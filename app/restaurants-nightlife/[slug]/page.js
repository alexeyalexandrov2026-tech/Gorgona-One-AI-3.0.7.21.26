import DiningPhoto from '../../components/dining/DiningPhoto';
import {LocalizedListing} from '../../components/LocalizedText';
import {notFound} from 'next/navigation';
import {diningVenue} from '../../../lib/server/diningCatalogue.mjs';
import {getServerTranslation} from '../../../lib/serverLocale';
import {fill} from '../../../lib/homeCopy';
import AskButton from '../../components/g1/AskButton';
import {Crumbs,Specs,eyebrowClass,btn} from '../../components/g1/ui';
import DiningBooking from '../../components/dining/DiningBooking';
import BookingButton from '../../components/dining/BookingButton';
import {getDiningCopy,getDiningStyles,getDiningHandoffCopy} from '../../../lib/dining/copy.mjs';
import {configuredManagerTelegram} from '../../../lib/managerContact.mjs';
import {pageMetadata,breadcrumbJsonLd,venueJsonLd} from '../../../lib/seo.mjs';
import JsonLd from '../../components/JsonLd';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}) {
 const {slug}=await params;
 // A catalogue outage renders the page's own error; metadata just stays generic.
 const venue=await diningVenue(slug,process.env,fetch,{strict:true}).catch(()=>null);
 if(!venue)return {};
 const place=[venue.cuisine,venue.neighborhood].filter(Boolean).join(', ');
 return pageMetadata({title:`${venue.name}${venue.neighborhood?` in ${venue.neighborhood}`:''}, Miami`,description:venue.description||`${venue.name}${place?` (${place})`:''}: book directly with the venue.`,path:`/restaurants-nightlife/${venue.slug}`});
}

/** Price, MICHELIN and atmosphere, only where the catalogue has them. */
function venueSpecs(venue,handoff){
 const michelin=venue.michelin?[handoff[venue.michelin],venue.greenStar?handoff.green:null].filter(Boolean).join(' · '):null;
 return [
  venue.price&&[handoff.price,venue.price],
  michelin&&[handoff.michelinGuide,michelin],
  venue.vibe?.length&&[handoff.vibe,venue.vibe.map(vibe=>handoff[vibe]).join(' · ')]
 ].filter(Boolean);
}

export default async function VenueDetailPage({params}) {
 const venue=await diningVenue((await params).slug,process.env,fetch,{strict:true});
 if(!venue)notFound();
 const {t,locale}=await getServerTranslation();
 const dining=getDiningCopy(locale),styles=getDiningStyles(locale),handoff=getDiningHandoffCopy(locale);
 const kind=venue.category==='restaurant'?t.restaurantsNightlife.restaurants:t.restaurantsNightlife.nightlife;
 const telegram=configuredManagerTelegram();
 const requestsEnabled=process.env.DINING_REQUESTS_ENABLED==='true'&&process.env.DINING_SCHEMA_ENABLED==='true';
 return <main className="flex-1 font-g1sans text-g1-ink">
  <JsonLd data={[breadcrumbJsonLd([{name:t.restaurantsNightlife.pill,path:'/restaurants-nightlife'},{name:venue.name,path:`/restaurants-nightlife/${venue.slug}`}]),venueJsonLd(venue)]}/>
  <Crumbs items={[[t.restaurantsNightlife.pill,'/restaurants-nightlife'],[venue.name]]}/>
  <DiningPhoto venue={venue} locale={locale} hero priority wide/>
  <div className="grid items-start gap-[clamp(24px,4vw,56px)] py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
   <div className="grid min-w-0 gap-5">
    <p className={eyebrowClass}>{kind}</p>
    <h1 className="font-g1display text-[clamp(2rem,2.4vw+1rem,3.3rem)] font-medium leading-[1.04] tracking-[-0.015em]">{venue.name}</h1>
    {venue.status==='verified'&&<p className="text-[1.05rem] leading-relaxed text-g1-soft"><LocalizedListing itemId={venue.id} source={venue.description}/></p>}
    <p className="text-g1-soft">{venue.address||venue.location}</p>
    <p className="text-sm text-g1-soft">{venue.features.filter(feature=>styles[feature]).map(feature=>styles[feature]).join(' · ')}</p>
    <Specs items={[[t.restaurantsNightlife.location,venue.neighborhood||venue.location],[t.category.categoryLabel,kind],...venueSpecs(venue,handoff)]}/>
    {venue.michelinSource&&<a href={venue.michelinSource} target="_blank" rel="noopener noreferrer" className="w-fit border-b border-g1-rule pb-0.5 text-xs text-g1-soft">{handoff.michelinGuide}<span aria-hidden="true"> ↗</span><span className="sr-only"> ({handoff.newTab})</span></a>}
   </div>
   {venue.status==='verified'?<section aria-labelledby="booking-options" className="grid min-w-0 gap-5 rounded-[22px] border border-g1-rule bg-g1-card p-5 sm:p-6">
    <h2 id="booking-options" className="font-g1display text-2xl">{dining.channels}</h2>
    <BookingButton venue={venue} copy={handoff}/>
    <div className="flex flex-wrap gap-2 border-t border-g1-rule pt-5">
     {telegram&&<a href={telegram} target="_blank" rel="noopener noreferrer" className={`${btn.base} ${btn.ghost} ${btn.sm}`}>{handoff.askTelegram}<span aria-hidden="true">↗</span><span className="sr-only">({handoff.newTab})</span></a>}
     <AskButton variant="ghost" className={btn.sm} prompt={fill(handoff.askPrompt,{name:venue.name})}>{handoff.askAi}</AskButton>
    </div>
    {requestsEnabled&&<DiningBooking venue={{slug:venue.slug,name:venue.name,category:venue.category,features:venue.features}}/>}
   </section>:<p role="status" className="rounded-[22px] border border-g1-rule p-5">{dining.held}</p>}
  </div>
 </main>;
}
