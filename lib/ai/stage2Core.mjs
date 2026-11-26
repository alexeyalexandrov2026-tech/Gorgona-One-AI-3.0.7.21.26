// ===========================================================================
// Stage 2 ELIO+ Guide: 16-language Page Context Awareness, Smart Handoff,
// Partner URL Enrichment, and Inline Conversion Copy (Plan -> Trip Room,
// Car Quick-Request, Email Itinerary).
// ===========================================================================

import { normalizeLocale } from './locale.js';
import { buildStay22ReferralUrl } from './tripProfile.mjs';

const STAGE2_COPY = Object.freeze({
  en: {
    viewing: 'Viewing',
    askAboutCar: 'Ask ELIO about this car',
    askAboutCarPrompt: 'Tell me about {name}: availability, 3-day estimate, security deposit, and delivery options in Miami.',
    carContextPrompts: [
      'Check availability for {name} on my dates',
      'Calculate a 3-day total for {name}',
      'Show similar cars to {name}',
      'Plan a Miami evening with {name}'
    ],
    venueContextPrompts: [
      'What is the vibe & must-order dishes at {name}?',
      'Build an evening around {name}',
      'Show similar spots near {name}',
      'Pair {name} with a luxury car for tonight'
    ],
    sectionPrompts: {
      '/rentals': ['Best luxury SUV under $700/day', 'Compare Lamborghini Urus vs G63', 'Convertible for 3 days this weekend', 'Luxury car with MIA airport delivery'],
      '/restaurants-nightlife': ['Michelin-starred dinner in Miami', 'Sunset rooftop dinner in Brickell', 'Romantic dinner in South Beach', 'VIP table & nightlife tonight'],
      '/yachts': ['Half-day yacht for 8 guests', 'Sunset Biscayne Bay cruise', 'Compare top Miami yachts', 'Pair a yacht day with waterfront dinner'],
      '/vacation-rentals': ['Waterfront villa for 6 guests', 'Miami Beach vs Brickell villas', 'Villa + luxury SUV weekend package', 'Pair a villa stay with a yacht day'],
      '/experiences': ['Private Miami helicopter tour', 'Everglades VIP airboat experience', 'Best activities with kids in Miami', 'Plan a full adventure day'],
      '/events': ['Miami Heat tickets this week', 'Inter Miami MLS matches', 'Top concerts in Miami this weekend', 'Dinner near the arena before the game'],
      '/private-jets': ['Private jet New York to Miami', 'Light vs heavy jet for 6 passengers', 'FBO arrival & luxury SUV pickup', 'Compare Miami private charter options']
    },
    quickRequest: 'Quick request',
    sendPlan: 'Send plan to Live Trip Room',
    sendPlanCount: 'Send plan ({n}) to Live Trip Room',
    selectedItem: 'In plan',
    addToPlan: 'Select',
    openTripRoom: 'Open Live Trip Room',
    planSentTitle: 'Plan sent to Live Trip Room',
    planSentBody: 'Our team received all {n} items under one itinerary. Track confirmation and passes in Live Trip Room.',
    requestSentTitle: 'Request received',
    requestSentBody: 'Our team will confirm availability, final rate, and deposit shortly.',
    emailItinerary: 'Email itinerary',
    emailPlaceholder: 'Your email address',
    sendEmail: 'Send',
    emailSent: 'Itinerary sent to your email',
    emailUnavailable: 'Email delivery is temporarily unavailable. Use Copy or Telegram.',
    emailInvalid: 'Enter a valid email address.',
    namePlaceholder: 'Full name',
    phonePlaceholder: 'Phone / WhatsApp',
    fromLabel: 'Start',
    toLabel: 'End',
    guestsLabel: 'Guests',
    timeLabel: 'Dinner time',
    notePlaceholder: 'Notes or special requests (optional)',
    submitRequest: 'Send request',
    submitPlan: 'Submit full plan',
    sending: 'Sending…',
    cancel: 'Cancel',
    errorBadDates: 'Return date must be after start date.',
    errorConsent: 'Please accept the Terms before submitting.',
    errorFailed: 'Could not send request. Please try again or message our manager.',
    handoffHeader: 'Hi MIAMI ELIO team — continuing from ELIO+ Guide:',
    handoffViewing: 'Viewing',
    handoffTrip: 'Trip',
    handoffPicks: 'Shortlist',
    handoffQuestion: 'Last request'
  },
  ru: {
    viewing: 'Сейчас на странице',
    askAboutCar: 'Спросить ELIO об этом авто',
    askAboutCarPrompt: 'Расскажи про {name}: наличие, расчёт на 3 дня, депозит и доставка по Майами.',
    carContextPrompts: [
      'Уточнить наличие {name} на мои даты',
      'Посчитать аренду {name} на 3 дня',
      'Подобрать похожие авто к {name}',
      'Собрать вечер в Майами с {name}'
    ],
    venueContextPrompts: [
      'Атмосфера и главные блюда в {name}',
      'Собрать вечер вокруг {name}',
      'Похожие места рядом с {name}',
      'Подобрать авто на вечер к {name}'
    ],
    sectionPrompts: {
      '/rentals': ['Лучший SUV до $700/день', 'Сравни Lamborghini Urus и G63', 'Кабриолет на 3 дня на выходные', 'Доставка авто в аэропорт MIA'],
      '/restaurants-nightlife': ['Ресторан со звездой Мишлен', 'Ужин на закате в Brickell', 'Романтический ужин в South Beach', 'VIP-стол и ночная жизнь сегодня'],
      '/yachts': ['Яхта на полдня на 8 гостей', 'Закатный круиз по Biscayne Bay', 'Сравни лучшие яхты Майами', 'Яхта днём + ужин у воды вечером'],
      '/vacation-rentals': ['Вилла у воды на 6 гостей', 'Где лучше вилла: Miami Beach или Brickell?', 'Пакет: вилла + люксовый SUV', 'Вилла + день на яхте'],
      '/experiences': ['Частный вертолёт над Майами', 'VIP-аэролодка в Everglades', 'Лучшее в Майами с детьми', 'Собрать активный день в Майами'],
      '/events': ['Билеты на Miami Heat на этой неделе', 'Матчи Inter Miami (MLS)', 'Главные концерты в эти выходные', 'Ужин рядом с ареной до матча'],
      '/private-jets': ['Частный джет Нью-Йорк — Майами', 'Лёгкий или тяжёлый джет на 6 человек', 'Встреча у FBO и трансфер на SUV', 'Сравни варианты чартера в Майами']
    },
    quickRequest: 'Быстрый запрос',
    sendPlan: 'Отправить план в Live Trip Room',
    sendPlanCount: 'Отправить план ({n}) в Trip Room',
    selectedItem: 'В плане',
    addToPlan: 'Выбрать',
    openTripRoom: 'Открыть Live Trip Room',
    planSentTitle: 'План отправлен в Live Trip Room',
    planSentBody: 'Команда получила все {n} позиции одним маршрутом. Статус подтверждения и пропуска — в Live Trip Room.',
    requestSentTitle: 'Запрос получен',
    requestSentBody: 'Команда скоро подтвердит наличие, финальную ставку и депозит.',
    emailItinerary: 'На Email',
    emailPlaceholder: 'Ваш email',
    sendEmail: 'Отправить',
    emailSent: 'Маршрут отправлен на почту',
    emailUnavailable: 'Отправка на email временно недоступна. Используйте копирование или Telegram.',
    emailInvalid: 'Введите корректный email.',
    namePlaceholder: 'Имя и фамилия',
    phonePlaceholder: 'Телефон / WhatsApp',
    fromLabel: 'Начало',
    toLabel: 'Конец',
    guestsLabel: 'Гости',
    timeLabel: 'Время ужина',
    notePlaceholder: 'Пожелания (необязательно)',
    submitRequest: 'Отправить запрос',
    submitPlan: 'Отправить весь план',
    sending: 'Отправка…',
    cancel: 'Отмена',
    errorBadDates: 'Дата возврата должна быть позже даты начала.',
    errorConsent: 'Подтвердите согласие с условиями перед отправкой.',
    errorFailed: 'Не удалось отправить. Попробуйте снова или напишите менеджеру.',
    handoffHeader: 'Здравствуйте, команда MIAMI ELIO! Перехожу из ELIO+ Guide:',
    handoffViewing: 'Страница',
    handoffTrip: 'Параметры',
    handoffPicks: 'Выбрано',
    handoffQuestion: 'Запрос'
  },
  es: {
    viewing: 'Viendo',
    askAboutCar: 'Preguntar a ELIO por este auto',
    askAboutCarPrompt: 'Cuéntame sobre {name}: disponibilidad, estimado de 3 días, depósito y entrega en Miami.',
    carContextPrompts: ['Consultar disponibilidad de {name}', 'Calcular total de 3 días para {name}', 'Mostrar autos similares a {name}', 'Planear una noche en Miami con {name}'],
    venueContextPrompts: ['¿Ambiente y platos clave en {name}?', 'Armar la noche alrededor de {name}', 'Lugares similares cerca de {name}', 'Combinar {name} con un auto de lujo'],
    sectionPrompts: {
      '/rentals': ['Mejor SUV de lujo bajo $700/día', 'Comparar Lamborghini Urus vs G63', 'Descapotable por 3 días', 'Entrega de auto en aeropuerto MIA'],
      '/restaurants-nightlife': ['Restaurante estrella Michelin', 'Rooftop al atardecer en Brickell', 'Cena romántica en South Beach', 'Mesa VIP y vida nocturna hoy'],
      '/yachts': ['Yate medio día para 8 personas', 'Crucero al atardecer en Biscayne Bay', 'Comparar mejores yates en Miami', 'Yate + cena frente al agua'],
      '/vacation-rentals': ['Villa frente al agua para 6', 'Miami Beach vs Brickell para villas', 'Paquete villa + SUV de lujo', 'Villa + día en yate privado'],
      '/experiences': ['Vuelo privado en helicóptero', 'Tour VIP en Everglades', 'Planes con niños en Miami', 'Planear un día de aventura'],
      '/events': ['Entradas Miami Heat esta semana', 'Partidos Inter Miami MLS', 'Conciertos este fin de semana', 'Cena cerca del estadio antes del juego'],
      '/private-jets': ['Jet privado Nueva York a Miami', 'Jet ligero vs pesado para 6', 'Llegada FBO con SUV de lujo', 'Opciones de chárter privado en Miami']
    },
    quickRequest: 'Solicitud rápida',
    sendPlan: 'Enviar plan a Live Trip Room',
    sendPlanCount: 'Enviar plan ({n}) a Trip Room',
    selectedItem: 'En el plan',
    addToPlan: 'Elegir',
    openTripRoom: 'Abrir Live Trip Room',
    planSentTitle: 'Plan enviado a Live Trip Room',
    planSentBody: 'Nuestro equipo recibió las {n} selecciones en un solo itinerario.',
    requestSentTitle: 'Solicitud recibida',
    requestSentBody: 'Confirmaremos disponibilidad, tarifa final y depósito en breve.',
    emailItinerary: 'Enviar por email',
    emailPlaceholder: 'Tu correo electrónico',
    sendEmail: 'Enviar',
    emailSent: 'Itinerario enviado a tu correo',
    emailUnavailable: 'Envío por correo no disponible ahora. Usa Copiar o Telegram.',
    emailInvalid: 'Ingresa un correo válido.',
    namePlaceholder: 'Nombre completo',
    phonePlaceholder: 'Teléfono / WhatsApp',
    fromLabel: 'Inicio',
    toLabel: 'Fin',
    guestsLabel: 'Invitados',
    timeLabel: 'Hora cena',
    notePlaceholder: 'Notas adicionales (opcional)',
    submitRequest: 'Enviar solicitud',
    submitPlan: 'Enviar plan completo',
    sending: 'Enviando…',
    cancel: 'Cancelar',
    errorBadDates: 'La fecha final debe ser posterior a la inicial.',
    errorConsent: 'Acepta los términos antes de enviar.',
    errorFailed: 'No se pudo enviar. Inténtalo de nuevo o escribe al gestor.',
    handoffHeader: 'Hola equipo MIAMI ELIO — continuando desde ELIO+ Guide:',
    handoffViewing: 'Viendo',
    handoffTrip: 'Viaje',
    handoffPicks: 'Selección',
    handoffQuestion: 'Última consulta'
  },
  uk: {
    viewing: 'Зараз на сторінці',
    askAboutCar: 'Запитати ELIO про це авто',
    askAboutCarPrompt: 'Розкажи про {name}: наявність, розрахунок на 3 дні, депозит і доставка в Маямі.',
    carContextPrompts: ['Перевірити наявність {name} на мої дати', 'Порахувати оренду {name} на 3 дні', 'Підібрати схожі авто до {name}', 'Спланувати вечір у Маямі з {name}'],
    venueContextPrompts: ['Атмосфера і найкращі страви в {name}', 'Спланувати вечір навколо {name}', 'Схожі заклади поруч із {name}', 'Додати авто класу люкс до {name}'],
    sectionPrompts: {
      '/rentals': ['Найкращий SUV до $700/день', 'Порівняти Lamborghini Urus і G63', 'Кабріолет на 3 дні на вихідні', 'Доставка авто в аеропорт MIA'],
      '/restaurants-nightlife': ['Ресторан із зіркою Мішлен', 'Вечеря на заході сонця в Brickell', 'Романтична вечеря в South Beach', 'VIP-стіл і нічне життя сьогодні'],
      '/yachts': ['Яхта на півдня для 8 гостей', 'Круїз на заході сонця в Biscayne Bay', 'Порівняти найкращі яхти Маямі', 'Яхта вдень + вечеря біля води'],
      '/vacation-rentals': ['Вілла біля води на 6 гостей', 'Де краще вілла: Miami Beach чи Brickell?', 'Пакет: вілла + люксовий SUV', 'Вілла + день на яхті'],
      '/experiences': ['Приватний гелікоптер над Маямі', 'VIP-аерочовен в Everglades', 'Найкраще в Маямі з дітьми', 'Спланувати активний день'],
      '/events': ['Квитки на Miami Heat цього тижня', 'Матчі Inter Miami (MLS)', 'Головні концерти цими вихідними', 'Вечеря поруч з ареною перед матчем'],
      '/private-jets': ['Приватний джет Нью-Йорк — Маямі', 'Легкий чи важкий джет на 6 пасажирів', 'Зустріч у FBO та трансфер на SUV', 'Варіанти приватного чартеру в Маямі']
    },
    quickRequest: 'Швидкий запит',
    sendPlan: 'Надіслати план у Live Trip Room',
    sendPlanCount: 'Надіслати план ({n}) у Trip Room',
    selectedItem: 'У плані',
    addToPlan: 'Обрати',
    openTripRoom: 'Відкрити Live Trip Room',
    planSentTitle: 'План надіслано в Live Trip Room',
    planSentBody: 'Команда отримала всі {n} позиції одним маршрутом.',
    requestSentTitle: 'Запит отримано',
    requestSentBody: 'Команда незабаром підтвердить наявність, фінальну ставку та депозит.',
    emailItinerary: 'На Email',
    emailPlaceholder: 'Ваш email',
    sendEmail: 'Надіслати',
    emailSent: 'Маршрут надіслано на пошту',
    emailUnavailable: 'Надсилання на email тимчасово недоступне. Скористайтеся копіюванням або Telegram.',
    emailInvalid: 'Введіть коректний email.',
    namePlaceholder: 'Імʼя та прізвище',
    phonePlaceholder: 'Телефон / WhatsApp',
    fromLabel: 'Початок',
    toLabel: 'Кінець',
    guestsLabel: 'Гості',
    timeLabel: 'Час вечері',
    notePlaceholder: 'Побажання (необовʼязково)',
    submitRequest: 'Надіслати запит',
    submitPlan: 'Надіслати весь план',
    sending: 'Надсилання…',
    cancel: 'Скасувати',
    errorBadDates: 'Дата завершення має бути пізнішою за дату початку.',
    errorConsent: 'Підтвердіть умови перед надсиланням.',
    errorFailed: 'Не вдалося надіслати. Спробуйте ще раз або напишіть менеджеру.',
    handoffHeader: 'Вітаю, командо MIAMI ELIO — продовжую з ELIO+ Guide:',
    handoffViewing: 'Сторінка',
    handoffTrip: 'Параметри',
    handoffPicks: 'Обране',
    handoffQuestion: 'Запит'
  },
  fr: {
    viewing: 'En consultation',
    askAboutCar: 'Demander à ELIO sur ce véhicule',
    askAboutCarPrompt: 'Parle-moi de {name} : disponibilité, estimation 3 jours, caution et livraison à Miami.',
    carContextPrompts: ['Vérifier la disponibilité de {name}', 'Calculer 3 jours pour {name}', 'Voitures similaires à {name}', 'Organiser une soirée à Miami avec {name}'],
    venueContextPrompts: ['Ambiance et plats phares chez {name}', 'Organiser la soirée autour de {name}', 'Adresses similaires près de {name}', 'Ajouter une voiture de luxe pour {name}'],
    quickRequest: 'Demande rapide',
    sendPlan: 'Envoyer le plan vers Live Trip Room',
    sendPlanCount: 'Envoyer le plan ({n}) vers Trip Room',
    selectedItem: 'Sélectionné',
    addToPlan: 'Choisir',
    openTripRoom: 'Ouvrir Live Trip Room',
    planSentTitle: 'Plan envoyé à Live Trip Room',
    planSentBody: 'Notre équipe a reçu vos {n} sélections dans un même itinéraire.',
    requestSentTitle: 'Demande reçue',
    requestSentBody: 'Notre équipe confirmera disponibilité, tarif final et caution sous peu.',
    emailItinerary: 'Par email',
    emailPlaceholder: 'Votre adresse email',
    sendEmail: 'Envoyer',
    emailSent: 'Itinéraire envoyé par email',
    emailUnavailable: 'Envoi par email indisponible. Utilisez Copier ou Telegram.',
    emailInvalid: 'Saisissez un email valide.',
    namePlaceholder: 'Nom complet',
    phonePlaceholder: 'Téléphone / WhatsApp',
    fromLabel: 'Début',
    toLabel: 'Fin',
    guestsLabel: 'Invités',
    timeLabel: 'Heure du dîner',
    notePlaceholder: 'Notes (optionnel)',
    submitRequest: 'Envoyer la demande',
    submitPlan: 'Envoyer le plan complet',
    sending: 'Envoi…',
    cancel: 'Annuler',
    errorBadDates: 'La date de fin doit suivre la date de début.',
    errorConsent: 'Veuillez accepter les conditions avant d’envoyer.',
    errorFailed: 'Échec de l’envoi. Réessayez ou contactez notre équipe.',
    handoffHeader: 'Bonjour l’équipe MIAMI ELIO — depuis ELIO+ Guide :',
    handoffViewing: 'Page',
    handoffTrip: 'Séjour',
    handoffPicks: 'Sélection',
    handoffQuestion: 'Demande'
  },
  de: {
    viewing: 'Aktuelle Seite',
    askAboutCar: 'ELIO zu diesem Fahrzeug fragen',
    askAboutCarPrompt: 'Erzähl mir über {name}: Verfügbarkeit, 3-Tage-Schätzung, Kaution und Lieferung in Miami.',
    carContextPrompts: ['Verfügbarkeit für {name} prüfen', '3-Tage-Preis für {name} berechnen', 'Ähnliche Fahrzeuge wie {name}', 'Miami-Abend mit {name} planen'],
    venueContextPrompts: ['Atmosphäre & Highlights im {name}', 'Abend rund um {name} planen', 'Ähnliche Spots nahe {name}', '{name} mit Luxuswagen kombinieren'],
    quickRequest: 'Schnellanfrage',
    sendPlan: 'Plan an Live Trip Room senden',
    sendPlanCount: 'Plan ({n}) an Trip Room senden',
    selectedItem: 'Im Plan',
    addToPlan: 'Wählen',
    openTripRoom: 'Live Trip Room öffnen',
    planSentTitle: 'Plan an Live Trip Room gesendet',
    planSentBody: 'Unser Team hat alle {n} Positionen gebündelt erhalten.',
    requestSentTitle: 'Anfrage erhalten',
    requestSentBody: 'Unser Team bestätigt Verfügbarkeit, Endpreis und Kaution in Kürze.',
    emailItinerary: 'Per E-Mail',
    emailPlaceholder: 'Ihre E-Mail-Adresse',
    sendEmail: 'Senden',
    emailSent: 'Reiseplan per E-Mail gesendet',
    emailUnavailable: 'E-Mail derzeit nicht verfügbar. Nutzen Sie Kopieren oder Telegram.',
    emailInvalid: 'Bitte gültige E-Mail eingeben.',
    namePlaceholder: 'Vollständiger Name',
    phonePlaceholder: 'Telefon / WhatsApp',
    fromLabel: 'Start',
    toLabel: 'Ende',
    guestsLabel: 'Gäste',
    timeLabel: 'Uhrzeit',
    notePlaceholder: 'Hinweise (optional)',
    submitRequest: 'Anfrage senden',
    submitPlan: 'Gesamten Plan senden',
    sending: 'Wird gesendet…',
    cancel: 'Abbrechen',
    errorBadDates: 'Das Enddatum muss nach dem Startdatum liegen.',
    errorConsent: 'Bitte Bedingungen vor dem Senden bestätigen.',
    errorFailed: 'Senden fehlgeschlagen. Bitte erneut versuchen oder Manager schreiben.',
    handoffHeader: 'Hallo MIAMI ELIO Team — weitergeleitet aus ELIO+ Guide:',
    handoffViewing: 'Seite',
    handoffTrip: 'Reisedaten',
    handoffPicks: 'Auswahl',
    handoffQuestion: 'Anfrage'
  },
  it: {
    viewing: 'Stai guardando',
    askAboutCar: 'Chiedi a ELIO di questa auto',
    askAboutCarPrompt: 'Parlami di {name}: disponibilità, stima per 3 giorni, cauzione e consegna a Miami.',
    carContextPrompts: ['Verifica disponibilità per {name}', 'Calcola totale 3 giorni per {name}', 'Auto simili a {name}', 'Organizza una serata con {name}'],
    venueContextPrompts: ['Atmosfera e piatti top da {name}', 'Organizza la serata attorno a {name}', 'Posti simili vicino a {name}', 'Abbina {name} a un’auto di lusso'],
    quickRequest: 'Richiesta rapida',
    sendPlan: 'Invia piano a Live Trip Room',
    sendPlanCount: 'Invia piano ({n}) a Trip Room',
    selectedItem: 'Nel piano',
    addToPlan: 'Seleziona',
    openTripRoom: 'Apri Live Trip Room',
    planSentTitle: 'Piano inviato a Live Trip Room',
    planSentBody: 'Il team ha ricevuto tutte le {n} scelte in un unico itinerario.',
    requestSentTitle: 'Richiesta ricevuta',
    requestSentBody: 'Confermeremo a breve disponibilità, tariffa finale e cauzione.',
    emailItinerary: 'Invia email',
    emailPlaceholder: 'La tua email',
    sendEmail: 'Invia',
    emailSent: 'Itinerario inviato via email',
    emailUnavailable: 'Invio email non disponibile ora. Usa Copia o Telegram.',
    emailInvalid: 'Inserisci una email valida.',
    namePlaceholder: 'Nome completo',
    phonePlaceholder: 'Telefono / WhatsApp',
    fromLabel: 'Inizio',
    toLabel: 'Fine',
    guestsLabel: 'Ospiti',
    timeLabel: 'Orario cena',
    notePlaceholder: 'Note (opzionale)',
    submitRequest: 'Invia richiesta',
    submitPlan: 'Invia piano completo',
    sending: 'Invio…',
    cancel: 'Annulla',
    errorBadDates: 'La data finale deve essere successiva a quella iniziale.',
    errorConsent: 'Accetta i termini prima di inviare.',
    errorFailed: 'Invio non riuscito. Riprova o scrivi al manager.',
    handoffHeader: 'Ciao team MIAMI ELIO — da ELIO+ Guide:',
    handoffViewing: 'Pagina',
    handoffTrip: 'Viaggio',
    handoffPicks: 'Selezione',
    handoffQuestion: 'Richiesta'
  },
  pt: {
    viewing: 'Visualizando',
    askAboutCar: 'Perguntar ao ELIO sobre este carro',
    askAboutCarPrompt: 'Fale sobre {name}: disponibilidade, estimativa de 3 dias, caução e entrega em Miami.',
    carContextPrompts: ['Ver disponibilidade de {name}', 'Calcular 3 dias para {name}', 'Carros similares a {name}', 'Planejar uma noite em Miami com {name}'],
    venueContextPrompts: ['Clima e pratos destaque no {name}', 'Montar a noite em torno do {name}', 'Lugares parecidos perto do {name}', 'Combinar {name} com carro de luxo'],
    quickRequest: 'Pedido rápido',
    sendPlan: 'Enviar plano ao Live Trip Room',
    sendPlanCount: 'Enviar plano ({n}) ao Trip Room',
    selectedItem: 'No plano',
    addToPlan: 'Selecionar',
    openTripRoom: 'Abrir Live Trip Room',
    planSentTitle: 'Plano enviado ao Live Trip Room',
    planSentBody: 'Nossa equipe recebeu todos os {n} itens em um único roteiro.',
    requestSentTitle: 'Pedido recebido',
    requestSentBody: 'Confirmaremos disponibilidade, valor final e caução em breve.',
    emailItinerary: 'Enviar por e-mail',
    emailPlaceholder: 'Seu e-mail',
    sendEmail: 'Enviar',
    emailSent: 'Roteiro enviado para seu e-mail',
    emailUnavailable: 'Envio por e-mail indisponível agora. Use Copiar ou Telegram.',
    emailInvalid: 'Informe um e-mail válido.',
    namePlaceholder: 'Nome completo',
    phonePlaceholder: 'Telefone / WhatsApp',
    fromLabel: 'Início',
    toLabel: 'Fim',
    guestsLabel: 'Pessoas',
    timeLabel: 'Horário',
    notePlaceholder: 'Observações (opcional)',
    submitRequest: 'Enviar pedido',
    submitPlan: 'Enviar plano completo',
    sending: 'Enviando…',
    cancel: 'Cancelar',
    errorBadDates: 'A data final deve ser posterior à data inicial.',
    errorConsent: 'Aceite os termos antes de enviar.',
    errorFailed: 'Falha ao enviar. Tente novamente ou fale com nosso gerente.',
    handoffHeader: 'Olá equipe MIAMI ELIO — continuando do ELIO+ Guide:',
    handoffViewing: 'Página',
    handoffTrip: 'Viagem',
    handoffPicks: 'Seleção',
    handoffQuestion: 'Consulta'
  },
  pl: {
    viewing: 'Oglądasz',
    askAboutCar: 'Zapytaj ELIO o to auto',
    askAboutCarPrompt: 'Opowiedz o {name}: dostępność, koszt na 3 dni, kaucja i dostawa w Miami.',
    carContextPrompts: ['Sprawdź dostępność {name}', 'Policz 3 dni wynajmu {name}', 'Pokaż auta podobne do {name}', 'Zaplanuj wieczór w Miami z {name}'],
    venueContextPrompts: ['Klimat i polecane dania w {name}', 'Zaplanuj wieczór wokół {name}', 'Podobne miejsca obok {name}', 'Dobierz auto na wieczór do {name}'],
    quickRequest: 'Szybkie zapytanie',
    sendPlan: 'Wyślij plan do Live Trip Room',
    sendPlanCount: 'Wyślij plan ({n}) do Trip Room',
    selectedItem: 'W planie',
    addToPlan: 'Wybierz',
    openTripRoom: 'Otwórz Live Trip Room',
    planSentTitle: 'Plan wysłany do Live Trip Room',
    planSentBody: 'Zespół otrzymał wszystkie {n} pozycje w jednym planie.',
    requestSentTitle: 'Zapytanie odebrane',
    requestSentBody: 'Wkrótce potwierdzimy dostępność, cenę końcową i kaucję.',
    emailItinerary: 'Wyślij e-mail',
    emailPlaceholder: 'Twój adres e-mail',
    sendEmail: 'Wyślij',
    emailSent: 'Plan wysłany na e-mail',
    emailUnavailable: 'Wysyłka e-mail chwilowo niedostępna. Użyj Kopiuj lub Telegram.',
    emailInvalid: 'Wpisz poprawny adres e-mail.',
    namePlaceholder: 'Imię i nazwisko',
    phonePlaceholder: 'Telefon / WhatsApp',
    fromLabel: 'Start',
    toLabel: 'Koniec',
    guestsLabel: 'Goście',
    timeLabel: 'Godzina kolacji',
    notePlaceholder: 'Uwagi (opcjonalnie)',
    submitRequest: 'Wyślij zapytanie',
    submitPlan: 'Wyślij cały plan',
    sending: 'Wysyłanie…',
    cancel: 'Anuluj',
    errorBadDates: 'Data końcowa musi być późniejsza niż początkowa.',
    errorConsent: 'Zaakceptuj regulamin przed wysłaniem.',
    errorFailed: 'Nie udało się wysłać. Spróbuj ponownie lub napisz na Telegram.',
    handoffHeader: 'Cześć zespole MIAMI ELIO — przechodzę z ELIO+ Guide:',
    handoffViewing: 'Strona',
    handoffTrip: 'Szczegóły',
    handoffPicks: 'Wybrane',
    handoffQuestion: 'Zapytanie'
  },
  tr: {
    viewing: 'İnceleniyor',
    askAboutCar: 'Bu araç hakkında ELIO’ya sor',
    askAboutCarPrompt: '{name} hakkında bilgi ver: müsaitlik, 3 günlük tahmini tutar, depozito ve Miami teslimatı.',
    carContextPrompts: ['{name} için tarihlerimde müsaitlik', '{name} için 3 günlük toplam hesapla', '{name} benzeri araçlar', '{name} ile Miami akşamı planla'],
    venueContextPrompts: ['{name} atmosferi ve öne çıkanlar', '{name} etrafında akşam planı', '{name} yakını benzer mekanlar', '{name} için lüks araç ekle'],
    quickRequest: 'Hızlı talep',
    sendPlan: 'Planı Live Trip Room’a gönder',
    sendPlanCount: 'Planı ({n}) Trip Room’a gönder',
    selectedItem: 'Planda',
    addToPlan: 'Seç',
    openTripRoom: 'Live Trip Room’u aç',
    planSentTitle: 'Plan Live Trip Room’a gönderildi',
    planSentBody: 'Ekibimiz {n} seçimin tamamını tek planda aldı.',
    requestSentTitle: 'Talep alındı',
    requestSentBody: 'Müsaitlik, son fiyat ve depozito yakında onaylanacaktır.',
    emailItinerary: 'E-posta gönder',
    emailPlaceholder: 'E-posta adresiniz',
    sendEmail: 'Gönder',
    emailSent: 'Plan e-postanıza gönderildi',
    emailUnavailable: 'E-posta gönderimi geçici olarak kapalı. Kopyala veya Telegram kullanın.',
    emailInvalid: 'Geçerli bir e-posta girin.',
    namePlaceholder: 'Ad soyad',
    phonePlaceholder: 'Telefon / WhatsApp',
    fromLabel: 'Başlangıç',
    toLabel: 'Bitiş',
    guestsLabel: 'Misafir',
    timeLabel: 'Akşam saati',
    notePlaceholder: 'Notlar (isteğe bağlı)',
    submitRequest: 'Talep gönder',
    submitPlan: 'Tüm planı gönder',
    sending: 'Gönderiliyor…',
    cancel: 'İptal',
    errorBadDates: 'Bitiş tarihi başlangıçtan sonra olmalıdır.',
    errorConsent: 'Göndermeden önce şartları onaylayın.',
    errorFailed: 'Gönderilemedi. Tekrar deneyin veya yöneticimize yazın.',
    handoffHeader: 'Merhaba MIAMI ELIO ekibi — ELIO+ Guide üzerinden yazıyorum:',
    handoffViewing: 'Sayfa',
    handoffTrip: 'Detaylar',
    handoffPicks: 'Seçimler',
    handoffQuestion: 'Son istek'
  },
  he: {
    viewing: 'צופה כעת',
    askAboutCar: 'שאל את ELIO על הרכב הזה',
    askAboutCarPrompt: 'ספר לי על {name}: זמינות, הערכה ל-3 ימים, פיקדון ומסירה במיאמי.',
    carContextPrompts: ['בדוק זמינות עבור {name}', 'חשב עלות ל-3 ימים ל-{name}', 'רכבים דומים ל-{name}', 'תכנן ערב במיאמי עם {name}'],
    venueContextPrompts: ['אווירה ומנות מומלצות ב-{name}', 'בנה ערב סביב {name}', 'מקומות דומים ליד {name}', 'שלב רכב יוקרה עם {name}'],
    quickRequest: 'בקשה מהירה',
    sendPlan: 'שלח תוכנית ל-Live Trip Room',
    sendPlanCount: 'שלח תוכנית ({n}) ל-Trip Room',
    selectedItem: 'בתוכנית',
    addToPlan: 'בחר',
    openTripRoom: 'פתח Live Trip Room',
    planSentTitle: 'התוכנית נשלחה ל-Live Trip Room',
    planSentBody: 'הצוות קיבל את כל {n} הפריטים במסלול אחד.',
    requestSentTitle: 'הבקשה התקבלה',
    requestSentBody: 'הצוות יאשר זמינות, מחיר סופי ופיקדון בהקדם.',
    emailItinerary: 'שלח למייל',
    emailPlaceholder: 'כתובת האימייל שלך',
    sendEmail: 'שלח',
    emailSent: 'המסלול נשלח למייל',
    emailUnavailable: 'שליחה במייל אינה זמינה כרגע. השתמש בהעתקה או בטלגרם.',
    emailInvalid: 'הזן כתובת מייל תקינה.',
    namePlaceholder: 'שם מלא',
    phonePlaceholder: 'טלפון / WhatsApp',
    fromLabel: 'התחלה',
    toLabel: 'סיום',
    guestsLabel: 'אורחים',
    timeLabel: 'שעת ארוחה',
    notePlaceholder: 'הערות (אופציונלי)',
    submitRequest: 'שלח בקשה',
    submitPlan: 'שלח את כל התוכנית',
    sending: 'שולח…',
    cancel: 'ביטול',
    errorBadDates: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה.',
    errorConsent: 'יש לאשר את התנאים לפני השליחה.',
    errorFailed: 'השליחה נכשלה. נסה שוב או פנה למנהל.',
    handoffHeader: 'שלום צוות MIAMI ELIO — ממשיך מתוך ELIO+ Guide:',
    handoffViewing: 'עמוד',
    handoffTrip: 'פרטים',
    handoffPicks: 'בחירות',
    handoffQuestion: 'בקשה'
  },
  ar: {
    viewing: 'تشاهد الآن',
    askAboutCar: 'اسأل ELIO عن هذه السيارة',
    askAboutCarPrompt: 'أخبرني عن {name}: التوفر، تقدير 3 أيام، مبلغ التأمين والتوصيل في ميامي.',
    carContextPrompts: ['تحقق من توفر {name}', 'احسب تكلفة 3 أيام لـ {name}', 'سيارات مشابهة لـ {name}', 'خطط لأمسية في ميامي مع {name}'],
    venueContextPrompts: ['الأجواء وأفضل الأطباق في {name}', 'ابنِ أمسية حول {name}', 'أماكن مشابهة قرب {name}', 'أضف سيارة فاخرة مع {name}'],
    quickRequest: 'طلب سريع',
    sendPlan: 'إرسال الخطة إلى Live Trip Room',
    sendPlanCount: 'إرسال الخطة ({n}) إلى Trip Room',
    selectedItem: 'في الخطة',
    addToPlan: 'اختر',
    openTripRoom: 'فتح Live Trip Room',
    planSentTitle: 'تم إرسال الخطة إلى Live Trip Room',
    planSentBody: 'استلم فريقنا جميع العناصر ({n}) ضمن خطة واحدة.',
    requestSentTitle: 'تم استلام الطلب',
    requestSentBody: 'سيؤكد فريقنا التوفر والسعر النهائي والتأمين قريباً.',
    emailItinerary: 'إرسال للبريد',
    emailPlaceholder: 'بريدك الإلكتروني',
    sendEmail: 'إرسال',
    emailSent: 'تم إرسال الخطة إلى بريدك',
    emailUnavailable: 'الإرسال عبر البريد غير متاح حالياً. استخدم النسخ أو تيليجرام.',
    emailInvalid: 'أدخل بريداً إلكترونياً صحيحاً.',
    namePlaceholder: 'الاسم الكامل',
    phonePlaceholder: 'الهاتف / واتساب',
    fromLabel: 'البداية',
    toLabel: 'النهاية',
    guestsLabel: 'الضيوف',
    timeLabel: 'وقت العشاء',
    notePlaceholder: 'ملاحظات (اختياري)',
    submitRequest: 'إرسال الطلب',
    submitPlan: 'إرسال الخطة الكاملة',
    sending: 'جارٍ الإرسال…',
    cancel: 'إلغاء',
    errorBadDates: 'يجب أن يكون تاريخ النهاية بعد تاريخ البداية.',
    errorConsent: 'يرجى الموافقة على الشروط قبل الإرسال.',
    errorFailed: 'تعذر الإرسال. حاول مجدداً أو تواصل مع المدير.',
    handoffHeader: 'مرحباً فريق MIAMI ELIO — متابعة من ELIO+ Guide:',
    handoffViewing: 'الصفحة',
    handoffTrip: 'التفاصيل',
    handoffPicks: 'المختارات',
    handoffQuestion: 'الطلب'
  },
  fa: {
    viewing: 'در حال مشاهده',
    askAboutCar: 'از ELIO درباره این خودرو بپرسید',
    askAboutCarPrompt: 'درباره {name} بگو: موجودی، برآورد ۳ روزه، ودیعه و تحویل در میامی.',
    carContextPrompts: ['بررسی موجودی {name}', 'محاسبه هزینه ۳ روز برای {name}', 'خودروهای مشابه {name}', 'برنامه‌ریزی شب میامی با {name}'],
    venueContextPrompts: ['فضا و غذاهای برتر {name}', 'چیدمان شب اطراف {name}', 'مکان‌های مشابه نزدیک {name}', 'افزودن خودروی لوکس برای {name}'],
    quickRequest: 'درخواست سریع',
    sendPlan: 'ارسال برنامه به Live Trip Room',
    sendPlanCount: 'ارسال برنامه ({n}) به Trip Room',
    selectedItem: 'در برنامه',
    addToPlan: 'انتخاب',
    openTripRoom: 'باز کردن Live Trip Room',
    planSentTitle: 'برنامه به Live Trip Room ارسال شد',
    planSentBody: 'تیم ما هر {n} مورد را در یک برنامه دریافت کرد.',
    requestSentTitle: 'درخواست ثبت شد',
    requestSentBody: 'تیم ما به‌زودی موجودی، نرخ نهایی و ودیعه را تأیید می‌کند.',
    emailItinerary: 'ارسال ایمیل',
    emailPlaceholder: 'ایمیل شما',
    sendEmail: 'ارسال',
    emailSent: 'برنامه به ایمیل شما ارسال شد',
    emailUnavailable: 'ارسال ایمیل فعلاً در دسترس نیست. از کپی یا تلگرام استفاده کنید.',
    emailInvalid: 'ایمیل معتبر وارد کنید.',
    namePlaceholder: 'نام کامل',
    phonePlaceholder: 'تلفن / واتساپ',
    fromLabel: 'شروع',
    toLabel: 'پایان',
    guestsLabel: 'مهمانان',
    timeLabel: 'ساعت شام',
    notePlaceholder: 'توضیحات (اختیاری)',
    submitRequest: 'ارسال درخواست',
    submitPlan: 'ارسال کل برنامه',
    sending: 'در حال ارسال…',
    cancel: 'انصراف',
    errorBadDates: 'تاریخ پایان باید بعد از تاریخ شروع باشد.',
    errorConsent: 'لطفاً پیش از ارسال، شرایط را تأیید کنید.',
    errorFailed: 'ارسال انجام نشد. دوباره تلاش کنید یا به مدیر پیام دهید.',
    handoffHeader: 'سلام تیم MIAMI ELIO — ادامه گفتگو از ELIO+ Guide:',
    handoffViewing: 'صفحه',
    handoffTrip: 'جزئیات',
    handoffPicks: 'انتخاب‌ها',
    handoffQuestion: 'درخواست'
  },
  zh: {
    viewing: '正在浏览',
    askAboutCar: '向 ELIO 咨询此车',
    askAboutCarPrompt: '介绍一下 {name}：迈阿密档期、3 天预估总价、押金和送车服务。',
    carContextPrompts: ['查询 {name} 的档期', '计算 {name} 3 天总价', '推荐与 {name} 类似车型', '用 {name} 规划迈阿密之夜'],
    venueContextPrompts: ['{name} 的氛围和必点菜', '围绕 {name} 规划晚间行程', '{name} 附近类似好去处', '为 {name} 搭配一辆豪车'],
    quickRequest: '快速预订咨询',
    sendPlan: '发送行程至 Live Trip Room',
    sendPlanCount: '发送行程 ({n}) 至 Trip Room',
    selectedItem: '已选',
    addToPlan: '选择',
    openTripRoom: '打开 Live Trip Room',
    planSentTitle: '行程已发送至 Live Trip Room',
    planSentBody: '团队已收到全部 {n} 项安排，可在 Live Trip Room 查看确认状态。',
    requestSentTitle: '已收到咨询',
    requestSentBody: '团队将尽快确认档期、最终报价与押金。',
    emailItinerary: '发送到邮箱',
    emailPlaceholder: '您的电子邮箱',
    sendEmail: '发送',
    emailSent: '行程已发送至您的邮箱',
    emailUnavailable: '邮件服务暂不可用，请使用复制或 Telegram。',
    emailInvalid: '请输入有效的电子邮箱。',
    namePlaceholder: '姓名',
    phonePlaceholder: '电话 / WhatsApp',
    fromLabel: '开始',
    toLabel: '结束',
    guestsLabel: '人数',
    timeLabel: '晚餐时间',
    notePlaceholder: '备注（选填）',
    submitRequest: '提交咨询',
    submitPlan: '提交完整行程',
    sending: '发送中…',
    cancel: '取消',
    errorBadDates: '结束日期必须晚于开始日期。',
    errorConsent: '提交前请先同意服务条款。',
    errorFailed: '提交失败，请重试或联系经理。',
    handoffHeader: '您好 MIAMI ELIO 团队 — 来自 ELIO+ Guide：',
    handoffViewing: '当前页面',
    handoffTrip: '行程参数',
    handoffPicks: '意向项目',
    handoffQuestion: '最近提问'
  },
  ja: {
    viewing: '閲覧中',
    askAboutCar: 'この車について ELIO に聞く',
    askAboutCarPrompt: '{name} の空き状況、3日間の見積もり、デポジット、マイアミ配車について教えて。',
    carContextPrompts: ['{name} の希望日の空きを確認', '{name} の3日間合計を計算', '{name} に似た車を表示', '{name} でマイアミの夜を計画'],
    venueContextPrompts: ['{name} の雰囲気とおすすめ料理', '{name} を中心に夜のプランを作成', '{name} 周辺の似たスポット', '{name} に高級車を追加'],
    quickRequest: 'クイック相談',
    sendPlan: 'プランを Live Trip Room に送信',
    sendPlanCount: 'プラン ({n}) を Trip Room に送信',
    selectedItem: '選択中',
    addToPlan: '選択',
    openTripRoom: 'Live Trip Room を開く',
    planSentTitle: 'Live Trip Room に送信しました',
    planSentBody: '全 {n} 件をまとめてチームに送信しました。',
    requestSentTitle: 'リクエストを受信しました',
    requestSentBody: '空き状況・最終料金・デポジットをまもなく確認します。',
    emailItinerary: 'メールで送る',
    emailPlaceholder: 'メールアドレス',
    sendEmail: '送信',
    emailSent: 'プランをメール送信しました',
    emailUnavailable: 'メール送信は現在利用できません。コピーまたは Telegram をご利用ください。',
    emailInvalid: '有効なメールアドレスを入力してください。',
    namePlaceholder: 'お名前',
    phonePlaceholder: '電話 / WhatsApp',
    fromLabel: '開始',
    toLabel: '終了',
    guestsLabel: '人数',
    timeLabel: 'ディナー時間',
    notePlaceholder: 'ご要望（任意）',
    submitRequest: 'リクエスト送信',
    submitPlan: 'プランを一括送信',
    sending: '送信中…',
    cancel: 'キャンセル',
    errorBadDates: '終了日は開始日より後にしてください。',
    errorConsent: '送信前に利用規約に同意してください。',
    errorFailed: '送信できませんでした。再試行するかマネージャーにご連絡ください。',
    handoffHeader: 'MIAMI ELIO チームへ — ELIO+ Guide からの引き継ぎ：',
    handoffViewing: '閲覧ページ',
    handoffTrip: '条件',
    handoffPicks: '候補',
    handoffQuestion: 'リクエスト'
  },
  ko: {
    viewing: '현재 페이지',
    askAboutCar: '이 차량에 대해 ELIO에게 물어보기',
    askAboutCarPrompt: '{name}의 예약 가능 여부, 3일 예상 비용, 보증금, 마이애미 배송 옵션을 알려줘.',
    carContextPrompts: ['{name} 날짜별 예약 가능 여부 확인', '{name} 3일 총액 계산', '{name}와 비슷한 차량 보기', '{name}와 함께 마이애미 저녁 계획'],
    venueContextPrompts: ['{name} 분위기 및 추천 메뉴', '{name} 중심으로 저녁 일정 만들기', '{name} 근처 비슷한 곳', '{name}에 럭셔리 차량 추가'],
    quickRequest: '빠른 문의',
    sendPlan: 'Live Trip Room으로 일정 보내기',
    sendPlanCount: '일정 ({n}) Trip Room으로 보내기',
    selectedItem: '선택됨',
    addToPlan: '선택',
    openTripRoom: 'Live Trip Room 열기',
    planSentTitle: 'Live Trip Room으로 전송 완료',
    planSentBody: '총 {n}개 항목이 하나의 일정으로 팀에 전달되었습니다.',
    requestSentTitle: '문의가 접수되었습니다',
    requestSentBody: '곧 예약 가능 여부, 최종 요금 및 보증금을 안내해 드립니다.',
    emailItinerary: '이메일로 받기',
    emailPlaceholder: '이메일 주소',
    sendEmail: '보내기',
    emailSent: '일정이 이메일로 전송되었습니다',
    emailUnavailable: '이메일 전송을 일시적으로 사용할 수 없습니다. 복사 또는 텔레그램을 이용해 주세요.',
    emailInvalid: '유효한 이메일을 입력해 주세요.',
    namePlaceholder: '성함',
    phonePlaceholder: '전화번호 / WhatsApp',
    fromLabel: '시작일',
    toLabel: '종료일',
    guestsLabel: '인원',
    timeLabel: '저녁 시간',
    notePlaceholder: '요청 사항 (선택)',
    submitRequest: '문의 보내기',
    submitPlan: '전체 일정 보내기',
    sending: '전송 중…',
    cancel: '취소',
    errorBadDates: '종료일은 시작일 이후여야 합니다.',
    errorConsent: '전송 전에 약관에 동의해 주세요.',
    errorFailed: '전송하지 못했습니다. 다시 시도하거나 매니저에게 문의해 주세요.',
    handoffHeader: 'MIAMI ELIO 팀 안녕하세요 — ELIO+ Guide에서 이어집니다:',
    handoffViewing: '페이지',
    handoffTrip: '일정 정보',
    handoffPicks: '선택 항목',
    handoffQuestion: '최근 문의'
  }
});

