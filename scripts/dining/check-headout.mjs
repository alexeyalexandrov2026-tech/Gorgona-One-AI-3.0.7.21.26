// Explicit, read-only sandbox acceptance. No customer data or booking operations.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHeadoutReadClient} from '../../lib/server/headoutApi.mjs';
import {HEADOUT_AFFILIATE_CODE} from '../../lib/headoutCatalog.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
const configPath=process.env.HEADOUT_SANDBOX_CONFIG,output=process.env.HEADOUT_SANDBOX_RESULTS;
assert.ok(configPath&&path.isAbsolute(configPath)&&output&&path.isAbsolute(output),'Explicit private config and results paths required');
assert.ok(!fs.realpathSync(configPath).startsWith(root+path.sep),'Keep credentials outside Git');
const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
assert.equal(config.environment,'sandbox');assert.equal(config.baseUrl,'https://www.sandbox-headout.com');
const client=createHeadoutReadClient({...config,affiliateCode:HEADOUT_AFFILIATE_CODE});
await client.listCities();
const products=new Map();let offset=0,finished=false;
for(let page=0;page<10;page++){
 const result=await client.listProducts('MIAMI',{offset,campaignName:'miami-elio-dining-sandbox'});
 for(const product of result.items){assert.equal(product.city.code,'MIAMI');products.set(product.id,product);}
 if(result.nextOffset===null){finished=true;break;}offset=result.nextOffset;
}
assert.ok(finished,'Bounded catalogue traversal must complete before reporting an audit');
const culinary=[...products.values()].filter(product=>/\b(food|culinary|cooking|dining|dinner|wine|tasting|brunch|lunch|caf[eé])\b/i.test([product.name,product.category,product.subcategory].join(' ')));
const sample=[...culinary,...products.values()].find(product=>product.inventorySelectionType==='NORMAL'&&product.variants.length);
assert.ok(sample,'A normal product with a verified variant is required for date acceptance');
const startDate=new Date(Date.now()+86400000).toISOString().slice(0,10),endDate=new Date(Date.now()+8*86400000).toISOString().slice(0,10);
const availability=await client.listDateAvailability(sample.id,sample.variants[0].id,{startDate,endDate});
const result={checkedAt:new Date().toISOString(),environment:'sandbox',apiVersion:2,city:'MIAMI',productsAudited:products.size,culinaryCandidates:culinary.map(p=>({id:p.id,name:p.name,category:p.category,subcategory:p.subcategory})),dateAcceptance:{productId:sample.id,variantId:sample.variants[0].id,startDate,endDate,returnedDates:availability.items.map(row=>({date:row.date,availability:row.availability})),slots:availability.slots,confirmation:availability.confirmation},bookingCreationEnabled:false,productionInventoryVerified:false,credentialsPrinted:false};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
