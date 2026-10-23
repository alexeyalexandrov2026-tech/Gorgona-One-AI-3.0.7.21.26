import { walk } from './catalogue.mjs';

// Exact exceptions: brands, currency codes and a service address, never prose.
const exempt = new Map([
  ['app/admin/page.js',new Set(['/api/notify','USD','admin@gorgona.com'])],
  ['app/components/Header.jsx',new Set(['Miami','Elio'])],
  ['app/components/Footer.jsx',new Set(['Miami','Elio'])],
  ['app/components/ai/DiscoveryDock.jsx',new Set(['AI'])],
  ['app/entertainment/adrenaline-365/page.js',new Set(['Adrenaline 365'])],
  ['app/events/TicketNetworkEvents.jsx',new Set(['ET','Time TBA'])],
  ['app/events/TicketProviders.jsx',new Set(['TicketNetwork'])],
  ['app/partner/page.js',new Set(['USD ($)','EUR (€)','AED (د.إ)','THB (฿)'])],
  ['app/register/partner/page.js',new Set(['WhatsApp','Telegram'])],
  ['app/travel/ovago/page.js',new Set(['Ovago'])],
  ['app/page.js',new Set(['A1A'])]
]);
const displayAttributes = new Set(['placeholder','aria-label','title','alt']);
export function unmarkedDisplayText(file, ast, onFinding) {
  if (['app/yachts/YatrCatalog.jsx','app/vacation-rentals/Stay22Browse.jsx'].includes(file)) return [];
  const errors=[];
  const add = (text, node) => {
    const value=text.trim();
    if (/\p{L}/u.test(value) && !exempt.get(file)?.has(value)) { errors.push(`Unmarked owned display text: ${file}: ${value}`); onFinding?.(node); }
  };
  walk(ast,(node,parents)=>{
    if (parents.some(p=>p.type==='JSXElement' && ['script','style','svg'].includes(p.openingElement.name.name))) return;
    if (node.type==='JSXText') add(node.value,node);
    if (node.type==='JSXAttribute' && displayAttributes.has(node.name.name) && node.value?.type==='StringLiteral') {
      const owner=parents.find(p=>p.type==='JSXOpeningElement');
      if (owner?.name.name!=='LocalizedElement') add(node.value.value,node);
    }
    if (node.type==='StringLiteral') {
      const boundary=parents.findIndex(p=>p.type==='JSXExpressionContainer');
      if (boundary<0 || parents.some(p=>p.type==='JSXAttribute')) return;
      const chain=parents.slice(0,boundary);
      if (chain.every((p,index)=> {
        const child=index===0 ? node : chain[index-1];
        return (p.type==='LogicalExpression' && p.right===child) || (p.type==='ConditionalExpression' && p.test!==child);
      })) add(node.value,node);
    }
  });
  return errors;
}