export function getStage2Copy(locale = 'en') {
  const code = normalizeLocale(locale);
  const localized = STAGE2_COPY[code] || STAGE2_COPY.en;
  return {
    ...STAGE2_COPY.en,
    ...localized,
    sectionPrompts: {
      ...STAGE2_COPY.en.sectionPrompts,
      ...(localized.sectionPrompts || {})
    }
  };
}

export function askAboutCarCopy(locale = 'en', title = '') {
  const copy = getStage2Copy(locale);
  const name = String(title || '').trim();
  return {
    label: copy.askAboutCar,
    prompt: copy.askAboutCarPrompt.replace('{name}', name || 'this car')
  };
}

/**
 * Enrich verified partner booking URLs (Stay22, YATR, Viator, TicketNetwork)
 * with remembered TripProfile dates/guests/area while preserving affiliate IDs.
 */
export function enrichPartnerBookingUrl(booking, profile = null) {
  if (!booking?.href || !profile || typeof profile !== 'object') return booking?.href || '';
  const platform = String(booking.platform || '').toLowerCase();
  if (platform === 'stay22') {
    return buildStay22ReferralUrl(profile);
  }
  try {
    const url = new URL(booking.href);
    if (platform === 'yatr' && url.hostname.endsWith('yatr.co')) {
      if (profile.dateRange?.from && !url.searchParams.has('date')) url.searchParams.set('date', profile.dateRange.from);
      if (Number.isInteger(profile.guests) && profile.guests > 0 && !url.searchParams.has('guests')) {
        url.searchParams.set('guests', String(profile.guests));
      }
      return url.href;
    }
    if (platform === 'viator' && url.hostname.endsWith('viator.com')) {
      if (profile.dateRange?.from && !url.searchParams.has('startDate')) url.searchParams.set('startDate', profile.dateRange.from);
      if (profile.dateRange?.to && profile.dateRange.to > profile.dateRange.from && !url.searchParams.has('endDate')) {
        url.searchParams.set('endDate', profile.dateRange.to);
      }
      return url.href;
    }
    if (platform === 'ticketnetwork' && url.pathname.includes('search') && profile.dateRange?.from && !url.searchParams.has('from')) {
      url.searchParams.set('from', profile.dateRange.from);
      if (profile.dateRange.to) url.searchParams.set('to', profile.dateRange.to);
      return url.href;
    }
    return booking.href;
  } catch {
    return booking.href;
  }
}

