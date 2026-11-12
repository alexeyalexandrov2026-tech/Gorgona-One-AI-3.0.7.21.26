import {notFound} from 'next/navigation';
import {getHeadoutCollection} from '../../../lib/headoutCatalog.mjs';
import HeadoutCollection from '../HeadoutCollection';
export async function generateMetadata({params}){const {slug}=await params;const item=getHeadoutCollection(slug);return {title:item?item.title+' | MIAMI ELIO':'Experiences | MIAMI ELIO'};}
export default async function ExperiencePage({params}){const {slug}=await params;const item=getHeadoutCollection(slug);if(!item)notFound();return <HeadoutCollection item={item}/>;}
