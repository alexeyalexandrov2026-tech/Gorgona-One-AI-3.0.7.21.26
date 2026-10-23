import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import { translations } from '../../lib/i18n.js';
import { coreMessages } from './core-sources.mjs';
import { OWNED_RECORDS, ownedMessages } from './owned-inventory.mjs';
import { allDeals } from '../../lib/dealsData.js';
import { ecosystem } from '../../lib/ecosystemData.js';
import { EXAMPLE_PROMPTS, discoveryCategories } from '../../lib/discoveryCategories.js';
import { categories } from '../../lib/dealsData.js';
import { EVENT_CATEGORIES, EVENT_CATEGORY_GROUPS, LEAGUES } from '../../lib/mockEventsData.js';
import { ROWE_AND_TAYLOR_DEAL } from '../../lib/storeDirectory.js';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const LOCALES = ['en','ru','es','he','zh','pt','uk','ja','ko','de','ar','tr','fa','it','fr','pl'];
export const hash = text => createHash('sha256').update(text).digest('hex');
export const messageId = text => `ui.${hash(text.trim()).slice(0,16)}`;
export const readJSON = file => JSON.parse(fs.readFileSync(path.join(ROOT,file),'utf8'));
export function readLocale(locale) {
  const text = fs.readFileSync(path.join(ROOT,`i18n/locales/${locale}.js`),'utf8');
  return JSON.parse(text.slice(text.indexOf('export default ') + 15).trim().replace(/;$/,''));
}
export function writeLocale(locale, messages) {
  fs.writeFileSync(path.join(ROOT,`i18n/locales/${locale}.js`), '// Saved display text. No translation service is called when rendering.\nexport default ' + JSON.stringify(messages,null,2) + ';\n');
}
export function appFiles(directory = 'app') {
  return fs.readdirSync(path.join(ROOT,directory),{withFileTypes:true}).flatMap(entry => {
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? appFiles(file) : /\.[jt]sx?$/.test(file) ? [file] : [];
  });
}
export function walk(node, callback, parents = []) {
  if (!node || typeof node !== 'object') return;
  if (node.type) callback(node,parents);
  for (const [key,value] of Object.entries(node)) {
    if (['loc','start','end','extra','comments','tokens'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => walk(child,callback,[node,...parents]));
    else if (value && typeof value === 'object') walk(value,callback,[node,...parents]);
  }
}
export function parseFile(file) {
  return parse(fs.readFileSync(path.join(ROOT,file),'utf8'),{sourceType:'module',plugins:['jsx']});
}
export function discoverMessages() {
  const messages = new Map();
  const add = (source,file) => {
    if (typeof source !== 'string' || !source.trim()) return;
    const text = source.trim();
    if (!messages.has(text)) messages.set(text,new Set());
    messages.get(text).add(file);
  };
  for (const file of appFiles()) {
    // Supplier documents and widget implementations are expressly excluded.
    if (file === 'app/yachts/YatrCatalog.jsx' || file === 'app/vacation-rentals/Stay22Browse.jsx') continue;
    walk(parseFile(file),(node,parents) => {
      if (node.type === 'CallExpression' && node.callee.name === 'msg' && node.arguments[0]?.type === 'StringLiteral') add(node.arguments[0].value,file);
      if (node.type === 'JSXOpeningElement' && ['LocalizedText','LocalizedElement','LocalizedTitle'].includes(node.name.name)) {
        for (const attr of node.attributes) {
          if (attr.type !== 'JSXAttribute' || !['source','placeholder','aria-label','title','alt'].includes(attr.name.name)) continue;
          const literal = attr.value?.type === 'JSXExpressionContainer' ? attr.value.expression : attr.value;
          if (literal?.type === 'StringLiteral') add(literal.value,file);
        }
      }
      // These arrays are our editorial cards, never individual event records.
      if (['app/travel/page.js','app/events/page.js'].includes(file) && parents.some(p => p.type === 'VariableDeclarator' && ['experiences','eventCategories'].includes(p.id.name)) && node.type === 'ObjectProperty' && ['title','copy','tag'].includes(node.key.name) && node.value.type === 'StringLiteral') add(node.value.value,file);
      if (file === 'app/travel/page.js' && node.type === 'ArrayExpression' && node.elements[0]?.value === 'MIA' && node.elements.length === 4) {
        add(node.elements[1]?.value,file); add(node.elements[3]?.value,file);
      }
      // Own validation strings are translated at display time, so switching
      // locale also updates an already visible error without resubmitting.
      if (/^app\/(login|register)(\/partner)?\/page\.js$/.test(file) && node.type === 'ObjectProperty' && /^error/.test(node.key.name) && node.value.type === 'StringLiteral') add(node.value.value,file);
      if (file === 'app/register/page.js' && node.type === 'CallExpression' && node.callee.name === 'setSuccess' && node.arguments[0]?.type === 'StringLiteral') add(node.arguments[0].value,file);
      if (['app/register/partner/page.js','app/events/TicketNetworkEvents.jsx'].includes(file) && node.type === 'StringLiteral' && node.value !== 'AbortError' && parents.some(p => (p.type === 'CallExpression' && p.callee.name === 'setError') || (p.type === 'NewExpression' && p.callee.name === 'Error'))) add(node.value,file);
    });
  }
  // Editorial feature strips, supplied promotion cards and our draft preview.
  // Only display fields from these reviewed local arrays; URLs and enums stay out.
  const arrays = new Map([
    ['app/sportsbook/[slug]/page.js',new Map([['PROFILE_FEATURES',['title','sub']]])],
    ['app/travel/ovago/page.js',new Map([['OVAGO_FEATURES',['title','sub']],['OVAGO_DEALS',['name','description']]])],
    ['app/entertainment/adrenaline-365/page.js',new Map([['ADRENALINE_FEATURES',['title','sub']],['ADRENALINE_DEALS',['name']]])]
  ]);
  for (const [file,variables] of arrays) walk(parseFile(file),(node,parents)=>{
    const variable=parents.find(p=>p.type==='VariableDeclarator')?.id.name;
    if(node.type==='ObjectProperty' && variables.get(variable)?.includes(node.key.name) && node.value.type==='StringLiteral' && node.value.value!=='Rentcars.com') add(node.value.value,file+': owned editorial card');
  });
  const draft='app/draft/homepage-preview/page.js';
  walk(parseFile(draft),(node,parents)=>{
    if(node.type==='ObjectProperty' && ['title','detail','value','description','body'].includes(node.key.name) && node.value.type==='StringLiteral' && parents.some(p=>p.type==='ArrayExpression')) add(node.value.value,draft+': owned preview card');
  });
  walk(parseFile('lib/aiSuggestions.js'),node=>{
    if(node.type==='ObjectProperty' && node.key.name==='label' && node.value.type==='StringLiteral') add(node.value.value,'lib/aiSuggestions.js: owned section navigation label');
  });
  // Own options and accessible text selected through small enum maps. The
  // corresponding API/filter values remain unchanged.
  for (const text of ['Miami & South Florida','All Florida','All cities','Team','Team or artist','Artist','Any team','Any team or artist','Any artist','Sport tickets','Concert tickets','Boxing','Tennis','Golf','All sports','Pop & Rock','Hip-Hop & R&B','Jazz & Blues','Electronic / EDM','Classical & Opera','Country','Comedy & Stand-up','Theater & Broadway','Festivals','All live shows','From {amount}','Please check the event filters and date range.']) add(text,'owned calendar filter and category labels');
  for (const {record,world} of OWNED_RECORDS) if (world === 'experiences') add(record.duration,'lib/experiencesData.js: owned display duration');
  for (const deal of [...allDeals,ROWE_AND_TAYLOR_DEAL]) add(deal.discount,'owned offer terms: lib/dealsData.js / lib/storeDirectory.js');
  for (const text of ['Worldwide car rental deals','Flight deals and discounts']) add(text,'app/components/SearchBar.jsx: owned offer summary');
  for (const item of [...EVENT_CATEGORIES,...EVENT_CATEGORY_GROUPS]) if (!['NFL','NHL','NBA','MLB','MLS','UFC','F1','NASCAR'].includes(item.label)) add(item.label,'owned event category navigation; event records remain English');
  for (const item of LEAGUES) add(item.sport,'owned sport taxonomy; league and team names remain English');
  for (const item of ecosystem) for (const field of ['label','tagline']) add(item[field],'owned ecosystem navigation');
  for (const item of categories) { add(item.label,'owned store category'); add(item.description,'owned store category introduction'); }
  for (const item of discoveryCategories) add(item.label,'owned discovery navigation');
  for (const text of EXAMPLE_PROMPTS) add(text,'owned rotating concierge placeholder');
  for (const text of ['Daily rate: {rate}','Guest capacity: {count}','Bedrooms: {count}','Guests: {count}','World','Category','Destination']) add(text,'owned discovery result labels; original search data is retained');
  return messages;
}
export function extract() {
  const source = readJSON('i18n/source.json');
  const context = readJSON('i18n/context.json');
  const found = discoverMessages();
  for (const [id,text] of coreMessages()) { source[id] = text; context[id] = {sourceHash:hash(text),description:'Owned source namespace. Translate complete messages and retain named slots.'}; }
  const samples = {
    'sample.me':'Landing at MIA on Friday at 3 PM, four of us. Something fun for Saturday?',
    'sample.them':'Welcome to Miami! I can meet you at MIA in the Mercedes-Maybach GLS, then take you out on the Azimut 68 Fly from Star Island on Saturday afternoon. Shall I add a dinner table after?',
    'sample.plan.0':'Maybach GLS · MIA',
    'sample.plan.1':'Azimut 68 Fly · Sat',
    'sample.plan.2':'Table request'
  };
  for (const [id,text] of Object.entries(samples)) { source[id] = text; context[id] = {sourceHash:hash(text),description:'Owned fictional concierge conversation example. Brand and place names retained.'}; }
  for (const [id,text,description] of ownedMessages()) {
    source[id] = text;
    context[id] = { sourceHash:hash(text), description:`Owned listing: ${description}. Product/brand/place names remain intact.` };
  }
  const keep = new Set([...found.keys()].map(messageId));
  for (const id of Object.keys(source)) if (id.startsWith('ui.') && !keep.has(id)) { delete source[id]; delete context[id]; }
  for (const [text,files] of found) {
    const id = messageId(text);
    source[id] = text;
    context[id] = {sourceHash:hash(text),description:`${[...files].join('; ')}. Owned display text; retain named slots, brands and URLs. Translate the whole message.`};
  }
  fs.writeFileSync(path.join(ROOT,'i18n/source.json'),JSON.stringify(source,null,2)+'\n');
  fs.writeFileSync(path.join(ROOT,'i18n/context.json'),JSON.stringify(context,null,2)+'\n');
  const flat = (object,prefix='') => Object.entries(object).flatMap(([key,value]) => typeof value === 'string' ? [[prefix+key,value]] : flat(value,prefix+key+'.'));
  const legacyEnglish = Object.fromEntries(flat(translations.en));
  const normalize = text => text.toLowerCase().trim().replace(/[.:!]+$/,'').trim();
  for (const locale of LOCALES) {
    const old = readLocale(locale), next = {};
    const legacyTarget = Object.fromEntries(flat(translations[locale]));
    const legacy = new Map();
    for (const [key,text] of Object.entries(legacyEnglish)) {
      if (!legacyTarget[key]) continue;
      const normalized = normalize(text);
      if (!legacy.has(normalized)) legacy.set(normalized,new Set());
      legacy.get(normalized).add(legacyTarget[key]);
    }
    const categoryCopy = new Map();
    for (const category of categories) {
      const key = category.slug.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
      if (translations.en.categories[key] === category.label) categoryCopy.set(category.label,translations[locale].categories[key]);
      if (translations.en.categoryDescriptions[key] === category.description) categoryCopy.set(category.description,translations[locale].categoryDescriptions[key]);
    }
    const revisionsPath = path.join(ROOT,`i18n/revisions/${locale}.json`);
    const revisions = fs.existsSync(revisionsPath) ? JSON.parse(fs.readFileSync(revisionsPath,'utf8')) : {};
    const nextRevisions = {};
    const known = new Map(Object.entries(source).filter(([id]) => old[id]).map(([id,text]) => [text.trim(),old[id]]));
    const knownBasis = new Map(Object.entries(source).filter(([id,text]) => old[id] && revisions[id] === hash(text)).map(([id,text]) => [text.trim(),hash(text)]));
    for (const [id,text] of Object.entries(source)) {
      if (locale === 'en') next[id] = text;
      else if (old[id]) { next[id] = old[id]; if (revisions[id]) nextRevisions[id] = revisions[id]; }
      else if (categoryCopy.has(text)) { next[id] = categoryCopy.get(text); nextRevisions[id] = hash(text); }
      else if (known.has(text.trim()) && knownBasis.has(text.trim())) {
        next[id] = known.get(text.trim()); nextRevisions[id] = hash(text);
      } else if (legacy.get(normalize(text))?.size === 1) {
        let value = [...legacy.get(normalize(text))][0];
        if (text.endsWith(':') && !value.endsWith(':')) value = value.replace(/[.!]$/,'')+':';
        next[id] = value; nextRevisions[id] = hash(text);
      }
    }
    writeLocale(locale,next);
    if (locale !== 'en') fs.writeFileSync(revisionsPath,JSON.stringify(nextRevisions,null,2)+'\n');
  }
  console.log(`Extracted ${found.size} UI messages; ${Object.keys(source).length} saved messages in total.`);
}
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--extract')) extract();
