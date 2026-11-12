import {HEADOUT_COLLECTIONS} from './headoutCatalog.mjs';
import {VIATOR_SINGLE_CARDS} from './viatorCatalogue.mjs';
import {VIATOR_EDITORIAL} from './viatorEditorial.mjs';
import {FLORIDA_OFFICIAL_PARKS,getFloridaParkGuide} from './floridaParks.mjs';

/** @typedef {'parks'|'water'|'family'|'nature'|'boats'|'florida-flights'|'helicopters'} ExperienceSection */
/** @typedef {{readonly kind:'headout'|'viator'|'official',readonly supplier:string,readonly id:string,readonly region:string,readonly section:ExperienceSection,readonly title:string,readonly titleRu?:string,readonly image:string,readonly imageSource:string,readonly imageAlt?:string,readonly imageCredit?:string,readonly imageLicense?:string,readonly illustrative?:boolean,readonly href:string,readonly location:string,readonly productCode?:string,readonly slug?:string,readonly ticketLink?:boolean}} ExperienceCard */
const parks=['3676','2331','6224','6225','6295','6296','6297','6299','3675','6482','42441','6575','2330','84'];
const water=['7215','6667','7090'];
const nature=['3097','6008','6009','6226','6289','6626','6630'];
function headoutSection(item){
 if(item.region==='helicopters')return 'helicopters';
 if(parks.includes(item.id))return 'parks';
 if(water.includes(item.id))return 'water';
 if(nature.includes(item.id))return 'nature';
 if(['3124','6107'].includes(item.id))return 'boats';
 return 'family';
}
// A single presentation registry; inventory and checkout stay with providers.
const headout=HEADOUT_COLLECTIONS.map(item=>Object.freeze({...item,kind:'headout',supplier:'Headout',id:'headout-'+item.id,section:headoutSection(item),href:'/experiences/'+item.slug,
 location:getFloridaParkGuide(item.slug)?.location||(item.id==='6289'?'Central Florida':item.region==='miami'?'Miami / South Florida':item.region==='orlando'?'Orlando':item.region==='tampa'?'Tampa':''),imageSource:'https://partner.headout.com/link-generator/'
}));
const viator=VIATOR_SINGLE_CARDS.map(item=>{
 const editorial=VIATOR_EDITORIAL[item.productCode];
 if(!editorial)throw Error('Missing Viator editorial card: '+item.productCode);
 return Object.freeze({...item,...editorial,kind:'viator',supplier:'Viator',id:'viator-'+item.productCode.toLowerCase(),region:'miami'});
});
const miamiHeadout=headout.filter(item=>item.region==='miami');
const miami=[];
for(let index=0;index<Math.max(miamiHeadout.length,viator.length);index++){
 if(miamiHeadout[index])miami.push(miamiHeadout[index]);
 if(viator[index])miami.push(viator[index]);
}
/** @type {ReadonlyArray<Readonly<ExperienceCard>>} */
export const EXPERIENCE_CARDS=Object.freeze([...miami,...headout.filter(item=>item.region!=='miami'),...FLORIDA_OFFICIAL_PARKS]);
export const EXPERIENCE_SECTION_IDS=Object.freeze(['parks','water','family','nature','boats','florida-flights','helicopters']);
export function getExperienceCards(region){return EXPERIENCE_CARDS.filter(item=>item.region===region);}
export function getExperienceSection(section){
 const items=EXPERIENCE_CARDS.filter(item=>item.section===section);
 if(section==='parks')items.sort((a,b)=>{
  const rank=card=>card.kind==='headout'?parks.indexOf(card.id.replace('headout-','')):parks.length;
  return rank(a)-rank(b);
 });
 if(section==='water')items.sort((a,b)=>water.indexOf(a.id.replace('headout-',''))-water.indexOf(b.id.replace('headout-','')));
 return items;
}
export function experienceImageUrl(item){
 if(!item.image.startsWith('https://cdn-imgix.headout.com/'))return item.image;
 const image=new URL(item.image);
 image.search=new URLSearchParams({auto:'format',fit:'crop',w:'960',h:'720',q:'78'}).toString();
 return image.toString();
}
