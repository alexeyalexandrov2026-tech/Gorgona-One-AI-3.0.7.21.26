import {getYachts} from '../../lib/data/listings';
import YachtContent from './YachtContent';
import { getServerLocale } from '../../lib/serverLocale';
import { getYatrCopy } from '../../lib/yatrCopy';
import { pageMetadata } from '../../lib/seo.mjs';
export const dynamic='force-dynamic';
export async function generateMetadata(){
 const copy=getYatrCopy(await getServerLocale());
 return pageMetadata({title:copy.title,description:copy.description,path:'/yachts'});
}
export default async function YachtsPage(){
 const partners=(await getYachts({editorial:true})).filter(y=>y.partner);
 return <YachtContent partners={partners}/>;
}
