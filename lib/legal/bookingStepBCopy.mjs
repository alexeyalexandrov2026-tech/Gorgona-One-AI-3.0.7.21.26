// 16-language Booking OS Step B copy:
// Stripe Identity 30-sec Online KYC, Flight-Synced Delivery, and Digital ELIO+ Reservation Pass (.ics + QR).

const keys = [
  'kycEyebrow', 'kycTitle', 'kycBody', 'kycButton', 'kycStarting', 'kycVerified', 'kycPending', 'kycRetry',
  'flightEyebrow', 'flightTitle', 'flightBody', 'flightNumberLabel', 'flightNumberPlaceholder',
  'airportLabel', 'arrivalTimeLabel', 'deliveryLabel', 'deliveryPlaceholder',
  'flightSaveButton', 'flightSaving', 'flightSaved', 'flightAutoSyncBadge',
  'passQrLabel', 'passCalendarButton', 'passKycStamp', 'passFlightStamp',
  'adminKycRequired', 'adminKycVerified', 'adminKycPending', 'adminFlightBadge'
];

const rows = {
  en: [
    'ONLINE ID & LICENSE KYC · 30 SEC', 'Express Online Verification (No Paperwork at Handover)', 'Verify your passport or driver’s license once via Stripe Identity — walk straight to your yacht, supercar, or villa without desk queues.', 'Verify ID Online (30 sec · Stripe Identity)', 'Opening Stripe Identity…', 'ID Verified · Fast-Track Ready', 'Verification Pending', 'Action Needed · Retry Verification',
    'FLIGHT-SYNCED DELIVERY', 'Sync Flight & Handover Location', 'Enter your flight or private tail number — your MIAMI ELIO specialist tracks live landing time and adjusts handover automatically with zero waiting fees.', 'Flight / Tail Number', 'e.g. AA 1245 or N650ME',
    'Airport / FBO / Marina', 'Estimated Arrival (Miami Time)', 'Delivery / Handover Address', 'Hotel valet, FBO ramp, marina slip, or villa address',
    'Save Flight-Synced Delivery', 'Saving…', 'Flight-Synced Delivery Saved', 'Live Flight Tracking Active',
    'Scan for Instant Handover Verification', 'Add to Apple / Google Calendar (.ics)', 'ID Verified (Stripe Identity)', 'Flight-Synced Handover',
    'Require 30-sec Online KYC (Stripe Identity)', 'KYC Verified', 'KYC Pending', 'Flight'
  ],
  ru: [
    'ОНЛАЙН-ВЕРИФИКАЦИЯ KYC · 30 СЕК', 'Проверка прав / паспорта онлайн (без бумаг при передаче)', 'Подтвердите права или паспорт один раз через Stripe Identity — садитесь в авто или на яхту сразу по прилёту, без бумажных договоров и очередей.', 'Пройти KYC онлайн (30 сек · Stripe Identity)', 'Открываем Stripe Identity…', 'Документы подтверждены · Fast-Track', 'Ожидает верификации', 'Требуется повторная проверка',
    'ПОДАЧА ПО РЕЙСУ (FLIGHT-SYNC)', 'Синхронизация рейса и адреса подачи', 'Укажите номер рейса или частного борта — специалист MIAMI ELIO отслеживает посадку в реальном времени и сдвигает подачу при задержке без штрафов.', 'Номер рейса / борта', 'напр. AA 1245 или N650ME',
    'Аэропорт / FBO / Марина', 'Время прилёта (Майами)', 'Адрес подачи / передачи', 'Валет отеля, перрон FBO, причал марины или вилла',
    'Сохранить подачу по рейсу', 'Сохранение…', 'Подача по рейсу сохранена', 'Авто-отслеживание рейса активно',
    'QR-код для мгновенной проверки при передаче', 'Добавить в Apple / Google Календарь (.ics)', 'KYC пройден (Stripe Identity)', 'Подача синхронизирована с рейсом',
    'Запросить онлайн-KYC 30 сек (Stripe Identity)', 'KYC пройден', 'KYC ожидает', 'Рейс'
  ],
  es: [
    'VERIFICACIÓN KYC EN LÍNEA · 30 SEG', 'Verificación Exprés (Sin Papeles en la Entrega)', 'Verifica tu pasaporte o licencia vía Stripe Identity una sola vez — entrega inmediata sin filas ni formularios.', 'Verificar ID en Línea (30 seg · Stripe)', 'Abriendo Stripe Identity…', 'ID Verificado · Fast-Track', 'Verificación Pendiente', 'Reintentar Verificación',
    'ENTREGA SINCRONIZADA CON VUELO', 'Sincroniza Vuelo y Lugar de Entrega', 'Ingresa tu vuelo o matrícula privada — seguimos el aterrizaje en vivo y ajustamos la entrega sin cargos de espera.', 'Número de Vuelo / Matrícula', 'ej. AA 1245 o N650ME',
    'Aeropuerto / FBO / Marina', 'Llegada Estimada (Hora Miami)', 'Dirección de Entrega', 'Valet de hotel, FBO, muelle o villa',
    'Guardar Entrega por Vuelo', 'Guardando…', 'Entrega Sincronizada Guardada', 'Seguimiento de Vuelo Activo',
    'Escanea para Verificación Inmediata', 'Añadir a Apple / Google Calendar (.ics)', 'ID Verificado (Stripe Identity)', 'Entrega Sincronizada',
    'Requerir KYC en línea 30 seg (Stripe Identity)', 'KYC Verificado', 'KYC Pendiente', 'Vuelo'
  ],
  he: [
    'אימות זהות מקוון KYC · 30 שניות', 'אימות רישיון ודרכון מראש (ללא ניירת במסירה)', 'אמתו מסמך פעם אחת ב-Stripe Identity וקבלו את הרכב או היאכטה מיד עם ההגעה.', 'אימות זהות מקוון (30 שניות · Stripe)', 'פותח Stripe Identity…', 'זהות אומתה · Fast-Track', 'ממתין לאימות', 'נדרש ניסיון חוזר',
    'מסירה מסונכרנת לטיסה', 'סנכרון טיסה ומיקום מסירה', 'הזינו מספר טיסה — המומחה שלנו עוקב אחר הנחיתה ומתאים את המסירה אוטומטית ללא עלות המתנה.', 'מספר טיסה / מטוס', 'לדוגמה AA 1245',
    'שדה תעופה / FBO / מרינה', 'שעת נחיתה (מיאמי)', 'כתובת מסירה', 'מלון, FBO, רציף או וילה',
    'שמור פרטי טיסה ומסירה', 'שומר…', 'פרטי הטיסה נשמרו', 'מעקב טיסה חי פעיל',
    'סרקו לאימות מסירה מיידי', 'הוסף ליומן Apple / Google (.ics)', 'זהות אומתה (Stripe Identity)', 'מסירה מסונכרנת לטיסה',
    'דרוש אימות KYC ב-30 שניות', 'KYC אומת', 'KYC ממתין', 'טיסה'
  ],
  zh: [
    '30秒在线 KYC 身份认证', '免现场纸质手续 · 极速交接', '通过 Stripe Identity 一次验证驾照或护照，抵达迈阿密即可免排队直接提车或登艇。', '在线完成身份认证（30秒 · Stripe）', '正在打开 Stripe Identity…', '身份已认证 · 极速通道', '待认证', '需要重新验证',
    '航班同步交付', '同步航班与交接地点', '输入航班号或私人飞机尾号，MIAMI ELIO 实时追踪降落时间，延误自动顺延零等待费。', '航班号 / 机尾号', '例如 AA 1245 或 N650ME',
    '机场 / 私人航站楼 / 码头', '预计抵达时间（迈阿密）', '交接地址', '酒店代客泊车、FBO、游艇码头或别墅地址',
    '保存航班同步交付', '保存中…', '航班交付信息已保存', '实时航班追踪已开启',
    '扫码快速核验预订通行证', '添加到 Apple / Google 日历 (.ics)', 'KYC 已通过 (Stripe Identity)', '航班同步交接',
    '启用 30秒在线 KYC 认证 (Stripe Identity)', 'KYC 已认证', 'KYC 待完成', '航班'
  ],
  pt: [
    'KYC ONLINE DE ID · 30 SEG', 'Verificação Expressa (Zero Papelada na Entrega)', 'Valide passaporte ou CNH via Stripe Identity uma vez e receba seu carro ou iate sem filas.', 'Verificar ID Online (30 seg · Stripe)', 'Abrindo Stripe Identity…', 'ID Verificado · Fast-Track', 'Verificação Pendente', 'Refazer Verificação',
    'ENTREGA SINCRONIZADA COM VOO', 'Sincronizar Voo e Local de Entrega', 'Informe seu voo ou prefixo privado — acompanhamos o pouso ao vivo sem taxas de espera.', 'Número do Voo / Prefixo', 'ex. AA 1245 ou N650ME',
    'Aeroporto / FBO / Marina', 'Chegada Estimada (Miami)', 'Endereço de Entrega', 'Valet do hotel, FBO, pier ou vila',
    'Salvar Entrega por Voo', 'Salvando…', 'Entrega por Voo Salva', 'Rastreamento de Voo Ativo',
    'Escaneie para Verificação Rápida', 'Adicionar ao Apple / Google Calendar (.ics)', 'ID Verificado (Stripe Identity)', 'Entrega Sincronizada',
    'Exigir KYC online 30s (Stripe Identity)', 'KYC Verificado', 'KYC Pendente', 'Voo'
  ],
  uk: [
    'ОНЛАЙН-ВЕРИФІКАЦІЯ KYC · 30 СЕК', 'Перевірка прав / паспорта онлайн (без паперів)', 'Підтвердьте права чи паспорт один раз через Stripe Identity — миттєва передача авто чи яхти без черг.', 'Пройти KYC онлайн (30 сек · Stripe)', 'Відкриваємо Stripe Identity…', 'Документи підтверджено · Fast-Track', 'Очікує верифікації', 'Потрібна повторна перевірка',
    'ПОДАЧА ЗА РЕЙСОМ (FLIGHT-SYNC)', 'Синхронізація рейсу та адреси подачі', 'Вкажіть номер рейсу — спеціаліст MIAMI ELIO відстежує посадку наживо та зсуває подачу при затримці без штрафів.', 'Номер рейсу / борту', 'напр. AA 1245 або N650ME',
    'Аеропорт / FBO / Марина', 'Час прильоту (Маямі)', 'Адреса подачі', 'Валет готелю, FBO, причал або вілла',
    'Зберегти подачу за рейсом', 'Збереження…', 'Подачу за рейсом збережено', 'Відстеження рейсу активне',
    'QR-код для миттєвої перевірки', 'Додати в Apple / Google Календар (.ics)', 'KYC пройдено (Stripe Identity)', 'Синхронізовано з рейсом',
    'Вимагати онлайн-KYC 30 сек (Stripe Identity)', 'KYC пройдено', 'KYC очікує', 'Рейс'
  ],
  ja: [
    'オンライン本人確認 KYC · 30秒', '書類不要のエクスプレス引渡し', 'Stripe Identity でパスポート・免許証を事前認証。現地での手続きなしでスムーズにご案内します。', 'オンライン本人確認（30秒 · Stripe）', 'Stripe Identity を起動中…', '本人確認済み · Fast-Track', '本人確認待ち', '再確認が必要です',
    'フライト連動デリバリー', 'フライト便名と引渡し場所を同期', '便名やプライベート機登録番号を登録すると、到着遅延に合わせて待機料無料で引渡し時刻を自動調整します。', 'フライト便名 / 機体番号', '例: AA 1245 / N650ME',
    '空港 / FBO / マリーナ', '到着予定時刻（マイアミ）', '引渡し場所', 'ホテルバレー、FBO、マリーナ、ヴィラ住所',
    'フライト連動情報を保存', '保存中…', 'フライト連動を保存しました', 'ライブ運航追跡アクティブ',
    'スキャンで予約パスを即時確認', 'Apple / Google カレンダーに追加 (.ics)', 'KYC 認証済み (Stripe Identity)', 'フライト連動引渡し',
    '30秒オンライン KYC を必須にする', 'KYC 認証済', 'KYC 待ち', '便名'
  ],
  ko: [
    '온라인 신원인증 KYC · 30초', '현장 서류 없는 익스프레스 인수', 'Stripe Identity로 여권·면허증을 1회 인증하고 도착 즉시 대기 없이 인수하세요.', '온라인 신원인증 (30초 · Stripe)', 'Stripe Identity 여는 중…', '신원인증 완료 · Fast-Track', '인증 대기', '재인증 필요',
    '항공편 연동 딜리버리', '항공편 및 인수 위치 동기화', '항공편명을 입력하면 실시간 착륙 시간에 맞춰 대기 수수료 없이 자동 조정됩니다.', '항공편명 / 기체번호', '예: AA 1245 또는 N650ME',
    '공항 / FBO / 마리나', '도착 예정 시간 (마이애미)', '인수 주소', '호텔 발렛, FBO, 마리나 또는 빌라',
    '항공편 연동 저장', '저장 중…', '항공편 연동 저장됨', '실시간 항공편 추적 활성',
    '스캔하여 즉시 예약 확인', 'Apple / Google 캘린더 추가 (.ics)', 'KYC 완료 (Stripe Identity)', '항공편 연동 인수',
    '30초 온라인 KYC 필수 (Stripe Identity)', 'KYC 완료', 'KYC 대기', '항공편'
  ],
  de: [
    'ONLINE-KYC PRÜFUNG · 30 SEK', 'Express-Verifizierung (Kein Papierkram vor Ort)', 'Verifizieren Sie Ausweis oder Führerschein einmalig via Stripe Identity — sofortige Übergabe ohne Wartezeit.', 'ID online verifizieren (30 Sek · Stripe)', 'Stripe Identity wird geöffnet…', 'ID verifiziert · Fast-Track', 'Prüfung ausstehend', 'Erneut prüfen',
    'FLUG-SYNCHRONISIERTE ÜBERGABE', 'Flugdaten & Übergabeort synchronisieren', 'Geben Sie Ihre Flugnummer ein — unser Spezialist verfolgt die Landung live und passt die Übergabe kostenlos an.', 'Flugnummer / Kennung', 'z. B. LH 462 oder N650ME',
    'Flughafen / FBO / Marina', 'Geplante Ankunft (Miami-Zeit)', 'Übergabeadresse', 'Hotel-Valet, FBO-Rampe, Marina oder Villa',
    'Flug-Übergabe speichern', 'Wird gespeichert…', 'Flug-Übergabe gespeichert', 'Live-Flugtracking aktiv',
    'Scannen für Sofort-Verifizierung', 'Zu Apple / Google Kalender (.ics)', 'ID verifiziert (Stripe Identity)', 'Flug-synchronisiert',
    '30-Sek Online-KYC anfordern (Stripe Identity)', 'KYC verifiziert', 'KYC ausstehend', 'Flug'
  ],
  ar: [
    'التحقق الإلكتروني KYC · 30 ثانية', 'تحقق فوري من الهوية (دون أوراق عند الاستلام)', 'وثّق جواز السفر أو الرخصة مرة واحدة عبر Stripe Identity لاستلام فوري دون انتظار.', 'توثيق الهوية الآن (30 ثانية · Stripe)', 'جاري فتح Stripe Identity…', 'تم التحقق · مسار سريع', 'بانتظار التحقق', 'إعادة المحاولة مطلوبة',
    'التسليم المتزامن مع الرحلة', 'مزامنة الرحلة وموقع التسليم', 'أدخل رقم الرحلة ليقوم مختص MIAMI ELIO بمتابعة الهبوط مباشرة وتعديل التسليم تلقائياً دون رسوم انتظار.', 'رقم الرحلة / الطائرة', 'مثال AA 1245',
    'المطار / FBO / المارينا', 'وقت الوصول (ميامي)', 'عنوان التسليم', 'فندق، صالة خاصة FBO، مرسى أو فيلا',
    'حفظ التسليم المتزامن', 'جاري الحفظ…', 'تم حفظ بيانات الرحلة', 'تتبع الرحلة المباشر نشط',
    'امسح الرمز للتحقق الفوري', 'إضافة إلى تقويم Apple / Google (.ics)', 'تم التحقق (Stripe Identity)', 'تسليم متزامن مع الرحلة',
    'طلب تحقق KYC إلكتروني 30 ثانية', 'KYC موثّق', 'KYC معلق', 'رحلة'
  ],
  tr: [
    'ONLİNE KYC DOĞRULAMA · 30 SN', 'Hızlı Kimlik Onayı (Teslimde Evrak Yok)', 'Pasaport veya ehliyetinizi Stripe Identity ile tek seferde doğrulayın — beklemeden teslim alın.', 'Kimliği Online Doğrula (30 sn · Stripe)', 'Stripe Identity açılıyor…', 'Kimlik Doğrulandı · Fast-Track', 'Doğrulama Bekliyor', 'Tekrar Doğrula',
    'UÇUŞ SENKRONİZE TESLİMAT', 'Uçuş ve Teslimat Konumunu Eşle', 'Uçuş numaranızı girin — MIAMI ELIO inişi canlı takip eder ve gecikmede bekleme ücreti olmadan teslimi uyarlar.', 'Uçuş / Kuyruk Numarası', 'örn. TK 77 veya N650ME',
    'Havalimanı / FBO / Marina', 'Tahmini Varış (Miami)', 'Teslimat Adresi', 'Otel vale, FBO, marina veya villa',
    'Uçuş Teslimatını Kaydet', 'Kaydediliyor…', 'Uçuş Teslimatı Kaydedildi', 'Canlı Uçuş Takibi Aktif',
    'Anında Doğrulama için Tara', 'Apple / Google Takvimine Ekle (.ics)', 'Kimlik Doğrulandı (Stripe Identity)', 'Uçuş Senkronize',
    '30 sn Online KYC iste (Stripe Identity)', 'KYC Onaylı', 'KYC Bekliyor', 'Uçuş'
  ],
  fa: [
    'احراز هویت آنلاین KYC · ۳۰ ثانیه', 'تأیید سریع مدارک (بدون کاغذبازی در تحویل)', 'گواهینامه یا پاسپورت را یک‌بار با Stripe Identity تأیید کنید تا تحویل فوری بدون صف داشته باشید.', 'تأیید آنلاین هویت (۳۰ ثانیه · Stripe)', 'در حال باز کردن Stripe Identity…', 'هویت تأیید شد · مسیر سریع', 'در انتظار تأیید', 'تلاش مجدد لازم است',
    'تحویل هماهنگ با پرواز', 'هماهنگی پرواز و محل تحویل', 'شماره پرواز را وارد کنید تا زمان فرود به‌صورت زنده پیگیری و بدون جریمه انتظار هماهنگ شود.', 'شماره پرواز / هواپیما', 'مثلاً AA 1245',
    'فرودگاه / FBO / مارینا', 'زمان ورود (میامی)', 'آدرس تحویل', 'هتل، FBO، اسکله یا ویلا',
    'ذخیره تحویل هماهنگ با پرواز', 'در حال ذخیره…', 'اطلاعات پرواز ذخیره شد', 'ردیابی زنده پرواز فعال',
    'اسکن برای تأیید فوری تحویل', 'افزودن به تقویم Apple / Google (.ics)', 'هویت تأییدشده (Stripe Identity)', 'هماهنگ با پرواز',
    'الزام احراز هویت آنلاین ۳۰ ثانیه‌ای KYC', 'KYC تأیید شد', 'KYC در انتظار', 'پرواز'
  ],
  it: [
    'VERIFICA KYC ONLINE · 30 SEC', 'Verifica Express (Zero Carte alla Consegna)', 'Verifica passaporto o patente una volta con Stripe Identity — ritiro immediato senza attese.', 'Verifica ID Online (30 sec · Stripe)', 'Apertura Stripe Identity…', 'ID Verificato · Fast-Track', 'Verifica in Attesa', 'Riprova Verifica',
    'CONSEGNA SINCRONIZZATA CON VOLO', 'Sincronizza Volo e Luogo di Consegna', 'Inserisci il numero del volo — monitoriamo l’atterraggio live e adattiamo la consegna senza costi di attesa.', 'Numero Volo / Tail', 'es. AZ 630 o N650ME',
    'Aeroporto / FBO / Marina', 'Arrivo Stimato (Miami)', 'Indirizzo di Consegna', 'Valet hotel, FBO, molo o villa',
    'Salva Consegna con Volo', 'Salvataggio…', 'Consegna Volo Salvata', 'Tracciamento Volo Attivo',
    'Scansiona per Verifica Immediata', 'Aggiungi a Apple / Google Calendar (.ics)', 'ID Verificato (Stripe Identity)', 'Consegna Sincronizzata',
    'Richiedi KYC online 30s (Stripe Identity)', 'KYC Verificato', 'KYC In Attesa', 'Volo'
  ],
  fr: [
    'VÉRIFICATION KYC EN LIGNE · 30 SEC', 'Validation Express (Zéro Papier sur Place)', 'Vérifiez passeport ou permis une seule fois via Stripe Identity — prise en main immédiate sans attente.', 'Vérifier mon ID (30 sec · Stripe)', 'Ouverture de Stripe Identity…', 'ID Vérifié · Fast-Track', 'Vérification en Attente', 'Relancer la Vérification',
    'LIVRAISON SYNCHRONISÉE AU VOL', 'Synchroniser Vol & Lieu de Remise', 'Indiquez votre numéro de vol — notre spécialiste suit l’atterrissage en direct et ajuste la remise sans frais d’attente.', 'Numéro de Vol / Immatriculation', 'ex. AF 090 ou N650ME',
    'Aéroport / FBO / Marina', 'Arrivée Estimée (Miami)', 'Adresse de Remise', 'Voiturier hôtel, FBO, quai ou villa',
    'Enregistrer la Livraison Vol', 'Enregistrement…', 'Livraison Vol Enregistrée', 'Suivi de Vol en Direct Actif',
    'Scanner pour Vérification Instantanée', 'Ajouter à Apple / Google Calendar (.ics)', 'ID Vérifié (Stripe Identity)', 'Livraison Synchronisée',
    'Exiger KYC en ligne 30s (Stripe Identity)', 'KYC Vérifié', 'KYC En Attente', 'Vol'
  ],
  pl: [
    'WERYFIKACJA KYC ONLINE · 30 SEK', 'Ekspresowa Weryfikacja (Bez Papierów)', 'Zweryfikuj paszport lub prawo jazdy raz przez Stripe Identity — błyskawiczny odbiór bez kolejek.', 'Zweryfikuj ID Online (30 sek · Stripe)', 'Otwieranie Stripe Identity…', 'ID Zweryfikowane · Fast-Track', 'Oczekuje Weryfikacji', 'Ponów Weryfikację',
    'DOSTAWA SYNCHRONIZOWANA Z LOTEM', 'Zsynchronizuj Lot i Miejsce Odbioru', 'Podaj numer lotu — nasz specjalista śledzi lądowanie na żywo i dostosowuje odbiór bez opłat za postój.', 'Numer Lotu / Rejestracja', 'np. LO 29 lub N650ME',
    'Lotnisko / FBO / Marina', 'Planowany Przylot (Miami)', 'Adres Odbioru', 'Valet hotelu, FBO, nabrzeże lub willa',
    'Zapisz Dostawę z Lotem', 'Zapisywanie…', 'Dostawa z Lotem Zapisana', 'Śledzenie Lotu Aktywne',
    'Zeskanuj do Szybkiej Weryfikacji', 'Dodaj do Apple / Google Kalendarza (.ics)', 'ID Zweryfikowane (Stripe Identity)', 'Odbiór Zsynchronizowany',
    'Wymagaj KYC online 30s (Stripe Identity)', 'KYC Zweryfikowane', 'KYC Oczekuje', 'Lot'
  ]
};

export const BOOKING_STEP_B_COPY = Object.fromEntries(
  Object.entries(rows).map(([locale, values]) => {
    if (values.length !== keys.length) {
      throw new Error(`Incomplete Step B copy for ${locale}: got ${values.length}, expected ${keys.length}`);
    }
    return [locale, Object.freeze(Object.fromEntries(keys.map((key, index) => [key, values[index]])))];
  })
);

export function getBookingStepBCopy(locale) {
  return BOOKING_STEP_B_COPY[locale] || BOOKING_STEP_B_COPY.en;
}
