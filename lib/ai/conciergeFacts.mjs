import {conciergeCopy} from './conciergeCopy.mjs';
import {latestMiamiWeather} from './miamiWeather.mjs';
import {normalizeLocale} from './locale.js';

function normalize(text){
  return text.normalize('NFKC').toLowerCase().replace(/\u0640|[\u064b-\u065f]/gu,'')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu,' ').trim();
}

const greetings=new Set(Object.values(conciergeCopy).flatMap(copy=>copy.greetings.split('|').map(normalize)));
const miami=/(?<![\p{L}\p{N}])(?:miami|майами|маями|маямі|міамі|миямі|[בל]?מיאמי|[ب]?\u0645[ىي]امي|میامی)(?![\p{L}\p{N}])|迈阿密|邁阿密|マイアミ|마이애미/u;
const weatherQuestions=[
  /^(?:(?:(?:what s|what is|how s|how is|tell me|show me|check) (?:the )?)?(?:current )?(?:weather|temperature) |(?:is it raining|is it sunny|how hot is it|how cold is it) )/u,
  /^(?:(?:какая |какова |узнай |скажи )?(?:сейчас |текущая )?(?:погода|температура) |(?:сколько градусов|идет ли дождь|идёт ли дождь) |(?:яка |яка зараз |зараз )?(?:погода|температура) )/u,
  /^(?:qué tiempo hace|qué temperatura hace|cómo está el tiempo|clima actual|está lloviendo|(?:qual é |como está )?(?:o )?(?:tempo|clima|temperatura) (?:atual |agora |em |de ))/u,
  /^(?:wie ist das wetter|wie warm ist es|aktuelle temperatur|aktuelles wetter|regnet es|quel temps fait il|quelle température fait il|quelle est la température|météo actuelle|pleut il|che tempo fa|qual è la temperatura|com è il meteo|piove|jaka jest pogoda|jaka pogoda|jaka jest temperatura|czy pada) /u,
  /^(?:מה מזג האוויר|איך מזג האוויר|כמה מעלות|كيف (?:هو )?(?:الطقس|الجو)|ما حالة الطقس|ما درجة الحرارة|هل تمطر|آب ?و ?هوا(?:ی)?|هوای|دمای|هوا در) /u,
];
const timeQuestions=[
  /^(?:what time (?:is it|is it now|in) |what (?:s|is) the (?:local )?time |(?:local time|current time|time now) (?:in|at) )/u,
  /^(?:который час|сколько (?:сейчас )?времени|какое (?:сейчас )?время|местное время|котра година|скільки зараз часу|який зараз час) /u,
  /^(?:qué hora es|hora local|que horas são|qual é a hora|wie spät ist es|wie viel uhr ist es|ortszeit|quelle heure est il|heure locale|che ore sono|che ora è|ora locale|która godzina|jaki jest czas) /u,
  /^(?:saat kaç|מה השעה|מה הזמן המקומי|كم الساعة|ما الوقت|ما التوقيت المحلي|ساعت (?:الان |محلی )?در|الان در) /u,
];
const nonCurrent=/(?<![\p{L}\p{N}])(?:tomorrow|yesterday|next|forecast|weekend|tonight|later|завтра|вчера|вечером|будет|прогноз|вихідні|учора|увечері|mañana|ayer|pronóstico|amanhã|ontem|previsão|demain|hier|prévisions|morgen|gestern|vorhersage|domani|ieri|previsioni|jutro|wczoraj|prognoza|yarın|dün|tahmin|מחר|אתמול|תחזית|غدا|أمس|توقعات|فردا|دیروز|پیش بینی)(?![\p{L}\p{N}])|明天|昨天|预报|預報|明日|昨日|予報|내일|어제|예보|\b20\d{2} \d{1,2} \d{1,2}\b/u;
// Accept only known current qualifiers after the complete place/question.
// Forecast dates, comparison cities and new requests stay with the model.
const currentSuffix=/^(?:(?:fl(?:orida)?|now|right now|currently|today|please|сейчас|сегодня|пожалуйста|зараз|сьогодні|ahora|ahora mismo|hoy|por favor|agora|hoje|maintenant|aujourd hui|actuellement|jetzt|gerade|heute|adesso|ora|oggi|teraz|dziś|dzisiaj|şu anda|şu an|bugün|כרגע|עכשיו|اليوم|الان|الآن|اکنون|امروز)(?: |$))*$/u;
const cityFirst=/^(?:miami (?:de )?|(?:迈阿密|邁阿密)(?:现在|現在|目前|当地|當地|的)?|マイアミ(?:の|は|で)?(?:今の|現在の|今|現地|現在)?|마이애미(?:의|는|에)? (?:지금 |현재 |현지 )?)/u;
const cityFirstWeather=/^(?:(?:şu anda |şu an )?(?:hava durumu|hava nasıl|kaç derece|yağmur yağıyor)(?: |$)|(?:天气|天氣|气温|氣溫)(?:怎么样|怎麼樣|如何|多少度|是多少)?|(?:天気|気温)(?:は(?:どう|何度)(?:ですか)?|を教えて(?:ください)?)?|(?:날씨|기온)(?:는|가)?(?: (?:어때요|어떤가요|몇 도(?:인가요)?|알려줘))?)/u;
const cityFirstTime=/^(?:(?:şu anda |şu an )?saat kaç(?: |$)|(?:几点|幾點|时间|時間)(?:了|是多少)?|(?:何時(?:ですか)?|時刻|時間)(?:を教えて(?:ください)?)?|(?:몇 시|시간)(?:예요|인가요|이야)?)/u;
const cityFirstQuestions=[['weather',cityFirstWeather],['time',cityFirstTime]];
const persianWeatherEnding=/^(?:چطور است|چگونه است|چند درجه است|چند است)$/u;
const persianClockEnding=/^(?:چند است|چنده)$/u;
const planning=/\b(?:recommend|activities|itinerary|things to do|what should|find a|book a|rent a|choose a|help me plan|weekend trip|check in|boarding|depart|arrive)\b|(?:порекомендуй|предложи|посоветуй|что посмотреть|маршрут|куда пойти|забронируй|арендовать|что делать)/u;
const clauseBreak=new RegExp([
  String.raw`(?<=[?!？！؟;；])|\r?\n|(?<=\.)\s+`,
  String.raw`(?:,\s*(?:(?:and|also)\s+)?|\s+(?:and|also)\s+)(?=(?:i|we|can|could|please|find|rent|book|tell|show|suggest|what|how)\b)`,
  String.raw`(?:,\s*(?:(?:и|а также)\s+)?|\s+(?:и|а также)\s+)(?=(?:ещё|еще|также|мне|нам|хочу|нужна?|подскажи|найди|сколько|какая|который)(?!\p{L}))`,
].join('|'),'iu');
const weatherDetails=/^(?:how many degrees|is it raining|сколько градусов(?: на улице)?(?: и ид[её]т ли дождь)?|ид[её]т ли дождь)$/u;
const timeDetails=/^(?:please (?:tell me|give me) the local time|lütfen yerel saati söyle)$/u;

