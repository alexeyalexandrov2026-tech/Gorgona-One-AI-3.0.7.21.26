// Copy for the Stores, category, Coupons and deal pages, in the five core
// languages. Other site languages fall back to English, key by key. Labels
// that already exist in lib/i18n.js (category names, Visit store...) come
// from there.
export const DEALS_COPY = {
  en: {
    requestTable: 'Request a table',
    tablePrompt: 'Please request a table at {name}. Date, time and group size: ',
    storesEyebrow: 'Deals · {n} brands · {c} categories',
    storesTitle: 'Codes and offers from brands you already shop.',
    storesLede: 'Fashion, beauty, tech, home, travel and more. Show a code and it is copied for you; offers without a code open the store directly.',
    browse: 'Browse by category',
    featured: 'Featured stores',
    offers: '{n} offers',
    empty: 'No offers in this category yet.',
    bettingTitle: 'Sportsbook offers have their own section.',
    bettingText: 'Welcome offers from ten operators, with the legal notice and where each one is licensed.',
    bettingCta: 'Open sportsbooks',
    couponsEyebrow: 'Coupons',
    couponsTitle: 'Delivery and streaming codes.',
    couponsLede: 'Uber Eats, DoorDash and Disney+, and a search across every brand, yacht and villa on Gorgona One.',
    dealLede: '{offer} at {name}.'
  },
  ru: {
    requestTable: 'Запросить стол',
    tablePrompt: 'Забронируйте, пожалуйста, стол в {name}. Дата, время и сколько нас: ',
    storesEyebrow: 'Скидки · {n} брендов · {c} категорий',
    storesTitle: 'Промокоды и скидки брендов, которыми вы уже пользуетесь.',
    storesLede: 'Мода, красота, техника, дом, путешествия и не только. Откройте код, и он скопируется; предложения без кода сразу открывают магазин.',
    browse: 'Категории',
    featured: 'Избранные магазины',
    offers: 'Предложений: {n}',
    empty: 'В этой категории пока нет предложений.',
    bettingTitle: 'Предложения букмекеров вынесены в отдельный раздел.',
    bettingText: 'Приветственные предложения десяти операторов, с юридической пометкой и штатами, где каждый работает легально.',
    bettingCta: 'Открыть букмекеров',
    couponsEyebrow: 'Купоны',
    couponsTitle: 'Коды на доставку и стриминг.',
    couponsLede: 'Uber Eats, DoorDash и Disney+, а также поиск по всем брендам, яхтам и виллам Gorgona One.',
    dealLede: '{offer} — {name}.'
  },
  es: {
    requestTable: 'Pedir una mesa',
    tablePrompt: 'Quiero una mesa en {name}. Fecha, hora y número de personas: ',
    storesEyebrow: 'Ofertas · {n} marcas · {c} categorías',
    storesTitle: 'Códigos y ofertas de las marcas que ya usas.',
    storesLede: 'Moda, belleza, tecnología, hogar, viajes y más. Al mostrar un código se copia solo; las ofertas sin código abren la tienda directamente.',
    browse: 'Explora por categoría',
    featured: 'Tiendas destacadas',
    offers: '{n} ofertas',
    empty: 'Aún no hay ofertas en esta categoría.',
    bettingTitle: 'Las ofertas de apuestas tienen su propia sección.',
    bettingText: 'Ofertas de bienvenida de diez operadores, con el aviso legal y dónde tiene licencia cada uno.',
    bettingCta: 'Ver apuestas',
    couponsEyebrow: 'Cupones',
    couponsTitle: 'Códigos de delivery y streaming.',
    couponsLede: 'Uber Eats, DoorDash y Disney+, y una búsqueda en todas las marcas, yates y villas de Gorgona One.',
    dealLede: '{offer} en {name}.'
  },
  pt: {
    requestTable: 'Pedir uma mesa',
    tablePrompt: 'Quero uma mesa no {name}. Data, horário e número de pessoas: ',
    storesEyebrow: 'Ofertas · {n} marcas · {c} categorias',
    storesTitle: 'Cupons e ofertas das marcas que você já usa.',
    storesLede: 'Moda, beleza, tecnologia, casa, viagens e mais. Ao mostrar um cupom ele é copiado; ofertas sem cupom abrem a loja direto.',
    browse: 'Navegue por categoria',
    featured: 'Lojas em destaque',
    offers: '{n} ofertas',
    empty: 'Ainda não há ofertas nesta categoria.',
    bettingTitle: 'As ofertas de apostas têm uma seção própria.',
    bettingText: 'Ofertas de boas-vindas de dez operadores, com o aviso legal e onde cada um tem licença.',
    bettingCta: 'Ver apostas',
    couponsEyebrow: 'Cupons',
    couponsTitle: 'Cupons de delivery e streaming.',
    couponsLede: 'Uber Eats, DoorDash e Disney+, e uma busca em todas as marcas, iates e villas da Gorgona One.',
    dealLede: '{offer} na {name}.'
  },
  he: {
    requestTable: 'בקשת שולחן',
    tablePrompt: 'אשמח לשולחן ב־{name}. תאריך, שעה וכמה אנחנו: ',
    storesEyebrow: 'מבצעים · {n} מותגים · {c} קטגוריות',
    storesTitle: 'קודים ומבצעים מהמותגים שאתם כבר קונים בהם.',
    storesLede: 'אופנה, טיפוח, טכנולוגיה, בית, נסיעות ועוד. חושפים קוד והוא מועתק; מבצעים בלי קוד פותחים את החנות ישירות.',
    browse: 'לפי קטגוריה',
    featured: 'חנויות נבחרות',
    offers: '{n} מבצעים',
    empty: 'עדיין אין מבצעים בקטגוריה הזו.',
    bettingTitle: 'להצעות הימורי הספורט יש מדור משלהן.',
    bettingText: 'הצעות הצטרפות מעשרה מפעילים, עם ההבהרה המשפטית והיכן כל אחד מורשה.',
    bettingCta: 'להימורי ספורט',
    couponsEyebrow: 'קופונים',
    couponsTitle: 'קודים למשלוחים ולסטרימינג.',
    couponsLede: 'Uber Eats, ‏DoorDash ו־Disney+, וחיפוש בכל המותגים, היאכטות והווילות של Gorgona One.',
    dealLede: '{offer} ב־{name}.'
  }
};

export function getDealsCopy(locale) {
  return { ...DEALS_COPY.en, ...(DEALS_COPY[locale] || {}) };
}
