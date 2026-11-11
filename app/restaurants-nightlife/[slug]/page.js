import DiningPhoto from '../../components/dining/DiningPhoto';
import {LocalizedListing} from '../../components/LocalizedText';
import {notFound} from 'next/navigation';
import {diningVenue} from '../../../lib/server/diningCatalogue.mjs';
import {getServerTranslation} from '../../../lib/serverLocale';
import {getDealsCopy} from '../../../lib/dealsCopy';
import {fill} from '../../../lib/homeCopy';
import AskButton from '../../components/g1/AskButton';
import SaveButton from '../../components/SaveButton';
import {Crumbs,Specs,eyebrowClass} from '../../components/g1/ui';
import DiningBooking from '../../components/dining/DiningBooking';
import {channelsFor,PROVIDERS} from '../../../lib/dining/gateway.mjs';
import {getDiningCopy,getDiningStyles} from '../../../lib/dining/copy.mjs';

export const dynamic = 'force-dynamic';
export default async function VenueDetailPage({params}) {
 const venue=await diningVenue((await params).slug,process.env,fetch,{strict:true});
 if(!venue)notFound();
 const {t,locale}=await getServerTranslation();
 const copy=getDealsCopy(locale),dining=getDiningCopy(locale),styles=getDiningStyles(locale);
 const kind=venue.category==='restaurant'?t.restaurantsNightlife.restaurants:t.restaurantsNightlife.nightlife;
 return <main className="flex-1 font-g1sans text-g1-ink">
  <Crumbs items={[[t.restaurantsNightlife.pill,'/restaurants-nightlife'],[venue.name]]}/>
  <DiningPhoto venue={venue} locale={locale} hero priority wide/>
  <div className="grid items-start gap-[clamp(24px,4vw,56px)] py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
   <div className="grid min-w-0 gap-5">
    <p className={eyebrowClass}>{kind}</p>
    <h1 className="font-g1display text-[clamp(2rem,2.4vw+1rem,3.3rem)] font-medium leading-[1.04] tracking-[-0.015em]">{venue.name}</h1>
    <SaveButton href={`/restaurants-nightlife/${venue.slug}`} title={venue.name} image={venue.photo?.src}/>
    {venue.status==='verified'&&<p className="text-[1.05rem] leading-relaxed text-g1-soft"><LocalizedListing itemId={venue.id} source={venue.description}/></p>}
    <p className="text-g1-soft">{venue.address||venue.location}</p>
    <p className="text-sm text-g1-soft">{venue.features.filter(feature=>styles[feature]).map(feature=>styles[feature]).join(' · ')}</p>
    <Specs items={[[t.restaurantsNightlife.location,venue.neighborhood||venue.location],[t.category.categoryLabel,kind]]}/>
    <AskButton prompt={fill(copy.tablePrompt,{name:venue.name})} className="w-fit">{copy.requestTable}</AskButton>
   </div>
   {venue.status==='verified'?<DiningBooking venue={{slug:venue.slug,name:venue.name,category:venue.category,features:venue.features}} channels={channelsFor(venue).map(channel=>({...channel,name:PROVIDERS.find(provider=>provider.id===channel.provider)?.name}))} enabled={process.env.DINING_REQUESTS_ENABLED==='true'&&process.env.DINING_SCHEMA_ENABLED==='true'}/>:<p role="status" className="rounded-[22px] border border-g1-rule p-5">{dining.held}</p>}
  </div>
 </main>;
}
