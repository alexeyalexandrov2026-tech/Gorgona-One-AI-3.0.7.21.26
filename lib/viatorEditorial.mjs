// Our descriptive link labels. Each photo is the product's own cover image as
// supplied for display by the Viator Partner API (Full Access, checked
// 2026-11-22); descriptions, reviews and live prices stay on Viator.
const CDN='https://media-cdn.tripadvisor.com/media/attractions-splice-spp-720x480/';
const rows=[
 ['231628P7','Miami helicopter flight','Полёт на вертолёте над Майами','florida-flights','r/33/2e/01/ad/caption.jpg'],
 ['28744P2','Miami sightseeing cruise','Обзорный круиз по Майами','boats','12/75/14/7b.jpg'],
 ['5096P35','Everglades airboat trip from Miami','Аэролодка по Everglades из Майами','nature','r/32/8d/20/34/caption.jpg'],
 ['408277P1','Miami ATV night ride','Ночная поездка на квадроциклах в Майами','family','r/32/fe/8e/2a/caption.jpg'],
 ['5606753P1','Private yacht experience in Miami','Прогулка на частной яхте в Майами','boats','r/33/82/12/aa/caption.jpg'],
 ['328105P2','Private Miami boat charter','Частная прогулка на лодке в Майами','boats','r/33/16/0a/f3/caption.jpg'],
 ['5304HAVANA','Little Havana food walk','Гастрономическая прогулка по Little Havana','family','06/6e/e5/1a.jpg'],
 ['35834P1','Miami speedboat sightseeing','Обзорная прогулка на скоростном катере','boats','07/35/b7/49.jpg'],
 ['21428P2','Small-group Everglades trip','Поездка в Everglades небольшой группой','nature','r/33/38/5d/cd/caption.jpg'],
 ['38439P1','Key West day trip from Miami','Поездка из Майами в Key West','family','06/71/3f/9f.jpg'],
 ['5493174P5','Explore Miami by city tour','Обзорная экскурсия по Майами','family','14/05/69/05.jpg'],
 ['454994P2','Miami yacht with a captain','Яхта с капитаном в Майами','boats','12/48/6d/dc.jpg'],
 ['5606753P3','Pink yacht experience in Miami','Прогулка на розовой яхте в Майами','boats','r/34/82/ee/51/caption.jpg'],
 ['10150P16','Boat trip to Raccoon Island','Прогулка на лодке к Raccoon Island','boats','r/32/a3/b2/c5/caption.jpg'],
 ['5865P8','Everglades from Fort Lauderdale','Everglades из Форт-Лодердейла','nature','0b/a8/b0/0a.jpg'],
 ['8836P1','Biscayne Bay sightseeing cruise','Обзорный круиз по заливу Бискейн','boats','13/d8/7d/c3.jpg'],
 ['169162P2','Private boat trip on Biscayne Bay','Частная прогулка по заливу Бискейн','boats','09/f9/4f/f3.jpg'],
 ['342209P11','Raccoon Island by kayak or SUP','К Raccoon Island на каяке или SUP','boats','12/61/b0/fd.jpg'],
 ['408277P4','Miami ATV rental experience','Поездка на квадроциклах в Майами','family','r/33/cf/94/67/caption.jpg'],
 ['288880P1','Private Miami boat with a captain','Частная лодка с капитаном в Майами','boats','12/4d/21/22.jpg'],
 // Replaces the Panama City Beach official-site cards, which earned nothing.
 ['170398P1','Scream Machine thrill ride','Аттракцион Scream Machine на воде','family','12/33/98/47.jpg','Panama City Beach']
];
export const VIATOR_EDITORIAL=Object.freeze(Object.fromEntries(rows.map(([productCode,title,titleRu,section,photo,location='Miami / South Florida'])=>[
 productCode,
 Object.freeze({title,titleRu,section,image:CDN+photo,imageAlt:title,imageSource:'https://partnerresources.viator.com/',imageCredit:'Viator',location})
])));
