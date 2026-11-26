// ===========================================================================
// Wave 1B ELIO+ Action Agent: 16-language localized micro-copy for live fleet
// availability badges, multi-day & Split-Pay estimates, and inline delivery.
// Strictly avoids the forbidden "concierge" / "консьерж" term in all locales.
// ===========================================================================

import { normalizeLocale } from './locale.js';

const ACTION_AGENT_COPY = Object.freeze({
  en: {
    availableDates: 'Available on your dates',
    busyDates: 'Active hold on these dates',
    estTotal: '{days}d est. {total}',
    splitPerGuest: '~{per}/guest ({n})',
    deliveryPlaceholder: 'Delivery: MIA / Hotel / Villa (optional)',
    splitPayOption: 'Request Split-Pay ({n} guests)'
  },
  ru: {
    availableDates: 'Свободно на ваши даты',
    busyDates: 'Есть бронь на эти даты',
    estTotal: '{days} дн. ≈ {total}',
    splitPerGuest: '≈ {per}/гость ({n})',
    deliveryPlaceholder: 'Доставка: MIA / отель / вилла (необязательно)',
    splitPayOption: 'Запросить Split-Pay ({n} гостей)'
  },
  es: {
    availableDates: 'Disponible en tus fechas',
    busyDates: 'Reserva activa en estas fechas',
    estTotal: '{days}d est. {total}',
    splitPerGuest: '~{per}/persona ({n})',
    deliveryPlaceholder: 'Entrega: MIA / Hotel / Villa (opcional)',
    splitPayOption: 'Solicitar Split-Pay ({n} personas)'
  },
  uk: {
    availableDates: 'Вільно на ваші дати',
    busyDates: 'Є бронь на ці дати',
    estTotal: '{days} дн. ≈ {total}',
    splitPerGuest: '≈ {per}/гість ({n})',
    deliveryPlaceholder: 'Доставка: MIA / готель / вілла (необовʼязково)',
    splitPayOption: 'Запитати Split-Pay ({n} гостей)'
  },
  fr: {
    availableDates: 'Disponible à vos dates',
    busyDates: 'Option active à ces dates',
    estTotal: '{days}j est. {total}',
    splitPerGuest: '~{per}/pers. ({n})',
    deliveryPlaceholder: 'Livraison : MIA / Hôtel / Villa (optionnel)',
    splitPayOption: 'Demander Split-Pay ({n} pers.)'
  },
  de: {
    availableDates: 'An Ihren Daten frei',
    busyDates: 'Aktive Reservierung an diesen Daten',
    estTotal: '{days}T ca. {total}',
    splitPerGuest: '~{per}/Person ({n})',
    deliveryPlaceholder: 'Lieferung: MIA / Hotel / Villa (optional)',
    splitPayOption: 'Split-Pay anfragen ({n} Personen)'
  },
  it: {
    availableDates: 'Disponibile nelle tue date',
    busyDates: 'Richiesta attiva in queste date',
    estTotal: '{days}g stima {total}',
    splitPerGuest: '~{per}/ospite ({n})',
    deliveryPlaceholder: 'Consegna: MIA / Hotel / Villa (opzionale)',
    splitPayOption: 'Richiedi Split-Pay ({n} ospiti)'
  },
  pt: {
    availableDates: 'Disponível nas suas datas',
    busyDates: 'Reserva ativa nestas datas',
    estTotal: '{days}d est. {total}',
    splitPerGuest: '~{per}/pessoa ({n})',
    deliveryPlaceholder: 'Entrega: MIA / Hotel / Villa (opcional)',
    splitPayOption: 'Solicitar Split-Pay ({n} pessoas)'
  },
  pl: {
    availableDates: 'Dostępne w tych datach',
    busyDates: 'Aktywna rezerwacja w tych datach',
    estTotal: '{days} dn. ok. {total}',
    splitPerGuest: '~{per}/os. ({n})',
    deliveryPlaceholder: 'Dostawa: MIA / Hotel / Willa (opcjonalnie)',
    splitPayOption: 'Poproś o Split-Pay ({n} osób)'
  },
  tr: {
    availableDates: 'Tarihlerinizde müsait',
    busyDates: 'Bu tarihlerde aktif talep var',
    estTotal: '{days}g tahmini {total}',
    splitPerGuest: '~{per}/kişi ({n})',
    deliveryPlaceholder: 'Teslimat: MIA / Otel / Villa (isteğe bağlı)',
    splitPayOption: 'Split-Pay talep et ({n} kişi)'
  },
  he: {
    availableDates: 'זמין בתאריכים שלך',
    busyDates: 'קיימת הזמנה פעילה בתאריכים אלה',
    estTotal: '{days} ימים ≈ {total}',
    splitPerGuest: '~{per}/אורח ({n})',
    deliveryPlaceholder: 'מסירה: MIA / מלון / וילה (אופציונלי)',
    splitPayOption: 'בקש Split-Pay ({n} אורחים)'
  },
  ar: {
    availableDates: 'متاح في تواريخك',
    busyDates: 'يوجد حجز نشط في هذه التواريخ',
    estTotal: '{days} أيام ≈ {total}',
    splitPerGuest: '~{per}/ضيف ({n})',
    deliveryPlaceholder: 'التوصيل: MIA / فندق / فيلا (اختياري)',
    splitPayOption: 'طلب Split-Pay ({n} ضيوف)'
  },
  fa: {
    availableDates: 'در تاریخ‌های شما موجود است',
    busyDates: 'در این تاریخ‌ها رزرو فعال دارد',
    estTotal: '{days} روز ≈ {total}',
    splitPerGuest: '~{per}/نفر ({n})',
    deliveryPlaceholder: 'تحویل: MIA / هتل / ویلا (اختیاری)',
    splitPayOption: 'درخواست Split-Pay ({n} نفر)'
  },
  zh: {
    availableDates: '您的日期可预订',
    busyDates: '该日期已有预订意向',
    estTotal: '{days}天预估 {total}',
    splitPerGuest: '约 {per}/人 ({n}人)',
    deliveryPlaceholder: '送车地点：MIA / 酒店 / 别墅（选填）',
    splitPayOption: '申请 Split-Pay 分账（{n}人）'
  },
  ja: {
    availableDates: 'ご希望日で空きあり',
    busyDates: 'この日程は仮押さえあり',
    estTotal: '{days}日 目安 {total}',
    splitPerGuest: '約{per}/名 ({n}名)',
    deliveryPlaceholder: '配車先：MIA / ホテル / ヴィラ（任意）',
    splitPayOption: 'Split-Pay を希望（{n}名）'
  },
  ko: {
    availableDates: '선택 날짜 예약 가능',
    busyDates: '해당 날짜 예약 진행 중',
    estTotal: '{days}일 예상 {total}',
    splitPerGuest: '약 {per}/인 ({n}명)',
    deliveryPlaceholder: '배차: MIA / 호텔 / 빌라 (선택)',
    splitPayOption: 'Split-Pay 요청 ({n}명)'
  }
});

export function getActionAgentCopy(locale = 'en') {
  const code = normalizeLocale(locale);
  return ACTION_AGENT_COPY[code] || ACTION_AGENT_COPY.en;
}

export function formatActionEstimate({ days, estimatedTotalUsd, perGuestUsd, splitWays, locale = 'en' } = {}) {
  const copy = getActionAgentCopy(locale);
  const fmt = (amount) => `$${Math.round(amount).toLocaleString('en-US')}`;
  const estimatedTotal = Number.isFinite(estimatedTotalUsd) && estimatedTotalUsd > 0 && Number.isInteger(days) && days >= 1
    ? copy.estTotal.replace('{days}', String(days)).replace('{total}', fmt(estimatedTotalUsd))
    : null;
  const perGuest = Number.isFinite(perGuestUsd) && perGuestUsd > 0 && Number.isInteger(splitWays) && splitWays >= 2
    ? copy.splitPerGuest.replace('{per}', fmt(perGuestUsd)).replace('{n}', String(splitWays))
    : null;
  return { estimatedTotal, perGuest };
}
