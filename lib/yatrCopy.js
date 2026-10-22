export const YATR_REFERRAL_URL = 'https://yatr.co?ref=MIAMI-ELIO-GORGONA-ONE';

const YATR_COPY = {
  en: {
    title: 'Yacht charters in Miami.',
    description: 'Explore the YATR fleet with photos, charter rates and filters. Choose your yacht and dates in the catalogue below.',
    catalogue: 'YATR yacht catalogue',
    open: 'Open YATR in a new tab',
    help: 'If the catalogue or booking does not open, continue on YATR.',
    disclosure: 'Bookings and payments are handled by YATR. Miami Elio may earn a commission from bookings through this catalogue.'
  },
  ru: {
    title: 'Аренда яхт в Майами.',
    description: 'Каталог YATR с фотографиями, ценами и фильтрами. Выберите яхту и даты в каталоге ниже.',
    catalogue: 'Каталог яхт YATR',
    open: 'Открыть YATR в новой вкладке',
    help: 'Если каталог или бронирование не открываются, продолжите на YATR.',
    disclosure: 'Бронирование и оплату обрабатывает YATR. Miami Elio может получить комиссию за бронирование через этот каталог.'
  },
  es: {
    title: 'Alquiler de yates en Miami.',
    description: 'Explora la flota de YATR con fotos, tarifas y filtros. Elige tu yate y las fechas en el catálogo.',
    catalogue: 'Catálogo de yates YATR',
    open: 'Abrir YATR en una nueva pestaña',
    help: 'Si el catálogo o la reserva no se abren, continúa en YATR.',
    disclosure: 'YATR gestiona las reservas y los pagos. Miami Elio puede recibir una comisión por las reservas realizadas a través de este catálogo.'
  },
  pt: {
    title: 'Aluguel de iates em Miami.',
    description: 'Explore a frota da YATR com fotos, preços e filtros. Escolha seu iate e as datas no catálogo abaixo.',
    catalogue: 'Catálogo de iates YATR',
    open: 'Abrir YATR em uma nova aba',
    help: 'Se o catálogo ou a reserva não abrir, continue na YATR.',
    disclosure: 'A YATR processa as reservas e os pagamentos. A Miami Elio pode receber uma comissão por reservas feitas por este catálogo.'
  },
  he: {
    title: 'השכרת יאכטות במיאמי.',
    description: 'גלו את צי היאכטות של YATR עם תמונות, מחירים ומסננים. בחרו יאכטה ותאריכים בקטלוג למטה.',
    catalogue: 'קטלוג היאכטות של YATR',
    open: 'פתיחת YATR בלשונית חדשה',
    help: 'אם הקטלוג או ההזמנה אינם נפתחים, המשיכו באתר YATR.',
    disclosure: 'ההזמנות והתשלומים מטופלים על ידי YATR. Miami Elio עשויה לקבל עמלה על הזמנות דרך קטלוג זה.'
  }
};

export function getYatrCopy(locale) {
  return YATR_COPY[locale] || YATR_COPY.en;
}
