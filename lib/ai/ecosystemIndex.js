// ===========================================================================
// Dynamic ecosystem index for Miami Elio AI.
//
// Aggregates synchronous, current MIAMI ELIO inventory from the canonical data
// registries (yachts, stays, experiences + Florida park rides, venues, cars,
// event categories/leagues/teams, Ovago flight deals, upcoming Miami season
// events and ecosystem worlds) into one normalized, searchable index.
//
// Entities are discovered by iterating live registries rather than hardcoding
// items, so newly added listings, tours, venues or categories become
// discoverable automatically with zero changes to AI logic.
//
// Each entity carries a `world` (constellation id) used ONLY to drive the visual
// highlight in the sphere — discovery itself is by matching text, not by world.
// ===========================================================================

import { getYachts } from '../yachtsData';
import { getVacationRentals } from '../vacationRentalsData';
import { EXPERIENCE_CARDS, experienceImageUrl } from '../experienceCards.mjs';
import { getHeadoutCollection } from '../headoutCatalog.mjs';
import { getFloridaParkGuide } from '../floridaParks.mjs';
import { getVenues } from '../restaurantsNightlifeData';
import { getRentals } from '../rentalsData';
import { EVENT_CATEGORY_GROUPS, EVENT_CATEGORIES, LEAGUES, TEAMS } from '../mockEventsData';
import { getTicketNetworkFallback } from '../ticketnetwork';
import { OVAGO_DEALS } from '../ovagoDeals.mjs';
import { upcomingSeason } from '../seasonData';
import { ecosystem } from '../ecosystemData';
import { discoveryCategories } from '../discoveryCategories';
import { SECTIONS } from '../aiSuggestions';
import { modelAliases } from './modelAliases.mjs';
import { seatsForCar } from '../carSeats.mjs';
import { primaryAction } from '../dining/gateway.mjs';
import { DINING_SEARCH_TAGS } from '../dining/filters.mjs';
import { parseDailyPrice } from './tripProfile.mjs';

// Ecosystem-world id -> constellation world.
const ECO_WORLD = {
  travel: 'travel', experiences: 'style', villas: 'travel', yachts: 'drive',
  cars: 'drive', events: 'play', concierge: 'concierge'
};

const norm = (s) => (s == null ? '' : String(s)).normalize('NFKC').toLowerCase().replace(/ё/g, 'е');

