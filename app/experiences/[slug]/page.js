import {notFound} from 'next/navigation';
import {getHeadoutCollection} from '../../../lib/headoutCatalog.mjs';
import {clip} from '../../../lib/seo.mjs';
import HeadoutCollection from '../HeadoutCollection';

// Two partner collections share the Grand Canyon supplier title.
const DESCRIPTION_OVERRIDES = {
  'grand-canyon-helicopter-tours-7236': 'Explore Grand Canyon Helicopter Tours with Miami Elio. View partner options and check dates and availability on Headout before booking.'
};

export async function generateMetadata({params}) {
  const {slug} = await params;
  const item = getHeadoutCollection(slug);
  if (!item) return {title: 'Experiences | MIAMI ELIO'};

  return {
    title: item.title + ' | MIAMI ELIO',
    description: clip(DESCRIPTION_OVERRIDES[item.slug]
      ?? `Explore ${item.title} with Miami Elio. Check dates and availability on Headout, where bookings and payments are handled.`)
  };
}

export default async function ExperiencePage({params}){const {slug}=await params;const item=getHeadoutCollection(slug);if(!item)notFound();return <HeadoutCollection item={item}/>;}
