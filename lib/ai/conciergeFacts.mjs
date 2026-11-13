import {conciergeCopy} from './conciergeCopy.mjs';
import {latestMiamiWeather} from './miamiWeather.mjs';
import {normalizeLocale} from './locale.js';

function normalize(text){
  return text.normalize('NFKC').toLowerCase().replace(/\u0640|[\u064b-\u065f]/gu,'')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu,' ').trim();
}

const greetings=new Set(Object.values(conciergeCopy).flatMap(copy=>copy.greetings.split('|').map(normalize)));
const miami=/(?<![\p{L}\p{N}])(?:miami|майами|маями|маямі|міамі|миямі|[בל]?מיאמי|[ب]?\u0645[ىي]امي|میامی)(?![\p{L}\p{N}])|迈阿密|邁阿密|マイアミ|마이애미/iu;
// Anchor direct questions so a trip that mentions rain, a date or a
// departure time remains a planning request. Forecasts go to the model.
const weatherQuestions=[
  /^(?:(?:(?:what s|what is|how s|how is|tell me|show me|check) (?:the )?)?(?:current )?(?:weather|temperature) |(?:is it raining|is it sunny|how hot is it|how cold is it) )/u,
  /^(?:(?:какая |какова |узнай |скажи )?(?:сейчас |текущая )?(?:погода|температура) |(?:сколько градусов|идет ли дождь|идёт ли дождь) |(?:яка |яка зараз |зараз )?(?:погода|температура) )/u,
  /^(?:qué tiempo hace|qué temperatura hace|cómo está el tiempo|clima actual|está lloviendo|(?:qual é |como está )?(?:o )?(?:tempo|clima|temperatura) (?:atual |agora |em |de ))/u,
  /^(?:wie ist das wetter|wie warm ist es|aktuelle temperatur|aktuelles wetter|regnet es|quel temps fait il|quelle température fait il|quelle est la température|météo actuelle|pleut il|che tempo fa|qual è la temperatura|com è il meteo|piove|jaka jest pogoda|jaka pogoda|jaka jest temperatura|czy pada) /u,
  /^(?:miami (?:de )?(?:şu anda |şu an )?(?:hava durumu|hava nasıl|kaç derece|yağmur yağıyor)(?: |$)|(?:מה מזג האוויר|איך מזג האוויר|כמה מעלות|كيف (?:هو )?(?:الطقس|الجو)|ما حالة الطقس|ما درجة الحرارة|هل تمطر|آب ?و ?هوا(?:ی)?|هوای|دمای|هوا در) )/u,
  /^(?:(?:迈阿密|邁阿密)(?:现在|現在|目前|的)?(?:天气|天氣|气温|氣溫)|マイアミ(?:の|は|で)?(?:今の|現在の)?(?:天気|気温)|마이애미(?:의|는|에)? (?:지금 |현재 )?(?:날씨|기온))/u,
];
const timeQuestions=[
  /^(?:what time (?:is it|is it now|in) |what (?:s|is) the (?:local )?time |(?:local time|current time|time now) (?:in|at) )/u,
  /^(?:который час|сколько (?:сейчас )?времени|какое (?:сейчас )?время|местное время|котра година|скільки зараз часу|який зараз час) /u,
  /^(?:qué hora es|hora local|que horas são|qual é a hora|wie spät ist es|wie viel uhr ist es|ortszeit|quelle heure est il|heure locale|che ore sono|che ora è|ora locale|która godzina|jaki jest czas) /u,
  /^(?:miami (?:de )?(?:şu anda |şu an )?saat kaç(?: |$)|(?:saat kaç|מה השעה|מה הזמן המקומי|كم الساعة|ما الوقت|ما التوقيت المحلي|ساعت (?:الان |محلی )?در|الان در) )/u,
  /^(?:(?:迈阿密|邁阿密)(?:现在|現在|目前|当地|當地)?(?:几点|幾點|时间|時間)|マイアミ(?:の|は|で)?(?:今|現地|現在)?(?:何時|時刻|時間)|마이애미(?:의|는|에)? (?:지금 |현재 |현지 )?(?:몇 시|시간))/u,
];
const nonCurrent=/(?<![\p{L}\p{N}])(?:tomorrow|yesterday|next|forecast|weekend|tonight|later|завтра|вчера|вечером|будет|прогноз|вихідні|учора|увечері|mañana|ayer|pronóstico|amanhã|ontem|previsão|demain|hier|prévisions|morgen|gestern|vorhersage|domani|ieri|previsioni|jutro|wczoraj|prognoza|yarın|dün|tahmin|מחר|אתמול|תחזית|غدا|أمس|توقعات|فردا|دیروز|پیش بینی)(?![\p{L}\p{N}])|明天|昨天|预报|預報|明日|昨日|予報|내일|어제|예보|\b20\d{2} \d{1,2} \d{1,2}\b/u;
const planning=/\b(?:recommend|activities|itinerary|things to do|what should|find a|book a|choose a|help me plan|weekend trip|check in|boarding|depart|arrive)\b|(?:порекомендуй|предложи|посоветуй|что посмотреть|маршрут|куда пойти|забронируй|что делать)/u;

function localDateTime(timestamp,locale,includeDate=false){
  return new Intl.DateTimeFormat(locale,{
    timeZone:'America/New_York',timeStyle:'short',...(includeDate?{dateStyle:'medium'}:{}),
  }).format(timestamp);
}

/** @param {string} message @param {string} locale @param {AbortSignal} [signal] */
export async function answerConciergeFact(message,locale,signal){
  const code=normalizeLocale(locale),copy=conciergeCopy[code];
  const normalized=normalize(message);
  if(greetings.has(normalized))return {reply:copy.hello,source:'concierge',error:false};

  const sentences=message.split(/[?!？！؟;；\n]+/u).map(normalize).filter(part=>part&&!greetings.has(part));
  if(!miami.test(sentences[0]||'')||nonCurrent.test(normalized)||planning.test(normalized))return null;
  const wantsWeather=sentences.some(part=>miami.test(part)&&weatherQuestions.some(pattern=>pattern.test(part)));
  const wantsTime=sentences.some(part=>miami.test(part)&&timeQuestions.some(pattern=>pattern.test(part)));
  if(!wantsWeather&&!wantsTime)return null;
  const time=wantsTime?copy.time.replace('{time}',localDateTime(Date.now(),code)):'';
  if(!wantsWeather)return {reply:time,source:'concierge',error:false};

  const reading=await latestMiamiWeather(signal);
  if(!reading)return {reply:[time,copy.weatherDown].filter(Boolean).join('\n\n'),source:'weather',error:true};
  const number=new Intl.NumberFormat(code,{maximumFractionDigits:0});
  const temp=number.format(reading.celsius)+' °C / '+number.format(reading.celsius*9/5+32)+' °F';
  const condition=reading.condition?' · '+copy.conditions[reading.condition]:'';
  const weather=copy.weather.replace('{temp}',temp).replace('{condition}',condition)
    .replace('{time}',localDateTime(reading.observedAt,code,true));
  return {reply:[time,weather].filter(Boolean).join('\n\n'),source:'weather',error:false};
}
