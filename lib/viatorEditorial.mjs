import {EXPERIENCE_MEDIA} from './experienceMedia.mjs';

// Our descriptive link labels and independently licensed destination photographs.
// These are not copied supplier descriptions, tour photographs or live prices.
const rows=[
 ['231628P7','Miami helicopter flight','Полёт на вертолёте над Майами','miami-aerial','florida-flights'],
 ['28744P2','Miami sightseeing cruise','Обзорный круиз по Майами','miami-coast','boats'],
 ['5096P35','Everglades airboat trip from Miami','Аэролодка по Everglades из Майами','everglades','nature'],
 ['408277P1','Miami ATV night ride','Ночная поездка на квадроциклах в Майами','atv','family'],
 ['5606753P1','Private yacht experience in Miami','Прогулка на частной яхте в Майами','miami-yacht','boats'],
 ['328105P2','Private Miami boat charter','Частная прогулка на лодке в Майами','miami-coast','boats'],
 ['5304HAVANA','Little Havana food walk','Гастрономическая прогулка по Little Havana','little-havana','family'],
 ['35834P1','Miami speedboat sightseeing','Обзорная прогулка на скоростном катере','miami-coast','boats'],
 ['21428P2','Small-group Everglades trip','Поездка в Everglades небольшой группой','everglades','nature'],
 ['38439P1','Key West day trip from Miami','Поездка из Майами в Key West','key-west','family'],
 ['5493174P5','Explore Miami by city tour','Обзорная экскурсия по Майами','miami-aerial','family'],
 ['454994P2','Miami yacht with a captain','Яхта с капитаном в Майами','miami-yacht','boats'],
 ['5606753P3','Pink yacht experience in Miami','Прогулка на розовой яхте в Майами','miami-coast','boats'],
 ['10150P16','Boat trip to Raccoon Island','Прогулка на лодке к Raccoon Island','miami-coast','boats'],
 ['5865P8','Everglades from Fort Lauderdale','Everglades из Форт-Лодердейла','everglades','nature'],
 ['8836P1','Biscayne Bay sightseeing cruise','Обзорный круиз по заливу Бискейн','miami-coast','boats'],
 ['169162P2','Private boat trip on Biscayne Bay','Частная прогулка по заливу Бискейн','miami-aerial','boats'],
 ['342209P11','Raccoon Island by kayak or SUP','К Raccoon Island на каяке или SUP','miami-coast','boats'],
 ['408277P4','Miami ATV rental experience','Поездка на квадроциклах в Майами','atv','family'],
 ['288880P1','Private Miami boat with a captain','Частная лодка с капитаном в Майами','miami-yacht','boats']
];
export const VIATOR_EDITORIAL=Object.freeze(Object.fromEntries(rows.map(([productCode,title,titleRu,mediaId,section])=>{
 const media=EXPERIENCE_MEDIA[mediaId];
 return [productCode,Object.freeze({title,titleRu,section,image:media.image,imageAlt:media.alt,imageSource:media.source,imageLicense:media.license,imageCredit:media.author,illustrative:true,location:'Miami / South Florida'})];
})));
