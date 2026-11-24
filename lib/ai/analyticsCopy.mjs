// ===========================================================================
// Localized labels for Admin ELIO+ Guide & Conversion Funnel Analytics widget.
// ===========================================================================

import { normalizeLocale } from './locale.js';

const COPY = Object.freeze({
  en: {
    title: 'ELIO+ Guide Intelligence & Conversion Funnel',
    subtitle: 'Zero-PII telemetry across the last 7 days: ELIO turns, cache savings, outbound partner clicks, Telegram/WhatsApp handoffs, and UTM/ad attribution.',
    turns: 'ELIO Turns (7d)',
    modelShare: 'AI Model Share',
    latency: 'Avg Latency',
    clicks: 'Partner Clicks (7d)',
    messengers: 'Telegram / WhatsApp',
    leads: 'Booking Leads (7d)',
    adEvents: 'Ad / UTM Events',
    openReports: 'Open Reports',
    partnerCol: 'Partner / Channel',
    shownCol: 'Frames Shown',
    clicksCol: 'Clicks',
    ctrCol: 'CTR',
    sourcesTitle: 'Top Traffic & Ad Sources (7 days)',
    sourceCol: 'Source',
    eventsCol: 'Events',
    leadsCol: 'Leads',
    noPartners: 'No partner referral events recorded in the last 7 days yet.',
    refresh: 'Refresh',
    loading: 'Loading…',
    error: 'ELIO analytics unavailable.'
  },
  ru: {
    title: 'Аналитика ELIO+ Guide и воронка конверсий',
    subtitle: 'Персистентная телеметрия без ПД за 7 дней: ответы ELIO, клики по партнёрам, переходы в Telegram/WhatsApp, заявки и атрибуция рекламы (UTM / fbclid).',
    turns: 'Ответов ELIO (7д)',
    modelShare: 'Доля AI-модели',
    latency: 'Средний ответ',
    clicks: 'Клики партнёров (7д)',
    messengers: 'Telegram / WhatsApp',
    leads: 'Заявки (7д)',
    adEvents: 'Реклама / UTM',
    openReports: 'Открытые жалобы',
    partnerCol: 'Партнёр / канал',
    shownCol: 'Показов карточек',
    clicksCol: 'Клики',
    ctrCol: 'CTR',
    sourcesTitle: 'Источники трафика и рекламы (7 дней)',
    sourceCol: 'Источник',
    eventsCol: 'События',
    leadsCol: 'Заявки',
    noPartners: 'За последние 7 дней событий по партнёрам ещё не зафиксировано.',
    refresh: 'Обновить',
    loading: 'Загрузка…',
    error: 'Аналитика ELIO недоступна.'
  },
  es: {
    title: 'Analítica de ELIO+ Guide y Embudo de Conversión',
    subtitle: 'Telemetría persistente sin datos personales (7 días): respuestas ELIO, clics a socios, Telegram/WhatsApp, solicitudes y atribución UTM/anuncios.',
    turns: 'Turnos ELIO (7d)',
    modelShare: 'Cuota Modelo IA',
    latency: 'Latencia Media',
    clicks: 'Clics a Socios (7d)',
    messengers: 'Telegram / WhatsApp',
    leads: 'Solicitudes (7d)',
    adEvents: 'Eventos UTM / Ads',
    openReports: 'Reportes Abiertos',
    partnerCol: 'Socio / Canal',
    shownCol: 'Impresiones',
    clicksCol: 'Clics',
    ctrCol: 'CTR',
    sourcesTitle: 'Fuentes de tráfico y anuncios (7 días)',
    sourceCol: 'Fuente',
    eventsCol: 'Eventos',
    leadsCol: 'Leads',
    noPartners: 'Aún no hay eventos de socios en los últimos 7 días.',
    refresh: 'Actualizar',
    loading: 'Cargando…',
    error: 'Analítica no disponible.'
  },
  uk: {
    title: 'Аналітика ELIO+ Guide та воронка конверсій',
    subtitle: 'Персистентна телеметрія без ПД за 7 днів: відповіді ELIO, кліки по партнерах, Telegram/WhatsApp, заявки та атрибуція реклами.',
    turns: 'Відповідей ELIO (7д)',
    modelShare: 'Частка AI-моделі',
    latency: 'Середня відповідь',
    clicks: 'Кліки партнерів (7д)',
    messengers: 'Telegram / WhatsApp',
    leads: 'Заявки (7д)',
    adEvents: 'Реклама / UTM',
    openReports: 'Відкриті скарги',
    partnerCol: 'Партнер / канал',
    shownCol: 'Показів',
    clicksCol: 'Кліки',
    ctrCol: 'CTR',
    sourcesTitle: 'Джерела трафіку та реклами (7 днів)',
    sourceCol: 'Джерело',
    eventsCol: 'Події',
    leadsCol: 'Заявки',
    noPartners: 'За останні 7 днів подій по партнерах ще не зафіксовано.',
    refresh: 'Оновити',
    loading: 'Завантаження…',
    error: 'Аналітика ELIO недоступна.'
  }
});

export function getAnalyticsCopy(locale = 'en') {
  const code = normalizeLocale(locale);
  return COPY[code] || COPY.en;
}
