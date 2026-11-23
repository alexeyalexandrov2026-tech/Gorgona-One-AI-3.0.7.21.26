// Private yacht and boat charters from Viator, from Key West to Palm Beach
// (Partner API, Full Access, checked 2026-11-23). Each card links straight to
// Viator with the partner referral; the photo is the product's own cover image
// from the API. Titles are our labels written from the API title and
// description; reviews and prices stay on Viator. Boat captains' fees are paid
// separately on several of these, so no label says "all inclusive".
const CDN='https://media-cdn.tripadvisor.com/media/attractions-splice-spp-720x480/';
const REFERRAL='mcid=42383&pid=P00329248&medium=link&campaign=miami-elio-yachts';

/** South to north (cities with verified private yacht charters). */
export const VIATOR_YACHT_CITIES=Object.freeze([
 Object.freeze({id:'key-west',name:'Key West'}),
 Object.freeze({id:'miami',name:'Miami'}),
 Object.freeze({id:'fort-lauderdale',name:'Fort Lauderdale'}),
 Object.freeze({id:'palm-beach',name:'Palm Beach'})
]);

// Curated true private yacht & boat charters (excursions, 1-hour sightseeing tours,
// duplicate cabin interiors, and non-vessel tourist/restaurant photos removed).
// [productCode, title, titleRu, city, cover photo, Viator path, imagePosition]
const rows=[
 ['7511P1','Private harbor sailing charter in Key West','Частный парусный чартер по гавани Key West','key-west','0b/11/60/4d.jpg','Key-West/Private-90-Minute-Customized-Sailing-Charter/d661-7511P1','50% 55%'],
 ['72789P25','Private 52 ft luxury yacht with captain','Частная люксовая яхта 52 фута с капитаном','miami','10/50/a0/3d.jpg','Miami/Private-52-Yacht-Rental-with-Captain-in-Miami/d662-72789P25','50% 72%'],
 ['181643P9','50 ft luxury yacht charter in Miami Beach','Люксовая яхта 50 футов в Майами-Бич','miami','17/0d/6a/75.jpg','Miami/50-Yacht-Tour-and-Boat-Rental-Party-with-Captain-enjoy-Miami-Beach/d662-181643P9','50% 34%'],
 ['5542052P3','Private 45 ft yacht, 3–4 hours, up to 13 guests','Частная яхта 45 футов, 3–4 часа, до 13 гостей','miami','17/0d/2b/a6.jpg','Miami/45ft-1-Hour-FREE-Miami-Yacht-Rental-3-to-6-Hours-13-People/d662-5542052P3','50% 68%'],
 ['169162P4','Private 42–44 ft flybridge yacht, 2 or 4 hours','Частная яхта 42–44 фута с флайбриджем, 2 или 4 часа','miami','12/8f/ee/74.jpg','Miami/Boat-Rental-for-8-people-Gas-Included-be-your-own-captain/d662-169162P4','50% 52%'],
 ['464279P1','Private 37 ft yacht charter for up to 12','Частная яхта 37 футов до 12 гостей','miami','r/33/de/79/da/caption.jpg','Miami/Renta-de-Yate-Privado-37Ft-en-Miami-Hasta-12-Personas/d662-464279P1','50% 84%'],
 ['169162P7','Private 37 ft yacht with swim stop','Частная яхта 37 футов с остановкой для купания','miami','17/0e/22/f6.jpg','Miami/70-ft-private-tour-in-Miami-Yatch-Rental-4-to-8-hours-13-people/d662-169162P7','50% 55%'],
 ['464279P5','Private 37 ft Rinker yacht for 12 guests','Частная яхта Rinker 37 футов для 12 гостей','miami','16/c1/48/1f.jpg','Miami/Private-Yacht-Rental-in-Miami-for-12-People/d662-464279P5','50% 90%'],
 ['464279P6','Private 34 ft cruiser yacht for up to 12','Частная круизная яхта 34 фута до 12 гостей','miami','17/14/82/79.jpg','Miami/Private-Yacht-Rental-in-Miami-for-Up-to-12-People/d662-464279P6','50% 24%'],
 ['169162P9','Private 34 ft Sundancer yacht with captain','Частная яхта Sundancer 34 фута с капитаном','miami','17/0f/3d/b8.jpg','Miami/Sundancer-34-Ft-for-up-to-6-people-gas-included/d662-169162P9','50% 78%'],
 ['169162P10','Private 34 ft yacht charter on the Miami River','Частная яхта 34 фута по Miami River','miami','0d/a5/25/81.jpg','Miami/2-Hours-Tour-on-a-30-to-34-Ft-Boat-for-8-people/d662-169162P10','50% 62%'],
 ['328105P2','Private boat charter: sunset and sandbar','Частный чартер: закат и отмель','miami','r/33/16/0a/f3/caption.jpg','Miami/Private-Tour-Miami-Boat-Rental/d662-328105P2','50% 54%'],
 ['169162P5','Private 40 ft Sea Ray yacht with swim stop','Частная яхта Sea Ray 40 футов с купанием','fort-lauderdale','14/cb/0f/dc.jpg','Fort-Lauderdale/8-Person-Boat-Rental-Gas-included-be-your-own-captain-Price-per-boat/d660-169162P5','50% 55%'],
 ['214602P2','Private 51 ft Sea Ray yacht with captain and stewardess','Чартер яхты Sea Ray 51 фут с капитаном и стюардессой','palm-beach','0f/2c/bd/06.jpg','West-Palm-Beach/Cruise-Luxury-51-Sea-Ray-Palm-Beach-Jupiter-3-h-Sunset-Cruise-Yacht-Charter/d24204-214602P2','50% 42%']
];

/** Cards in the shape of `ExperienceCard` (a direct, sponsored link to Viator). */
export const VIATOR_YACHTS=Object.freeze(rows.map(([productCode,title,titleRu,city,photo,path,imagePosition='50% 50%'])=>{
 const href='https://www.viator.com/tours/'+path+'?'+REFERRAL;
 return Object.freeze({
  kind:'viator',supplier:'Viator',direct:true,section:'yachts',
  id:'viator-yacht-'+productCode.toLowerCase(),productCode,city,
  title,titleRu,image:CDN+photo,imageAlt:title,imagePosition,
  imageSource:'https://partnerresources.viator.com/',imageCredit:'Viator',
  location:VIATOR_YACHT_CITIES.find(item=>item.id===city).name,
  href,partnerHref:href
 });
}));

export function getViatorYachts(city){return VIATOR_YACHTS.filter(card=>card.city===city);}
