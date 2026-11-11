// Synthetic customer requests: no personal details, orders, payments or outreach.
const localized={
 en:['Rent a yacht','Rent a car','Book a restaurant','Concert tickets','Rent a villa'],
 ru:['Нужна яхта','Хочу арендовать машину','Забронировать ресторан','Билеты на концерт','Арендовать виллу'],
 uk:['Потрібна яхта','Оренда автомобіля','Забронювати ресторан','Квитки на концерт','Орендувати віллу'],
 es:['Alquilar un yate','Alquilar un coche','Reservar restaurante','Entradas para concierto','Alquilar villa'],
 pt:['Alugar um iate','Alugar carro','Reservar restaurante','Ingressos para concerto','Alugar uma vila'],
 de:['Eine Yacht mieten','Ein Auto mieten','Restaurant reservieren','Konzerttickets','Villa mieten'],
 fr:['Louer un yacht','Louer une voiture','Réserver un restaurant','Billets de concert','Louer une villa'],
 it:['Noleggiare uno yacht','Noleggiare auto','Prenotare ristorante','Biglietti concerto','Affittare villa'],
 pl:['Wynajem jachtu','Wynajem samochodu','Rezerwacja restauracji','Bilety na koncert','Wynajem willi'],
 tr:['Yat kiralama','Araba kiralama','Restoran rezervasyonu','Konser bileti','Villa kiralama'],
 he:['השכרת יאכטה','השכרת רכב','הזמנת מסעדה','כרטיסים להופעה','השכרת וילה'],
 ar:['استئجار يخت','تأجير سيارة','حجز مطعم','تذاكر حفل','استئجار فيلا'],
 fa:['اجاره قایق','اجاره خودرو','رزرو رستوران','بلیط کنسرت','اجاره ویلا'],
 zh:['租一艘游艇','租一辆汽车','预订餐厅','音乐会门票','租一栋别墅'],
 ja:['ヨットを借りたい','レンタカーを予約','レストランを予約','コンサートチケット','ヴィラを予約'],
 ko:['요트를 빌리고 싶어요','렌터카 예약','레스토랑 예약','콘서트 티켓','빌라 예약']
};
const routes=['/yachts','/rentals','/restaurants-nightlife','/events','/vacation-rentals'];
export const cases=Object.entries(localized).flatMap(([locale,queries])=>queries.map((query,i)=>({locale,query,expected:routes[i]})));
cases.push(...[
 ['en','Find flights to New York','/travel'],['ru','Авиабилеты из Майами в Нью-Йорк','/travel'],
 ['en','Book a hotel','/travel'],['ru','Найти отель в Майами','/travel'],
 ['en','Everglades airboat adventure','/experiences'],['ru','Экскурсия в Эверглейдс','/experiences'],
 ['en','Sportsbook odds and bonuses','/sportsbook'],['ru','Букмекерские ставки','/sportsbook'],
 ['en','Private jet from Miami to New York','/private-jets'],['ru','Частный самолёт из Майами в Нью-Йорк','/private-jets'],
 ['en','VIP nightclub bottle service','/restaurants-nightlife'],['ru','VIP стол в ночном клубе','/restaurants-nightlife'],
 ['en','I need a yacht and a car','/yachts','/rentals'],
 ['ru','Нужна яхта и машина','/yachts','/rentals']
].map(([locale,query,expected,also])=>({locale,query,expected,...(also?{also}:{})})));
export const followups=[
 {locale:'en',messages:[{role:'user',content:'I need a yacht'},{role:'assistant',content:'How many guests?'},{role:'user',content:'For 8 guests tomorrow'}],expected:'/yachts'},
 {locale:'ru',messages:[{role:'user',content:'Хочу арендовать машину'},{role:'assistant',content:'На сколько дней?'},{role:'user',content:'На три дня с завтра'}],expected:'/rentals'}
];
