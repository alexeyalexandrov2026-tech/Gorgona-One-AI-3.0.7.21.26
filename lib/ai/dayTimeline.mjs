// ===========================================================================
// Interactive Miami Day Timeline builder & RFC 5545 .ics Calendar Exporter
// for ELIO+ Guide multi-stop plans (16 languages, pure deterministic logic).
// ===========================================================================

import { normalizeLocale } from './locale.js';

const BASE_EN = Object.freeze({
  heading: 'Miami Day Timeline',
  exportIcs: 'Add to Calendar (.ics)',
  rainPlanB: 'Rain Plan B',
  rainPrompt: 'Give me an indoor luxury Rain Plan B in Miami with fine dining and a covered lounge or penthouse option for this itinerary.',
  driveHint: '~15–20 min drive across Miami',
  slots: {
    car: { time: '11:00', durationMin: 120 },
    yacht: { time: '13:30', durationMin: 240 },
    experience: { time: '14:00', durationMin: 150 },
    stay: { time: '15:00', durationMin: 60 },
    event: { time: '19:30', durationMin: 180 },
    dining: { time: '20:00', durationMin: 120 },
    nightlife: { time: '23:00', durationMin: 150 },
    default: { time: '16:00', durationMin: 120 }
  }
});

const TIMELINE_COPY = Object.freeze({
  en: BASE_EN,
  ru: {
    ...BASE_EN,
    heading: 'Расписание дня в Майами',
    exportIcs: 'В Календарь (.ics)',
    rainPlanB: 'План Б при дожде',
    rainPrompt: 'Предложи люксовый закрытый План Б в Майами на случай дождя: лучший ресторан в помещении и закрытый лаунж или пентхаус вместо прогулки на улице.',
    driveHint: '~15–20 мин в пути по Майами'
  },
  es: {
    ...BASE_EN,
    heading: 'Itinerario del día en Miami',
    exportIcs: 'Añadir al Calendario (.ics)',
    rainPlanB: 'Plan B por lluvia',
    rainPrompt: 'Dame un Plan B de lujo bajo techo en Miami en caso de lluvia con restaurante top y lounge interior.',
    driveHint: '~15–20 min en auto por Miami'
  },
  uk: {
    ...BASE_EN,
    heading: 'Розклад дня в Маямі',
    exportIcs: 'До Календаря (.ics)',
    rainPlanB: 'План Б на дощ',
    rainPrompt: 'Запропонуй люксовий критий План Б у Маямі на випадок дощу: найкращий ресторан у приміщенні та закритий лаунж.',
    driveHint: '~15–20 хв у дорозі по Маямі'
  },
  fr: {
    ...BASE_EN,
    heading: 'Programme de la journée à Miami',
    exportIcs: 'Ajouter au calendrier (.ics)',
    rainPlanB: 'Plan B pluie',
    rainPrompt: 'Propose-moi un Plan B de luxe en intérieur à Miami en cas de pluie.',
    driveHint: '~15–20 min de trajet'
  },
  de: {
    ...BASE_EN,
    heading: 'Miami Tagesplan',
    exportIcs: 'Zum Kalender (.ics)',
    rainPlanB: 'Regen-Plan B',
    rainPrompt: 'Gib mir einen luxuriösen Indoor-Plan B in Miami bei Regen.',
    driveHint: '~15–20 Min. Fahrtzeit'
  },
  it: {
    ...BASE_EN,
    heading: 'Programma del giorno a Miami',
    exportIcs: 'Aggiungi al calendario (.ics)',
    rainPlanB: 'Piano B pioggia',
    rainPrompt: 'Dammi un Piano B di lusso al coperto a Miami in caso di pioggia.',
    driveHint: '~15–20 min in auto'
  },
  pt: {
    ...BASE_EN,
    heading: 'Roteiro do dia em Miami',
    exportIcs: 'Adicionar ao Calendário (.ics)',
    rainPlanB: 'Plano B chuva',
    rainPrompt: 'Me dê um Plano B de luxo em ambiente coberto em Miami em caso de chuva.',
    driveHint: '~15–20 min de carro'
  },
  he: {
    ...BASE_EN,
    heading: 'לוח זמנים ליום במיאמי',
    exportIcs: 'הוסף ליומן (.ics)',
    rainPlanB: 'תוכנית ב׳ לגשם',
    rainPrompt: 'תן לי תוכנית ב׳ יוקרתית מקורה במיאמי למקרה של גשם.',
    driveHint: 'כ-15–20 דקות נסיעה'
  },
  ar: {
    ...BASE_EN,
    heading: 'جدول يومك في ميامي',
    exportIcs: 'إضافة للتقويم (.ics)',
    rainPlanB: 'خطة بديلة للمطر',
    rainPrompt: 'اقترح لي خطة بديلة فاخرة داخلية في ميامي في حال هطول المطر.',
    driveHint: 'حوالي 15–20 دقيقة بالسيارة'
  },
  zh: {
    ...BASE_EN,
    heading: '迈阿密一日时间线',
    exportIcs: '添加到日历 (.ics)',
    rainPlanB: '雨天备选方案',
    rainPrompt: '如果迈阿密下雨，请为我推荐高端室内餐饮和私密酒廊的备选方案。',
    driveHint: '车程约 15–20 分钟'
  },
  ja: {
    ...BASE_EN,
    heading: 'マイアミ1日タイムライン',
    exportIcs: 'カレンダーに追加 (.ics)',
    rainPlanB: '雨天プランB',
    rainPrompt: 'マイアミで雨が降った場合の屋内ラグジュアリー・プランBを提案してください。',
    driveHint: '車で約15〜20分'
  },
  ko: {
    ...BASE_EN,
    heading: '마이애미 데이 타임라인',
    exportIcs: '캘린더에 추가 (.ics)',
    rainPlanB: '우천 플랜 B',
    rainPrompt: '마이애미에 비가 올 경우 실내 럭셔리 다이닝과 라운지 플랜 B를 추천해 주세요.',
    driveHint: '차량 약 15–20분'
  },
  tr: {
    ...BASE_EN,
    heading: 'Miami Günlük Program',
    exportIcs: 'Takvime Ekle (.ics)',
    rainPlanB: 'Yağmur Planı B',
    rainPrompt: 'Miami’de yağmur yağarsa lüks kapalı mekân B planı öner.',
    driveHint: 'Yaklaşık 15–20 dk sürüş'
  },
  pl: {
    ...BASE_EN,
    heading: 'Plan dnia w Miami',
    exportIcs: 'Dodaj do kalendarza (.ics)',
    rainPlanB: 'Plan B na deszcz',
    rainPrompt: 'Zaproponuj luksusowy plan B pod dachem w Miami na wypadek deszczu.',
    driveHint: 'Ok. 15–20 min jazdy'
  },
  fa: {
    ...BASE_EN,
    heading: 'برنامه روزانه میامی',
    exportIcs: 'افزودن به تقویم (.ics)',
    rainPlanB: 'پلن B روز بارانی',
    rainPrompt: 'برای روز بارانی در میامی یک برنامه لوکس سرپوشیده پیشنهاد بده.',
    driveHint: 'حدود ۱۵ تا ۲۰ دقیقه رانندگی'
  }
});

