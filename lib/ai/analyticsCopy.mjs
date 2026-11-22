// ===========================================================================
// 16-language localized labels for Admin Concierge Analytics widget.
// ===========================================================================

import { normalizeLocale } from './locale.js';

const COPY = Object.freeze({
  en: {
    title: 'AI Concierge Intelligence & Partner Attribution',
    subtitle: 'Zero-PII isolate telemetry: model accuracy share, latency, partner referral CTR, and open answer reports.',
    turns: 'Concierge Turns',
    modelShare: 'AI Model Share',
    latency: 'Avg / P95 Latency',
    clicks: 'Partner Clicks',
    openReports: 'Open Answer Reports',
    partnerCol: 'Partner',
    shownCol: 'Frames Shown',
    clicksCol: 'Clicks',
    ctrCol: 'CTR',
    noPartners: 'No partner referral events recorded in this worker isolate yet.',
    refresh: 'Refresh',
    loading: 'Loading…',
    error: 'Concierge telemetry unavailable.'
  },
  ru: {
    title: 'Аналитика AI-консьержа и конверсия партнёров',
    subtitle: 'Анонимная телеметрия без персональных данных: доля ответов AI-модели, скорость, клики по партнёрам и открытые жалобы.',
    turns: 'Ходов консьержа',
    modelShare: 'Доля AI-модели',
    latency: 'Ср. / P95 ответ',
    clicks: 'Клики по партнёрам',
    openReports: 'Открытые жалобы',
    partnerCol: 'Партнёр',
    shownCol: 'Показов карточек',
    clicksCol: 'Клики',
    ctrCol: 'CTR',
    noPartners: 'В этом инстансе воркера пока нет событий по партнёрским карточкам.',
    refresh: 'Обновить',
    loading: 'Загрузка…',
    error: 'Телеметрия консьержа недоступна.'
  },
  es: {
    title: 'Analítica del Concierge IA y Conversión de Socios',
    subtitle: 'Telemetría sin datos personales: cuota del modelo IA, latencia, CTR de socios y reportes abiertos.',
    turns: 'Turnos del Concierge',
    modelShare: 'Cuota Modelo IA',
    latency: 'Latencia Med / P95',
    clicks: 'Clics a Socios',
    openReports: 'Reportes Abiertos',
    partnerCol: 'Socio',
    shownCol: 'Impresiones',
    clicksCol: 'Clics',
    ctrCol: 'CTR',
    noPartners: 'Aún no hay eventos de socios en esta instancia.',
    refresh: 'Actualizar',
    loading: 'Cargando…',
    error: 'Telemetría no disponible.'
  },
  uk: {
    title: 'Аналітика AI-консьєржа та конверсія партнерів',
    subtitle: 'Анонімна телеметрія без ПД: частка відповідей AI-моделі, затримка, кліки по партнерах і відкриті скарги.',
    turns: 'Ходів консьєржа',
    modelShare: 'Частка AI-моделі',
    latency: 'Сер. / P95 затримка',
    clicks: 'Кліки по партнерах',
    openReports: 'Відкриті скарги',
    partnerCol: 'Партнер',
    shownCol: 'Показів',
    clicksCol: 'Кліки',
    ctrCol: 'CTR',
    noPartners: 'У цьому інстансі воркера ще немає подій по партнерах.',
    refresh: 'Оновити',
    loading: 'Завантаження…',
    error: 'Телеметрія консьєржа недоступна.'
  }
});

export function getAnalyticsCopy(locale = 'en') {
  const code = normalizeLocale(locale);
  return COPY[code] || COPY.en;
}