function factKind(part){
  const place=miami.exec(part);
  if(!place||nonCurrent.test(part)||planning.test(part))return null;
  const suffix=part.slice(place.index+place[0].length).trim();
  const persian=place[0]==='میامی',current=currentSuffix.test(suffix);
  if((current||persian&&persianWeatherEnding.test(suffix))&&weatherQuestions.some(pattern=>pattern.test(part)))return 'weather';
  if((current||persian&&persianClockEnding.test(suffix))&&timeQuestions.some(pattern=>pattern.test(part)))return 'time';
  // Some languages place Miami before the question rather than after it.
  const prefix=cityFirst.exec(part);
  if(!prefix)return null;
  const rest=part.slice(prefix[0].length);
  for(const [kind,question] of cityFirstQuestions){
    const matched=question.exec(rest);
    if(matched&&currentSuffix.test(rest.slice(matched[0].length).trim()))return kind;
  }
  return null;
}

/** @param {string} message */
function factClauses(message){
  let wantsWeather=false,wantsTime=false;
  const remaining=[];
  for(const clause of message.split(clauseBreak)){
    const part=normalize(clause);
    if(!part||greetings.has(part))continue;
    const kind=factKind(part);
    if(kind==='weather'){wantsWeather=true;continue;}
    if(kind==='time'){wantsTime=true;continue;}
    // Clarifications may refer to a fact requested earlier in this turn.
    if((wantsWeather&&weatherDetails.test(part))||(wantsTime&&timeDetails.test(part)))continue;
    remaining.push(clause.trim());
  }
  return {wantsWeather,wantsTime,remainingMessage:remaining.join(' ')};
}

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

  const {wantsWeather,wantsTime,remainingMessage}=factClauses(message);
  if(!wantsWeather&&!wantsTime)return null;
  const time=wantsTime?copy.time.replace('{time}',localDateTime(Date.now(),code)):'';
  if(!wantsWeather)return {reply:time,source:'concierge',error:false,remainingMessage};

  const reading=await latestMiamiWeather(signal);
  if(!reading)return {reply:[time,copy.weatherDown].filter(Boolean).join('\n\n'),source:'weather',error:true,remainingMessage};
  const number=new Intl.NumberFormat(code,{maximumFractionDigits:0});
  const temp=number.format(reading.celsius)+' °C / '+number.format(reading.celsius*9/5+32)+' °F';
  const condition=reading.condition?' · '+copy.conditions[reading.condition]:'';
  const weather=copy.weather.replace('{temp}',temp).replace('{condition}',condition)
    .replace('{time}',localDateTime(reading.observedAt,code,true));
  return {reply:[time,weather].filter(Boolean).join('\n\n'),source:'weather',error:false,remainingMessage};
}
