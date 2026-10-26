// Shared, deterministic v1 contract. No credentials or database calls here.
/** @typedef {'car'|'yacht'|'stay'} ListingKind */
/** @typedef {{name:string,email:string,phone:string}} ListingContact */
/** @typedef {{brand:string,model:string,year:number|null,bodyType:string}} CarSpecs */
/** @typedef {{brand:string,model:string,year:number|null,lengthFt:number|null,guests:number|null}} YachtSpecs */
/** @typedef {{propertyType:string,bedrooms:number|null,bathrooms:number|null,guests:number|null}} StaySpecs */
/** @typedef {{schemaVersion:1,kind:ListingKind,title:string,description:string,location:string,priceCents:number|null,currency:string,priceUnit:'day'|'hour'|'night',contact:ListingContact,images:string[],specs:CarSpecs|YachtSpecs|StaySpecs}} ListingContent */
export const MAX_PHOTOS=20;
export const MAX_PHOTO_BYTES=8*1024*1024;
export const CAR_TYPES=['SUVs','Sedans','Convertibles','Sports Cars'];
export const PROPERTY_TYPES=['villa','apartment','house'];
export const CURRENCIES=['USD','EUR','AED','THB'];
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const MEDIA_PATH=/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
export class ListingValidationError extends Error {
 constructor(field){super('Invalid listing field: '+field);this.name='ListingValidationError';this.field=field;}
}
const invalid=field=>{throw new ListingValidationError(field);};
function object(value,keys,field){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))invalid(field);
 return value;
}
function text(value,max,field,required=false){
 if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))invalid(field);
 const result=value.trim();if(required&&!result)invalid(field);return result;
}
function number(value,min,max,field,required=false,integer=true){
 if(value===null&&!required)return null;
 if(typeof value!=='number'||!Number.isFinite(value)||(integer&&!Number.isSafeInteger(value))||value<min||value>max)invalid(field);
 return value;
}
/** @param {ListingKind} kind @returns {ListingContent} */
export function draftListing(kind='car'){
 if(!['car','yacht','stay'].includes(kind))invalid('kind');
 return {schemaVersion:1,kind,title:'',description:'',location:'',priceCents:null,currency:'USD',priceUnit:kind==='yacht'?'hour':kind==='stay'?'night':'day',contact:{name:'',email:'',phone:''},images:[],specs:kind==='car'?{brand:'',model:'',year:null,bodyType:'Sedans'}:kind==='yacht'?{brand:'',model:'',year:null,lengthFt:null,guests:null}:{propertyType:'villa',bedrooms:null,bathrooms:null,guests:null}};
}
/** @param {unknown} input @param {string} owner @returns {ListingContent} */
export function validateListing(input,owner,{complete=false,requireContact=complete,year=new Date().getUTCFullYear()}={}){
 const c=object(input,['schemaVersion','kind','title','description','location','priceCents','currency','priceUnit','contact','images','specs'],'content');
 if(c.schemaVersion!==1||!['car','yacht','stay'].includes(c.kind))invalid('schemaVersion');
 if(!CURRENCIES.includes(c.currency))invalid('currency');
 if(c.priceUnit!==({car:'day',yacht:'hour',stay:'night'})[c.kind])invalid('priceUnit');
 const result=draftListing(c.kind);
 for(const [field,max]of [['title',140],['description',5000],['location',160]])result[field]=text(c[field],max,field,complete);
 result.priceCents=number(c.priceCents,1,100000000,'priceCents',complete);
 result.currency=c.currency;
 const contact=object(c.contact,['name','email','phone'],'contact');
 for(const [field,max]of [['name',120],['email',254],['phone',40]])result.contact[field]=text(contact[field],max,'contact.'+field,requireContact);
 if(result.contact.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.contact.email))invalid('contact.email');
 if(result.contact.phone&&!/^\+?[0-9() .-]{7,40}$/.test(result.contact.phone))invalid('contact.phone');
 if(!UUID.test(owner)||!Array.isArray(c.images)||c.images.length>MAX_PHOTOS||new Set(c.images).size!==c.images.length||complete&&!c.images.length)invalid('images');
 for(const image of c.images)if(typeof image!=='string'||!MEDIA_PATH.test(image)||!image.startsWith(owner+'/')||!UUID.test(image.split('/')[1].split('.')[0]))invalid('images');
 result.images=[...c.images];
 const keys=Object.keys(result.specs),specs=object(c.specs,keys,'specs');
 for(const field of keys){
  const value=specs[field],name='specs.'+field;
  if(['brand','model'].includes(field))result.specs[field]=text(value,80,name,complete);
  else if(field==='year')result.specs[field]=number(value,1900,year+1,name,complete&&c.kind==='car');
  else if(field==='bodyType'){if(!CAR_TYPES.includes(value))invalid(name);result.specs[field]=value;}
  else if(field==='propertyType'){if(!PROPERTY_TYPES.includes(value))invalid(name);result.specs[field]=value;}
  else result.specs[field]=number(value,field==='bedrooms'?0:1,field==='lengthFt'?500:100,name,complete,field!=='lengthFt'&&field!=='bathrooms');
 }
 return result;
}
const crcTable=Uint32Array.from({length:256},(_,index)=>{let n=index;for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let n=0xffffffff;for(const byte of bytes)n=crcTable[(n^byte)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
/** Inspect bounded raster structure, checksums and dimensions. The UI also decodes each file before upload. */
export function inspectPhoto(input,declaredType){
 const b=new Uint8Array(input),v=new DataView(b.buffer,b.byteOffset,b.byteLength);
 const ascii=(at,n)=>String.fromCharCode(...b.subarray(at,at+n));
 let type,extension,width,height;
 if(b.length<24||b.length>MAX_PHOTO_BYTES)invalid('photo.size');
 if([137,80,78,71,13,10,26,10].every((byte,i)=>b[i]===byte)){
  type='image/png';extension='png';let header=false,data=false,end=false,palette=false,afterData=false;
  for(let at=8;at<b.length;){
   if(at+12>b.length)invalid('photo.format');
   const size=v.getUint32(at),name=ascii(at+4,4),next=at+12+size;
   if(next>b.length||!/^[A-Za-z]{4}$/.test(name)||crc32(b.subarray(at+4,at+8+size))!==v.getUint32(at+8+size))invalid('photo.format');
   if(!header&&name!=='IHDR'||name==='acTL')invalid('photo.format');
   if(name==='IHDR'){
    if(header||size!==13)invalid('photo.format');header=true;width=v.getUint32(at+8);height=v.getUint32(at+12);
    const depth=b[at+16],color=b[at+17];if(!({0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]})[color]?.includes(depth)||b[at+18]!==0||b[at+19]!==0||b[at+20]>1)invalid('photo.format');
   }else if(name==='PLTE'){if(palette||data||size<3||size>768||size%3)invalid('photo.format');palette=true;}
   else if(name==='IDAT'){if(afterData||!size||b[25]===3&&!palette)invalid('photo.format');data=true;}
   else if(name==='IEND'){if(size||!data||next!==b.length)invalid('photo.format');end=true;}
   else if(name[0]===name[0].toUpperCase())invalid('photo.format');
   if(data&&name!=='IDAT')afterData=true;
   at=next;
  }
  if(!end)invalid('photo.format');
 }else if(b[0]===255&&b[1]===216&&b.at(-2)===255&&b.at(-1)===217){
  type='image/jpeg';extension='jpg';
  let scan=false;
  for(let at=2;at+3<b.length;){
   if(b[at++]!==255)invalid('photo.format');
   while(b[at]===255)at++;
   const marker=b[at++];
   if(marker===217)break;
   if(marker===1||marker>=208&&marker<=215)continue;
   if(at+2>b.length)invalid('photo.format');
   const size=v.getUint16(at);if(size<2||at+size>b.length)invalid('photo.format');
   if(marker===218){if(!width||size<6||at+size>=b.length-2)invalid('photo.format');scan=true;break;}
   if([192,193,194].includes(marker)){if(size<8)invalid('photo.format');height=v.getUint16(at+3);width=v.getUint16(at+5);}
   at+=size;
  }if(!scan)invalid('photo.format');
 }else if(ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP'&&v.getUint32(4,true)===b.length-8){
  type='image/webp';extension='webp';const format=ascii(12,4);let image=false;
  for(let at=12;at<b.length;){if(at+8>b.length)invalid('photo.format');const n=v.getUint32(at+4,true),name=ascii(at,4);if(at+8+n+(n%2)>b.length||['ANIM','ANMF'].includes(name))invalid('photo.format');if(['VP8 ','VP8L'].includes(name)){if(image||n<5)invalid('photo.format');image=true;}at+=8+n+(n%2);}
  if(!image)invalid('photo.format');
  if(format==='VP8X'&&b.length>=30){if(b[20]&2)invalid('photo.animation');width=1+b[24]+(b[25]<<8)+(b[26]<<16);height=1+b[27]+(b[28]<<8)+(b[29]<<16);}
  else if(format==='VP8 '&&b.length>=30&&b[23]===157&&b[24]===1&&b[25]===42){width=v.getUint16(26,true)&16383;height=v.getUint16(28,true)&16383;}
  else if(format==='VP8L'&&b.length>=25&&b[20]===47){const bits=v.getUint32(21,true);width=(bits&16383)+1;height=((bits>>>14)&16383)+1;}
 }
 if(!type||declaredType!==type||!width||!height||width>8192||height>8192||width*height>24000000)invalid('photo.format');
 return {type,extension,width,height,size:b.length};
}
