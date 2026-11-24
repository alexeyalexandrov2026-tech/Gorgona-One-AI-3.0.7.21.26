import ExperiencesContent from './ExperiencesContent';
import JsonLd from '../components/JsonLd';
import { pageMetadata, sectionJsonLd } from '../../lib/seo.mjs';
export const metadata = pageMetadata({
  title: 'Things to Do in Miami: Tours & Experiences',
  fullTitle: 'Things to Do in Miami: Tours & Experiences | Miami Elio',
  description: 'Discover top Miami experiences, Everglades airboat tours, sightseeing cruises, and attractions. Book verified tickets instantly with Miami Elio.',
  path: '/experiences',
  image: '/images/experiences/miami-coast.webp'
});
export default function ExperiencesPage(){return (<><JsonLd data={sectionJsonLd({ name: 'Top Miami Tours & Experiences', description: metadata.description, path: '/experiences' })} /><ExperiencesContent/></>);}
