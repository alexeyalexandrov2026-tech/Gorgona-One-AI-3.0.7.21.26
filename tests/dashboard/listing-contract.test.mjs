import {test} from 'node:test';
import assert from 'node:assert/strict';
import {draftListing,validateListing,inspectPhoto,MAX_PHOTO_BYTES} from '../../lib/partnerListing.mjs';
import {pngFixture} from './photo-fixture.mjs';
const owner='33333333-3333-4333-8333-333333333333';
const photo=owner+'/55555555-5555-4555-8555-555555555555.jpg';
export function example(kind='car'){
 const c=draftListing(kind);
 Object.assign(c,{title:'Partner example',description:'A factual partner description.',location:'Miami Beach',priceCents:12500,contact:{name:'Partner',email:'partner@example.com',phone:'+1 305 555 0100'},images:[photo]});
 c.specs=kind==='car'?{brand:'BMW',model:'7 Series',year:2025,bodyType:'Sedans'}:kind==='yacht'?{brand:'Azimut',model:'68',year:2023,lengthFt:68,guests:10}:{propertyType:'villa',bedrooms:3,bathrooms:2,guests:6};
 return c;
}
test('versioned category contracts accept complete car, yacht and stay forms',()=>{
 for(const kind of ['car','yacht','stay'])assert.equal(validateListing(example(kind),owner,{complete:true}).kind,kind);
 assert.equal(validateListing(draftListing('car'),owner).title,'');
 assert.throws(()=>validateListing(draftListing('car'),owner,{complete:true}));
});
test('form rejects forged publication fields, wrong categories, prices and foreign media',()=>{
 for(const change of [{featured:true},{schemaVersion:2},{kind:'script'},{priceCents:-1},{priceCents:1.2},{images:['https://attacker.example/photo.jpg']},{images:['../private.jpg']},{images:[photo.replace(owner,'11111111-1111-4111-8111-111111111111')]},{specs:{brand:'BMW',model:'7',year:9000,bodyType:'Sedans'}},{contact:{name:'A',email:'bad',phone:'123'}}])assert.throws(()=>validateListing({...example(),...change},owner,{complete:true}));
 assert.throws(()=>validateListing({...example('stay'),priceUnit:'hour'},owner,{complete:true}));
 assert.throws(()=>validateListing({...example(),images:Array(21).fill(photo)},owner,{complete:true}));
});
test('photos are bounded raster files; active documents, spoofed types and huge dimensions are refused',()=>{
 const png=pngFixture();
 assert.equal(inspectPhoto(png,'image/png').extension,'png');
 assert.throws(()=>inspectPhoto(png,'image/jpeg'));
 assert.throws(()=>inspectPhoto(Buffer.from('<svg onload="alert(1)"/>'),'image/svg+xml'));
 assert.throws(()=>inspectPhoto(Buffer.alloc(MAX_PHOTO_BYTES+1),'image/png'));
 const large=Buffer.from(png);large.writeUInt32BE(99999,16);assert.throws(()=>inspectPhoto(large,'image/png'));
 const malformed=Buffer.alloc(32);malformed[0]=137;malformed.write('PNG',1);malformed.write('IHDR',12);malformed.writeUInt32BE(1,16);malformed.writeUInt32BE(1,20);malformed.write('IEND',24);
 assert.throws(()=>inspectPhoto(malformed,'image/png'));
 const corrupt=Buffer.from(png);corrupt[corrupt.length-20]^=1;assert.throws(()=>inspectPhoto(corrupt,'image/png'));
});