/**
 * Build a smart Telegram (`https://t.me/<user>?text=...`) or WhatsApp
 * (`https://wa.me/<digits>?text=...`) handoff URL prefilled with the guest's
 * TripProfile, current page context, shortlisted picks, Split-Pay intent,
 * and AI/conversation summary so the live manager has full context immediately.
 * Returns the plain baseHref untouched when there is no conversation context.
 */
export function buildManagerHandoffUrl({ baseHref, textBaseHref = null, profile = null, pageContext = null, messages = [], listings = [], plan = null, handoffSummary = '', locale = 'en' } = {}) {
  if (!baseHref || typeof baseHref !== 'string') return null;
  const copy = getStage2Copy(locale);
  const lines = [];

  if (pageContext?.title) {
    lines.push(`${copy.handoffViewing}: ${pageContext.title}`);
  }

  const tripBits = [];
  if (profile?.dateRange?.from) {
    tripBits.push(profile.dateRange.to && profile.dateRange.to !== profile.dateRange.from
      ? `${profile.dateRange.from} → ${profile.dateRange.to}`
      : profile.dateRange.from);
  }
  if (profile?.guests) tripBits.push(`${profile.guests} pax`);
  if (profile?.neighborhood) tripBits.push(profile.neighborhood);
  if (profile?.maxDailyBudget) tripBits.push(`≤$${profile.maxDailyBudget}/day`);
  if (profile?.airport) tripBits.push(profile.airport);
  if (profile?.occasion) tripBits.push(profile.occasion);
  if (profile?.hasKids && profile?.occasion !== 'family-kids') tripBits.push('kids');
  if (Array.isArray(profile?.dietaryOrCuisine) && profile.dietaryOrCuisine.length) {
    tripBits.push(profile.dietaryOrCuisine.join('/'));
  }
  if (tripBits.length) lines.push(`${copy.handoffTrip}: ${tripBits.join(' · ')}`);

  const picks = [];
  for (const section of plan?.sections || []) {
    const first = section?.candidates?.[0];
    if (first?.title && !picks.includes(first.title)) {
      picks.push(first.price ? `${first.title} (${first.price})` : first.title);
    }
  }
  for (const item of listings || []) {
    if (item?.title && !picks.some((p) => p.startsWith(item.title))) {
      picks.push(item.price ? `${item.title} (${item.price})` : item.title);
    }
    if (picks.length >= 4) break;
  }
  if (picks.length) lines.push(`${copy.handoffPicks}: ${picks.slice(0, 4).join(', ')}`);

  const userTurns = (Array.isArray(messages) ? messages : [])
    .filter((m) => m?.role === 'user' && typeof m.content === 'string' && m.content.trim())
    .map((m) => m.content.trim().replace(/\s+/g, ' '));
  const mentionsSplitPay = Boolean(
    (profile?.guests && profile.guests >= 2 && plan?.sections?.length)
    || userTurns.some((t) => /split[\s-]?pay|раздел\p{L}*\s+оплат|пополам|на\s+(?:двоих|троих|четверых|шестерых|восьмерых|\d+\s*(?:чел|гост))/iu.test(t))
  );
  if (mentionsSplitPay) {
    lines.push(`Split-Pay: ${profile?.guests ? `${profile.guests} guests` : 'interested'}`);
  }

  const cleanSummary = typeof handoffSummary === 'string' ? handoffSummary.trim().replace(/\s+/g, ' ').slice(0, 260) : '';
  if (cleanSummary) {
    lines.push(`Summary: ${cleanSummary}`);
  } else if (userTurns.length) {
    const recent = userTurns.slice(-3);
    const combined = recent.length === 1
      ? recent[0].slice(0, 220)
      : recent.map((t) => t.slice(0, 120)).join(' / ').slice(0, 320);
    lines.push(`${copy.handoffQuestion}: "${combined}"`);
  }

  if (!lines.length) return baseHref;

  const text = `${copy.handoffHeader}\n${lines.join('\n')}`.slice(0, 950);
  try {
    const url = new URL(textBaseHref || baseHref);
    url.searchParams.set('text', text);
    return url.href;
  } catch {
    return baseHref;
  }
}
