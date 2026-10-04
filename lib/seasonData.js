// Miami season 2026-27: the weeks that sell out first, shown on the homepage.
// Dates come from each organizer's own site (`source`) and were checked on
// SEASON_CHECKED_AT. Events whose end date has passed drop off by themselves;
// add next season's dates here when organizers publish them.
export const SEASON_CHECKED_AT = '2026-10-02';

export const SEASON = [
  {
    id: 'flibs',
    name: 'Fort Lauderdale International Boat Show',
    start: '2026-10-28',
    end: '2026-11-01',
    where: 'Fort Lauderdale',
    stop: 'fort-lauderdale',
    source: 'https://www.flibs.com/',
    tip: {
      en: 'The world’s largest in-water boat show. Marinas and charters fill up first.',
      ru: 'Крупнейшее в мире шоу яхт на воде. Первыми заканчиваются причалы и чартеры.',
      es: 'La mayor feria náutica en el agua del mundo. Las marinas y los chárteres se llenan primero.',
      pt: 'A maior feira náutica na água do mundo. Marinas e fretamentos lotam primeiro.',
      he: 'תערוכת הסירות על המים הגדולה בעולם. המרינות והשכרות היאכטות נתפסות ראשונות.'
    }
  },
  {
    id: 'art-basel',
    name: 'Art Basel Miami Beach',
    start: '2026-12-04',
    end: '2026-12-06',
    where: 'Miami Beach Convention Center',
    stop: 'south-beach',
    source: 'https://www.artbasel.com/miami-beach',
    tip: {
      en: 'VIP days start Dec 2. Dinner tables and cars go first.',
      ru: 'VIP-дни начинаются 2 декабря. Первыми разбирают столы на ужин и машины.',
      es: 'Los días VIP empiezan el 2 de diciembre. Las mesas para cenar y los autos se van primero.',
      pt: 'Os dias VIP começam em 2 de dezembro. Mesas para jantar e carros acabam primeiro.',
      he: 'ימי ה־VIP מתחילים ב־2 בדצמבר. שולחנות לארוחת ערב ורכבים נגמרים ראשונים.'
    }
  },
  {
    id: 'nye',
    name: 'New Year’s Eve',
    start: '2026-12-31',
    end: '2026-12-31',
    where: 'Biscayne Bay',
    stop: 'downtown',
    source: null,
    tip: {
      en: 'Fireworks over the bay. Yachts for the night book out weeks ahead.',
      ru: 'Салют над заливом. Яхты на эту ночь бронируют за несколько недель.',
      es: 'Fuegos artificiales sobre la bahía. Los yates para esa noche se reservan con semanas de antelación.',
      pt: 'Fogos sobre a baía. Os iates para a noite esgotam com semanas de antecedência.',
      he: 'זיקוקים מעל המפרץ. יאכטות ללילה הזה נתפסות שבועות מראש.'
    }
  },
  {
    id: 'boat-show',
    name: 'Miami International Boat Show',
    start: '2027-02-10',
    end: '2027-02-14',
    where: 'Miami Beach',
    stop: 'south-beach',
    source: 'https://www.miamiboatshow.com/',
    tip: {
      en: 'Five days of boats, brokers and dinners on the water.',
      ru: 'Пять дней яхт, брокеров и ужинов на воде.',
      es: 'Cinco días de barcos, brókers y cenas sobre el agua.',
      pt: 'Cinco dias de barcos, corretores e jantares na água.',
      he: 'חמישה ימים של סירות, ברוקרים וארוחות על המים.'
    }
  },
  {
    id: 'miami-open',
    name: 'Miami Open',
    start: '2027-03-14',
    end: '2027-03-28',
    where: 'Hard Rock Stadium',
    stop: 'miami-gardens',
    source: 'https://www.miamiopen.com/',
    tip: {
      en: 'Two weeks of tennis. The final weekend sells first.',
      ru: 'Две недели тенниса. Финальные выходные раскупают первыми.',
      es: 'Dos semanas de tenis. El fin de semana final se agota primero.',
      pt: 'Duas semanas de tênis. O fim de semana final esgota primeiro.',
      he: 'שבועיים של טניס. סוף השבוע של הגמר נמכר ראשון.'
    }
  },
  {
    id: 'ultra',
    name: 'Ultra Music Festival',
    start: '2027-03-26',
    end: '2027-03-28',
    where: 'Bayfront Park',
    stop: 'downtown',
    source: 'https://ultramusicfestival.com/',
    tip: {
      en: 'Miami Music Week runs around it, and downtown hotels fill early.',
      ru: 'Вокруг него идёт Miami Music Week, и отели в центре заполняются заранее.',
      es: 'La Miami Music Week lo rodea y los hoteles del centro se llenan pronto.',
      pt: 'A Miami Music Week acontece em volta, e os hotéis do centro lotam cedo.',
      he: 'שבוע המוזיקה של מיאמי מתקיים סביבו, והמלונות במרכז העיר מתמלאים מוקדם.'
    }
  },
  {
    id: 'f1',
    name: 'Formula 1 Miami Grand Prix',
    start: '2027-04-30',
    end: '2027-05-02',
    where: 'Miami International Autodrome',
    stop: 'miami-gardens',
    source: 'https://f1miamigp.com/',
    tip: {
      en: 'Race weekend. Cars and villas book months ahead.',
      ru: 'Гоночный уикенд. Машины и виллы бронируют за несколько месяцев.',
      es: 'Fin de semana de carrera. Los autos y las villas se reservan con meses de antelación.',
      pt: 'Fim de semana de corrida. Carros e villas são reservados com meses de antecedência.',
      he: 'סוף שבוע של מרוץ. רכבים ווילות נתפסים חודשים מראש.'
    }
  }
];

const dayOf = (iso) => new Date(`${iso}T12:00:00`);

// Events that have not ended yet, relative to `today` (a Date at midnight).
export function upcomingSeason(today) {
  return SEASON.filter((event) => new Date(`${event.end}T23:59:59`) >= today);
}

// Whole days from `today` until the event starts; 0 or less means it is on.
export function daysUntil(event, today) {
  return Math.round((new Date(`${event.start}T00:00:00`) - today) / 864e5);
}

export function formatSeasonRange(event, intlLocale) {
  const format = new Intl.DateTimeFormat(intlLocale, { month: 'short', day: 'numeric' });
  if (event.start === event.end) return format.format(dayOf(event.start));
  try {
    return format.formatRange(dayOf(event.start), dayOf(event.end));
  } catch {
    return `${format.format(dayOf(event.start))} – ${format.format(dayOf(event.end))}`;
  }
}

export function seasonStub(event, intlLocale) {
  const start = dayOf(event.start);
  return {
    month: start.toLocaleDateString(intlLocale, { month: 'short' }).replace('.', '').toUpperCase(),
    day: start.getDate(),
    year: start.getFullYear()
  };
}
