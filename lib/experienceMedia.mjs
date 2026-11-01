// Independently licensed editorial photographs, not Viator product photographs.
// Source pages explicitly say "Free to use under the Unsplash License".
const license='https://unsplash.com/license';
const rows=[
 ['miami-aerial','Ryan Parker','mqpawAQXRyA','photo-1506966953602-c20cc11f75e3','Downtown Miami from the air'],
 ['miami-coast','Mark','D3cC-j2-pP4','photo-1530071291164-537d481750f4','South Beach, Miami'],
 ['everglades','Laurenz Krabisch','99m_kTTf_Mw','photo-1674465147089-0adc98453939','Everglades wetlands'],
 ['miami-yacht','Zoshua Colah','DHh-_b8ia9M','photo-1740482882563-bccef548b8dc','Yacht in Miami Beach; illustrative vessel'],
 ['little-havana','Kian Lem','fNNlAxGMVMw','photo-1574167630074-8221b69f8b98','Little Havana, Miami'],
 ['key-west','Lynn Danielson','Zo54r3Gh4QY','photo-1643594959163-32dd6f8bcfc5','Smathers Beach, Key West'],
 ['atv','matthew smith','joeBXwvA434','photo-1623173126028-2c32599fe423','ATV at sunset in Halifax; illustrative photo, not the Miami tour'],
 ['panama-city-beach','Felipe Callado','p7LpPjeHgFc','photo-1719679169567-2a276181f872','Panama City Beach coastline; destination photo, not the park']
];
export const EXPERIENCE_MEDIA=Object.freeze(Object.fromEntries(rows.map(([id,author,photoId,asset,alt])=>[id,Object.freeze({
 image:'/images/experiences/'+id+'.webp',source:'https://unsplash.com/photos/'+photoId,license,author,alt,
 original:'https://images.unsplash.com/'+asset,verifiedAt:'2026-10-31',illustrative:true
})])));
