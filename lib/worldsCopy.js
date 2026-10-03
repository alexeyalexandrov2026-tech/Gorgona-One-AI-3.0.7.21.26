// Copy for the car, yacht and stay pages and their request form, in the
// five core languages. Other site languages fall back to English, key by key.
// Field labels that already exist in lib/i18n.js (daily, weekly, length...)
// come from there, so they stay translated in all sixteen languages.
export const WORLDS_COPY = {
  en: {
    onRequest: 'On request',
    all: 'All',
    seeAll: 'See all',
    howItWorks: 'How it works',
    photos: 'Photos',
    photoOf: 'Photo {n} of {total}',
    showPhoto: 'Show photo {n} of {total}',
    categories: { SUVs: 'SUVs', Convertibles: 'Convertibles', Sedans: 'Sedans' },
    cars: {
      eyebrow: 'Cars · {n} cars · Sunny Isles Beach',
      title: 'Our own fleet, delivered to your door.',
      lede: 'Every car here is ours, photographed in Miami. We deliver to hotels, villas, marinas and both airports, and confirm the rate, deposit and documents with you before anything is booked.',
      filterLabel: 'Body type',
      delivery: 'Delivery: Miami Beach · Brickell · Downtown · Fisher Island · Key Biscayne · MIA · FLL',
      ourFleet: 'Gorgona One fleet · {place}',
      more: 'More from the fleet',
      steps: [
        ['Pick a car', 'Browse the fleet or ask the concierge for a match.'],
        ['Request dates', 'Choose dates and where the car should meet you.'],
        ['We confirm', 'Rate, deposit and documents are confirmed with you.'],
        ['Keys at your door', 'Delivered on time, picked up when you are done.']
      ]
    },
    yachts: {
      eyebrow: 'Yachts · {n} charters · Miami marinas',
      title: 'Crewed charters from Miami marinas.',
      lede: 'Half days, full days and sunset runs on Biscayne Bay, with captain and crew. Tell us the date and group size, and we confirm the yacht, the marina and the rate.',
      more: 'More charters',
      steps: [
        ['Pick a yacht', 'Or tell the concierge the group size and the mood.'],
        ['Request a date', 'Choose the day, how long, and how many guests.'],
        ['We confirm', 'Captain, marina, rate and deposit are confirmed with you.'],
        ['Board', 'Meet the crew at the marina. Drinks and food on request.']
      ]
    },
    stays: {
      eyebrow: 'Stays · {n} homes · Miami',
      title: 'Villas and residences in Miami.',
      lede: 'Private homes from Miami Beach to Key Biscayne. Send your dates and group size, and we confirm availability, the rate and the house rules.',
      more: 'More homes',
      steps: [
        ['Pick a home', 'Or describe the stay and let the concierge match it.'],
        ['Request dates', 'Choose check-in, check-out and how many guests.'],
        ['We confirm', 'Availability, rate, deposit and house rules, in writing.'],
        ['Arrive', 'Check-in details arrive before your trip. Add a car or a yacht.']
      ]
    },
    form: {
      title: { car: 'Request this car', yacht: 'Request this charter', stay: 'Request these dates', experience: 'Request this experience' },
      pickup: 'Pick-up',
      return: 'Return',
      date: 'Date',
      duration: 'How long',
      durations: ['4 hours', '6 hours', '8 hours', 'Full day'],
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      guests: 'Guests',
      deliveryTo: 'Delivery to',
      places: ['Sunny Isles Beach (our garage)', 'Miami Beach', 'Brickell', 'Downtown Miami', 'MIA airport', 'FLL airport', 'Fisher Island', 'Key Biscayne', 'Another address'],
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      submit: 'Send request',
      sending: 'Sending…',
      note: 'Nothing is charged now. Our team confirms the rate, deposit and requirements with you first.',
      badDates: 'The end date must be after the start date.',
      failed: 'The request did not go through. Please try again, or ask the concierge.',
      sentTitle: 'Request sent',
      sentText: 'Our team will contact you shortly to confirm the details.',
      again: 'Send another request'
    }
  },
  ru: {
    onRequest: 'По запросу',
    all: 'Все',
    seeAll: 'Смотреть всё',
    howItWorks: 'Как это работает',
    photos: 'Фото',
    photoOf: 'Фото {n} из {total}',
    showPhoto: 'Показать фото {n} из {total}',
    categories: { SUVs: 'Внедорожники', Convertibles: 'Кабриолеты', Sedans: 'Седаны' },
    cars: {
      eyebrow: 'Авто · {n} машин · Sunny Isles Beach',
      title: 'Собственный автопарк с доставкой к двери.',
      lede: 'Все машины здесь наши и сняты в Майами. Доставляем в отели, виллы, марины и оба аэропорта. Цену, депозит и документы согласуем с вами до бронирования.',
      filterLabel: 'Тип кузова',
      delivery: 'Доставка: Miami Beach · Brickell · Downtown · Fisher Island · Key Biscayne · MIA · FLL',
      ourFleet: 'Автопарк Gorgona One · {place}',
      more: 'Ещё из автопарка',
      steps: [
        ['Выберите машину', 'Посмотрите автопарк или попросите консьержа подобрать.'],
        ['Укажите даты', 'Выберите даты и место, куда подать машину.'],
        ['Мы подтверждаем', 'Цену, депозит и документы согласуем с вами.'],
        ['Ключи у двери', 'Привезём вовремя и заберём, когда закончите.']
      ]
    },
    yachts: {
      eyebrow: 'Яхты · {n} чартеров · марины Майами',
      title: 'Чартеры с экипажем из марин Майами.',
      lede: 'Полдня, целый день или закат в заливе Бискейн, с капитаном и экипажем. Сообщите дату и число гостей, и мы подтвердим яхту, марину и цену.',
      more: 'Ещё чартеры',
      steps: [
        ['Выберите яхту', 'Или расскажите консьержу, сколько вас и какое настроение.'],
        ['Укажите дату', 'Выберите день, длительность и число гостей.'],
        ['Мы подтверждаем', 'Капитана, марину, цену и депозит согласуем с вами.'],
        ['На борт', 'Экипаж встретит вас в марине. Напитки и еда по запросу.']
      ]
    },
    stays: {
      eyebrow: 'Виллы · {n} объектов · Майами',
      title: 'Виллы и резиденции в Майами.',
      lede: 'Частные дома от Miami Beach до Key Biscayne. Пришлите даты и число гостей, и мы подтвердим наличие, цену и правила дома.',
      more: 'Ещё дома',
      steps: [
        ['Выберите дом', 'Или опишите поездку, и консьерж подберёт вариант.'],
        ['Укажите даты', 'Заезд, выезд и число гостей.'],
        ['Мы подтверждаем', 'Наличие, цену, депозит и правила дома, письменно.'],
        ['Заезжайте', 'Детали заселения придут до поездки. Добавьте машину или яхту.']
      ]
    },
    form: {
      title: { car: 'Заявка на эту машину', yacht: 'Заявка на чартер', stay: 'Заявка на эти даты', experience: 'Заявка на впечатление' },
      pickup: 'Получение',
      return: 'Возврат',
      date: 'Дата',
      duration: 'Длительность',
      durations: ['4 часа', '6 часов', '8 часов', 'Целый день'],
      checkIn: 'Заезд',
      checkOut: 'Выезд',
      guests: 'Гостей',
      deliveryTo: 'Куда подать',
      places: ['Sunny Isles Beach (наш гараж)', 'Miami Beach', 'Brickell', 'Downtown Miami', 'Аэропорт MIA', 'Аэропорт FLL', 'Fisher Island', 'Key Biscayne', 'Другой адрес'],
      name: 'Имя',
      phone: 'Телефон',
      email: 'Email',
      submit: 'Отправить заявку',
      sending: 'Отправляем…',
      note: 'Сейчас ничего не списывается. Сначала наша команда согласует с вами цену, депозит и условия.',
      badDates: 'Дата окончания должна быть позже даты начала.',
      failed: 'Заявка не отправилась. Попробуйте ещё раз или напишите консьержу.',
      sentTitle: 'Заявка отправлена',
      sentText: 'Наша команда скоро свяжется с вами, чтобы подтвердить детали.',
      again: 'Отправить ещё одну заявку'
    }
  },
  es: {
    onRequest: 'A consultar',
    all: 'Todos',
    seeAll: 'Ver todo',
    howItWorks: 'Cómo funciona',
    photos: 'Fotos',
    photoOf: 'Foto {n} de {total}',
    showPhoto: 'Ver foto {n} de {total}',
    categories: { SUVs: 'SUV', Convertibles: 'Convertibles', Sedans: 'Sedanes' },
    cars: {
      eyebrow: 'Autos · {n} autos · Sunny Isles Beach',
      title: 'Nuestra propia flota, entregada en tu puerta.',
      lede: 'Todos los autos son nuestros y están fotografiados en Miami. Los entregamos en hoteles, villas, marinas y ambos aeropuertos, y confirmamos contigo la tarifa, el depósito y los documentos antes de reservar.',
      filterLabel: 'Tipo de carrocería',
      delivery: 'Entrega: Miami Beach · Brickell · Downtown · Fisher Island · Key Biscayne · MIA · FLL',
      ourFleet: 'Flota Gorgona One · {place}',
      more: 'Más de la flota',
      steps: [
        ['Elige un auto', 'Mira la flota o pide al concierge que te recomiende uno.'],
        ['Pide fechas', 'Elige las fechas y dónde te esperará el auto.'],
        ['Confirmamos', 'Tarifa, depósito y documentos, contigo.'],
        ['Llaves en tu puerta', 'Lo entregamos a tiempo y lo recogemos al terminar.']
      ]
    },
    yachts: {
      eyebrow: 'Yates · {n} chárteres · marinas de Miami',
      title: 'Chárteres con tripulación desde marinas de Miami.',
      lede: 'Medio día, día completo o atardecer en la bahía de Biscayne, con capitán y tripulación. Dinos la fecha y el tamaño del grupo, y confirmamos el yate, la marina y la tarifa.',
      more: 'Más chárteres',
      steps: [
        ['Elige un yate', 'O cuéntale al concierge cuántos son y qué buscan.'],
        ['Pide una fecha', 'Elige el día, la duración y el número de invitados.'],
        ['Confirmamos', 'Capitán, marina, tarifa y depósito, contigo.'],
        ['A bordo', 'La tripulación te espera en la marina. Bebidas y comida a pedido.']
      ]
    },
    stays: {
      eyebrow: 'Estancias · {n} propiedades · Miami',
      title: 'Villas y residencias en Miami.',
      lede: 'Casas privadas de Miami Beach a Key Biscayne. Envía tus fechas y el tamaño del grupo, y confirmamos disponibilidad, tarifa y normas de la casa.',
      more: 'Más casas',
      steps: [
        ['Elige una casa', 'O describe tu estancia y el concierge la encuentra.'],
        ['Pide fechas', 'Entrada, salida y número de huéspedes.'],
        ['Confirmamos', 'Disponibilidad, tarifa, depósito y normas, por escrito.'],
        ['Llega', 'Los detalles de entrada llegan antes del viaje. Suma un auto o un yate.']
      ]
    },
    form: {
      title: { car: 'Solicitar este auto', yacht: 'Solicitar este chárter', stay: 'Solicitar estas fechas', experience: 'Solicitar esta experiencia' },
      pickup: 'Recogida',
      return: 'Devolución',
      date: 'Fecha',
      duration: 'Duración',
      durations: ['4 horas', '6 horas', '8 horas', 'Día completo'],
      checkIn: 'Entrada',
      checkOut: 'Salida',
      guests: 'Huéspedes',
      deliveryTo: 'Entrega en',
      places: ['Sunny Isles Beach (nuestro garaje)', 'Miami Beach', 'Brickell', 'Downtown Miami', 'Aeropuerto MIA', 'Aeropuerto FLL', 'Fisher Island', 'Key Biscayne', 'Otra dirección'],
      name: 'Nombre',
      phone: 'Teléfono',
      email: 'Email',
      submit: 'Enviar solicitud',
      sending: 'Enviando…',
      note: 'No se cobra nada ahora. Nuestro equipo confirma contigo la tarifa, el depósito y los requisitos.',
      badDates: 'La fecha final debe ser posterior a la inicial.',
      failed: 'La solicitud no se envió. Inténtalo de nuevo o pregunta al concierge.',
      sentTitle: 'Solicitud enviada',
      sentText: 'Nuestro equipo te contactará pronto para confirmar los detalles.',
      again: 'Enviar otra solicitud'
    }
  },
  pt: {
    onRequest: 'Sob consulta',
    all: 'Todos',
    seeAll: 'Ver tudo',
    howItWorks: 'Como funciona',
    photos: 'Fotos',
    photoOf: 'Foto {n} de {total}',
    showPhoto: 'Ver foto {n} de {total}',
    categories: { SUVs: 'SUVs', Convertibles: 'Conversíveis', Sedans: 'Sedãs' },
    cars: {
      eyebrow: 'Carros · {n} carros · Sunny Isles Beach',
      title: 'Nossa própria frota, entregue na sua porta.',
      lede: 'Todos os carros são nossos e foram fotografados em Miami. Entregamos em hotéis, villas, marinas e nos dois aeroportos, e confirmamos com você o preço, o depósito e os documentos antes de reservar.',
      filterLabel: 'Tipo de carroceria',
      delivery: 'Entrega: Miami Beach · Brickell · Downtown · Fisher Island · Key Biscayne · MIA · FLL',
      ourFleet: 'Frota Gorgona One · {place}',
      more: 'Mais da frota',
      steps: [
        ['Escolha um carro', 'Veja a frota ou peça uma sugestão ao concierge.'],
        ['Peça as datas', 'Escolha as datas e onde o carro deve te encontrar.'],
        ['Confirmamos', 'Preço, depósito e documentos, com você.'],
        ['Chave na porta', 'Entregamos na hora e buscamos quando terminar.']
      ]
    },
    yachts: {
      eyebrow: 'Iates · {n} iates · marinas de Miami',
      title: 'Fretamentos com tripulação a partir de marinas de Miami.',
      lede: 'Meio dia, dia inteiro ou pôr do sol na baía de Biscayne, com capitão e tripulação. Diga a data e o tamanho do grupo, e confirmamos o iate, a marina e o preço.',
      more: 'Mais iates',
      steps: [
        ['Escolha um iate', 'Ou conte ao concierge quantos são e o clima do passeio.'],
        ['Peça uma data', 'Escolha o dia, a duração e o número de convidados.'],
        ['Confirmamos', 'Capitão, marina, preço e depósito, com você.'],
        ['Embarque', 'A tripulação te espera na marina. Bebidas e comida sob pedido.']
      ]
    },
    stays: {
      eyebrow: 'Estadias · {n} imóveis · Miami',
      title: 'Villas e residências em Miami.',
      lede: 'Casas privadas de Miami Beach a Key Biscayne. Envie as datas e o tamanho do grupo, e confirmamos disponibilidade, preço e regras da casa.',
      more: 'Mais casas',
      steps: [
        ['Escolha uma casa', 'Ou descreva a estadia e o concierge encontra.'],
        ['Peça as datas', 'Check-in, check-out e número de hóspedes.'],
        ['Confirmamos', 'Disponibilidade, preço, depósito e regras, por escrito.'],
        ['Chegue', 'Os detalhes do check-in chegam antes da viagem. Inclua um carro ou um iate.']
      ]
    },
    form: {
      title: { car: 'Solicitar este carro', yacht: 'Solicitar este iate', stay: 'Solicitar estas datas', experience: 'Solicitar esta experiência' },
      pickup: 'Retirada',
      return: 'Devolução',
      date: 'Data',
      duration: 'Duração',
      durations: ['4 horas', '6 horas', '8 horas', 'Dia inteiro'],
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      guests: 'Hóspedes',
      deliveryTo: 'Entrega em',
      places: ['Sunny Isles Beach (nossa garagem)', 'Miami Beach', 'Brickell', 'Downtown Miami', 'Aeroporto MIA', 'Aeroporto FLL', 'Fisher Island', 'Key Biscayne', 'Outro endereço'],
      name: 'Nome',
      phone: 'Telefone',
      email: 'Email',
      submit: 'Enviar pedido',
      sending: 'Enviando…',
      note: 'Nada é cobrado agora. Nossa equipe confirma com você o preço, o depósito e os requisitos.',
      badDates: 'A data final precisa ser depois da inicial.',
      failed: 'O pedido não foi enviado. Tente de novo ou fale com o concierge.',
      sentTitle: 'Pedido enviado',
      sentText: 'Nossa equipe vai entrar em contato em breve para confirmar os detalhes.',
      again: 'Enviar outro pedido'
    }
  },
  he: {
    onRequest: 'לפי בקשה',
    all: 'הכול',
    seeAll: 'לכל הרשימה',
    howItWorks: 'איך זה עובד',
    photos: 'תמונות',
    photoOf: 'תמונה {n} מתוך {total}',
    showPhoto: 'הצגת תמונה {n} מתוך {total}',
    categories: { SUVs: 'רכבי שטח', Convertibles: 'קבריולטים', Sedans: 'סדאנים' },
    cars: {
      eyebrow: 'רכבים · {n} רכבים · Sunny Isles Beach',
      title: 'צי הרכבים שלנו, עד הדלת.',
      lede: 'כל הרכבים כאן שלנו וצולמו במיאמי. אנחנו מביאים למלונות, וילות, מרינות ולשני שדות התעופה, ומאשרים איתכם מחיר, פיקדון ומסמכים לפני כל הזמנה.',
      filterLabel: 'סוג רכב',
      delivery: 'משלוח: Miami Beach · Brickell · Downtown · Fisher Island · Key Biscayne · MIA · FLL',
      ourFleet: 'צי Gorgona One · {place}',
      more: 'עוד מהצי',
      steps: [
        ['בחרו רכב', 'עיינו בצי או בקשו מהקונסיירז׳ התאמה.'],
        ['בקשו תאריכים', 'בחרו תאריכים ולאן להביא את הרכב.'],
        ['אנחנו מאשרים', 'מחיר, פיקדון ומסמכים, יחד איתכם.'],
        ['מפתחות עד הדלת', 'מגיע בזמן, ונאסף כשתסיימו.']
      ]
    },
    yachts: {
      eyebrow: 'יאכטות · {n} יאכטות · מרינות מיאמי',
      title: 'הפלגות עם צוות ממרינות מיאמי.',
      lede: 'חצי יום, יום שלם או שקיעה במפרץ ביסקיין, עם קפטן וצוות. ספרו לנו את התאריך ואת גודל הקבוצה, ונאשר יאכטה, מרינה ומחיר.',
      more: 'עוד הפלגות',
      steps: [
        ['בחרו יאכטה', 'או ספרו לקונסיירז׳ כמה אתם ומה האווירה.'],
        ['בקשו תאריך', 'בחרו יום, משך ומספר אורחים.'],
        ['אנחנו מאשרים', 'קפטן, מרינה, מחיר ופיקדון, יחד איתכם.'],
        ['עולים לסיפון', 'הצוות מחכה במרינה. משקאות ואוכל לפי בקשה.']
      ]
    },
    stays: {
      eyebrow: 'לינה · {n} נכסים · מיאמי',
      title: 'וילות ודירות יוקרה במיאמי.',
      lede: 'בתים פרטיים מ־Miami Beach ועד Key Biscayne. שלחו תאריכים וגודל קבוצה, ונאשר זמינות, מחיר וכללי הבית.',
      more: 'עוד בתים',
      steps: [
        ['בחרו בית', 'או תארו את השהייה והקונסיירז׳ ימצא התאמה.'],
        ['בקשו תאריכים', 'כניסה, יציאה ומספר אורחים.'],
        ['אנחנו מאשרים', 'זמינות, מחיר, פיקדון וכללי הבית, בכתב.'],
        ['מגיעים', 'פרטי הכניסה יגיעו לפני הנסיעה. הוסיפו רכב או יאכטה.']
      ]
    },
    form: {
      title: { car: 'בקשה לרכב הזה', yacht: 'בקשה להפלגה', stay: 'בקשה לתאריכים', experience: 'בקשה לחוויה' },
      pickup: 'איסוף',
      return: 'החזרה',
      date: 'תאריך',
      duration: 'משך',
      durations: ['4 שעות', '6 שעות', '8 שעות', 'יום שלם'],
      checkIn: 'כניסה',
      checkOut: 'יציאה',
      guests: 'אורחים',
      deliveryTo: 'משלוח אל',
      places: ['Sunny Isles Beach (המוסך שלנו)', 'Miami Beach', 'Brickell', 'Downtown Miami', 'שדה התעופה MIA', 'שדה התעופה FLL', 'Fisher Island', 'Key Biscayne', 'כתובת אחרת'],
      name: 'שם',
      phone: 'טלפון',
      email: 'אימייל',
      submit: 'שליחת בקשה',
      sending: 'שולחים…',
      note: 'שום דבר לא מחויב עכשיו. הצוות שלנו מאשר איתכם קודם מחיר, פיקדון ותנאים.',
      badDates: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה.',
      failed: 'הבקשה לא נשלחה. נסו שוב או פנו לקונסיירז׳.',
      sentTitle: 'הבקשה נשלחה',
      sentText: 'הצוות שלנו ייצור איתכם קשר בקרוב כדי לאשר את הפרטים.',
      again: 'שליחת בקשה נוספת'
    }
  }
};

function merge(base, override) {
  const out = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    out[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(base[key] || {}, value) : value;
  }
  return out;
}

export function getWorldsCopy(locale) {
  return locale === 'en' || !WORLDS_COPY[locale] ? WORLDS_COPY.en : merge(WORLDS_COPY.en, WORLDS_COPY[locale]);
}

// Data records say 'On request' in English; show it in the reader's language.
export function displayValue(value, copy) {
  return value === 'On request' ? copy.onRequest : value;
}

// Listing photos from the image CDN are 900px wide; heroes ask for 1600px.
export function largeImage(src) {
  return src.replace('w=900', 'w=1600');
}

// The trip in one line for /api/book's `dates` field (at most 120 characters).
// It is written in English so the team reads every request the same way.
export function summarizeRequest(kind, trip) {
  if (kind === 'yacht') return `${trip.from} · ${WORLDS_COPY.en.form.durations[trip.duration]} · ${trip.guests} guests`;
  if (kind === 'stay') return `${trip.from} → ${trip.to} · ${trip.guests} guests`;
  if (kind === 'experience') return `${trip.from} · ${trip.guests} guests`;
  return `${trip.from} → ${trip.to} · Delivery: ${WORLDS_COPY.en.form.places[trip.place]}`;
}
