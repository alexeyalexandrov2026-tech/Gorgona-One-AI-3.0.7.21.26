import {notFound} from 'next/navigation';
import {getViatorExperience} from '../../../../lib/experienceCards.mjs';
import {clip,breadcrumbJsonLd} from '../../../../lib/seo.mjs';
import JsonLd from '../../../components/JsonLd';
import ViatorCollection from '../../ViatorCollection';

// One page per Viator card: the address is a product code from our registry
// (`/experiences/viator/28744p2`), never a link to follow.
export async function generateMetadata({params}){
 const {code}=await params;
 const item=getViatorExperience(code);
 if(!item)return {title:'Experiences | MIAMI ELIO'};
 return {
  title:`${item.title} | MIAMI ELIO`,
  description:clip(`${item.title} and other Miami offers from Viator, through Miami Elio. Check dates, availability and prices on Viator before booking.`),
  alternates:{canonical:`/experiences/viator/${item.slug}`}
 };
}

export default async function ViatorExperiencePage({params}){
 const {code}=await params;
 const item=getViatorExperience(code);
 if(!item)notFound();
 return <>
  <JsonLd data={breadcrumbJsonLd([{name:'Exclusive Destinations',path:'/exclusive-destinations'},{name:item.title,path:`/experiences/viator/${item.slug}`}])}/>
  <ViatorCollection slug={item.slug}/>
 </>;
}
