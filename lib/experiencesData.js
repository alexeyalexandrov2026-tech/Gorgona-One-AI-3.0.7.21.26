import {HEADOUT_COLLECTIONS} from './headoutCatalog.mjs';
const experiences=HEADOUT_COLLECTIONS.map((item,index)=>({...item,supplier:'Headout',id:item.slug,title:item.title,location:item.region==='miami'?'Miami':item.region==='orlando'?'Orlando':item.region==='tampa'?'Tampa':'Headout',duration:'',price:'',description:item.title,featured:index<6}));
export function getExperiences(){return experiences;}
export function getFeaturedExperiences(){return experiences.filter(item=>item.featured);}
export function getExperienceBySlug(slug){return experiences.find(item=>item.slug===slug);}
