'use client';
import {useLocale} from '../components/LocaleProvider';
import {getYatrCopy} from '../../lib/yatrCopy';
import {getPartnerListingCopy} from '../../lib/partnerListingCopy.mjs';
import {ListingCard} from '../components/g1/ui';
import YatrCatalog from './YatrCatalog';
export default function YachtContent({partners}){
 const locale=useLocale(),copy=getYatrCopy(locale),listingCopy=getPartnerListingCopy(locale);
 return <main className="min-w-0 flex-1 pb-10 font-g1sans text-g1-ink">
  <header className="grid gap-4 pb-7 pt-6 sm:pb-9 sm:pt-10"><h1 className="g1-display max-w-[22ch] font-g1display text-[clamp(2.1rem,3.6vw+1rem,4.6rem)] font-medium leading-none">{copy.title}</h1><p className="max-w-[64ch] text-[1.06rem] text-g1-soft">{copy.description}</p></header>
  {partners.length>0&&<section className="mb-10" aria-label={listingCopy.listings}><h2 className="mb-6 font-g1display text-3xl">{listingCopy.listings}</h2><div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">{partners.map(y=><ListingCard key={y.slug} href={'/yachts/'+y.slug} img={y.image} alt={y.title} title={y.title} meta={y.length+' · '+y.location} note={y.description} rate={y.price}/>)}</div></section>}
  <YatrCatalog copy={copy}/>
 </main>;
}
