import {EXPERIENCE_MEDIA} from './experienceMedia.mjs';

/** @typedef {{readonly location:string,readonly source:string,readonly coasters:ReadonlyArray<string>,readonly other?:ReadonlyArray<string>,readonly related?:ReadonlyArray<{title:string,href:string,coasters:ReadonlyArray<string>}>}} ParkGuide */
// Official park catalogues checked 2026-10-31. This is a visit guide, not
// live ride availability, an individual-coaster ticket or a booking API.
/** @type {Readonly<Record<string,Readonly<ParkGuide>>>} */
export const FLORIDA_PARK_GUIDES=Object.freeze({
 'busch-gardens-tampa-bay-tickets':{location:'Tampa',source:'https://buschgardens.com/tampa/rides/',coasters:['Iron Gwazi','SheiKra','Montu','Cheetah Hunt',"Cobra’s Curse",'Tigris','Phoenix Rising','Air Grover'],other:["Falcon’s Fury",'Congo River Rapids','Stanley Falls Flume']},
 'universal-studios-orlando':{location:'Orlando',source:'https://www.universalorlando.com/web/en/us/theme-parks/universal-studios-florida',coasters:['Revenge of the Mummy','Harry Potter and the Escape from Gringotts','Trolls Trollercoaster']},
 'islands-of-adventure':{location:'Orlando',source:'https://www.universalorlando.com/web/en/us/theme-parks/islands-of-adventure',coasters:['Jurassic World VelociCoaster',"Hagrid’s Magical Creatures Motorbike Adventure",'The Incredible Hulk Coaster','Flight of the Hippogriff','Pteranodon Flyers'],other:['The High in the Sky Seuss Trolley Train Ride!']},
 'epic-universe':{location:'Orlando',source:'https://blog.discoveruniversal.com/guides-and-tips/complete-guide-to-universal-epic-universe/',coasters:['Stardust Racers','Mine-Cart Madness',"Hiccup’s Wing Gliders",'Curse of the Werewolf']},
 'magic-kingdom':{location:'Lake Buena Vista',source:'https://disneyworld.disney.go.com/attractions/magic-kingdom/',coasters:['TRON Lightcycle / Run','Space Mountain','Seven Dwarfs Mine Train','Big Thunder Mountain Railroad','The Barnstormer']},
 'epcot':{location:'Lake Buena Vista',source:'https://disneyworld.disney.go.com/attractions/epcot/',coasters:['Guardians of the Galaxy: Cosmic Rewind']},
 'disneys-hollywood-studios':{location:'Lake Buena Vista',source:'https://disneyworld.disney.go.com/attractions/hollywood-studios/',coasters:['Slinky Dog Dash',"Rock ’n’ Roller Coaster Starring The Muppets"]},
 'disneys-animal-kingdom':{location:'Bay Lake',source:'https://disneyworld.disney.go.com/attractions/animal-kingdom/',coasters:['Expedition Everest — Legend of the Forbidden Mountain']},
 'seaworld-orlando-tickets':{location:'Orlando',source:'https://seaworld.com/orlando/rides/',coasters:['Mako','Manta','Kraken','Pipeline: The Surf Coaster','Ice Breaker','Penguin Trek','Journey to Atlantis',"Super Grover’s Box Car Derby"],other:['Infinity Falls','Expedition Odyssey']},
 'legoland-florida':{location:'Winter Haven',source:'https://www.legoland.com/florida/things-to-do/theme-park/rides-attractions/',coasters:['Galacticoaster','The Dragon','Coastersaurus','The Great LEGO Race'],other:["Mia’s Riding Adventure",'LEGO NINJAGO The Ride','Lost Kingdom Adventure','Pirate River Quest']},
 'peppa-pig-theme-park-tickets':{location:'Winter Haven',source:'https://www.peppapigthemepark.com/florida/',coasters:["Daddy Pig’s Roller Coaster"]},
 'fun-spot-america':{location:'Orlando',source:'https://fun-spot.com/orlando/',coasters:['White Lightning','Freedom Flyer','Sea Serpent'],related:[{title:'Fun Spot America Kissimmee',href:'https://fun-spot.com/kissimmee/',coasters:['Mine Blower','Galaxy Spin','Hurricane','Sea Serpent']}]},
 'adventure-island-tampa':{location:'Tampa',source:'https://www.adventureisland.com/',coasters:[]},
 'aquatico-orlando':{location:'Orlando',source:'https://aquatica.com/orlando/',coasters:[]}
});
for(const guide of Object.values(FLORIDA_PARK_GUIDES)){
 Object.freeze(guide.coasters);if(guide.other)Object.freeze(guide.other);
 if(guide.related){for(const item of guide.related){Object.freeze(item.coasters);Object.freeze(item);}Object.freeze(guide.related);}
 Object.freeze(guide);
}

// These parks use official visitor/ticket pages, not affiliate accounts.
const media=EXPERIENCE_MEDIA['panama-city-beach'];
export const FLORIDA_OFFICIAL_PARKS=Object.freeze([
 {id:'race-city',slug:'race-city-panama-city-beach',title:'Race City · Hurricane',region:'panama-city-beach',section:'parks',supplier:'Race City',href:'https://racecitypcb.com/tickets',source:'https://racecitypcb.com/rides/byid/1',coasters:['Hurricane'],ticketLink:true},
 {id:'wongo-adventure',slug:'wongo-adventure-panama-city-beach',title:"Swampy Jack’s Wongo Adventure",region:'panama-city-beach',section:'parks',supplier:'Wongo Adventure',href:'https://wongoadventure.com/attractions/spin-coaster/',source:'https://wongoadventure.com/open/',coasters:['Spin Coaster'],ticketLink:false},
 {id:'cobra-adventure',slug:'cobra-adventure-park',title:'Cobra Adventure Park',region:'panama-city-beach',section:'family',supplier:'Cobra Adventure Park',href:'https://cobraadventurepark.com/',source:'https://cobraadventurepark.com/attractions-pricing/',coasters:[],ticketLink:false}
].map(item=>Object.freeze({...item,coasters:Object.freeze(item.coasters),kind:'official',location:'Panama City Beach',image:media.image,imageAlt:media.alt,imageSource:media.source,imageLicense:media.license,imageCredit:media.author,illustrative:true,verifiedAt:'2026-10-31'})));

export function getFloridaParkGuide(slug){return FLORIDA_PARK_GUIDES[slug];}
