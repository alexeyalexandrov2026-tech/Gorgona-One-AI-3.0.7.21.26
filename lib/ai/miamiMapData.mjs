// Offline-First Interactive Miami Day Route Map data, real GPS projection,
// Haversine + Miami causeway travel-time estimator, free Apple/Google/Waze
// navigation deep-links, and 16-language UI copy ($0/month, zero API keys).

import { normalizeLocale } from './locale.js';
import { buildDayTimeline } from './dayTimeline.mjs';

export const MIAMI_BOUNDS = Object.freeze({
  minLat: 25.675,
  maxLat: 25.965,
  minLng: -80.325,
  maxLng: -80.105,
  width: 480,
  height: 540
});

// Accurate geographic projection from WGS84 (lat, lng) -> SVG (x, y)
export function projectMiamiCoord(lat, lng) {
  const { minLat, maxLat, minLng, maxLng, width, height } = MIAMI_BOUNDS;
  const x = ((Number(lng) - minLng) / (maxLng - minLng)) * width;
  const y = ((maxLat - Number(lat)) / (maxLat - minLat)) * height;
  return {
    x: Math.round(Math.max(12, Math.min(width - 12, x)) * 10) / 10,
    y: Math.round(Math.max(12, Math.min(height - 12, y)) * 10) / 10,
    inBounds: lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
  };
}

export function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function estimateMiamiMinutes(from, to, kind = 'car') {
  const km = haversineKm(from, to);
  if (kind === 'yacht') return Math.max(15, Math.round((km / 18) * 60));
  // Miami urban + causeway average ~28 km/h + 5 min valet/bridge buffer
  return Math.max(6, Math.round((km / 28) * 60 + 5));
}

export function buildFreeNavLinks(stop) {
  const lat = Number(stop.lat).toFixed(5);
  const lng = Number(stop.lng).toFixed(5);
  const q = encodeURIComponent(stop.title || 'Miami');
  return {
    appleMaps: `https://maps.apple.com/?daddr=${lat},${lng}&q=${q}&dirflg=d`,
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
  };
}