const safe = (fn) => {
  try {
    const value = fn();
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

function makeEntity({ id, type, world, title, subtitle, href, capacity, tags, aliases = [], image, price, numericPrice, neighborhood, region, experienceSection, booking, collections }) {
  const text = [title, subtitle, type, world, ...aliases, ...(tags || [])].map(norm).filter(Boolean).join(' ');
  return {
    id, type, world, title, subtitle, href,
    capacity: capacity || null,
    aliases,
    image: image || null,
    price: price || null,
    ...(Number.isFinite(numericPrice) && numericPrice > 0 ? { numericPrice } : {}),
    ...(neighborhood ? { neighborhood } : {}),
    ...(region ? { region } : {}),
    ...(experienceSection ? { experienceSection } : {}),
    text,
    ...(booking ? { booking } : {}),
    ...(collections?.length ? { collections: [...collections] } : {})
  };
}

// --- Enriched multilingual synonym maps ------------------------------------

const CAR_CATEGORY_TAGS = {
  Convertibles: ['convertible', 'cabriolet', 'cabrio', 'spyder', 'spider', 'roadster', 'open top', 'кабриолет', 'кабрио', 'открытый верх', 'descapotable', 'conversível', 'مكشوف', 'کروک', 'גג נפתח', '敞篷', 'オープンカー', '컨버터블'],
  SUVs: ['suv', 'crossover', '4x4', 'внедорожник', 'кроссовер', 'джип', 'позашляховик', 'todoterreno', 'geländewagen', 'شاسی بلند', '越野车'],
  Sports: ['supercar', 'sportscar', 'sports car', 'coupe', 'exotic', 'суперкар', 'спорткар', 'купе', 'спортивная', 'deportivo', 'sportwagen', '超跑', 'スーパーカー', '슈퍼카'],
  Sedans: ['sedan', 'saloon', 'executive', 'luxury sedan', 'chauffeur', 'седан', 'представительский', 'лимузин', 'berlina', 'berline', 'limousine', '轿车', 'セダン', '세단']
};

const COLOR_PATTERNS = [
  [/\bwhite\b/i, ['white', 'белый', 'белая', 'белую', 'blanco', 'blanc', 'weiß', 'bianco', 'أبيض', 'לבן', '白色']],
  [/\bblack\b/i, ['black', 'чёрный', 'черный', 'чёрная', 'черная', 'negro', 'noir', 'schwarz', 'nero', 'أسود', 'שחור', '黑色']],
  [/\bblue\b/i, ['blue', 'синий', 'синяя', 'голубой', 'azul', 'bleu', 'blau', 'blu', 'أزرق', 'כחול', '蓝色']],
  [/\bred\b/i, ['red', 'красный', 'красная', 'rojo', 'rouge', 'rot', 'rosso', 'أحمر', 'אדום', '红色']],
  [/\bgr[ae]y\b|\bsilver\b/i, ['grey', 'gray', 'silver', 'серый', 'серая', 'серебристый', 'gris', 'grau', 'grigio', 'رمادي', 'אפור', '灰色']],
  [/\byellow\b|\borange\b/i, ['yellow', 'orange', 'жёлтый', 'желтый', 'оранжевый', 'amarillo', 'jaune', 'gelb', 'giallo', 'أصفر']],
  [/\bgreen\b/i, ['green', 'зелёный', 'зеленый', 'verde', 'vert', 'grün', 'أخضر', 'ירוק', '绿色']]
];

const NEIGHBORHOOD_TAGS = {
  Brickell: ['brickell', 'брикелл', 'брикелле', 'брикел', 'بريكيل', 'בריקל', '布里克尔', 'ブリッケル', '브리켈'],
  'Brickell Key': ['brickell', 'brickell key', 'брикелл', 'брикелл ки'],
  'South Beach': ['south beach', 'sobe', 'miami beach', 'саус бич', 'майами бич', 'собе', 'ساوث بيتش', 'סאות ביץ', '南海滩', 'サウスビーチ', '사우스 비치'],
  'Miami Beach': ['miami beach', 'south beach', 'майами бич', 'саус бич', 'ميامي بيتش'],
  'Design District': ['design district', 'дизайн дистрикт', 'дизайн-дистрикт', 'район дизайна', 'ديزاين ديستريكت', '设计区'],
  Wynwood: ['wynwood', 'винвуд', 'винвуде', 'уинвуд', 'وينوود', '温伍德'],
  'Coral Gables': ['coral gables', 'корал гейблс', 'корал-гейблс', 'كورال غيبلز'],
  'Coconut Grove': ['coconut grove', 'коконат гроув', 'коконат-гроув', 'كوكونات غروف'],
  'Sunny Isles Beach': ['sunny isles', 'sunny isles beach', 'санни айлс', 'санни-айлс', 'солнечные острова'],
  'Bal Harbour': ['bal harbour', 'бал харбор', 'бал-харбор', 'бэл харбор'],
  'Little Havana': ['little havana', 'calle ocho', 'литл гавана', 'маленькая гавана'],
  'Downtown Miami': ['downtown', 'downtown miami', 'даунтаун', 'центр майами', 'центр'],
  'Key Biscayne': ['key biscayne', 'ки бискейн', 'ки-бискейн'],
  Edgewater: ['edgewater', 'эджвотер', 'эджуотер'],
  Surfside: ['surfside', 'сёрфсайд', 'серфсайд'],
  'Little River': ['little river', 'литл ривер'],
  'Little Haiti / Lemon City': ['little haiti', 'lemon city', 'литл гаити'],
  'North Miami': ['north miami', 'северный майами'],
  'North Miami Beach': ['north miami beach', 'северный майами бич'],
  'South Miami': ['south miami', 'южный майами'],
  'MiMo / Upper Eastside': ['mimo', 'upper eastside', 'biscayne'],
  Kendall: ['kendall', 'кендалл']
};

const CUISINE_TAGS = {
  Italian: ['italian', 'pasta', 'pizza', 'итальянский', 'итальянская', 'итальянскую', 'итальянской', 'паста', 'пицца', 'italiano', 'italiana', 'italien', 'italienisch', 'איטלקי', 'إيطالي', 'ایتالیایی', '意大利', 'イタリアン', '이탈리안', 'włoska', 'italyan'],
  Japanese: ['japanese', 'sushi', 'omakase', 'sashimi', 'японский', 'японская', 'японскую', 'суши', 'омакасе', 'japonés', 'japonês', 'japonais', 'japanisch', 'giapponese', 'יפני', 'ياباني', 'ژاپنی', '日本', '日料', '寿司', '和食', '일식', 'japońska', 'japon'],
  Steakhouse: ['steakhouse', 'steak', 'meat', 'grill', 'стейкхаус', 'стейк', 'стейки', 'мясо', 'гриль', 'asador', 'carne', 'churrascaria', 'ستيك', 'סטייק', '牛排', 'ステーキ', '스테이크'],
  Seafood: ['seafood', 'fish', 'crab', 'oysters', 'lobster', 'морепродукты', 'рыба', 'краб', 'устрицы', 'mariscos', 'frutti di mare', 'fruits de mer', 'meeresfrüchte', 'مأكولات بحرية', 'פירות ים', '海鲜', 'シーフード', '해산물'],
  Cuban: ['cuban', 'кубинский', 'кубинская', 'кубинскую', 'cubano', 'cubain', 'kubanisch', 'كوبي', 'קובני'],
  Asian: ['asian', 'southeast asian', 'pan-asian', 'азиатский', 'азиатская', 'азиатскую', 'asiático', 'asiatique', 'asiatisch', 'آسيوي', 'אסייתי', '亚洲', 'アジア', '아시안'],
  Aegean: ['mediterranean', 'greek', 'aegean', 'средиземноморский', 'средиземноморская', 'греческий', 'греческая', 'mediterráneo', 'méditerranéen', 'grec', 'griechisch', 'יווני', 'متوسطي'],
  'French Mediterranean': ['french', 'mediterranean', 'французский', 'французская', 'средиземноморский', 'français', 'francés', 'französisch', 'فرنسي', 'צרפתי', '法餐'],
  MediterrAsian: ['mediterranean', 'asian', 'rooftop', 'средиземноморский', 'азиатский', 'крыша'],
  Korean: ['korean', 'korean bbq', 'bbq', 'steakhouse', 'корейский', 'корейская', 'барбекю', 'coreano', 'coréen', 'koreanisch', 'كوري', 'קוריאני', '韩国', '韓国', '한식'],
  American: ['american', 'bistro', 'американский', 'американская', 'бистро'],
  Continental: ['continental', 'fine dining', 'европейский', 'европейская'],
  International: ['international', 'beach club', 'пляжный клуб']
};

const EXTRA_MICHELIN_TAGS = [
  'michelin', 'michelin star', 'starred', 'fine dining',
  'мишлен', 'мишлена', 'мишленом', 'мишлену', 'мишленовский', 'мишленовские', 'мишленовских', 'мишленовском', 'звезда', 'звезды', 'звездами',
  'мішлен', 'estrella michelin', 'étoile michelin', 'michelin-stern', 'stella michelin', 'gwiazdka michelin',
  'מישלן', 'ميشلان', 'میشلن', '米其林', 'ミシュラン', '미슐랭'
];

const EXPERIENCE_SECTION_TAGS = {
  'florida-flights': ['helicopter', 'flight', 'aerial', 'skyline', 'tour', 'вертолёт', 'вертолет', 'вертолёте', 'вертолете', 'вертолётная', 'вертолетная', 'полёт', 'полет', 'обзорный', 'helicóptero', 'hélicoptère', 'hubschrauber', 'elicottero', 'helikopter', 'מסוק', 'هليكوبتر', 'هلیکوپتر', '直升机', 'ヘリコプター', '헬리콥터'],
  helicopters: ['helicopter', 'flight', 'aerial', 'tour', 'вертолёт', 'вертолет', 'вертолёте', 'вертолете', 'вертолётная', 'вертолетная', 'полёт', 'полет', 'helicóptero', 'hélicoptère', 'hubschrauber', 'elicottero', 'helikopter', 'מסוק', 'هليكوبتر', 'هلیکوپتر', '直升机', 'ヘリコプター', '헬리콥터'],
  boats: ['boat', 'cruise', 'yacht', 'yachts', 'crewed', 'speedboat', 'kayak', 'sup', 'biscayne', 'bay', 'water', 'charter', 'sightseeing', 'катер', 'лодка', 'лодке', 'круиз', 'яхта', 'яхту', 'яхты', 'яхте', 'яхтой', 'чартер', 'залив', 'бискейн', 'каяк', 'морская прогулка', 'прогулка по заливу', 'yate', 'yates', 'barco', 'crucero', 'bateau', 'croisière', 'boot', 'barca', 'jacht', 'łódź', 'tekne', 'יאכטה', 'סירה', 'يخت', 'قارب', '游艇', '游船', 'ヨット', 'クルーズ', '요트', '보트'],
  nature: ['everglades', 'airboat', 'wildlife', 'alligator', 'alligators', 'wetlands', 'nature', 'park', 'эверглейдс', 'аэролодка', 'природа', 'аллигаторы', 'болота', 'парк', 'naturaleza', 'natur', 'טבע', 'طبيعة', '自然', '자연'],
  parks: ['theme park', 'amusement park', 'roller coaster', 'coaster', 'rides', 'attractions', 'park', 'tickets', 'парк', 'парк аттракционов', 'аттракционы', 'американские горки', 'горки', 'билеты', 'parque temático', 'freizeitpark', 'parc d attractions', '主题公园', 'テーマパーク', '테마파크'],
  water: ['water park', 'waterpark', 'slides', 'splash', 'аквапарк', 'водные горки', 'водный парк', 'parque acuático', 'wasserpark', '水上乐园', 'ウォーターパーク', '워터파크'],
  family: ['family', 'tour', 'excursion', 'city tour', 'food tour', 'sightseeing', 'atv', 'key west', 'little havana', 'экскурсия', 'обзорная', 'квадроцикл', 'квадроциклы', 'кей вест', 'маленькая гавана', 'семейный', 'с детьми', 'excursión', 'ausflug', 'visite', 'wycieczka', 'تيار', 'טיול', '游览', 'ツアー', '투어']
};

const EVENT_CATEGORY_TAGS = {
  sports: ['sports', 'sport', 'game', 'games', 'match', 'stadium', 'arena', 'tickets', 'спорт', 'спортивные', 'матч', 'матчи', 'игра', 'игры', 'билеты', 'билета', 'билет', 'deportes', 'deporte', 'partido', 'entradas', 'entrada', 'esportes', 'ingressos', 'sportarten', 'sportifs', 'billets', 'sportivi', 'biglietti', 'sporty', 'bilety', 'spor', 'bilet', 'ספורט', 'כרטיסים', 'رياضة', 'تذاكر', 'ورزش', '体育', 'スポーツ', '스포츠'],
  concerts: ['concerts', 'concert', 'live music', 'shows', 'show', 'music', 'tickets', 'концерт', 'концерты', 'шоу', 'музыка', 'билеты', 'билета', 'билет', 'concierto', 'conciertos', 'entradas', 'entrada', 'ingressos', 'konzert', 'konzerte', 'spectacle', 'spectacles', 'billets', 'concerto', 'concerti', 'koncert', 'koncerty', 'konser', 'הופעה', 'הופעות', 'حفل', 'حفلات', 'کنسرت', '演唱会', 'コンサート', '콘서트'],
  nfl: ['nfl', 'football', 'american football', 'touchdown', 'hard rock stadium', 'dolphins', 'miami dolphins', 'футбол', 'американский футбол', 'нфл', 'матч', 'игра', 'дельфины', 'долфинс', 'билеты', 'билета', 'fútbol americano', 'futbol americano', 'fútbol', 'futbol', 'futebol americano', 'futebol', 'football américain', 'american football', 'futbol amerykański', 'amerikan futbolu', 'פוטבול', 'كرة القدم الأمريكية', 'فوتبال آمریکایی', '橄榄球', 'アメフト', '미식축구'],
  mls: ['mls', 'soccer', 'football', 'futbol', 'inter miami', 'messi', 'chase stadium', 'футбол', 'футбольный', 'матч', 'игра', 'млс', 'интер майами', 'месси', 'билеты', 'билета', 'fútbol', 'futebol', 'fußball', 'fussball', 'calcio', 'piłka nożna', 'pilka nozna', 'כדורגל', 'كرة القدم', 'فوتبال', '足球', 'サッカー', '축구'],
  nba: ['nba', 'basketball', 'kaseya center', 'heat', 'miami heat', 'баскетбол', 'нба', 'майами хит', 'хит', 'матч', 'игра', 'билеты', 'билета', 'baloncesto', 'basquete', 'basket', 'koszykówka', 'basketbol', 'כדורסל', 'كرة السلة', 'بسکتبال', '篮球', 'バスケットボール', '농구'],
  nhl: ['nhl', 'hockey', 'ice hockey', 'panthers', 'florida panthers', 'amerant bank arena', 'хоккей', 'нхл', 'пантерз', 'флорида пантерз', 'матч', 'игра', 'билеты', 'билета', 'eishockey', 'hokej', 'הוקי', 'هوكي', 'هاکی', '冰球', 'アイスホッケー', '하키'],
  mlb: ['mlb', 'baseball', 'marlins', 'miami marlins', 'loandepot park', 'бейсбол', 'млб', 'марлинс', 'матч', 'игра', 'билеты', 'билета', 'béisbol', 'beisebol', 'בייסבול', 'بيسبول', 'بیسبال', '棒球', '野球', '야구'],
  ufc: ['ufc', 'mma', 'mixed martial arts', 'fight', 'fighting', 'юфс', 'мма', 'бои', 'бой', 'единоборства', 'билеты', 'билета', 'artes marciales', 'kampfsport', 'للفنون القتالية', '格斗', '総合格闘技', '종합격투기'],
  boxing: ['boxing', 'box', 'fight', 'бокс', 'бой', 'поединок', 'билеты', 'билета', 'boxeo', 'boxe', 'boxen', 'boks', 'אגרוף', 'ملاكمة', 'بوکس', '拳击', 'ボクシング', '복싱'],
  'formula-1': ['f1', 'formula 1', 'formula one', 'grand prix', 'miami grand prix', 'racing', 'motorsport', 'формула 1', 'формула', 'ф1', 'гран при', 'гонки', 'автоспорт', 'билеты', 'билета', 'fórmula 1', 'formel 1', 'formule 1', 'פורמולה 1', 'فورمولا 1', 'فرمول 1', '一级方程式', 'F1', '포뮬러 1'],
  nascar: ['nascar', 'racing', 'homestead', 'motorsport', 'наскар', 'гонки', 'автоспорт', 'билеты', 'билета'],
  tennis: ['tennis', 'atp', 'wta', 'miami open', 'hard rock stadium', 'теннис', 'майами оупен', 'турнир', 'матч', 'билеты', 'билета', 'tenis', 'טניס', 'تنس', 'تنیس', '网球', 'テニス', '테니스'],
  golf: ['golf', 'pga', 'tournament', 'гольф', 'турнир', 'билеты', 'билета', 'גולף', 'غولف', 'گلف', '高尔夫', 'ゴルフ', '골프'],
  'other-leagues': ['sports', 'league', 'leagues', 'soccer', 'wrestling', 'wwe', 'college', 'ncaa', 'спорт', 'лиги', 'матч', 'билеты', 'билета'],
  'pop-rock': ['pop', 'rock', 'concert', 'live music', 'band', 'singer', 'tour', 'поп', 'рок', 'концерт', 'живая музыка', 'билеты', 'билета', 'concierto', 'konzert', 'concerto', 'koncert', 'הופעה', 'حفل', '演唱会', 'コンサート', '콘서트'],
  'hip-hop-rnb': ['hip hop', 'hip-hop', 'rap', 'rnb', 'r&b', 'concert', 'хип хоп', 'рэп', 'рнб', 'концерт', 'билеты', 'билета'],
  'jazz-blues': ['jazz', 'blues', 'soul', 'concert', 'джаз', 'блюз', 'соул', 'концерт', 'билеты', 'билета'],
  'electronic-edm': ['edm', 'electronic', 'dj', 'techno', 'house', 'rave', 'ultra', 'электронная музыка', 'диджей', 'рейв', 'билеты', 'билета'],
  'classical-opera': ['classical', 'opera', 'symphony', 'orchestra', 'ballet', 'классика', 'классическая музыка', 'опера', 'симфония', 'оркестр', 'балет', 'билеты', 'билета', 'ópera', 'opéra', 'oper', 'אופרה', 'أوبرا', '歌剧', 'オペラ', '오페라'],
  country: ['country', 'country music', 'кантри', 'концерт', 'билеты', 'билета'],
  'comedy-standup': ['comedy', 'standup', 'stand-up', 'comedian', 'humor', 'стендап', 'комедия', 'комик', 'юмор', 'шоу', 'билеты', 'билета', 'comedia', 'comédie', 'komödie', 'komedia', 'komedi', 'סטנדאפ', 'كوميديا', 'کمدی', '脱口秀', 'コメディ', '코미디'],
  'theater-broadway': ['theater', 'theatre', 'broadway', 'musical', 'play', 'stage', 'show', 'shows', 'театр', 'бродвей', 'мюзикл', 'спектакль', 'шоу', 'билеты', 'билета', 'teatro', 'théâtre', 'teatr', 'tiyatro', 'תיאטרון', 'مسرح', 'تئاتر', '音乐剧', 'ミュージカル', '뮤지컬'],
  festivals: ['festival', 'festivals', 'music festival', 'ultra', 'lineup', 'фестиваль', 'фестивали', 'фест', 'ультра', 'билеты', 'билета', 'festiwal', 'פסטיבל', 'مهرجان', 'جشنواره', '音乐节', 'フェス', '페스티벌'],
  'other-live': ['live', 'events', 'shows', 'tickets', 'шоу', 'события', 'мероприятия', 'билеты', 'билета']
};

const SEASON_ROUTING = {
  f1: { href: '/events/category/formula-1', image: '/images/events/leagues/formula-1.png', world: 'play', extraTags: ['f1', 'formula 1', 'формула 1', 'гонки', 'grand prix'] },
  'miami-open': { href: '/events/category/tennis', image: '/images/events/leagues/tennis.webp', world: 'play', extraTags: ['tennis', 'теннис', 'miami open', 'майами оупен'] },
  ultra: { href: '/events/category/festivals', image: '/images/events/festival-pass-1100.webp', world: 'play', extraTags: ['ultra', 'edm', 'festival', 'ультра', 'фестиваль', 'miami music week'] },
  'boat-show': { href: '/yachts', image: '/images/experiences/miami-yacht.webp', world: 'drive', extraTags: ['boat show', 'yacht show', 'шоу яхт', 'боат шоу', 'выставка яхт'] },
  flibs: { href: '/yachts', image: '/images/experiences/miami-yacht.webp', world: 'drive', extraTags: ['flibs', 'boat show', 'fort lauderdale', 'шоу яхт'] },
  'art-basel': { href: '/events', image: '/images/events/concerts-pass.jpg', world: 'play', extraTags: ['art basel', 'арт базель', 'базель', 'art week', 'выставка'] },
  nye: { href: '/events', image: '/images/events/concerts-pass.jpg', world: 'play', extraTags: ['new years eve', 'nye', 'новый год', 'новогодняя ночь', 'fireworks'] }
};

function eventCategoryImage(cat) {
  if (cat.logo) return cat.logo;
  if (cat.group === 'sports') return '/images/events/sports-pass-1100.webp';
  if (cat.slug === 'festivals') return '/images/events/festival-pass-1100.webp';
  if (['theater-broadway', 'comedy-standup', 'classical-opera'].includes(cat.slug)) return '/images/events/stage-pass-1100.webp';
  return '/images/events/concerts-pass.jpg';
}

function viatorCapacity(partnerHref) {
  const url = String(partnerHref || '');
  const match = url.match(/(?:for-(\d{1,2})-pax|up-to-(\d{1,2})-people)/i);
  const value = match ? Number(match[1] || match[2]) : null;
  return Number.isInteger(value) && value > 0 ? value : null;
}

function priceNumberTag(price) {
  const digits = String(price || '').replace(/[^0-9]/g, '');
  return digits ? [String(price), digits] : [];
}

/** Normalize any car record (static fleet or Supabase partner publication) into an index entity. */
export function makeCarEntity(c) {
  const desc = [c.title, c.description, c.sourceCategory].filter(Boolean).join(' ');
  const colorTags = [];
  for (const [pattern, list] of COLOR_PATTERNS) if (pattern.test(desc)) colorTags.push(...list);
  const categoryTags = CAR_CATEGORY_TAGS[c.category] || [];
  const priceLabel = c.dailyPrice && c.dailyPrice !== 'On request' && !/\/\s*(?:day|h)/i.test(c.dailyPrice)
    ? `${c.dailyPrice}/day`
    : c.dailyPrice;
  const aliases = [...new Set([...modelAliases(c.title), ...(c.aliases || [])])];
  return makeEntity({
    id: `car-${c.slug || c.id}`,
    type: 'Car',
    world: 'drive',
    title: c.title,
    subtitle: [c.category, c.location, priceLabel].filter(Boolean).join(' · '),
    href: `/rentals/${c.slug}`,
    capacity: c.capacity || seatsForCar(c),
    aliases,
    image: c.image || c.thumbnail,
    price: c.dailyPrice,
    numericPrice: parseDailyPrice(c.dailyPrice),
    tags: [
      'car', 'rental', 'drive', 'vehicle', 'exotic', 'auto', 'авто', 'машина', 'автомобиль',
      c.category, c.sourceCategory, c.company, c.supplier, c.location, c.title, c.description,
      ...priceNumberTag(c.dailyPrice),
      ...categoryTags,
      ...colorTags
    ]
  });
}

/** Normalize any verified restaurant or nightlife venue (static or Supabase editorial) into an index entity. */
export function makeVenueEntity(vn) {
  const nightlife = vn.category === 'nightlife';
  const hoodTags = NEIGHBORHOOD_TAGS[vn.neighborhood] || [];
  const cuisineTags = CUISINE_TAGS[vn.cuisine] || [];
  const michelinTags = vn.michelin
    ? [...(DINING_SEARCH_TAGS[vn.michelin] || []), ...EXTRA_MICHELIN_TAGS]
    : [];
  const pickTags = vn.conciergePick ? ['concierge pick', 'top pick', 'рекомендация консьержа'] : [];
  return makeEntity({
    id: `venue-${vn.slug || vn.id}`,
    type: nightlife ? 'Nightlife' : 'Restaurant',
    world: nightlife ? 'play' : 'taste',
    title: vn.name,
    subtitle: vn.location || (vn.neighborhood ? `${vn.neighborhood}, FL` : null),
    aliases: [String(vn.id || vn.slug || '').replace(/-/g, ' ')],
    href: `/restaurants-nightlife/${vn.slug}`,
    image: vn.image,
    price: vn.price || null,
    neighborhood: vn.neighborhood || null,
    // The venue's own booking page (or Google Maps): the chat card links there, never to a booking of ours.
    booking: primaryAction(vn) || undefined,
    collections: vn.collections,
    tags: [
      vn.category,
      ...(nightlife
        ? ['nightlife', 'nightclub', 'club', 'bar', 'lounge', 'bottle service', 'guest list', 'клуб', 'ночной клуб', 'бар', 'лаунж', 'вечеринка']
        : ['dining', 'restaurant', 'food', 'eat', 'dinner', 'lunch', 'ресторан', 'ужин', 'обед', 'поесть', 'еда']),
      vn.location, vn.neighborhood, vn.address, vn.cuisine, vn.sheetCategory, vn.description,
      ...(vn.features || []),
      vn.price,
      ...(vn.vibe || []).flatMap((vibe) => DINING_SEARCH_TAGS[vibe] || []),
      ...(vn.collections || []).flatMap((collection) => DINING_SEARCH_TAGS[collection] || []),
      ...michelinTags,
      ...hoodTags,
      ...cuisineTags,
      ...pickTags
    ]
  });
}

function build() {
  const out = [];

  // --- Yachts (Drive & Sail) — automatic growth when cards exist ---
  for (const y of safe(getYachts)) {
    out.push(makeEntity({
      id: `yacht-${y.slug || y.id}`, type: 'Yacht', world: 'drive',
      title: y.title, subtitle: [y.length, y.capacity && `up to ${y.capacity} guests`, y.location].filter(Boolean).join(' · '),
      href: `/yachts/${y.slug}`, capacity: y.capacity, image: y.image, price: y.price,
      tags: ['yacht', 'boat', 'charter', 'sail', 'marine', 'яхта', 'катер', y.company, y.location]
    }));
  }

  // --- Vacation rentals / stays (Travel) — automatic growth when cards exist ---
  for (const v of safe(getVacationRentals)) {
    out.push(makeEntity({
      id: `stay-${v.slug || v.id}`, type: 'Stay', world: 'travel',
      title: v.title, subtitle: [v.bedrooms && `${v.bedrooms} BR`, v.guests && `sleeps ${v.guests}`, v.location].filter(Boolean).join(' · '),
      href: `/vacation-rentals/${v.slug}`, capacity: v.guests, image: v.image, price: v.nightlyRate,
      tags: ['villa', 'hotel', 'stay', 'rental', 'home', 'accommodation', 'вилла', 'дом', v.location]
    }));
  }

  // --- Experiences: Headout (48) + Viator (20) + Florida Official Parks (3) + 51 Park Coasters ---
  for (const e of safe(() => EXPERIENCE_CARDS)) {
    const href = e.kind === 'official' || e.direct ? `/experiences#${e.section || 'parks'}` : e.href;
    const guide = e.slug ? getFloridaParkGuide(e.slug) : null;
    const rideTags = [
      ...(e.coasters || []),
      ...(guide?.coasters || []),
      ...(guide?.other || []),
      ...(guide?.related || []).flatMap((rel) => [rel.title, ...(rel.coasters || [])])
    ];
    const miamiTags = e.region === 'miami'
      ? ['miami', 'south florida', 'майами', 'маямі', 'ميامي', 'מיאמי', 'میامی', '迈阿密', 'マイアミ', '마이애미']
      : [];
    const capacity = e.kind === 'viator' ? viatorCapacity(e.partnerHref) : null;
    const headoutHref = e.kind === 'headout' && e.slug ? getHeadoutCollection(e.slug)?.href : null;
    const booking = e.kind === 'viator' && e.partnerHref
      ? { kind: 'book', platform: 'viator', href: e.partnerHref }
      : (headoutHref ? { kind: 'book', platform: 'headout', href: headoutHref } : undefined);
    out.push(makeEntity({
      id: `exp-${e.id}`,
      type: 'Experience',
      world: 'play',
      title: e.title,
      subtitle: [e.location, e.supplier].filter(Boolean).join(' · '),
      href,
      capacity,
      region: e.region || null,
      experienceSection: e.section || null,
      booking,
      aliases: [e.titleRu].filter(Boolean),
      image: experienceImageUrl(e),
      tags: [
        'experience', 'tour', 'activity', 'adventure', 'things to do', 'excursion',
        'впечатления', 'экскурсия', 'тур', 'активность',
        e.title, e.titleRu, e.location, e.region, e.section, e.supplier,
        ...miamiTags,
        ...(EXPERIENCE_SECTION_TAGS[e.section] || []),
        ...rideTags
      ]
    }));
  }

  // --- Venues: verified restaurants & nightlife only (excludes unverified e.g. story-miami) ---
  for (const vn of safe(getVenues)) {
    if (vn.status && vn.status !== 'verified') continue;
    out.push(makeVenueEntity(vn));
  }

  // --- Cars: MIAMI ELIO + Miami Fleet Import + Sunset Exotics ---
  for (const c of safe(getRentals)) {
    out.push(makeCarEntity(c));
  }

  // --- Events: 22 subcategories + 2 pillar groups + leagues + teams (NO hidden providers) ---
  const leaguesByCategory = new Map();
  for (const league of safe(() => LEAGUES)) {
    const list = leaguesByCategory.get(league.category) || [];
    list.push(league);
    leaguesByCategory.set(league.category, list);
  }
  const teamsByLeague = new Map();
  for (const team of safe(() => TEAMS)) {
    const list = teamsByLeague.get(team.league) || [];
    list.push(team);
    teamsByLeague.set(team.league, list);
  }

  for (const cat of safe(() => EVENT_CATEGORIES)) {
    const leagues = leaguesByCategory.get(cat.slug) || [];
    const teams = leagues.flatMap((l) => teamsByLeague.get(l.slug) || []);
    const groupLabel = EVENT_CATEGORY_GROUPS.find((g) => g.slug === cat.group)?.label || cat.group;
    out.push(makeEntity({
      id: `event-cat-${cat.slug}`,
      type: 'Event',
      world: 'play',
      title: cat.label,
      subtitle: [groupLabel, 'Miami & South Florida'].filter(Boolean).join(' · '),
      href: `/events/category/${cat.slug}`,
      image: eventCategoryImage(cat),
      booking: { kind: 'book', platform: 'ticketnetwork', href: getTicketNetworkFallback(cat.slug) },
      aliases: teams.map((t) => t.name),
      tags: [
        'event', 'events', 'ticket', 'tickets', 'live', 'miami', 'майами',
        cat.slug, cat.label, cat.group, groupLabel,
        ...leagues.flatMap((l) => [l.slug, l.name, l.sport]),
        ...teams.flatMap((t) => [t.name, t.city]),
        ...(EVENT_CATEGORY_TAGS[cat.slug] || [])
      ]
    }));
  }

  for (const group of safe(() => EVENT_CATEGORY_GROUPS)) {
    const memberCategories = safe(() => EVENT_CATEGORIES).filter((c) => c.group === group.slug);
    out.push(makeEntity({
      id: `event-group-${group.slug}`,
      type: 'Event',
      world: 'play',
      title: group.label,
      subtitle: 'Miami & South Florida',
      href: `/events/category/${group.slug}`,
      image: group.slug === 'sports' ? '/images/events/sports-pass-1100.webp' : '/images/events/concerts-pass.jpg',
      booking: { kind: 'book', platform: 'ticketnetwork', href: getTicketNetworkFallback(group.slug) },
      tags: [
        'event', 'events', 'ticket', 'tickets', 'live', 'miami', 'майами',
        group.slug, group.label,
        ...memberCategories.map((c) => c.label),
        ...(EVENT_CATEGORY_TAGS[group.slug] || [])
      ]
    }));
  }

  // --- Ovago Flight Deals (3 CJ Affiliate offers on /travel/ovago) ---
  for (const deal of safe(() => OVAGO_DEALS)) {
    out.push(makeEntity({
      id: deal.id || `ovago-${deal.slug}`,
      type: 'Flight',
      world: 'travel',
      title: deal.name,
      subtitle: deal.description,
      href: deal.internalHref || '/travel/ovago',
      image: deal.image,
      booking: deal.href ? { kind: 'book', platform: 'ovago', href: deal.href } : undefined,
      tags: [
        'ovago', 'flight', 'flights', 'airfare', 'airline', 'travel', 'plane ticket',
        'авиабилеты', 'авиабилет', 'перелёт', 'перелет', 'рейс',
        deal.name, deal.description,
        ...(deal.tags || [])
      ]
    }));
  }

  // --- Upcoming Miami Season Events (dynamically drops past events) ---
  for (const ev of safe(() => upcomingSeason(new Date()))) {
    const route = SEASON_ROUTING[ev.id] || { href: '/events', image: '/images/events/concerts-pass.jpg', world: 'play', extraTags: [] };
    out.push(makeEntity({
      id: `season-${ev.id}`,
      type: 'Season',
      world: route.world,
      title: ev.name,
      subtitle: [ev.where, `${ev.start} – ${ev.end}`].filter(Boolean).join(' · '),
      href: route.href,
      image: route.image,
      aliases: [ev.name],
      tags: [
        'season', 'event', 'miami', 'майами',
        ev.id, ev.name, ev.where, ev.stop, ev.start, ev.end,
        ...Object.values(ev.tip || {}),
        ...route.extraTags
      ]
    }));
  }

  // --- Top-level sections ---
  for (const section of SECTIONS) {
    out.push(makeEntity({
      id: 'section-' + section.href.slice(1),
      type: 'Destination',
      world: section.href === '/private-jets' ? 'travel' : ECO_WORLD[section.href.slice(1)] || 'concierge',
      title: section.label,
      href: section.href,
      tags: [section.label]
    }));
  }

  // --- Ecosystem worlds (top-level destinations) ---
  for (const w of safe(() => ecosystem)) {
    out.push(makeEntity({
      id: `world-${w.id}`, type: 'World', world: ECO_WORLD[w.id] || 'concierge',
      title: w.label, subtitle: w.tagline, href: w.href === '/concierge' ? '/discovery' : w.href,
      tags: [w.id, w.description, w.tagline]
    }));
  }

  // --- Canonical entry points ---
  for (const c of safe(() => discoveryCategories)) {
    out.push(makeEntity({
      id: `dest-${c.label}-${c.href}`, type: 'Destination', world: c.cluster,
      title: c.label, subtitle: null, href: c.href === '/concierge' ? '/discovery' : c.href,
      tags: c.keywords
    }));
  }

  return out;
}

let cache = null;
export function getEcosystemIndex() {
  if (!cache) {
    // A malformed data source must degrade discovery, never throw into the
    // caller's render or leave an uncaught rejection in the console.
    try {
      cache = build();
    } catch {
      cache = [];
    }
  }
  return cache;
}
