import {getYachts} from '../../lib/data/listings';
import YachtContent from './YachtContent';
export const dynamic='force-dynamic';
export default async function YachtsPage(){
 const partners=(await getYachts({editorial:true})).filter(y=>y.partner);
 return <YachtContent partners={partners}/>;
}