export function getTimelineCopy(locale = 'en') {
  const code = normalizeLocale(locale);
  return TIMELINE_COPY[code] || TIMELINE_COPY.en;
}

function slotKindForSection(section) {
  const href = String(section?.href || '').toLowerCase();
  const candKind = String(section?.candidates?.[0]?.kind || '').toLowerCase();
  if (candKind && BASE_EN.slots[candKind]) return candKind;
  if (href.includes('/rentals')) return 'car';
  if (href.includes('/yachts')) return 'yacht';
  if (href.includes('/vacation-rentals')) return 'stay';
  if (href.includes('/events')) return 'event';
  if (href.includes('/restaurants-nightlife')) return 'dining';
  if (href.includes('/experiences')) return 'experience';
  return 'default';
}

const ORDER_PRIORITY = Object.freeze({
  car: 1,
  yacht: 2,
  experience: 3,
  stay: 4,
  event: 5,
  dining: 6,
  nightlife: 7,
  default: 8
});

export function buildDayTimeline(plan, profile = null, locale = 'en') {
  const sections = Array.isArray(plan?.sections) ? plan.sections : [];
  if (!sections.length) return [];
  const copy = getTimelineCopy(locale);

  const stops = sections.map((section, idx) => {
    const kind = slotKindForSection(section);
    const slot = copy.slots[kind] || copy.slots.default;
    const primary = section.candidates?.[0] || {};
    return {
      id: `${kind}-${idx}`,
      kind,
      order: ORDER_PRIORITY[kind] || 8,
      time: slot.time,
      durationMin: slot.durationMin,
      label: section.label || kind,
      title: primary.title || section.label || 'Miami Elio Stop',
      price: primary.price || null,
      href: primary.href || section.href || '/discovery'
    };
  });

  stops.sort((a, b) => a.order - b.order);
  return stops.map((stop, idx) => ({
    ...stop,
    driveHint: idx > 0 ? copy.driveHint : null
  }));
}

function escapeIcsText(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatIcsLocalDate(isoDate, hhmm, addMinutes = 0) {
  const [y, m, d] = String(isoDate || '').split('-').map(Number);
  const [hh, mm] = String(hhmm || '12:00').split(':').map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1, hh || 12, (mm || 0) + addMinutes, 0));
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00`;
}

export function buildPlanIcs(plan, profile = null, locale = 'en', now = new Date()) {
  const stops = buildDayTimeline(plan, profile, locale);
  if (!stops.length) return '';
  const baseDate = profile?.dateRange?.from || new Date(now.getTime() + 3 * 86400_000).toISOString().slice(0, 10);
  const stamp = formatIcsLocalDate(now.toISOString().slice(0, 10), '12:00', 0) + 'Z';

  const events = stops.map((stop, idx) => {
    const start = formatIcsLocalDate(baseDate, stop.time, 0);
    const end = formatIcsLocalDate(baseDate, stop.time, stop.durationMin);
    const uid = `miami-elio-${baseDate}-${idx + 1}@gorgona-one.com`;
    const url = `https://gorgona-one.com${stop.href}`;
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=America/New_York:${start}`,
      `DTEND;TZID=America/New_York:${end}`,
      `SUMMARY:${escapeIcsText(`Miami Elio — ${stop.title}`)}`,
      `DESCRIPTION:${escapeIcsText(`${stop.label}${stop.price ? ` (${stop.price})` : ''} · ${url}`)}`,
      `URL:${url}`,
      'LOCATION:Miami, FL',
      'END:VEVENT'
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Miami Elio//ELIO+ Guide//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Miami Elio Itinerary',
    'X-WR-TIMEZONE:America/New_York',
    ...events,
    'END:VCALENDAR',
    ''
  ].join('\r\n');
}