// Curated Greater Miami luxury coordinates (100% offline bundled)
export const MIAMI_PLACES = Object.freeze([
  { id: 'opf', match: /opf|opa[\s-]?locka|private\s*jet|fbo|fontainebleau\s*aviation/i, title: 'OPF Private FBO', area: 'Opa-Locka', kind: 'car', lat: 25.9070, lng: -80.2784, href: '/private-jets' },
  { id: 'mia', match: /\bmia\b|miami\s*international|аэропорт|а\/п/i, title: 'MIA Airport VIP', area: 'Miami Intl', kind: 'car', lat: 25.7959, lng: -80.2870, href: '/rentals' },
  { id: 'mb-marina', match: /miami\s*beach\s*marina|azimut|yacht|яхт|charter|чартер|biscayne|бискейн/i, title: 'Miami Beach Marina', area: 'South of Fifth', kind: 'yacht', lat: 25.7745, lng: -80.1404, href: '/yachts' },
  { id: 'star-island', match: /star\s*island|sunset\s*cruise|island|круиз|остров/i, title: 'Biscayne Bay & Star Island', area: 'Biscayne Bay', kind: 'yacht', lat: 25.7770, lng: -80.1510, href: '/yachts' },
  { id: 'komodo', match: /komodo|комодо/i, title: 'Komodo Brickell', area: 'Brickell', kind: 'dining', lat: 25.7662, lng: -80.1912, href: '/restaurants-nightlife' },
  { id: 'papi-steak', match: /papi\s*steak|папи/i, title: 'Papi Steak', area: 'South Beach', kind: 'dining', lat: 25.7717, lng: -80.1338, href: '/restaurants-nightlife' },
  { id: 'carbone', match: /carbone|карбоне/i, title: 'Carbone Miami', area: 'South of Fifth', kind: 'dining', lat: 25.7740, lng: -80.1329, href: '/restaurants-nightlife' },
  { id: 'cote', match: /\bcote\b|design\s*district/i, title: 'COTE Miami', area: 'Design District', kind: 'dining', lat: 25.8126, lng: -80.1919, href: '/restaurants-nightlife' },
  { id: 'sexy-fish', match: /sexy\s*fish|brickell|брикелл/i, title: 'Sexy Fish Brickell', area: 'Brickell', kind: 'dining', lat: 25.7644, lng: -80.1920, href: '/restaurants-nightlife' },
  { id: 'liv', match: /\bliv\b|fontainebleau|nightlife|клуб/i, title: 'LIV Fontainebleau', area: 'Mid-Beach', kind: 'dining', lat: 25.8179, lng: -80.1229, href: '/restaurants-nightlife' },
  { id: 'e11even', match: /e11even|eleven|downtown/i, title: 'E11EVEN Miami', area: 'Downtown', kind: 'dining', lat: 25.7848, lng: -80.1930, href: '/restaurants-nightlife' },
  { id: 'setai', match: /setai|faena|south\s*beach|villa|вилл|hotel|отел/i, title: 'South Beach Luxury Villas', area: 'Miami Beach', kind: 'stay', lat: 25.7956, lng: -80.1282, href: '/vacation-rentals' },
  { id: 'sunny-isles', match: /sunny\s*isles|bal\s*harbour|haulover|st\.?\s*regis/i, title: 'Bal Harbour & Sunny Isles', area: 'North Beach', kind: 'stay', lat: 25.8892, lng: -80.1235, href: '/vacation-rentals' },
  { id: 'wynwood', match: /wynwood|винвуд/i, title: 'Wynwood Arts District', area: 'Wynwood', kind: 'experience', lat: 25.8010, lng: -80.1994, href: '/experiences' },
  { id: 'key-biscayne', match: /key\s*biscayne|coconut\s*grove|coral\s*gables/i, title: 'Key Biscayne & Grove', area: 'Key Biscayne', kind: 'experience', lat: 25.7025, lng: -80.1650, href: '/experiences' },
  { id: 'fleet', match: /lamborghini|urus|ferrari|rolls|bentley|mclaren|porsche|g63|авто|машин|car/i, title: 'Miami Beach Supercar Handover', area: 'South Beach', kind: 'car', lat: 25.7826, lng: -80.1304, href: '/rentals' }
]);

const DEFAULT_SIGNATURE_STOPS = Object.freeze([
  { id: 'sig-1', kind: 'car', time: '13:30', title: 'OPF Private FBO · Urus SE', area: 'Opa-Locka', lat: 25.9070, lng: -80.2784, href: '/rentals' },
  { id: 'sig-2', kind: 'yacht', time: '14:30', title: 'Miami Beach Marina · 60ft Azimut', area: 'South of Fifth', lat: 25.7745, lng: -80.1404, href: '/yachts' },
  { id: 'sig-3', kind: 'yacht', time: '16:00', title: 'Biscayne Bay & Star Island', area: 'Biscayne Bay', lat: 25.7770, lng: -80.1510, href: '/yachts' },
  { id: 'sig-4', kind: 'dining', time: '19:30', title: 'Komodo Brickell · VIP Table', area: 'Brickell', lat: 25.7662, lng: -80.1912, href: '/restaurants-nightlife' }
]);

function placeForStop(stop) {
  const hay = `${stop.title || ''} ${stop.label || ''} ${stop.href || ''}`;
  for (const place of MIAMI_PLACES) {
    if (place.match.test(hay)) return place;
  }
  if (stop.kind === 'yacht') return MIAMI_PLACES.find((p) => p.id === 'mb-marina');
  if (stop.kind === 'car') return MIAMI_PLACES.find((p) => p.id === 'fleet');
  if (stop.kind === 'dining' || stop.kind === 'nightlife') return MIAMI_PLACES.find((p) => p.id === 'komodo');
  if (stop.kind === 'stay') return MIAMI_PLACES.find((p) => p.id === 'setai');
  return MIAMI_PLACES.find((p) => p.id === 'wynwood');
}

