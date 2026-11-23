// 16-language UI copy for ELIO+ Guide Live Trip Room (/profile & /trip).
// Covers all 16 supported locales without bloating i18n/source.json.

const keys = [
  'eyebrow', 'title', 'subtitle', 'openFullRoom', 'backToProfile',
  'signInEyebrow', 'signInTitle', 'signInBody', 'signInCta',
  'statActive', 'statAction', 'statConfirmed', 'statPlans',
  'askElio', 'chatTelegram', 'chatWhatsApp', 'refresh',
  'shieldActiveEyebrow', 'shieldActiveTitle', 'shieldActiveBody', 'directLineCta', 'directLinePending',
  'quotesHeading', 'quotesSub', 'quotesEmpty',
  'statusOpen', 'statusSigned', 'statusPaid', 'statusExpired', 'statusCancelled',
  'ctaSignAndPay', 'ctaCompletePay', 'ctaOpenPass', 'supplierLabel', 'datesLabel',
  'plansHeading', 'plansSub', 'guestsLabel', 'plansEmptyTitle', 'plansEmptyBody',
  'browseYachts', 'browseCars', 'browseDining', 'browseExperiences',
  'weatherHeading', 'weatherSource', 'rainChance', 'windLabel',
  'loading', 'error'
];

const rows = {
  en: [
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Your Miami Trip Room', 'Confirmed reservation passes, pending ESIGN quotes, live itinerary status, and Miami weather in one private workspace.', 'Open Full Trip Room', 'Back to ELIO+ Desk',
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Sign in to open your Live Trip Room', 'Access confirmed reservation passes, pending ESIGN checkout links, multi-stop itineraries, and unlocked 24/7 support.', 'Sign in to Trip Room',
    'Active Requests', 'Awaiting Action', 'Confirmed Passes', 'Trip Plans',
    'Ask ELIO+ Guide', 'Specialist on Telegram', 'Specialist on WhatsApp', 'Refresh',
    'ELIO+ SHIELD & CARE 24/7 · ACTIVE', 'Protected Reservation Support Unlocked', 'Your verified paid reservation activates our 100% contractual fulfillment guarantee and priority 24/7 live specialist care.', 'Call 24/7 Direct Line', 'Direct 24/7 phone line is being provisioned — use priority Telegram or WhatsApp right here.',
    'Verified Quotes & Confirmed Passes', 'Sign your electronic agreement and complete payment, or open your active pass for handover.', 'No verified checkout quotes have been issued yet. Once our team confirms availability with a supplier, your private checkout link appears here.',
    'Awaiting ESIGN', 'Ready to Pay', 'Confirmed Pass', 'Expired', 'Cancelled',
    'Sign ESIGN & Pay', 'Complete Payment', 'Open Confirmed Pass', 'Supplier', 'Dates',
    'Live Itinerary & Trip Plans', 'Multi-stop plans and real-time request progress across Miami.', 'guests', 'No trip plan submitted yet', 'Explore yachts, exotic cars, fine dining, or ask ELIO to build a multi-stop Miami itinerary.',
    'Yachts', 'Exotic Cars', 'Dining & Nightlife', 'Experiences',
    'Miami 5-Day Conditions', 'Official NOAA / NWS (KMIA)', 'Rain', 'Wind',
    'Loading your Live Trip Room…', 'Unable to load Live Trip Room right now.'
  ],
  ru: [
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Комната вашей поездки в Майами', 'Подтверждённые пропуска, счета на подпись ESIGN, живой статус маршрута и прогноз погоды Майами в одном приватном пространстве.', 'Открыть полную комнату', 'Назад в ELIO+ Desk',
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Войдите, чтобы открыть Live Trip Room', 'Доступ к подтверждённым пропускам, ссылкам ESIGN-оплаты, маршрутам и закрытой поддержке 24/7 после оплаты.', 'Войти в Trip Room',
    'Активные заявки', 'Ждут действия', 'Подтверждённые пропуска', 'Планы поездок',
    'Спросить ELIO+ Guide', 'Специалист в Telegram', 'Специалист в WhatsApp', 'Обновить',
    'ELIO+ SHIELD & CARE 24/7 · АКТИВНО', 'Защита подтверждённой брони активна', 'Подтверждённая оплата активировала нашу договорную 100% гарантию исполнения и приоритетную живую поддержку 24/7.', 'Позвонить на линию 24/7', 'Прямая линия 24/7 подключается — используйте приоритетный Telegram или WhatsApp ниже.',
    'Счета на оплату и подтверждённые пропуска', 'Подпишите электронное соглашение и завершите оплату, либо откройте активный пропуск для передачи услуги.', 'Подтверждённых счетов пока нет. Как только команда согласует наличие с поставщиком, приватная ссылка на оплату появится здесь.',
    'Ждёт подписи ESIGN', 'Готово к оплате', 'Подтверждённый пропуск', 'Истёк', 'Отменён',
    'Подписать ESIGN и оплатить', 'Завершить оплату', 'Открыть пропуск', 'Поставщик', 'Даты',
    'Живой маршрут и планы поездок', 'Статус комплексных планов и бронирований в Майами в реальном времени.', 'гостей', 'План поездки ещё не создан', 'Выберите яхту, спорткар, ресторан или попросите ELIO собрать готовый маршрут по Майами.',
    'Яхты', 'Автомобили', 'Рестораны и клубы', 'Впечатления',
    'Погода и условия в Майами (5 дней)', 'Официальный прогноз NOAA / NWS (KMIA)', 'Осадки', 'Ветер',
    'Загрузка Live Trip Room…', 'Не удалось загрузить Live Trip Room.'
  ],
  es: [
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Tu Sala de Viaje en Miami', 'Pases confirmados, cotizaciones ESIGN pendientes, itinerario en vivo y clima de Miami en un solo espacio privado.', 'Abrir Sala Completa', 'Volver a ELIO+ Desk',
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Inicia sesión para abrir tu Live Trip Room', 'Accede a pases confirmados, enlaces ESIGN, itinerarios y soporte 24/7 desbloqueado tras el pago.', 'Entrar a Trip Room',
    'Solicitudes Activas', 'Acción Requerida', 'Pases Confirmados', 'Planes de Viaje',
    'Preguntar a ELIO+ Guide', 'Especialista en Telegram', 'Especialista en WhatsApp', 'Actualizar',
    'ELIO+ SHIELD & CARE 24/7 · ACTIVO', 'Soporte de Reserva Confirmada Activo', 'Tu pago verificado activa nuestra garantía contractual 100% de cumplimiento y atención prioritaria 24/7.', 'Llamar Línea Directa 24/7', 'La línea telefónica directa se está activando — usa Telegram o WhatsApp prioritario abajo.',
    'Cotizaciones Verificadas y Pases', 'Firma tu acuerdo electrónico y paga, o abre tu pase confirmado para la entrega.', 'Aún no hay cotizaciones emitidas. Cuando el equipo confirme disponibilidad, tu enlace privado aparecerá aquí.',
    'Pendiente ESIGN', 'Listo para Pagar', 'Pase Confirmado', 'Expirado', 'Cancelado',
    'Firmar ESIGN y Pagar', 'Completar Pago', 'Abrir Pase Confirmado', 'Proveedor', 'Fechas',
    'Itinerario en Vivo y Planes', 'Seguimiento en tiempo real de tus planes y reservas en Miami.', 'huéspedes', 'Aún no hay un plan enviado', 'Explora yates, autos exóticos, gastronomía o pide a ELIO un itinerario a medida.',
    'Yates', 'Autos Exóticos', 'Gastronomía y Noche', 'Experiencias',
    'Condiciones en Miami (5 Días)', 'Oficial NOAA / NWS (KMIA)', 'Lluvia', 'Viento',
    'Cargando tu Live Trip Room…', 'No se pudo cargar Live Trip Room.'
  ],
  he: [
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'חדר הטיול החי שלכם במיאמי', 'אישורי הזמנה פעילים, הצעות ממתינות לחתימת ESIGN, מסלול חי ותחזית מזג האוויר במיאמי במקום פרטי אחד.', 'פתח חדר טיול מלא', 'חזרה אל ELIO+ Desk',
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'התחברו לפתיחת Live Trip Room', 'גישה לאישורים מאומתים, קישורי ESIGN, מסלולים ותמיכת 24/7 שנפתחת לאחר תשלום.', 'כניסה אל Trip Room',
    'בקשות פעילות', 'ממתין לפעולה', 'אישורים פעילים', 'תוכניות טיול',
    'שאלו את ELIO+ Guide', 'מומחה ב-Telegram', 'מומחה ב-WhatsApp', 'רענון',
    'ELIO+ SHIELD & CARE 24/7 · פעיל', 'הגנת הזמנה מאומתת פעילה', 'התשלום המאומת הפעיל את ערבות הביצוע החוזית של 100% ואת התמיכה האנושית 24/7.', 'התקשרו לקו 24/7', 'הקו הישיר 24/7 בהפעלה — השתמשו ב-Telegram או WhatsApp בעדיפות למטה.',
    'הצעות מאומתות ואישורי הזמנה', 'חתמו על ההסכם האלקטרוני והשלימו תשלום, או פתחו אישור פעיל.', 'טרם הונפקו הצעות תשלום. ברגע שהצוות יאשר זמינות מול הספק, הקישור הפרטי יופיע כאן.',
    'ממתין ל-ESIGN', 'מוכן לתשלום', 'אישור פעיל', 'פג תוקף', 'בוטל',
    'חתימת ESIGN ותשלום', 'השלמת תשלום', 'פתיחת אישור הזמנה', 'ספק', 'תאריכים',
    'מסלול חי ותוכניות טיול', 'מעקב בזמן אמת אחר התוכניות והבקשות שלכם במיאמי.', 'אורחים', 'טרם נשלחה תוכנית טיול', 'עיינו ביאכטות, רכבי יוקרה, מסעדות או בקשו מ-ELIO לבנות מסלול.',
    'יאכטות', 'רכבי יוקרה', 'מסעדות וחיי לילה', 'חוויות',
    'תנאי מזג אוויר במיאמי (5 ימים)', 'תחזית NOAA / NWS (KMIA)', 'גשם', 'רוח',
    'טוען את Live Trip Room…', 'לא ניתן לטעון את Live Trip Room כרגע.'
  ],
  zh: [
    'ELIO+ GUIDE · LIVE TRIP ROOM', '您的迈阿密实时行程室', '在一个私密空间内管理已确认通行证、待签 ESIGN 报价、实时行程进度与迈阿密天气。', '打开完整行程室', '返回 ELIO+ Desk',
    'ELIO+ GUIDE · LIVE TRIP ROOM', '登录以打开 Live Trip Room', '查看已确认通行证、ESIGN 结账链接、多站行程以及付款后解锁的 24/7 专属支持。', '登录 Trip Room',
    '进行中申请', '待处理事项', '已确认通行证', '行程计划',
    '咨询 ELIO+ Guide', 'Telegram 专员', 'WhatsApp 专员', '刷新',
    'ELIO+ SHIELD & CARE 24/7 · 已激活', '已确认预订保障已开启', '您的已确认付款已激活合同级 100% 履约保障与 24/7 优先顾问支持。', '拨打 24/7 直通电话', '24/7 直通电话正在配置中，请优先使用下方 Telegram 或 WhatsApp。',
    '认证报价与已确认通行证', '签署电子协议并完成付款，或打开已确认通行证用于交接。', '暂无已签发的认证报价。团队与供应商确认档期后，专属付款链接将显示在此处。',
    '待签 ESIGN', '待付款', '已确认通行证', '已过期', '已取消',
    '签署 ESIGN 并付款', '完成付款', '打开确认通行证', '供应商', '日期',
    '实时行程与旅行计划', '迈阿密多站行程与预订请求的实时进度。', '位宾客', '尚未提交行程计划', '浏览游艇、超跑、精选餐厅，或让 ELIO 为您定制迈阿密行程。',
    '游艇', '豪华超跑', '餐饮与夜生活', '精选体验',
    '迈阿密 5 日天气与风况', '官方 NOAA / NWS (KMIA)', '降雨', '风速',
    '正在加载 Live Trip Room…', '暂时无法加载 Live Trip Room。'
  ],
  pt: [
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Sua Sala de Viagem em Miami', 'Passes confirmados, cotações ESIGN pendentes, roteiro ao vivo e clima de Miami em um só painel privado.', 'Abrir Sala Completa', 'Voltar ao ELIO+ Desk',
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Entre para abrir sua Live Trip Room', 'Acesse passes confirmados, links ESIGN, roteiros e suporte 24/7 liberado após o pagamento.', 'Entrar na Trip Room',
    'Pedidos Ativos', 'Aguardando Ação', 'Passes Confirmados', 'Planos de Viagem',
    'Perguntar ao ELIO+ Guide', 'Especialista no Telegram', 'Especialista no WhatsApp', 'Atualizar',
    'ELIO+ SHIELD & CARE 24/7 · ATIVO', 'Suporte de Reserva Confirmada Ativo', 'Seu pagamento verificado ativa a garantia contratual 100% de entrega e atendimento prioritário 24/7.', 'Ligar para Linha 24/7', 'A linha direta 24/7 está sendo ativada — use Telegram ou WhatsApp prioritário abaixo.',
    'Cotações Verificadas e Passes', 'Assine o acordo eletrônico e conclua o pagamento, ou abra seu passe ativo.', 'Nenhuma cotação emitida ainda. Assim que confirmarmos com o fornecedor, seu link privado aparecerá aqui.',
    'Aguardando ESIGN', 'Pronto para Pagar', 'Passe Confirmado', 'Expirado', 'Cancelado',
    'Assinar ESIGN e Pagar', 'Concluir Pagamento', 'Abrir Passe Confirmado', 'Fornecedor', 'Datas',
    'Roteiro ao Vivo e Planos', 'Status em tempo real dos seus planos e solicitações em Miami.', 'hóspedes', 'Nenhum plano enviado ainda', 'Explore iates, carros exóticos, restaurantes ou peça ao ELIO um roteiro em Miami.',
    'Iates', 'Carros Exóticos', 'Gastronomia e Noite', 'Experiências',
    'Clima em Miami (5 Dias)', 'Oficial NOAA / NWS (KMIA)', 'Chuva', 'Vento',
    'Carregando sua Live Trip Room…', 'Não foi possível carregar a Live Trip Room.'
  ],
  uk: [
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Кімната вашої поїздки в Маямі', 'Підтверджені перепустки, рахунки на підпис ESIGN, живий статус маршруту та погода Маямі в одному приватному просторі.', 'Відкрити повну кімнату', 'Назад до ELIO+ Desk',
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Увійдіть, щоб відкрити Live Trip Room', 'Доступ до підтверджених перепусток, посилань ESIGN-оплати, маршрутів і підтримки 24/7 після оплати.', 'Увійти до Trip Room',
    'Активні заявки', 'Очікують дії', 'Підтверджені перепустки', 'Плани поїздок',
    'Запитати ELIO+ Guide', 'Спеціаліст у Telegram', 'Спеціаліст у WhatsApp', 'Оновити',
    'ELIO+ SHIELD & CARE 24/7 · АКТИВНО', 'Захист підтвердженої броні активний', 'Підтверджена оплата активувала договірну 100% гарантію виконання та пріоритетну підтримку 24/7.', 'Зателефонувати на лінію 24/7', 'Пряма лінія 24/7 підключається — скористайтеся пріоритетним Telegram або WhatsApp нижче.',
    'Рахунки на оплату та перепустки', 'Підпишіть електронну угоду та завершіть оплату або відкрийте активну перепустку.', 'Підтверджених рахунків ще немає. Щойно команда погодить наявність із постачальником, приватне посилання з’явиться тут.',
    'Очікує ESIGN', 'Готово до оплати', 'Підтверджена перепустка', 'Минув', 'Скасовано',
    'Підписати ESIGN і сплатити', 'Завершити оплату', 'Відкрити перепустку', 'Постачальник', 'Дати',
    'Живий маршрут і плани поїздок', 'Статус комплексних планів і бронювань у Маямі в реальному часі.', 'гостей', 'План поїздки ще не створено', 'Перегляньте яхти, спорткари, ресторани або попросіть ELIO скласти маршрут по Маямі.',
    'Яхти', 'Автомобілі', 'Ресторани та клуби', 'Враження',
    'Погода й умови в Маямі (5 днів)', 'Офіційний прогноз NOAA / NWS (KMIA)', 'Опади', 'Вітер',
    'Завантаження Live Trip Room…', 'Не вдалося завантажити Live Trip Room.'
  ],
  ja: [
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'マイアミ ライブトリップルーム', '確定パス、ESIGN 署名待ち見積、リアルタイム旅程、マイアミ気象情報をひとつの専用空間で確認できます。', 'フル画面で開く', 'ELIO+ Desk に戻る',
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'サインインして Live Trip Room を開く', '確定予約パス、ESIGN 決済リンク、旅程、決済後に開示される24時間専用サポートへアクセスできます。', 'Trip Room にサインイン',
    '進行中リクエスト', '要アクション', '確定パス', '旅程プラン',
    'ELIO+ Guide に相談', 'Telegram 担当者', 'WhatsApp 担当者', '更新',
    'ELIO+ SHIELD & CARE 24/7 · 有効', '確定予約サポートが有効です', '認証済み決済により、契約上の100%履行保証および24時間優先専任サポートが有効化されました。', '24時間直通ラインに発信', '専用直通回線を準備中です。下の優先 Telegram または WhatsApp をご利用ください。',
    '認証済み見積・確定パス', '電子契約に署名して決済を完了するか、確定済みパスを開いてください。', '発行済みの見積はまだありません。サプライヤー確認後、専用決済リンクがここに表示されます。',
    'ESIGN 署名待ち', '決済可能', '確定パス', '期限切れ', 'キャンセル済み',
    'ESIGN 署名して支払う', '支払いを完了', '確定パスを開く', 'サプライヤー', '日程',
    'リアルタイム旅程とプラン', 'マイアミでのプランと予約リクエストの最新状況。', '名', '旅程プランはまだありません', 'ヨット、スーパーカー、レストランをご覧いただくか、ELIO に旅程作成をご依頼ください。',
    'ヨット', 'スーパーカー', 'ダイニング＆ナイトライフ', '体験ツアー',
    'マイアミ 5日間コンディション', '公式 NOAA / NWS (KMIA)', '降水確率', '風速',
    'Live Trip Room を読み込み中…', 'Live Trip Room を読み込めませんでした。'
  ],
  ko: [
    'ELIO+ GUIDE · LIVE TRIP ROOM', '마이애미 라이브 트립 룸', '확정 예약 패스, ESIGN 대기 견적, 실시간 일정, 마이애미 날씨를 하나의 프라이빗 공간에서 확인하세요.', '전체 트립 룸 열기', 'ELIO+ Desk로 돌아가기',
    'ELIO+ GUIDE · LIVE TRIP ROOM', '로그인하여 Live Trip Room 열기', '확정 패스, ESIGN 결제 링크, 일정 및 결제 후 열리는 24/7 전담 지원에 접근하세요.', 'Trip Room 로그인',
    '진행 중 요청', '조치 필요', '확정 패스', '여행 플랜',
    'ELIO+ Guide 문의', 'Telegram 담당자', 'WhatsApp 담당자', '새로고침',
    'ELIO+ SHIELD & CARE 24/7 · 활성', '확정 예약 보호가 활성화됨', '인증된 결제로 계약상 100% 이행 보장 및 24/7 우선 전담 지원이 활성화되었습니다.', '24/7 직통 전화 걸기', '직통 전화 회선을 준비 중입니다. 아래 우선 Telegram 또는 WhatsApp을 이용해 주세요.',
    '인증 견적 및 확정 패스', '전자 계약 서명 후 결제를 완료하거나 확정된 패스를 여세요.', '발급된 인증 견적이 아직 없습니다. 공급업체 확인 후 프라이빗 결제 링크가 여기에 표시됩니다.',
    'ESIGN 대기', '결제 가능', '확정 패스', '만료됨', '취소됨',
    'ESIGN 서명 및 결제', '결제 완료하기', '확정 패스 열기', '공급업체', '일정',
    '실시간 일정 및 여행 플랜', '마이애미 플랜 및 예약 요청 진행 현황.', '명', '아직 제출된 여행 플랜이 없습니다', '요트, 슈퍼카, 다이닝을 둘러보거나 ELIO에게 맞춤 일정을 요청해 보세요.',
    '요트', '슈퍼카', '다이닝 & 나이트라이프', '익스피리언스',
    '마이애미 5일 기상 조건', '공식 NOAA / NWS (KMIA)', '강수', '바람',
    'Live Trip Room 불러오는 중…', 'Live Trip Room을 불러올 수 없습니다.'
  ],
  de: [
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Ihr Miami Live Trip Room', 'Bestätigte Reservierungspässe, offene ESIGN-Angebote, Live-Reiseplan und Miami-Wetter an einem privaten Ort.', 'Vollansicht öffnen', 'Zurück zum ELIO+ Desk',
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Anmelden für Ihren Live Trip Room', 'Zugriff auf bestätigte Pässe, ESIGN-Zahlungslinks, Reisepläne und nach Zahlung freigeschalteten 24/7-Support.', 'Zum Trip Room anmelden',
    'Aktive Anfragen', 'Aktion erforderlich', 'Bestätigte Pässe', 'Reisepläne',
    'ELIO+ Guide fragen', 'Spezialist auf Telegram', 'Spezialist auf WhatsApp', 'Aktualisieren',
    'ELIO+ SHIELD & CARE 24/7 · AKTIV', 'Geschützter Buchungssupport aktiv', 'Ihre verifizierte Zahlung aktiviert unsere vertragliche 100% Erfüllungsgarantie und 24/7-Prioritätsbetreuung.', '24/7-Direktleitung anrufen', 'Die direkte 24/7-Leitung wird eingerichtet — nutzen Sie vorrangig Telegram oder WhatsApp unten.',
    'Verifizierte Angebote & Pässe', 'Elektronisch signieren und zahlen oder Ihren aktiven Reservierungspass öffnen.', 'Noch keine verifizierten Zahlungsangebote. Sobald unser Team die Verfügbarkeit bestätigt, erscheint Ihr privater Link hier.',
    'ESIGN ausstehend', 'Zahlungsbereit', 'Bestätigter Pass', 'Abgelaufen', 'Storniert',
    'ESIGN signieren & zahlen', 'Zahlung abschließen', 'Bestätigten Pass öffnen', 'Anbieter', 'Daten',
    'Live-Reiseplan & Pläne', 'Echtzeit-Status Ihrer mehrteiligen Pläne und Buchungsanfragen in Miami.', 'Gäste', 'Noch kein Reiseplan erstellt', 'Entdecken Sie Yachten, Sportwagen, Restaurants oder lassen Sie ELIO einen Miami-Plan erstellen.',
    'Yachten', 'Sportwagen', 'Dining & Nightlife', 'Erlebnisse',
    'Miami 5-Tage-Wetter', 'Offiziell NOAA / NWS (KMIA)', 'Regen', 'Wind',
    'Live Trip Room wird geladen…', 'Live Trip Room konnte nicht geladen werden.'
  ],
  ar: [
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'غرفة رحلتك المباشرة في ميامي', 'تصاريح الحجز المؤكدة، عروض ESIGN المعلقة، خط السير المباشر وطقس ميامي في مساحة خاصة واحدة.', 'فتح الغرفة الكاملة', 'العودة إلى ELIO+ Desk',
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'سجّل الدخول لفتح Live Trip Room', 'الوصول إلى التصاريح المؤكدة، روابط دفع ESIGN، خطط الرحلة ودعم 24/7 المفتوح بعد الدفع.', 'الدخول إلى Trip Room',
    'الطلبات النشطة', 'بانتظار إجراء', 'التصاريح المؤكدة', 'خطط الرحلات',
    'اسأل ELIO+ Guide', 'مختص عبر Telegram', 'مختص عبر WhatsApp', 'تحديث',
    'ELIO+ SHIELD & CARE 24/7 · نشط', 'دعم الحجز المحمي مُفعّل', 'دفعك الموثق فعّل ضمان التنفيذ التعاقدي بنسبة 100% ورعاية المختصين على مدار الساعة 24/7.', 'الاتصال بالخط المباشر 24/7', 'يجري تفعيل الخط المباشر 24/7 — استخدم Telegram أو WhatsApp ذي الأولوية أدناه.',
    'عروض الدفع الموثقة والتصاريح', 'وقّع الاتفاقية الإلكترونية وأكمل الدفع، أو افتح تصريحك المؤكد عند التسليم.', 'لا توجد عروض دفع مُصدرة بعد. فور تأكيد التوفر مع المزود سيظهر رابطك الخاص هنا.',
    'بانتظار ESIGN', 'جاهز للدفع', 'تصريح مؤكد', 'منتهي الصلاحية', 'ملغى',
    'توقيع ESIGN والدفع', 'إكمال الدفع', 'فتح التصريح المؤكد', 'المزود', 'التواريخ',
    'خط السير المباشر والخطط', 'متابعة فورية لخططك وطلباتك في ميامي.', 'ضيوف', 'لم تُرسل خطة رحلة بعد', 'تصفح اليخوت والسيارات الفاخرة والمطاعم أو اطلب من ELIO إعداد برنامج رحلة.',
    'اليخوت', 'سيارات فاخرة', 'مطاعم وحياة ليلية', 'تجارب',
    'أحوال ميامي لـ 5 أيام', 'توقعات NOAA / NWS الرسمية (KMIA)', 'أمطار', 'رياح',
    'جاري تحميل Live Trip Room…', 'تعذر تحميل Live Trip Room حالياً.'
  ],
  tr: [
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Miami Canlı Seyahat Odanız', 'Onaylı rezervasyon kartları, bekleyen ESIGN teklifleri, canlı program ve Miami hava durumu tek özel alanda.', 'Tam Odayı Aç', 'ELIO+ Desk’e Dön',
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Live Trip Room için giriş yapın', 'Onaylı kartlara, ESIGN ödeme bağlantılarına, programlara ve ödeme sonrası açılan 7/24 desteğe erişin.', 'Trip Room’a Giriş Yap',
    'Aktif Talepler', 'İşlem Bekleyen', 'Onaylı Kartlar', 'Seyahat Planları',
    'ELIO+ Guide’a Sor', 'Telegram Uzmanı', 'WhatsApp Uzmanı', 'Yenile',
    'ELIO+ SHIELD & CARE 24/7 · AKTİF', 'Korumalı Rezervasyon Desteği Açık', 'Doğrulanmış ödemeniz %100 sözleşmesel ifa garantimizi ve 7/24 öncelikli uzman desteğini etkinleştirdi.', '7/24 Direkt Hattı Ara', 'Direkt 7/24 hat hazırlanıyor — aşağıdan öncelikli Telegram veya WhatsApp kullanın.',
    'Doğrulanmış Teklifler ve Kartlar', 'Elektronik sözleşmeyi imzalayıp ödeyin veya teslim için onaylı kartınızı açın.', 'Henüz oluşturulmuş ödeme teklifi yok. Ekibimiz müsaitliği onayladığında özel bağlantınız burada görünür.',
    'ESIGN Bekliyor', 'Ödemeye Hazır', 'Onaylı Kart', 'Süresi Doldu', 'İptal Edildi',
    'ESIGN İmzala ve Öde', 'Ödemeyi Tamamla', 'Onaylı Kartı Aç', 'Sağlayıcı', 'Tarihler',
    'Canlı Program ve Planlar', 'Miami planlarınızın ve rezervasyon taleplerinizin anlık durumu.', 'misafir', 'Henüz seyahat planı yok', 'Yatları, egzotik araçları, restoranları keşfedin veya ELIO’dan Miami programı isteyin.',
    'Yatlar', 'Egzotik Araçlar', 'Restoran ve Gece Hayatı', 'Deneyimler',
    'Miami 5 Günlük Hava Durumu', 'Resmi NOAA / NWS (KMIA)', 'Yağış', 'Rüzgar',
    'Live Trip Room yükleniyor…', 'Live Trip Room şu anda yüklenemedi.'
  ],
  fa: [
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'اتاق زنده سفر شما در میامی', 'کارت‌های رزرو تأییدشده، پیشنهادهای در انتظار امضای ESIGN، برنامه زنده و آب‌وهوای میامی در یک فضای خصوصی.', 'باز کردن اتاق کامل', 'بازگشت به ELIO+ Desk',
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'برای باز کردن Live Trip Room وارد شوید', 'دسترسی به کارت‌های تأییدشده، لینک‌های پرداخت ESIGN، برنامه‌های سفر و پشتیبانی ۲۴/۷ پس از پرداخت.', 'ورود به Trip Room',
    'درخواست‌های فعال', 'نیازمند اقدام', 'کارت‌های تأییدشده', 'برنامه‌های سفر',
    'پرسش از ELIO+ Guide', 'متخصص در Telegram', 'متخصص در WhatsApp', 'به‌روزرسانی',
    'ELIO+ SHIELD & CARE 24/7 · فعال', 'پشتیبانی رزرو تأییدشده فعال شد', 'پرداخت تأییدشده شما تضمین قراردادی ۱۰۰٪ اجرا و پشتیبانی اولویت‌دار ۲۴/۷ را فعال کرده است.', 'تماس با خط مستقیم ۲۴/۷', 'خط مستقیم ۲۴/۷ در حال فعال‌سازی است — از Telegram یا WhatsApp اولویت‌دار زیر استفاده کنید.',
    'پیشنهادهای تأییدشده و کارت‌ها', 'توافق‌نامه الکترونیکی را امضا و پرداخت کنید یا کارت تأییدشده خود را باز کنید.', 'هنوز پیشنهادی صادر نشده است. پس از تأیید موجودی با ارائه‌دهنده، لینک خصوصی شما اینجا نمایش داده می‌شود.',
    'در انتظار ESIGN', 'آماده پرداخت', 'کارت تأییدشده', 'منقضی', 'لغوشده',
    'امضای ESIGN و پرداخت', 'تکمیل پرداخت', 'باز کردن کارت تأییدشده', 'ارائه‌دهنده', 'تاریخ‌ها',
    'برنامه زنده و طرح‌های سفر', 'وضعیت لحظه‌ای برنامه‌ها و درخواست‌های شما در میامی.', 'مهمان', 'هنوز برنامه سفری ثبت نشده است', 'قایق‌های تفریحی، خودروهای لوکس و رستوران‌ها را ببینید یا از ELIO برنامه سفر بخواهید.',
    'قایق‌ها', 'خودروهای لوکس', 'رستوران و شب‌زنده‌داری', 'تجربه‌ها',
    'شرایط ۵ روزه میامی', 'پیش‌بینی رسمی NOAA / NWS (KMIA)', 'بارش', 'باد',
    'در حال بارگذاری Live Trip Room…', 'بارگذاری Live Trip Room ممکن نشد.'
  ],
  it: [
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'La Tua Live Trip Room a Miami', 'Pass confermati, preventivi ESIGN in attesa, itinerario live e meteo Miami in un unico spazio privato.', 'Apri Trip Room Completa', 'Torna a ELIO+ Desk',
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Accedi per aprire la tua Live Trip Room', 'Accedi a pass confermati, link ESIGN, itinerari e supporto 24/7 sbloccato dopo il pagamento.', 'Accedi alla Trip Room',
    'Richieste Attive', 'Azione Richiesta', 'Pass Confermati', 'Piani di Viaggio',
    'Chiedi a ELIO+ Guide', 'Specialista su Telegram', 'Specialista su WhatsApp', 'Aggiorna',
    'ELIO+ SHIELD & CARE 24/7 · ATTIVO', 'Supporto Prenotazione Protetta Attivo', 'Il pagamento verificato attiva la garanzia contrattuale 100% di esecuzione e l’assistenza prioritaria 24/7.', 'Chiama Linea Diretta 24/7', 'La linea telefonica diretta è in attivazione — usa Telegram o WhatsApp prioritario qui sotto.',
    'Preventivi Verificati e Pass', 'Firma l’accordo elettronico e paga, oppure apri il pass confermato per la consegna.', 'Nessun preventivo emesso al momento. Appena il team conferma la disponibilità, il link privato apparirà qui.',
    'In attesa ESIGN', 'Pronto al Pagamento', 'Pass Confermato', 'Scaduto', 'Annullato',
    'Firma ESIGN e Paga', 'Completa Pagamento', 'Apri Pass Confermato', 'Fornitore', 'Date',
    'Itinerario Live e Piani', 'Stato in tempo reale dei tuoi piani e richieste a Miami.', 'ospiti', 'Nessun piano di viaggio ancora', 'Esplora yacht, supercar, ristoranti o chiedi a ELIO un itinerario su misura a Miami.',
    'Yacht', 'Supercar', 'Ristoranti e Nightlife', 'Esperienze',
    'Condizioni Miami (5 Giorni)', 'Ufficiale NOAA / NWS (KMIA)', 'Pioggia', 'Vento',
    'Caricamento Live Trip Room…', 'Impossibile caricare la Live Trip Room.'
  ],
  fr: [
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Votre Live Trip Room à Miami', 'Pass confirmés, devis ESIGN en attente, itinéraire en direct et météo Miami dans un seul espace privé.', 'Ouvrir en Plein Écran', 'Retour à ELIO+ Desk',
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Connectez-vous pour ouvrir votre Live Trip Room', 'Accédez à vos pass confirmés, liens ESIGN, itinéraires et assistance 24/7 débloquée après paiement.', 'Accéder à la Trip Room',
    'Demandes Actives', 'Action Requise', 'Pass Confirmés', 'Plans de Voyage',
    'Demander à ELIO+ Guide', 'Spécialiste sur Telegram', 'Spécialiste sur WhatsApp', 'Actualiser',
    'ELIO+ SHIELD & CARE 24/7 · ACTIF', 'Assistance Réservation Protégée Active', 'Votre paiement vérifié active notre garantie contractuelle 100% d’exécution et l’assistance prioritaire 24/7.', 'Appeler la Ligne Directe 24/7', 'La ligne téléphonique directe est en activation — utilisez Telegram ou WhatsApp prioritaire ci-dessous.',
    'Devis Vérifiés & Pass Confirmés', 'Signez votre accord électronique et réglez, ou ouvrez votre pass actif pour la remise.', 'Aucun devis vérifié émis pour l’instant. Dès confirmation auprès du prestataire, votre lien privé apparaîtra ici.',
    'Signature ESIGN requise', 'Prêt à Régler', 'Pass Confirmé', 'Expiré', 'Annulé',
    'Signer ESIGN & Payer', 'Finaliser le Paiement', 'Ouvrir le Pass Confirmé', 'Prestataire', 'Dates',
    'Itinéraire Live & Plans', 'Suivi en temps réel de vos plans et demandes à Miami.', 'invités', 'Aucun plan de voyage soumis', 'Découvrez yachts, supercars, tables ou demandez à ELIO un itinéraire sur mesure à Miami.',
    'Yachts', 'Voitures d’Exception', 'Tables & Nightlife', 'Expériences',
    'Météo Miami (5 Jours)', 'Officiel NOAA / NWS (KMIA)', 'Pluie', 'Vent',
    'Chargement de votre Live Trip Room…', 'Impossible de charger la Live Trip Room.'
  ],
  pl: [
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Twój Pokój Podróży w Miami', 'Potwierdzone przepustki, oferty ESIGN do podpisu, plan podróży na żywo i pogoda Miami w jednym prywatnym miejscu.', 'Otwórz Pełny Pokój', 'Wróć do ELIO+ Desk',
    'ELIO+ GUIDE · LIVE TRIP ROOM', 'Zaloguj się, aby otworzyć Live Trip Room', 'Dostęp do potwierdzonych przepustek, linków ESIGN, planów podróży i wsparcia 24/7 po opłaceniu.', 'Wejdź do Trip Room',
    'Aktywne Zapytania', 'Wymaga Działania', 'Potwierdzone Przepustki', 'Plany Podróży',
    'Zapytaj ELIO+ Guide', 'Specjalista na Telegram', 'Specjalista na WhatsApp', 'Odśwież',
    'ELIO+ SHIELD & CARE 24/7 · AKTYWNE', 'Ochrona Potwierdzonej Rezerwacji Aktywna', 'Zweryfikowana płatność aktywowała umowną 100% gwarancję realizacji i priorytetowe wsparcie 24/7.', 'Zadzwoń na Linię 24/7', 'Bezpośrednia linia 24/7 jest uruchamiana — skorzystaj z priorytetowego Telegrama lub WhatsApp poniżej.',
    'Zweryfikowane Oferty i Przepustki', 'Podpisz umowę elektroniczną i opłać, lub otwórz aktywną przepustkę przy odbiorze.', 'Brak wystawionych ofert płatności. Gdy zespół potwierdzi dostępność u dostawcy, prywatny link pojawi się tutaj.',
    'Oczekuje ESIGN', 'Gotowe do Płatności', 'Potwierdzona Przepustka', 'Wygasła', 'Anulowana',
    'Podpisz ESIGN i Zapłać', 'Dokończ Płatność', 'Otwórz Przepustkę', 'Dostawca', 'Termin',
    'Plan Podróży na Żywo', 'Status Twoich planów i rezerwacji w Miami w czasie rzeczywistym.', 'gości', 'Brak przesłanego planu podróży', 'Przeglądaj jachty, auta egzotyczne, restauracje lub poproś ELIO o plan pobytu w Miami.',
    'Jachty', 'Auta Egzotyczne', 'Restauracje i Kluby', 'Atrakcje',
    'Warunki w Miami (5 Dni)', 'Oficjalne NOAA / NWS (KMIA)', 'Deszcz', 'Wiatr',
    'Ładowanie Live Trip Room…', 'Nie udało się załadować Live Trip Room.'
  ]
};

export const TRIP_ROOM_COPY = Object.fromEntries(
  Object.entries(rows).map(([locale, values]) => {
    if (values.length !== keys.length) {
      throw new Error(`Incomplete trip room copy for ${locale}: got ${values.length}, expected ${keys.length}`);
    }
    return [locale, Object.freeze(Object.fromEntries(keys.map((key, index) => [key, values[index]])))];
  })
);

export function getTripRoomCopy(locale) {
  return TRIP_ROOM_COPY[locale] || TRIP_ROOM_COPY.en;
}
