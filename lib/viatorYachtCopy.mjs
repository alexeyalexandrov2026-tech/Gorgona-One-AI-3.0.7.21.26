// Interface copy of the Viator yacht charters section on /yachts, in the
// sixteen site languages. Product titles are English and Russian only, as for
// the other Viator cards.
const keys=['title','lead','cities'];
const rows={
 en:'Private yacht and boat charters from Key West to Palm Beach|Private charters from Viator partners along Florida’s coast. Details, dates and prices are confirmed on Viator.|Cities',
 ru:'Частные яхты и лодки от Key West до Palm Beach|Частные чартеры партнёров Viator вдоль побережья Флориды. Подробности, даты и цены подтверждаются на Viator.|Города',
 es:'Yates y barcos privados de Key West a Palm Beach|Chárteres privados de socios de Viator a lo largo de la costa de Florida. Los detalles, las fechas y los precios se confirman en Viator.|Ciudades',
 he:'יאכטות וסירות פרטיות מקי ווסט עד פאלם ביץ׳|שכירות פרטית של שותפי Viator לאורך חוף פלורידה. הפרטים, התאריכים והמחירים מאושרים ב-Viator.|ערים',
 zh:'从基韦斯特到棕榈滩的私人游艇与游船包租|Viator 合作伙伴提供的佛罗里达海岸私人包船服务。详情、日期和价格以 Viator 页面为准。|城市',
 pt:'Iates e barcos particulares de Key West a Palm Beach|Fretamentos privados de parceiros da Viator ao longo da costa da Flórida. Detalhes, datas e preços são confirmados na Viator.|Cidades',
 uk:'Приватні яхти та човни від Key West до Palm Beach|Приватні чартери партнерів Viator уздовж узбережжя Флориди. Подробиці, дати й ціни підтверджуються на Viator.|Міста',
 ja:'キーウェストからパームビーチまでのプライベートヨット・ボートチャーター|フロリダ沿岸のViatorパートナーによるプライベートチャーター。詳細、日程、料金はViatorで確認されます。|都市',
 ko:'키웨스트에서 팜비치까지 프라이빗 요트·보트 차터|플로리다 해안의 Viator 파트너가 제공하는 프라이빗 차터입니다. 세부 정보, 날짜, 요금은 Viator에서 확정됩니다.|도시',
 de:'Private Yachten und Boote von Key West bis Palm Beach|Private Charter von Viator-Partnern entlang der Küste Floridas. Details, Termine und Preise werden bei Viator bestätigt.|Städte',
 ar:'يخوت وقوارب خاصة من كي ويست إلى بالم بيتش|رحلات خاصة من شركاء Viator على ساحل فلوريدا. تُؤكَّد التفاصيل والتواريخ والأسعار على Viator.|المدن',
 tr:'Key West’ten Palm Beach’e özel yat ve tekne kiralama|Viator iş ortaklarından Florida kıyısı boyunca özel kiralamalar. Ayrıntılar, tarihler ve fiyatlar Viator’da onaylanır.|Şehirler',
 fa:'یات‌ها و قایق‌های خصوصی از کی‌وست تا پالم بیچ|کرایه‌های خصوصی شرکای Viator در امتداد سواحل فلوریدا. جزئیات، تاریخ‌ها و قیمت‌ها در Viator تأیید می‌شود.|شهرها',
 it:'Yacht e barche private da Key West a Palm Beach|Noleggi privati di partner Viator lungo la costa della Florida. Dettagli, date e prezzi si confermano su Viator.|Città',
 fr:'Yachts et bateaux privés de Key West à Palm Beach|Locations privées de partenaires Viator le long de la côte de Floride. Détails, dates et tarifs sont confirmés sur Viator.|Villes',
 pl:'Prywatne jachty i łodzie od Key West do Palm Beach|Prywatne czartery partnerów Viator wzdłuż wybrzeża Florydy. Szczegóły, terminy i ceny potwierdza Viator.|Miasta'
};
export const VIATOR_YACHT_COPY=Object.freeze(Object.fromEntries(Object.entries(rows).map(([locale,row])=>{
 const values=row.split('|');
 if(values.length!==keys.length)throw Error('Invalid yacht section translation: '+locale);
 return [locale,Object.freeze(Object.fromEntries(keys.map((key,index)=>[key,values[index]])))];
})));
export function getViatorYachtCopy(locale){return VIATOR_YACHT_COPY[locale]||VIATOR_YACHT_COPY.en;}
