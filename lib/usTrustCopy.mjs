// 16-language copy for the Miami Elio US Trust & Payment Strip
// (ELIO+ Shield, Apple Pay / Google Pay / Stripe Link, response SLA, and ELIO+ Guide planner CTA).

const COPY = {
  en: {
    shieldTitle: 'ELIO+ Shield',
    shieldSub: 'Verified local fulfillment & zero upfront charge until confirmed',
    payTitle: 'US Express Checkout',
    paySub: 'Apple Pay · Google Pay · Stripe Link · Cards · PayPal',
    slaTitle: 'Fast Miami Desk',
    slaSub: 'Real specialist confirmation in ~15 min',
    planCarCta: 'Plan my day with ELIO+ Guide',
    planCarPrompt: 'Plan a luxury day in Miami with an exotic car, lunch, and sunset dinner for 2.',
    planDiningCta: 'Curate tonight with ELIO+ Guide',
    planDiningPrompt: 'Recommend the best Miami restaurant for dinner tonight plus a rooftop or lounge after.'
  },
  ru: {
    shieldTitle: 'Защита ELIO+ Shield',
    shieldSub: 'Проверенные партнёры и оплата только после подтверждения',
    payTitle: 'Экспресс-оплата США',
    paySub: 'Apple Pay · Google Pay · Stripe Link · Карты · PayPal',
    slaTitle: 'Команда в Майами',
    slaSub: 'Ответ живого специалиста за ~15 минут',
    planCarCta: 'Собрать день с ELIO+ Guide',
    planCarPrompt: 'Собери премиальный день в Майами: спорткар, обед у воды и ужин на закате на двоих.',
    planDiningCta: 'Подобрать вечер с ELIO+ Guide',
    planDiningPrompt: 'Подбери лучший ресторан в Майами на сегодняшний ужин и руфтоп или лаунж после.'
  },
  es: {
    shieldTitle: 'Protección ELIO+ Shield',
    shieldSub: 'Socios verificados y sin cobro hasta confirmar disponibilidad',
    payTitle: 'Pago exprés en EE. UU.',
    paySub: 'Apple Pay · Google Pay · Stripe Link · Tarjetas · PayPal',
    slaTitle: 'Equipo en Miami',
    slaSub: 'Confirmación real en ~15 min',
    planCarCta: 'Planear mi día con ELIO+ Guide',
    planCarPrompt: 'Planifica un día de lujo en Miami con auto exótico, almuerzo y cena al atardecer para 2.',
    planDiningCta: 'Diseñar mi noche con ELIO+ Guide',
    planDiningPrompt: 'Recomienda el mejor restaurante en Miami para cenar hoy y un rooftop o lounge después.'
  },
  he: {
    shieldTitle: 'הגנת ELIO+ Shield',
    shieldSub: 'שותפים מאומתים וללא חיוב עד לאישור זמינות',
    payTitle: 'תשלום מהיר בארה״ב',
    paySub: 'Apple Pay · Google Pay · Stripe Link · כרטיסים · PayPal',
    slaTitle: 'צוות מקומי במיאמי',
    slaSub: 'מענה מומחה תוך ~15 דקות',
    planCarCta: 'תכנן יום עם ELIO+ Guide',
    planCarPrompt: 'תכנן יום יוקרה במיאמי עם רכב אקזוטי, ארוחת צהריים וערב בשקיעה לזוג.',
    planDiningCta: 'בנה ערב עם ELIO+ Guide',
    planDiningPrompt: 'המלץ על המסעדה הטובה ביותר במיאמי לארוחת ערב הערב ורופטופ או לאונג׳ אחריה.'
  },
  zh: {
    shieldTitle: 'ELIO+ Shield 保障',
    shieldSub: '核实本地合作方，确认前零预扣款',
    payTitle: '美国快捷支付',
    paySub: 'Apple Pay · Google Pay · Stripe Link · 银行卡 · PayPal',
    slaTitle: '迈阿密专员响应',
    slaSub: '约 15 分钟内人工确认',
    planCarCta: '用 ELIO+ Guide 规划行程',
    planCarPrompt: '为两位客人规划迈阿密奢华一日行程：超跑、海景午餐和日落晚餐。',
    planDiningCta: '用 ELIO+ Guide 挑选今晚餐厅',
    planDiningPrompt: '推荐迈阿密今晚最棒的餐厅以及餐后屋顶酒吧或酒廊。'
  },
  pt: {
    shieldTitle: 'Proteção ELIO+ Shield',
    shieldSub: 'Parceiros verificados e zero cobrança antes da confirmação',
    payTitle: 'Checkout rápido EUA',
    paySub: 'Apple Pay · Google Pay · Stripe Link · Cartões · PayPal',
    slaTitle: 'Equipe em Miami',
    slaSub: 'Resposta real em ~15 min',
    planCarCta: 'Planejar dia com ELIO+ Guide',
    planCarPrompt: 'Monte um dia de luxo em Miami com carro exótico, almoço e jantar ao pôr do sol para 2.',
    planDiningCta: 'Montar noite com ELIO+ Guide',
    planDiningPrompt: 'Recomende o melhor restaurante em Miami para hoje à noite e um rooftop ou lounge depois.'
  },
  uk: {
    shieldTitle: 'Захист ELIO+ Shield',
    shieldSub: 'Перевірені партнери та оплата лише після підтвердження',
    payTitle: 'Експрес-оплата США',
    paySub: 'Apple Pay · Google Pay · Stripe Link · Картки · PayPal',
    slaTitle: 'Команда в Маямі',
    slaSub: 'Відповідь спеціаліста за ~15 хвилин',
    planCarCta: 'Зібрати день з ELIO+ Guide',
    planCarPrompt: 'Збери преміальний день у Маямі: спорткар, обід біля води та вечеря на заході сонця для двох.',
    planDiningCta: 'Підібрати вечір з ELIO+ Guide',
    planDiningPrompt: 'Порадь найкращий ресторан у Маямі на сьогоднішню вечерю та руфтоп або лаунж після.'
  },
  ja: {
    shieldTitle: 'ELIO+ Shield 保証',
    shieldSub: '認証済み現地パートナー・確定前の事前課金なし',
    payTitle: '米国エクスプレス決済',
    paySub: 'Apple Pay · Google Pay · Stripe Link · カード · PayPal',
    slaTitle: 'マイアミ専任デスク',
    slaSub: '約15分で担当者が確認',
    planCarCta: 'ELIO+ Guideで1日を計画',
    planCarPrompt: 'マイアミでスーパーカー、ランチ、サンセットディナーを楽しむ2人向けの1日プランを作って。',
    planDiningCta: 'ELIO+ Guideで今夜のお店を選ぶ',
    planDiningPrompt: '今夜のマイアミでおすすめのディナーレストランと食後のルーフトップを教えて。'
  },
  ko: {
    shieldTitle: 'ELIO+ Shield 보호',
    shieldSub: '검증된 현지 파트너 · 확정 전 선결제 없음',
    payTitle: '미국 간편 결제',
    paySub: 'Apple Pay · Google Pay · Stripe Link · 카드 · PayPal',
    slaTitle: '마이애미 전담 데스크',
    slaSub: '약 15분 내 전문가 확인',
    planCarCta: 'ELIO+ Guide로 하루 계획하기',
    planCarPrompt: '마이애미에서 슈퍼카, 점심, 선셋 디너로 구성된 2인 럭셔리 하루 일정을 짜줘.',
    planDiningCta: 'ELIO+ Guide로 오늘 저녁 추천',
    planDiningPrompt: '오늘 밤 마이애미 최고의 레스토랑과 식사 후 갈 루프탑이나 라운지를 추천해줘.'
  },
  de: {
    shieldTitle: 'ELIO+ Shield Schutz',
    shieldSub: 'Geprüfte lokale Partner & keine Belastung vor Bestätigung',
    payTitle: 'US-Express-Checkout',
    paySub: 'Apple Pay · Google Pay · Stripe Link · Karten · PayPal',
    slaTitle: 'Miami-Team vor Ort',
    slaSub: 'Persönliche Bestätigung in ~15 Min.',
    planCarCta: 'Tag mit ELIO+ Guide planen',
    planCarPrompt: 'Plane einen Luxustag in Miami mit Sportwagen, Mittagessen und Sunset-Dinner für 2.',
    planDiningCta: 'Abend mit ELIO+ Guide planen',
    planDiningPrompt: 'Empfiehl das beste Restaurant in Miami für heute Abend plus eine Rooftop-Bar danach.'
  },
  ar: {
    shieldTitle: 'حماية ELIO+ Shield',
    shieldSub: 'شركاء محليون معتمدون ودون أي خصم قبل التأكيد',
    payTitle: 'دفع سريع في أمريكا',
    paySub: 'Apple Pay · Google Pay · Stripe Link · بطاقات · PayPal',
    slaTitle: 'فريق ميامي المباشر',
    slaSub: 'تأكيد مختص خلال ~15 دقيقة',
    planCarCta: 'خطط يومك مع ELIO+ Guide',
    planCarPrompt: 'خطط لي يوماً فاخراً في ميامي مع سيارة رياضية وغداء وعشاء عند الغروب لشخصين.',
    planDiningCta: 'نسّق سهرتك مع ELIO+ Guide',
    planDiningPrompt: 'رشح أفضل مطعم في ميامي للعشاء الليلة مع روفتوب أو لاونج بعده.'
  },
  tr: {
    shieldTitle: 'ELIO+ Shield Güvencesi',
    shieldSub: 'Onaylı yerel iş ortakları ve onay öncesi ön çekim yok',
    payTitle: 'ABD Hızlı Ödeme',
    paySub: 'Apple Pay · Google Pay · Stripe Link · Kartlar · PayPal',
    slaTitle: 'Miami Uzman Ekibi',
    slaSub: 'Yaklaşık ~15 dakikada gerçek dönüş',
    planCarCta: 'ELIO+ Guide ile gününü planla',
    planCarPrompt: 'Miami’de süper otomobil, öğle yemeği ve gün batımı akşam yemeğiyle 2 kişilik lüks gün planla.',
    planDiningCta: 'ELIO+ Guide ile akşamını seç',
    planDiningPrompt: 'Bu akşam Miami’de en iyi akşam yemeği restoranını ve sonrasında bir rooftop öner.'
  },
  fa: {
    shieldTitle: 'ضمانت ELIO+ Shield',
    shieldSub: 'شرکای محلی تأییدشده و بدون کسر وجه پیش از تأیید',
    payTitle: 'پرداخت سریع آمریکا',
    paySub: 'Apple Pay · Google Pay · Stripe Link · کارت · PayPal',
    slaTitle: 'تیم محلی میامی',
    slaSub: 'پاسخ متخصص در حدود ۱۵ دقیقه',
    planCarCta: 'برنامه‌ریزی روز با ELIO+ Guide',
    planCarPrompt: 'یک روز لوکس در میامی برای ۲ نفر با خودروی اسپرت، ناهار و شام هنگام غروب برنامه‌ریزی کن.',
    planDiningCta: 'انتخاب امشب با ELIO+ Guide',
    planDiningPrompt: 'بهترین رستوران میامی برای شام امشب و یک روفتاپ یا لانژ بعد از آن را پیشنهاد بده.'
  },
  it: {
    shieldTitle: 'Garanzia ELIO+ Shield',
    shieldSub: 'Partner verificati e nessun addebito prima della conferma',
    payTitle: 'Checkout rapido USA',
    paySub: 'Apple Pay · Google Pay · Stripe Link · Carte · PayPal',
    slaTitle: 'Team Miami dedicato',
    slaSub: 'Conferma reale in ~15 min',
    planCarCta: 'Organizza la giornata con ELIO+ Guide',
    planCarPrompt: 'Organizza una giornata di lusso a Miami con supercar, pranzo e cena al tramonto per 2.',
    planDiningCta: 'Scegli la serata con ELIO+ Guide',
    planDiningPrompt: 'Consiglia il miglior ristorante a Miami per stasera e un rooftop o lounge dopo cena.'
  },
  fr: {
    shieldTitle: 'Protection ELIO+ Shield',
    shieldSub: 'Partenaires vérifiés et aucun débit avant confirmation',
    payTitle: 'Paiement express US',
    paySub: 'Apple Pay · Google Pay · Stripe Link · Cartes · PayPal',
    slaTitle: 'Équipe locale à Miami',
    slaSub: 'Confirmation réelle en ~15 min',
    planCarCta: 'Planifier ma journée avec ELIO+ Guide',
    planCarPrompt: 'Planifie une journée de luxe à Miami avec supercar, déjeuner et dîner au coucher du soleil pour 2.',
    planDiningCta: 'Organiser ma soirée avec ELIO+ Guide',
    planDiningPrompt: 'Recommande le meilleur restaurant à Miami pour ce soir plus un rooftop ou lounge ensuite.'
  },
  pl: {
    shieldTitle: 'Ochrona ELIO+ Shield',
    shieldSub: 'Zweryfikowani partnerzy i brak opłat przed potwierdzeniem',
    payTitle: 'Szybkie płatności USA',
    paySub: 'Apple Pay · Google Pay · Stripe Link · Karty · PayPal',
    slaTitle: 'Zespół w Miami',
    slaSub: 'Potwierdzenie specjalisty w ~15 min',
    planCarCta: 'Zaplanuj dzień z ELIO+ Guide',
    planCarPrompt: 'Zaplanuj luksusowy dzień w Miami ze sportowym autem, lunchem i kolacją o zachodzie słońca dla 2 osób.',
    planDiningCta: 'Zaplanuj wieczór z ELIO+ Guide',
    planDiningPrompt: 'Poleć najlepszą restaurację w Miami na dzisiejszą kolację oraz rooftop lub lounge po niej.'
  }
};

export function getUsTrustCopy(locale = 'en') {
  return COPY[locale] || COPY.en;
}
