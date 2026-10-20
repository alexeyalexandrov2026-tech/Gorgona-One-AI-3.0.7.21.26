// Presentation labels for the owner-managed vacation-rental status.
// The label is an editorial status, not a live availability or booking feed.
const RESERVED_LABELS = {
  en: 'Reserved',
  ru: 'Забронировано',
  es: 'Reservado',
  pt: 'Reservado',
  he: 'הוזמן'
};

export function reservedLabel(locale) {
  return RESERVED_LABELS[locale] || RESERVED_LABELS.en;
}
