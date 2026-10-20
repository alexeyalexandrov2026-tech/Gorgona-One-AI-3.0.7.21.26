'use client';

import { useLocale } from '../LocaleProvider';

// Keep this label reactive to a language switch without requiring a page reload.
export const BOOKED_LABELS = {
  en: 'Already Booked',
  ru: 'Уже забронировано',
  es: 'Ya reservado',
  he: 'כבר הוזמן',
  zh: '已被预订',
  pt: 'Já reservado',
  uk: 'Уже заброньовано',
  ja: '予約済み',
  ko: '이미 예약됨',
  de: 'Bereits gebucht',
  ar: 'محجوز بالفعل',
  tr: 'Zaten rezerve edildi',
  fa: 'قبلاً رزرو شده است',
  it: 'Già prenotato',
  fr: 'Déjà réservé',
  pl: 'Już zarezerwowano'
};

export default function BookedStatus({ overlay = false }) {
  const locale = useLocale();
  const label = BOOKED_LABELS[locale] || BOOKED_LABELS.en;

  return (
    <span
      role="status"
      className={overlay
        ? 'pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4'
        : 'inline-flex max-w-full items-center justify-center'}
    >
      <span className="max-w-full rounded-xl border-2 border-red-600 bg-white/95 px-4 py-3 text-center font-g1sans text-[clamp(1rem,1.3vw+0.75rem,1.5rem)] font-extrabold uppercase leading-tight tracking-[0.03em] text-red-700 shadow-xl [text-wrap:balance]">
        {label}
      </span>
    </span>
  );
}
