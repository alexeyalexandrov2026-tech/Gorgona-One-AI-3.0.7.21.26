import {getYachts} from '../../lib/data/listings';
import YachtContent from './YachtContent';

export const metadata = {
  title: 'Yacht Charters in Miami | Miami Elio',
  description: 'Explore yacht charters in Miami with Miami Elio. Browse available yachts and find an option for your next day on the water.'
};

export const dynamic='force-dynamic';
export default async function YachtsPage(){
 const partners=(await getYachts({editorial:true})).filter(y=>y.partner);
 return <YachtContent partners={partners}/>;
}
