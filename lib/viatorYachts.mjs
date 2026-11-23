// Private yacht and boat charters from Viator, from Key West to Palm Beach
// (Partner API, Full Access, checked 2026-11-23). Each card links straight to
// Viator with the partner referral; the photo is the product's own cover image
// from the API. Titles are our labels written from the API title and
// description; reviews and prices stay on Viator. Boat captains' fees are paid
// separately on several of these, so no label says "all inclusive".
const CDN='https://media-cdn.tripadvisor.com/media/attractions-splice-spp-720x480/';
const REFERRAL='mcid=42383&pid=P00329248&medium=link&campaign=miami-elio-yachts';

/** South to north. */
export const VIATOR_YACHT_CITIES=Object.freeze([
 Object.freeze({id:'key-west',name:'Key West'}),
 Object.freeze({id:'florida-keys',name:'Florida Keys'}),
 Object.freeze({id:'miami',name:'Miami'}),
 Object.freeze({id:'fort-lauderdale',name:'Fort Lauderdale'}),
 Object.freeze({id:'palm-beach',name:'Palm Beach'})
]);

// [productCode, title, titleRu, city, cover photo, Viator path]
const rows=[
 ['439057P2','Private sunset cruise around Key West','Частный закатный круиз вокруг Key West','key-west','12/37/dc/03.jpg','Key-West/Private-sunset-cruise-around-Key-West/d661-439057P2'],
 ['331502P1','Private luxury charter with captain','Частный люксовый чартер с капитаном','key-west','0c/d0/a6/7a.jpg','Key-West/Top-Private-Luxury-Charter-SUV-of-the-Seas-Fully-Custom-for-any-Adventure-Day/d661-331502P1'],
 ['7511P1','Private 90-minute harbor sailing charter','Частная парусная прогулка по гавани, 90 минут','key-west','0b/11/60/4d.jpg','Key-West/Private-90-Minute-Customized-Sailing-Charter/d661-7511P1'],
 ['314013P2','Private Islamorada sunset cruise','Частный закатный круиз у Islamorada','florida-keys','0c/00/4b/14.jpg','Islamorada/Islamorada-Sunset-Tour/d23474-314013P2'],
 ['5575842P5','Private 3-hour charter with sandbar stop','Частный чартер на 3 часа с отмелью','florida-keys','16/41/67/08.jpg','Islamorada/Private-3-hour-Charter-and-Sandbar/d23474-5575842P5'],
 ['169162P2','Private 2-hour boat tour: skyline and Star Island','Частная лодка на 2 часа: скайлайн и Star Island','miami','09/f9/4f/f3.jpg','Miami/Boat-Tour-at-night-private-for-2-and-for-up-to-6-people/d662-169162P2'],
 ['328105P2','Private boat charter: sunset and sandbar','Частный чартер: закат и отмель','miami','r/33/16/0a/f3/caption.jpg','Miami/Private-Tour-Miami-Boat-Rental/d662-328105P2'],
 ['288880P1','Private boat with a captain and champagne','Частная лодка с капитаном и шампанским','miami','12/4d/21/22.jpg','Miami/Miami-Boat-Rental/d662-288880P1'],
 ['169162P10','Private 2-hour yacht cruise on the Miami River','Частная яхта на 2 часа по Miami River','miami','0d/a5/25/81.jpg','Miami/2-Hours-Tour-on-a-30-to-34-Ft-Boat-for-8-people/d662-169162P10'],
 ['454994P2','Captained yacht, sunset options','Яхта с капитаном, варианты на закате','miami','12/48/6d/dc.jpg','Miami/Private-Captained-Boat-Tour-in-Miami/d662-454994P2'],
 ['454994P1','Private captained boat tour for up to 12','Частная лодка с капитаном до 12 гостей','miami','12/47/17/30.jpg','Miami/Private-Captained-Boat-Tour-in-Miami-for-up-to-12-passangers/d662-454994P1'],
 ['438341P1','Private bayside boat cruise with captain','Частный круиз по заливу с капитаном','miami','15/73/40/36.jpg','Miami/Private-boat-tour-through-beautiful-bay-side-Miami/d662-438341P1'],
 ['438341P2','Private Monterey 32 cruise with captain','Частная прогулка на Monterey 32 с капитаном','miami','15/73/3f/b3.jpg','Miami/Sightseeing-tour-or-party-on-a-Monterey-32ft/d662-438341P2'],
 ['169162P3','Private 24 ft boat with captain','Частная лодка 24 фута с капитаном','miami','r/32/78/f7/4e/caption.jpg','Miami/7-Person-boat-rental-Gas-included-5-Star-boat-rental/d662-169162P3'],
 ['288880P8','Private Millionaire’s Row cruise, 1 hour','Частный час по Millionaire’s Row','miami','15/7c/f7/63.jpg','Miami/Private-Millionaires-Row-Cruise-in-Miami/d662-288880P8'],
 ['464279P1','Private 37 ft yacht for up to 12','Частная яхта 37 футов до 12 гостей','miami','r/33/de/79/da/caption.jpg','Miami/Renta-de-Yate-Privado-37Ft-en-Miami-Hasta-12-Personas/d662-464279P1'],
 ['169162P4','Private yacht 42–44 ft, 2 or 4 hours','Частная яхта 42–44 фута, 2 или 4 часа','miami','12/8f/ee/74.jpg','Miami/Boat-Rental-for-8-people-Gas-Included-be-your-own-captain/d662-169162P4'],
 ['169162P1','Private 2-hour boat cruise with licensed captain','Частная лодка на 2 часа с лицензированным капитаном','miami','r/34/c1/33/0d/caption.jpg','Miami/Boat-Rental-for-7-people-without-Captain-Price-per-boat/d662-169162P1'],
 ['169162P7','Private 37 ft yacht with swim stop','Частная яхта 37 футов с остановкой для купания','miami','17/0e/22/f6.jpg','Miami/70-ft-private-tour-in-Miami-Yatch-Rental-4-to-8-hours-13-people/d662-169162P7'],
 ['181643P9','50 ft luxury yacht in Miami Beach','Люксовая яхта 50 футов в Майами-Бич','miami','17/0d/6a/75.jpg','Miami/50-Yacht-Tour-and-Boat-Rental-Party-with-Captain-enjoy-Miami-Beach/d662-181643P9'],
 ['169162P9','Private yacht with captain, 2 or 4 hours','Частная яхта с капитаном, 2 или 4 часа','miami','17/0f/3d/b8.jpg','Miami/Sundancer-34-Ft-for-up-to-6-people-gas-included/d662-169162P9'],
 ['454994P7','Private yacht tour in Miami','Частная яхта в Майами','miami','13/56/89/25.jpg','Miami/Miami-Private-Yacht-Tour/d662-454994P7'],
 ['5547692P3','Private 45 ft yacht','Частная яхта 45 футов','miami','15/73/3d/72.jpg','Miami/45-Ft-Private-Yacht-Rental-in-Miami/d662-5547692P3'],
 ['5542052P3','Private 45 ft yacht, 3–4 hours, up to 13','Частная яхта 45 футов, 3–4 часа, до 13 гостей','miami','17/0d/2b/a6.jpg','Miami/45ft-1-Hour-FREE-Miami-Yacht-Rental-3-to-6-Hours-13-People/d662-5542052P3'],
 ['464279P5','Private 37 ft yacht for 12 guests','Частная яхта 37 футов для 12 гостей','miami','16/c1/48/1f.jpg','Miami/Private-Yacht-Rental-in-Miami-for-12-People/d662-464279P5'],
 ['464279P6','Private 34 ft yacht','Частная яхта 34 фута','miami','17/14/82/79.jpg','Miami/Private-Yacht-Rental-in-Miami-for-Up-to-12-People/d662-464279P6'],
 ['72789P25','Private 52 ft luxury yacht with captain','Частная люксовая яхта 52 фута с капитаном','miami','10/50/a0/3d.jpg','Miami/Private-52-Yacht-Rental-with-Captain-in-Miami/d662-72789P25'],
 ['169162P5','Private 40 ft yacht with swim stop','Частная яхта 40 футов с купанием','fort-lauderdale','14/cb/0f/dc.jpg','Fort-Lauderdale/8-Person-Boat-Rental-Gas-included-be-your-own-captain-Price-per-boat/d660-169162P5'],
 ['68236P1','Private sailing charter','Частный парусный чартер','fort-lauderdale','06/fa/b7/98.jpg','Fort-Lauderdale/Sailing-Charter/d660-68236P1'],
 ['169162P11','Private yacht: mansions and the Intracoastal','Частная яхта: особняки и Intracoastal','fort-lauderdale','15/7b/4f/a3.jpg','Fort-Lauderdale/Private-Yacht-Cruise-4-or-6-hours-around-Miami-Bay/d660-169162P11'],
 ['117093P3','Private 4-hour sailing charter','Частный парусный чартер на 4 часа','fort-lauderdale','0b/3c/82/57.jpg','Fort-Lauderdale/Half-Day-Sailing-Charter/d660-117093P3'],
 ['169162P18','Private yacht with sandbar swim','Частная яхта с отмелью и купанием','fort-lauderdale','r/32/db/66/9b/caption.jpg','Fort-Lauderdale/Relaxing-Day-at-Ft-Lauderdale-Sandbars-on-a-37-to-40-Ft-Yacht/d660-169162P18'],
 ['5541884P2','Private 1-hour boat tour, up to 6','Частная лодка на час, до 6 гостей','fort-lauderdale','15/6f/59/e8.jpg','Fort-Lauderdale/1-hour-Relaxing-boat-tour-in-Fort-Lauderdale-max-6-ppx/d660-5541884P2'],
 ['5519716P1','Private boat cruise with captain','Частный круиз с капитаном','palm-beach','17/0f/7c/47.jpg','West-Palm-Beach/West-Palm-Beach-Private-Boat-Cruise-and-Tour-with-a-Captain/d24204-5519716P1'],
 ['214602P2','Yacht charter with captain and stewardess','Чартер яхты с капитаном и стюардессой','palm-beach','0f/2c/bd/06.jpg','West-Palm-Beach/Cruise-Luxury-51-Sea-Ray-Palm-Beach-Jupiter-3-h-Sunset-Cruise-Yacht-Charter/d24204-214602P2'],
 ['384372P9','Private narrated historic boat tour','Частная экскурсия на лодке с гидом','palm-beach','17/0e/1e/ba.jpg','West-Palm-Beach/West-Palm-Beach-Narrated-Historic-Boat-Tour-Private-Tour/d24204-384372P9']
];

/** Cards in the shape of `ExperienceCard` (a direct, sponsored link to Viator). */
export const VIATOR_YACHTS=Object.freeze(rows.map(([productCode,title,titleRu,city,photo,path])=>{
 const href='https://www.viator.com/tours/'+path+'?'+REFERRAL;
 return Object.freeze({
  kind:'viator',supplier:'Viator',direct:true,section:'yachts',
  id:'viator-yacht-'+productCode.toLowerCase(),productCode,city,
  title,titleRu,image:CDN+photo,imageAlt:title,
  imageSource:'https://partnerresources.viator.com/',imageCredit:'Viator',
  location:VIATOR_YACHT_CITIES.find(item=>item.id===city).name,
  href,partnerHref:href
 });
}));

export function getViatorYachts(city){return VIATOR_YACHTS.filter(card=>card.city===city);}
