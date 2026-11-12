import { CATALOGUE } from './dining/catalogue.mjs';
export const VENUE_CATEGORIES = [{slug:'restaurant',label:'Restaurants'},{slug:'nightlife',label:'Nightlife'}];
// Existing editorial wording and routes are retained as display metadata.
const legacyCopy = {
  "komodo": {
    "slug": "komodo-miami",
    "description": "Southeast Asian fine dining across three stories with a rooftop lounge and lush open-air terrace."
  },
  "papi-steak": {
    "slug": "papi-steak-miami",
    "description": "Celebrity-favorite steakhouse known for gold-dusted tomahawks and a high-energy dining room."
  },
  "sexy-fish": {
    "slug": "sexy-fish-miami",
    "description": "Asian-inspired seafood restaurant with striking interior art and a lively bar scene."
  },
  "carbone": {
    "slug": "carbone-miami",
    "description": "Red-sauce Italian-American institution with white-glove service and old-school Miami glamour."
  },
  "prime-112": {
    "slug": "prime-112-miami",
    "description": "Legendary steakhouse in a historic 1915 building, famous for its bacon and people-watching."
  },
  "joes-stone-crab": {
    "slug": "joes-stone-crab-miami",
    "description": "Miami institution since 1913, serving fresh stone crab claws in a classic dining room."
  },
  "liv": {
    "slug": "liv-miami",
    "description": "World-renowned nightclub hosting top international DJs inside the iconic Fontainebleau hotel."
  },
  "e11even": {
    "slug": "e11even-miami",
    "description": "Always-open ultraclub with live performances, aerial acts, and round-the-clock entertainment."
  },
  "club-space": {
    "slug": "club-space-miami",
    "description": "Underground electronic music venue famous for sunrise sets on the open-air terrace."
  },
  "rosa-sky": {
    "slug": "rosa-sky-miami",
    "description": "Rooftop lounge with skyline views, craft cocktails, and a stylish sunset-to-late-night crowd."
  },
  "sugar-rooftop": {
    "slug": "sugar-rooftop-miami",
    "description": "40th-floor rooftop bar blending East Asian-inspired decor with panoramic bay views."
  }
};
// Retain original identities/routes; quarantine records without current evidence.
const records = CATALOGUE.map(record => {
  const legacy = legacyCopy[record.id];
  return Object.freeze({...record, ...(legacy ? {slug:legacy.slug,description:legacy.description} : {}), location:record.neighborhood + ', FL'});
});
const held = Object.freeze({id:'story',slug:'story-miami',name:'Story',category:'nightlife',location:'South Beach, Miami, FL',image:null,status:'unverified',channels:[],features:[],sources:[],verifiedOn:null});
export function getVenues() { return records; }
export function getVenuesByCategory(category) { return !category || category === 'all' ? records : records.filter(venue => venue.category === category); }
export function getVenueBySlug(slug) { return records.find(venue => venue.slug === slug) || (held.slug === slug ? held : undefined); }
export function getVenueAudit() { return [...records,held]; }
