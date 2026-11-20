import {notFound} from 'next/navigation';
import {getHeadoutCollection} from '../../../lib/headoutCatalog.mjs';
import {clip,experienceSearchText,breadcrumbJsonLd,attractionJsonLd} from '../../../lib/seo.mjs';
import JsonLd from '../../components/JsonLd';
import HeadoutCollection from '../HeadoutCollection';

// Two partner collections share the Grand Canyon supplier title.
const DESCRIPTION_OVERRIDES = {
  'grand-canyon-helicopter-tours-7236': 'Explore Grand Canyon Helicopter Tours with Miami Elio. View partner options and check dates and availability on Headout before booking.'
};

export async function generateMetadata({params}) {
  const {slug} = await params;
  const item = getHeadoutCollection(slug);
  if (!item) return {title: 'Experiences | MIAMI ELIO'};

  const search = experienceSearchText(item);
  return {
    title: search.title,
    description: DESCRIPTION_OVERRIDES[item.slug] ? clip(DESCRIPTION_OVERRIDES[item.slug]) : search.description
  };
}

export default async function ExperiencePage({params}){const {slug}=await params;const item=getHeadoutCollection(slug);if(!item)notFound();return <><JsonLd data={[breadcrumbJsonLd([{name:'Experiences',path:'/experiences'},{name:item.title,path:`/experiences/${item.slug}`}]),attractionJsonLd(item)]}/><HeadoutCollection item={item}/></>;}
