// Approved editorial templates for the new canonical venue descriptions.
// Run after npm run i18n:extract; never use a live translation service at render time.
import {readFileSync,writeFileSync} from 'node:fs';
import {hash,LOCALES,readLocale,writeLocale} from '../i18n/catalogue.mjs';
const templates={
 en:'Music, cocktails and a night out in Miami.|Dining with coastal views.|A welcoming table in an outdoor setting.|Dining and private celebrations in Miami.|Discover a different side of Miami dining.',
 ru:'Музыка, коктейли и вечер в Майами.|Ужин с видом на побережье.|Гостеприимный столик под открытым небом.|Ужины и частные торжества в Майами.|Откройте другую сторону гастрономического Майами.',
 es:'Música, cócteles y una noche en Miami.|Una mesa con vistas a la costa.|Una mesa acogedora al aire libre.|Cenas y celebraciones privadas en Miami.|Descubra otra cara de la gastronomía de Miami.',
 he:'מוזיקה, קוקטיילים ובילוי לילי במיאמי.|ארוחה עם נוף לחוף.|שולחן מזמין באוויר הפתוח.|ארוחות ואירועים פרטיים במיאמי.|גלו צד אחר של הקולינריה במיאמי.',
 zh:'音乐、鸡尾酒与迈阿密之夜。|欣赏海岸景色的用餐体验。|户外环境中的温馨餐桌。|迈阿密的美食与私人庆典。|探索迈阿密美食的另一面。',
 pt:'Música, coquetéis e uma noite em Miami.|Refeições com vista para a costa.|Uma mesa acolhedora ao ar livre.|Jantares e celebrações privadas em Miami.|Descubra outro lado da gastronomia de Miami.',
 uk:'Музика, коктейлі та вечір у Маямі.|Вечеря з видом на узбережжя.|Гостинний столик просто неба.|Вечері та приватні святкування в Маямі.|Відкрийте інший бік гастрономічного Маямі.',
 ja:'音楽とカクテルで楽しむマイアミの夜。|海岸の景色を楽しむ食事。|開放的な屋外でくつろぐ食卓。|マイアミでの食事とプライベートなお祝い。|マイアミの食の新たな一面を発見。',
 ko:'음악과 칵테일로 즐기는 마이애미의 밤.|해안 전망과 함께하는 식사.|야외에서 즐기는 따뜻한 식탁.|마이애미에서 즐기는 식사와 프라이빗 행사.|마이애미 미식의 새로운 모습을 발견하세요.',
 de:'Musik, Cocktails und eine Nacht in Miami.|Essen mit Blick auf die Küste.|Ein einladender Tisch im Freien.|Essen und private Feiern in Miami.|Entdecken Sie eine andere Seite von Miamis Küche.',
 ar:'موسيقى وكوكتيلات وليلة في ميامي.|تناول الطعام مع إطلالات ساحلية.|طاولة ترحيبية في الهواء الطلق.|تناول الطعام والاحتفالات الخاصة في ميامي.|اكتشف جانباً مختلفاً من مطاعم ميامي.',
 tr:'Müzik, kokteyller ve Miami’de bir gece.|Sahil manzarası eşliğinde yemek.|Açık havada sıcak bir sofra.|Miami’de yemek ve özel kutlamalar.|Miami mutfağının farklı bir yönünü keşfedin.',
 fa:'موسیقی، کوکتل و شبی در میامی.|صرف غذا با چشم‌انداز ساحل.|میزی دلپذیر در فضای باز.|غذا و جشن‌های خصوصی در میامی.|جنبه‌ای متفاوت از آشپزی میامی را کشف کنید.',
 it:'Musica, cocktail e una serata a Miami.|Una cena con vista sulla costa.|Una tavola accogliente all’aperto.|Cene e feste private a Miami.|Scoprite un altro lato della cucina di Miami.',
 fr:'Musique, cocktails et soirée à Miami.|Un repas avec vue sur la côte.|Une table accueillante en plein air.|Repas et célébrations privées à Miami.|Découvrez une autre facette de la gastronomie de Miami.',
 pl:'Muzyka, koktajle i wieczór w Miami.|Posiłek z widokiem na wybrzeże.|Gościnny stół na świeżym powietrzu.|Kolacje i prywatne uroczystości w Miami.|Odkryj inne oblicze kuchni Miami.'
};
const source=JSON.parse(readFileSync(new URL('../../i18n/source.json',import.meta.url),'utf8'));
const english=templates.en.split('|');
for(const locale of LOCALES){
 const values=templates[locale].split('|');if(values.length!==english.length)throw Error('Invalid template locale');
 const messages=readLocale(locale),path=new URL('../../i18n/revisions/'+locale+'.json',import.meta.url);
 const revisions=locale==='en'?{}:JSON.parse(readFileSync(path,'utf8'));
 for(const [id,text] of Object.entries(source))if(id.startsWith('listing.')&&id.endsWith('.description')&&english.includes(text)){
  messages[id]=values[english.indexOf(text)];if(locale!=='en')revisions[id]=hash(text);
 }
 for(const [id,text] of Object.entries(source))if(text==='Eatwith'){messages[id]=text;if(locale!=='en')revisions[id]=hash(text);}
 writeLocale(locale,messages);if(locale!=='en')writeFileSync(path,JSON.stringify(revisions,null,2)+'\n');
}