export function resolveMiamiRouteStops({ messages = [], plan = null, listings = [], locale = 'en' } = {}) {
  const rawStops = [];
  const seen = new Set();

  // 1. Prefer structured plan stops built by ELIO+ Guide
  const timeline = buildDayTimeline(plan, null, locale);
  for (const stop of timeline) {
    const place = placeForStop(stop);
    if (!place) continue;
    const key = `${place.id}:${stop.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rawStops.push({
      id: stop.id,
      kind: stop.kind === 'nightlife' ? 'dining' : stop.kind,
      time: stop.time,
      title: stop.title,
      area: place.area,
      price: stop.price || null,
      lat: place.lat,
      lng: place.lng,
      href: stop.href || place.href
    });
  }

  // 2. Complement with explicit listings or mentioned places from latest conversation
  if (rawStops.length < 2 && Array.isArray(listings) && listings.length > 0) {
    const defaultTimes = ['11:30', '14:30', '19:30', '22:00'];
    for (const item of listings.slice(0, 4)) {
      const place = placeForStop({ title: item.title, label: item.neighborhood || '', href: item.href, kind: item.kind });
      if (!place || seen.has(place.id)) continue;
      seen.add(place.id);
      rawStops.push({
        id: `list-${item.slug || rawStops.length}`,
        kind: item.kind === 'nightlife' ? 'dining' : (item.kind || place.kind),
        time: defaultTimes[rawStops.length] || '16:00',
        title: item.title,
        area: item.neighborhood || place.area,
        price: item.price || null,
        lat: place.lat,
        lng: place.lng,
        href: item.href || place.href
      });
    }
  }

  // 3. Scan recent user/assistant text for iconic Miami landmarks (e.g. OPF, Komodo, Urus)
  if (rawStops.length < 2 && Array.isArray(messages) && messages.length > 0) {
    const recentText = messages.slice(-4).map((m) => m?.content || '').join(' ');
    const defaultTimes = ['13:30', '15:00', '19:30', '22:00'];
    for (const place of MIAMI_PLACES) {
      if (rawStops.length >= 4) break;
      if (place.match.test(recentText) && !seen.has(place.id)) {
        seen.add(place.id);
        rawStops.push({
          id: `txt-${place.id}`,
          kind: place.kind,
          time: defaultTimes[rawStops.length] || '16:00',
          title: place.title,
          area: place.area,
          price: null,
          lat: place.lat,
          lng: place.lng,
          href: place.href
        });
      }
    }
  }

  const chosen = rawStops.length > 0 ? rawStops.slice(0, 5) : [...DEFAULT_SIGNATURE_STOPS];
  let totalDriveMin = 0;

  const stops = chosen.map((stop, idx) => {
    const prev = idx > 0 ? chosen[idx - 1] : null;
    const legMin = prev ? estimateMiamiMinutes(prev, stop, stop.kind) : 0;
    const legKm = prev ? Math.round(haversineKm(prev, stop) * 10) / 10 : 0;
    totalDriveMin += legMin;
    const pt = projectMiamiCoord(stop.lat, stop.lng);
    return {
      ...stop,
      number: String(idx + 1).padStart(2, '0'),
      x: pt.x,
      y: pt.y,
      legMin,
      legKm,
      nav: buildFreeNavLinks(stop)
    };
  });

  return {
    stops,
    isSignaturePreview: rawStops.length === 0,
    totalDriveMin
  };
}

// 16-language UI copy for Offline-First GPS Miami Route Map
const MAP_COPY_KEYS = [
  'title', 'offlineBadge', 'filterAll', 'filterCar', 'filterYacht', 'filterDining',
  'totalTransit', 'minUnit', 'gpsButton', 'gpsActive', 'gpsDenied', 'gpsYouAreHere',
  'distanceAway', 'kmUnit', 'openAppleMaps', 'openGoogleMaps', 'openWaze', 'openDetails',
  'signaturePreviewHint', 'streamingLive'
];

const MAP_COPY_ROWS = {
  en: ['Miami Day Route Map', 'Offline Ready · GPS', 'Full Day', 'Cars', 'Yacht', 'Dining', 'Total transit', 'min', 'My GPS', 'GPS Live', 'GPS blocked', 'You are here', 'from you', 'km', 'Apple Maps', 'Google Maps', 'Waze', 'Open listing', 'Signature Miami Day · Ask ELIO+ to personalize your pins', 'ELIO+ streaming live'],
  ru: ['Карта маршрута по Майами', 'Оффлайн · GPS', 'Весь день', 'Авто', 'Яхта', 'Ужин', 'В пути', 'мин', 'Мой GPS', 'GPS активен', 'GPS недоступен', 'Вы здесь', 'от вас', 'км', 'Apple Maps', 'Google Maps', 'Waze', 'Открыть', 'Пример дня в Майами · Спросите ELIO+, чтобы обновить точки', 'ELIO+ отвечает в реальном времени'],
  es: ['Mapa de Ruta en Miami', 'Offline · GPS', 'Todo el día', 'Autos', 'Yate', 'Cena', 'En ruta', 'min', 'Mi GPS', 'GPS Activo', 'GPS bloqueado', 'Estás aquí', 'de ti', 'km', 'Apple Maps', 'Google Maps', 'Waze', 'Abrir', 'Día insignia en Miami · Pide a ELIO+ personalizar tu ruta', 'ELIO+ en tiempo real'],
  he: ['מפת מסלול יומי במיאמי', 'אופליין · GPS', 'כל היום', 'רכבים', 'יאכטה', 'מסעדה', 'זמן נסיעה', 'דק׳', 'ה-GPS שלי', 'GPS פעיל', 'GPS חסום', 'אתם כאן', 'ממך', 'ק״מ', 'Apple Maps', 'Google Maps', 'Waze', 'פתח', 'מסלול לדוגמה · שאלו את ELIO+ להתאמה אישית', 'ELIO+ משדר בזמן אמת'],
  zh: ['迈阿密一日路线地图', '离线可用 · GPS', '全天', '超跑', '游艇', '餐饮', '总车程', '分钟', '我的 GPS', 'GPS 实时', 'GPS 未授权', '您在这里', '距您', '公里', 'Apple 地图', 'Google 地图', 'Waze', '查看详情', '迈阿密精选路线 · 询问 ELIO+ 定制专属点位', 'ELIO+ 实时流式响应'],
  pt: ['Mapa de Rota em Miami', 'Offline · GPS', 'Dia inteiro', 'Carros', 'Iate', 'Jantar', 'Trânsito', 'min', 'Meu GPS', 'GPS Ativo', 'GPS bloqueado', 'Você está aqui', 'de você', 'km', 'Apple Maps', 'Google Maps', 'Waze', 'Abrir', 'Roteiro assinatura · Peça ao ELIO+ para personalizar', 'ELIO+ em tempo real'],
  uk: ['Карта маршруту по Маямі', 'Офлайн · GPS', 'Весь день', 'Авто', 'Яхта', 'Вечеря', 'У дорозі', 'хв', 'Мій GPS', 'GPS активний', 'GPS недоступний', 'Ви тут', 'від вас', 'км', 'Apple Maps', 'Google Maps', 'Waze', 'Відкрити', 'Приклад дня в Маямі · Запитайте ELIO+, щоб оновити точки', 'ELIO+ відповідає наживо'],
  ja: ['マイアミ1日ルートマップ', 'オフライン · GPS', '終日', '車', 'ヨット', 'ディナー', '移動合計', '分', '現在地 GPS', 'GPS 稼働中', 'GPS 不可', '現在地', '現在地から', 'km', 'Apple Maps', 'Google Maps', 'Waze', '詳細を見る', 'マイアミモデルコース · ELIO+ に相談してカスタマイズ', 'ELIO+ リアルタイム応答中'],
  ko: ['마이애미 데이 루트 지도', '오프라인 · GPS', '종일', '차량', '요트', '다이닝', '총 이동', '분', '내 GPS', 'GPS 활성', 'GPS 차단됨', '현재 위치', '거리', 'km', 'Apple Maps', 'Google Maps', 'Waze', '열기', '시그니처 일정 · ELIO+에게 맞춤 경로를 요청하세요', 'ELIO+ 실시간 응답 중'],
  de: ['Miami Tagesrouten-Karte', 'Offline · GPS', 'Ganzer Tag', 'Autos', 'Yacht', 'Dinner', 'Fahrzeit', 'Min', 'Mein GPS', 'GPS Live', 'GPS blockiert', 'Sie sind hier', 'entfernt', 'km', 'Apple Maps', 'Google Maps', 'Waze', 'Öffnen', 'Beispiel-Tag in Miami · ELIO+ für Ihre Route fragen', 'ELIO+ antwortet live'],
  ar: ['خريطة مسار اليوم في ميامي', 'دون إنترنت · GPS', 'اليوم كامل', 'سيارات', 'يخت', 'عشاء', 'وقت التنقل', 'دقيقة', 'موقعي GPS', 'GPS نشط', 'GPS محظور', 'أنت هنا', 'عنك', 'كم', 'Apple Maps', 'Google Maps', 'Waze', 'فتح', 'مسار نموذجي · اسأل ELIO+ لتخصيص يومك', 'ELIO+ يبث مباشرة'],
  tr: ['Miami Günlük Rota Haritası', 'Çevrimdışı · GPS', 'Tüm Gün', 'Araçlar', 'Yat', 'Akşam Yemeği', 'Toplam yol', 'dk', 'GPS Konumum', 'GPS Aktif', 'GPS kapalı', 'Buradasınız', 'uzaklıkta', 'km', 'Apple Maps', 'Google Maps', 'Waze', 'Aç', 'Örnek Miami Günü · Kişiselleştirmek için ELIO+’a sorun', 'ELIO+ canlı yanıtlıyor'],
  fa: ['نقشه مسیر روزانه میامی', 'آفلاین · GPS', 'کل روز', 'خودرو', 'کشتی', 'شام', 'زمان مسیر', 'دقیقه', 'GPS من', 'GPS فعال', 'GPS مسدود', 'شما اینجا هستید', 'تا شما', 'کیلومتر', 'Apple Maps', 'Google Maps', 'Waze', 'باز کردن', 'مسیر پیشنهادی · از ELIO+ برای شخصی‌سازی بپرسید', 'ELIO+ در حال پاسخ زنده'],
  it: ['Mappa Percorso Miami', 'Offline · GPS', 'Tutto il giorno', 'Auto', 'Yacht', 'Cena', 'Spostamenti', 'min', 'Mio GPS', 'GPS Attivo', 'GPS bloccato', 'Sei qui', 'da te', 'km', 'Apple Maps', 'Google Maps', 'Waze', 'Apri', 'Giornata tipo a Miami · Chiedi a ELIO+ di personalizzare', 'ELIO+ in tempo reale'],
  fr: ['Carte d’Itinéraire Miami', 'Hors ligne · GPS', 'Journée', 'Voitures', 'Yacht', 'Dîner', 'Trajet total', 'min', 'Mon GPS', 'GPS Actif', 'GPS bloqué', 'Vous êtes ici', 'de vous', 'km', 'Apple Maps', 'Google Maps', 'Waze', 'Ouvrir', 'Journée signature · Demandez à ELIO+ de personnaliser', 'ELIO+ en temps réel'],
  pl: ['Mapa Trasy Dnia Miami', 'Offline · GPS', 'Cały dzień', 'Auta', 'Jacht', 'Kolacja', 'Przejazdy', 'min', 'Mój GPS', 'GPS Aktywny', 'GPS zablokowany', 'Jesteś tutaj', 'od Ciebie', 'km', 'Apple Maps', 'Google Maps', 'Waze', 'Otwórz', 'Przykładowy dzień w Miami · Zapytaj ELIO+, aby spersonalizować', 'ELIO+ odpowiada na żywo']
};

export const MIAMI_MAP_COPY = Object.fromEntries(
  Object.entries(MAP_COPY_ROWS).map(([locale, values]) => {
    if (values.length !== MAP_COPY_KEYS.length) {
      throw new Error(`Incomplete Miami Map copy for ${locale}: got ${values.length}, expected ${MAP_COPY_KEYS.length}`);
    }
    return [locale, Object.freeze(Object.fromEntries(MAP_COPY_KEYS.map((key, index) => [key, values[index]])))];
  })
);

export function getMiamiMapCopy(locale = 'en') {
  const code = normalizeLocale(locale);
  return MIAMI_MAP_COPY[code] || MIAMI_MAP_COPY.en;
}
