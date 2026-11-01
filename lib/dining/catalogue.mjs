import {DINING_PHOTOS} from './photos.mjs';
/** Reviewed metadata; URLs identify evidence, not permission to reuse photography. */
export const VERIFIED_ON = '2026-10-31';
// id, name, category, neighborhood, address, cuisine, features, official website.
const rows = [
 ['komodo','Komodo','restaurant','Brickell','801 Brickell Avenue, Miami, FL 33131','Asian',['fine-dining','private'],'https://komodomiami.com/'],
 ['papi-steak','Papi Steak','restaurant','South Beach','736 1st Street, Miami Beach, FL 33139','Steakhouse',['fine-dining','private'],'https://papisteak.com/miami/'],
 ['sexy-fish','Sexy Fish','restaurant','Brickell','1001 S Miami Avenue, Miami, FL 33130','Japanese',['fine-dining','private'],'https://sexyfishmiami.com/'],
 ['carbone','Carbone','restaurant','South Beach','49 Collins Avenue, Miami Beach, FL 33139','Italian',['fine-dining','private'],'https://carbonemiami.com/'],
 ['prime-112','Prime 112','restaurant','South Beach','112 Ocean Drive, Miami Beach, FL 33139','Steakhouse',['fine-dining','private'],'https://mylesrestaurantgroup.com/prime-112/'],
 ['joes-stone-crab',"Joe's Stone Crab",'restaurant','South Beach','11 Washington Avenue, Miami Beach, FL 33139','Seafood',['private'],'https://www.joesstonecrab.com/location/joes-stone-crab/'],
 ['liv','LIV','nightlife','Miami Beach','4441 Collins Avenue, Miami Beach, FL 33140',null,['club','vip'],'https://www.livnightclub.com/miami/'],
 ['e11even','E11EVEN','nightlife','Downtown Miami','29 NE 11th Street, Miami, FL 33132',null,['club','vip'],'https://www.11miami.com/'],
 ['club-space','Club Space','nightlife','Downtown Miami','34 NE 11th Street, Miami, FL 33132',null,['club','vip'],'https://www.clubspace.com/'],
 ['rosa-sky','Rosa Sky','nightlife','Brickell','115 SW 8th Street, 22nd Floor, Miami, FL 33130',null,['rooftop','lounge','vip'],'https://rosaskyrooftop.com/'],
 ['sugar-rooftop','Sugar Rooftop','nightlife','Brickell','788 Brickell Plaza, 40th Floor, Miami, FL 33131',null,['rooftop','lounge'],'https://www.easthotels.com/en/miami/restaurants-and-bars/sugar/'],
 ['mandolin','Mandolin Aegean Bistro','restaurant','Design District','4312 NE 2nd Avenue, Miami, FL 33137','Aegean',['outdoor'],'https://www.mandolinrestaurant.com/'],
 ['versailles','Versailles','restaurant','Little Havana','3555 SW 8th Street, Miami, FL 33135','Cuban',['casual'],'https://www.versaillesrestaurant.com/'],
 ['rusty-pelican','Rusty Pelican','restaurant','Key Biscayne','3201 Rickenbacker Causeway, Key Biscayne, FL 33149','Seafood',['waterfront','private'],'https://www.therustypelican.com/reservations'],
 ['cote','COTE Miami','restaurant','Design District','3900 NE 2nd Avenue, Miami, FL 33137','Korean',['fine-dining','private'],'https://www.cotekoreansteakhouse.com/locations/cotemiami'],
 ['lpm','LPM Restaurant & Bar','restaurant','Brickell','1300 Brickell Bay Drive, Miami, FL 33131','French Mediterranean',['fine-dining','private'],'https://lpmrestaurants.com/miami/'],
 ['mila','MILA','restaurant','South Beach','1636 Meridian Avenue, Miami Beach, FL 33139','MediterrAsian',['rooftop','vip','private'],'https://mila-miami.com/reserve'],
 ['nikki-beach','Nikki Beach Miami Beach','restaurant','South Beach','1 Ocean Drive, Miami Beach, FL 33139','International',['beach-club','outdoor'],'https://nikkibeach.com/miami-beach/contact/'],
 ['michaels-genuine',"Michael's Genuine Food & Drink",'restaurant','Design District','130 NE 40th Street, Miami, FL 33137','American',['casual'],'https://michaelsgenuine.com/'],
 ['glass-and-vine','Glass & Vine','restaurant','Coconut Grove','2820 McFarlane Road, Miami, FL 33133','American',['outdoor','private'],'https://www.glassandvine.com/'],
 ['makoto','Makoto','restaurant','Bal Harbour','9700 Collins Avenue, Bal Harbour, FL 33154','Japanese',['outdoor'],'https://makoto-restaurant.com/'],
 ['surf-club','The Surf Club Restaurant','restaurant','Surfside','9011 Collins Avenue, Surfside, FL 33154','Continental',['fine-dining','private'],'https://www.surfclubrestaurant.com/'],
 ['fontana','Fontana','restaurant','Coral Gables','1200 Anastasia Avenue, Coral Gables, FL 33134','Italian',['outdoor'],'https://biltmorehotel.com/coral-gables-dining/fontana/'],
 ['il-mulino','Il Mulino New York','restaurant','Sunny Isles Beach','17875 Collins Avenue, Sunny Isles Beach, FL 33160','Italian',['waterfront','private'],'https://www.acqualinaresort.com/restaurants/il-mulino-new-york/'],
 ['doya','DOYA','restaurant','Wynwood','347 NW 24th Street, Miami, FL 33127','Aegean',['private'],'https://doyarestaurant.com/'],
 ['ball-and-chain','Ball & Chain','nightlife','Little Havana','1513 SW 8th Street, Miami, FL 33135',null,['lounge','live-music'],'https://ballandchainmiami.com/'],
 ['midline','Midline Miami','nightlife','Wynwood','2221 NW Miami Court, Miami, FL 33127',null,['club'],'https://buy.tablelist.com/v/midline-miami']
];
const mappings = {
 komodo:['sevenrooms','komodo','https://www.sevenrooms.com/explore/komodo/reservations/create/search'],
 'papi-steak':['sevenrooms','papisteak','https://www.sevenrooms.com/explore/papisteak/reservations/create/search'],
 'sexy-fish':['sevenrooms','sexyfishmiamimiami','https://www.sevenrooms.com/explore/sexyfishmiamimiami/reservations/create/search/'],
 'joes-stone-crab':['opentable','1021381','https://www.opentable.com/booking/restref/availability?restRef=1021381'],
 'sugar-rooftop':['sevenrooms','sugarmiami','https://www.sevenrooms.com/reservations/sugarmiami'],
 doya:['sevenrooms','doya','https://www.sevenrooms.com/explore/doya/reservations/create/search/'],
 lpm:['sevenrooms','lpmmiami','https://www.sevenrooms.com/explore/lpmmiami/reservations/create/search'],
 'glass-and-vine':['sevenrooms','glassandvine','https://www.sevenrooms.com/explore/glassandvine/reservations/create/search/'],
 makoto:['opentable','55921','https://www.opentable.com/restaurant/profile/55921/reserve?rid=55921'],
 'il-mulino':['opentable','ll-mulino-new-york-sunny-isles-beach-miami','https://www.opentable.com/r/ll-mulino-new-york-sunny-isles-beach-miami'],
 midline:['tablelistpro','midline-miami','https://buy.tablelist.com/v/midline-miami']
};
/** @typedef {{id:string,name:string,slug:string,category:string,neighborhood:string,address:string,cuisine:string|null,features:string[],website:string,status:string,verifiedOn:string,sources:string[],channels:Array<{provider:string,externalId:string,href:string,evidence:string}>,description:string,image:string|null,photo:object|null}} Venue */
/** @type {ReadonlyArray<Venue>} */
export const CATALOGUE = Object.freeze(rows.map(([id,name,category,neighborhood,address,cuisine,features,website]) => {
 const mapped=mappings[id];
 const channels=[{provider:'venue',externalId:id,href:website,evidence:website}];
 if(mapped)channels.unshift({provider:mapped[0],externalId:mapped[1],href:mapped[2],evidence:website});
 if(id==='liv')channels.unshift({provider:'discotech',externalId:'liv',href:'https://app.discotech.me/miami/liv',evidence:'https://app.discotech.me/miami/liv'});
 return Object.freeze({id,name,slug:id+'-miami',category,neighborhood,address,cuisine,features:Object.freeze(features),website,status:'verified',verifiedOn:VERIFIED_ON,sources:Object.freeze([website]),channels:Object.freeze(channels.map(Object.freeze)),image:DINING_PHOTOS[id]?.src||null,photo:DINING_PHOTOS[id]||null,
  description:category==='nightlife'?'Music, cocktails and a night out in Miami.':features.includes('waterfront')?'Dining with coastal views.':features.includes('outdoor')?'A welcoming table in an outdoor setting.':features.includes('private')?'Dining and private celebrations in Miami.':'Discover a different side of Miami dining.'});
}));
