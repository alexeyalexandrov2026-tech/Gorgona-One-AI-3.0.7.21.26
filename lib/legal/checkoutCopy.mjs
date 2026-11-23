// 16-language UI copy for verified checkout (/pay/[token]), clickwrap consent
// in BookingForm, legal pages (/terms, /partner-agreement), and Admin Quote Builder.
// Matches the 16 locales in lib/languages.js without bloating i18n/source.json.

const keys = [
  // Clickwrap consent in BookingForm
  'consentPrefix', 'termsLink', 'consentAnd', 'privacyLink', 'consentSuffix', 'consentRequired',
  // Legal pages chrome
  'effectiveLabel', 'versionLabel', 'entityLabel', 'englishLegalNote', 'backHome', 'contactLabel',
  // /pay/[token] header & statuses
  'payEyebrow', 'referenceLabel', 'statusOpen', 'statusSigned', 'statusPaid', 'statusExpired', 'statusCancelled',
  'loadingQuote', 'notFoundTitle', 'notFoundBody', 'expiredNotice', 'cancelledNotice', 'paymentCancelledBanner',
  // Quote breakdown
  'quoteSummaryTitle', 'supplierLabel', 'datesLabel', 'clientLabel', 'cancellationLabel', 'notesLabel', 'totalLabel', 'validUntilLabel',
  // Shield card
  'shieldEyebrow', 'shieldTitle', 'shieldP1', 'shieldP2', 'shieldP3', 'shieldLegalNote',
  // Step 1 ESIGN
  'step1Eyebrow', 'step1Title', 'step1Subtitle', 'checkAgency', 'checkShield', 'fullNameLabel', 'fullNamePlaceholder',
  'signButton', 'signingButton', 'signErrorMissing', 'signErrorFailed', 'signedBadge', 'signedByLabel', 'signedAtLabel', 'hashLabel',
  // Step 2 Payment
  'step2Eyebrow', 'step2Title', 'step2Locked', 'payCardButton', 'payPayPalButton', 'redirectingPayment', 'capturingPayPal',
  'providerPendingConfig', 'paymentError', 'chatTitle', 'chatTelegram', 'chatWhatsApp',
  // Confirmed Reservation Pass
  'passEyebrow', 'passTitle', 'passSubtitle', 'paidAtLabel', 'paymentMethodLabel', 'receiptLabel', 'shieldActiveStamp',
  'directLineTitle', 'directLineSubtitle', 'directLineCallCta', 'directLinePending', 'printPassButton',
  // Admin Quote Builder
  'adminHeading', 'adminSub', 'adminEmpty', 'adminNewButton', 'adminHideForm', 'adminSupplier', 'adminAmountUsd',
  'adminDates', 'adminCancelPolicy', 'adminNotes', 'adminExpiresHours', 'adminCreateButton', 'adminCreating',
  'adminCopyLink', 'adminCopied', 'adminOpenLink', 'adminCancelQuote', 'adminSignedTag', 'adminPaidTag', 'adminError', 'adminProviderStatus'
];

const rows = {
  en: [
    'I agree to the', 'Terms of Service', 'and', 'Privacy Policy', 'and understand that requests are confirmed manually before any charge.', 'Please accept the Terms of Service and Privacy Policy before submitting.',
    'Effective', 'Version', 'Operator', 'Binding legal clauses below are published in English under Florida law.', 'Back to MIAMI ELIO', 'Legal inquiries',
    'Verified Reservation Checkout', 'Reference', 'Awaiting ESIGN', 'Agreement Signed', 'Confirmed Pass', 'Quote Expired', 'Quote Cancelled',
    'Loading verified quote…', 'Checkout link unavailable', 'This payment link is invalid or no longer active. Contact our specialist team in chat if you need a fresh quote.', 'This quote has expired. Ask your ELIO+ Guide specialist in chat for an updated checkout link.', 'This quote has been cancelled by MIAMI ELIO.', 'Payment was cancelled before completion. Your signed agreement remains ready below.',
    'Confirmed Quote Details', 'Operating Supplier', 'Service Dates', 'Guest', 'Cancellation Policy', 'Specialist Notes', 'Total Due (USD)', 'Valid Until',
    'ELIO+ SHIELD & CARE 24/7', 'Included With Verified Checkout', '100% Contractual Fulfillment & Replacement Guarantee if a confirmed supplier fails to deliver.', 'Zero platform markup over verified supplier rates, with 3DS2 / PayPal buyer protection.', '24/7 live specialist care — private direct phone line unlocks immediately after payment.', 'Contractual fulfillment guarantee by MIAMI ELIO — not an insurance policy (Fla. Stat. § 626.9541).',
    'STEP 01 · ELECTRONIC AGREEMENT', 'Review & Sign Before Payment', 'Payment methods unlock only after you sign the electronic reservation agreement below.', 'I acknowledge MIAMI ELIO acts as Limited Payment Collection Agent and that operating, safety, deposit, and accident liability belong strictly to the named supplier and guest.', 'I accept the stated cancellation policy, the ELIO+ Shield & Care 24/7 contractual guarantee (understanding it is not insurance), and electronic execution under ESIGN / Florida UETA.', 'Full Legal Name (Electronic Signature)', 'Enter your full legal name as on ID',
    'Sign Agreement & Unlock Payment', 'Recording ESIGN Signature…', 'Please check both boxes and enter your full legal name.', 'Unable to record signature right now. Please refresh and try again.', 'ESIGN Executed', 'Signed By', 'Signed At', 'SHA-256 Document Hash',
    'STEP 02 · VERIFIED PAYMENT', 'Complete Reservation Payment', 'Complete Step 01 (Electronic Agreement) above to unlock card and PayPal checkout.', 'Pay by Card · Stripe 3DS2', 'Pay with PayPal Business', 'Opening secure payment gateway…', 'Confirming PayPal settlement…',
    'Online checkout gateways are being finalized. Contact your ELIO+ Guide specialist in chat below to complete settlement.', 'Payment could not be started. Please try again or message your specialist in chat.', 'Need assistance with this quote?', 'Message Specialist on Telegram', 'Message Specialist on WhatsApp',
    'CONFIRMED RESERVATION PASS', 'Reservation Confirmed & Protected', 'Your electronic agreement and verified payment are on file. Keep this pass for handover and 24/7 support.', 'Paid At', 'Payment Method', 'Settlement Reference', 'ELIO+ Shield & Care 24/7 · Active',
    'Private 24/7 Direct Phone Line (Unlocked)', 'Available exclusively to confirmed MIAMI ELIO guests throughout your booking.', 'Call 24/7 Specialist Line', 'Direct 24/7 phone line is being provisioned for your pass — use priority Telegram or WhatsApp below.', 'Print / Save Pass',
    'Verified Payment Quotes', 'Generate a private /pay checkout link with mandatory ESIGN before Stripe or PayPal payment.', 'No payment quotes created for this request yet.', 'Create Verified Quote', 'Hide Quote Form', 'Operating Supplier Name', 'Total Amount (USD)',
    'Confirmed Service Dates', 'Cancellation Policy', 'Optional Specialist Notes', 'Link Expiry (Hours)', 'Generate Checkout Link', 'Generating…',
    'Copy Checkout Link', 'Copied', 'Open', 'Cancel Quote', 'ESIGN Signed', 'Paid', 'Unable to update quotes. Check fields and try again.', 'Gateways'
  ],
  ru: [
    'Я принимаю', 'Условия использования', 'и', 'Политику конфиденциальности', 'и понимаю, что заявка подтверждается вручную без списания средств.', 'Подтвердите согласие с Условиями использования и Политикой конфиденциальности.',
    'Дата вступления в силу', 'Версия', 'Оператор', 'Обязательные юридические положения ниже опубликованы на английском языке по праву штата Флорида.', 'На главную MIAMI ELIO', 'Юридические вопросы',
    'Защищённая оплата бронирования', 'Номер', 'Ожидает подписи ESIGN', 'Соглашение подписано', 'Бронь подтверждена', 'Срок ссылки истёк', 'Счёт отменён',
    'Загрузка подтверждённого счёта…', 'Ссылка на оплату недоступна', 'Эта ссылка недействительна или уже закрыта. Напишите специалисту в чат, чтобы получить новую.', 'Срок действия этого предложения истёк. Запросите обновлённую ссылку у специалиста ELIO+ Guide в чате.', 'Этот счёт был отменён командой MIAMI ELIO.', 'Оплата была прервана. Ваша электронная подпись сохранена — вы можете завершить оплату ниже.',
    'Детали подтверждённого предложения', 'Поставщик услуги', 'Даты и детали', 'Гость', 'Условия отмены', 'Комментарий специалиста', 'К оплате (USD)', 'Действительно до',
    'ELIO+ SHIELD & CARE 24/7', 'Включено в подтверждённый заказ', 'Договорная 100% гарантия исполнения и замены, если поставщик не предоставит услугу.', 'Без скрытой наценки к тарифу поставщика; защита платежа Stripe 3DS2 / PayPal.', 'Живая поддержка 24/7 — личная прямая телефонная линия открывается сразу после оплаты.', 'Договорная гарантия исполнения MIAMI ELIO — не является страховым полисом (Fla. Stat. § 626.9541).',
    'ШАГ 01 · ЭЛЕКТРОННОЕ СОГЛАШЕНИЕ', 'Ознакомьтесь и подпишите до оплаты', 'Способы оплаты откроются сразу после подписания электронного соглашения ниже.', 'Подтверждаю, что MIAMI ELIO выступает ограниченным платёжным агентом, а эксплуатационная ответственность, депозит и риски относятся к указанному поставщику и гостю.', 'Принимаю условия отмены, договорную гарантию ELIO+ Shield & Care 24/7 (понимая, что это не страховка) и электронную подпись по ESIGN / Florida UETA.', 'Полное имя (электронная подпись)', 'Введите имя и фамилию как в документе',
    'Подписать соглашение и открыть оплату', 'Фиксируем подпись ESIGN…', 'Отметьте оба пункта и введите полное имя.', 'Не удалось сохранить подпись. Обновите страницу и повторите попытку.', 'ESIGN подписано', 'Подписант', 'Дата подписи', 'SHA-256 хэш документа',
    'ШАГ 02 · БЕЗОПАСНАЯ ОПЛАТА', 'Завершите оплату бронирования', 'Выполните Шаг 01 (Электронное соглашение), чтобы разблокировать оплату картой и PayPal.', 'Оплатить картой · Stripe 3DS2', 'Оплатить через PayPal Business', 'Переход к защищённому платёжному шлюзу…', 'Подтверждаем платёж PayPal…',
    'Онлайн-шлюзы оплаты подключаются. Напишите специалисту ELIO+ Guide в чат ниже для завершения расчёта.', 'Не удалось запустить оплату. Попробуйте ещё раз или напишите специалисту в чат.', 'Нужна помощь по этому счёту?', 'Написать специалисту в Telegram', 'Написать специалисту в WhatsApp',
    'ПОДТВЕРЖДЁННЫЙ ПРОПУСК БРОНИРОВАНИЯ', 'Бронирование подтверждено и защищено', 'Ваше электронное соглашение и оплата зафиксированы. Сохраните этот пропуск для передачи услуги и связи 24/7.', 'Оплачено', 'Способ оплаты', 'Номер транзакции', 'ELIO+ Shield & Care 24/7 · Активно',
    'Личная прямая линия 24/7 (открыта)', 'Доступна исключительно подтверждённым клиентам MIAMI ELIO на всё время бронирования.', 'Позвонить на линию 24/7', 'Прямая линия 24/7 активируется — используйте приоритетный Telegram или WhatsApp ниже.', 'Распечатать / Сохранить',
    'Счета на оплату (Verified Quotes)', 'Создайте приватную ссылку /pay с обязательной подписью ESIGN перед оплатой Stripe или PayPal.', 'По этой заявке ещё не создано счетов.', 'Создать счёт / ссылку оплаты', 'Скрыть форму', 'Название поставщика', 'Сумма (USD)',
    'Подтверждённые даты и детали', 'Условия отмены', 'Комментарий специалиста (опционально)', 'Срок действия ссылки (часов)', 'Сгенерировать ссылку оплаты', 'Создание…',
    'Скопировать ссылку', 'Скопировано', 'Открыть', 'Отменить счёт', 'ESIGN подписан', 'Оплачено', 'Не удалось сохранить счёт. Проверьте заполненные поля.', 'Платёжные шлюзы'
  ],
  es: [
    'Acepto los', 'Términos de Servicio', 'y la', 'Política de Privacidad', 'y entiendo que las solicitudes se confirman manualmente antes de cualquier cobro.', 'Acepta los Términos de Servicio y la Política de Privacidad antes de enviar.',
    'Vigente desde', 'Versión', 'Operador', 'Las cláusulas legales vinculantes se publican en inglés bajo la ley de Florida.', 'Volver a MIAMI ELIO', 'Consultas legales',
    'Pago Verificado de Reserva', 'Referencia', 'Pendiente de firma ESIGN', 'Acuerdo Firmado', 'Pase Confirmado', 'Cotización Expirada', 'Cotización Cancelada',
    'Cargando cotización verificada…', 'Enlace de pago no disponible', 'Este enlace no es válido o ya no está activo. Escribe a nuestro especialista en chat para recibir uno nuevo.', 'Esta cotización ha expirado. Solicita un nuevo enlace a tu especialista ELIO+ Guide en el chat.', 'Esta cotización fue cancelada por MIAMI ELIO.', 'El pago se canceló antes de completarse. Tu acuerdo firmado sigue listo abajo.',
    'Detalles de la Cotización Confirmada', 'Proveedor Operador', 'Fechas del Servicio', 'Huésped', 'Política de Cancelación', 'Notas del Especialista', 'Total a Pagar (USD)', 'Válido Hasta',
    'ELIO+ SHIELD & CARE 24/7', 'Incluido con Pago Verificado', 'Garantía contractual 100% de cumplimiento y reemplazo si el proveedor confirmado falla.', 'Sin recargos ocultos sobre tarifas verificadas, con protección Stripe 3DS2 / PayPal.', 'Asistencia en vivo 24/7 — línea telefónica privada se desbloquea tras el pago.', 'Garantía contractual de cumplimiento de MIAMI ELIO — no es una póliza de seguro (Fla. Stat. § 626.9541).',
    'PASO 01 · ACUERDO ELECTRÓNICO', 'Revisar y Firmar Antes de Pagar', 'Los métodos de pago se desbloquean únicamente al firmar el acuerdo electrónico abajo.', 'Reconozco que MIAMI ELIO actúa como Agente Limitado de Cobro y que la responsabilidad operativa, depósito y accidentes recaen en el proveedor y huésped.', 'Acepto la política de cancelación, la garantía contractual ELIO+ Shield & Care 24/7 (entendiendo que no es un seguro) y la firma electrónica ESIGN / Florida UETA.', 'Nombre Legal Completo (Firma Electrónica)', 'Escribe tu nombre legal completo',
    'Firmar Acuerdo y Desbloquear Pago', 'Registrando Firma ESIGN…', 'Marca ambas casillas e ingresa tu nombre legal completo.', 'No se pudo registrar la firma. Actualiza e inténtalo nuevamente.', 'ESIGN Firmado', 'Firmado Por', 'Fecha de Firma', 'Hash SHA-256 del Documento',
    'PASO 02 · PAGO VERIFICADO', 'Completar Pago de Reserva', 'Completa el Paso 01 (Acuerdo Electrónico) para desbloquear tarjeta y PayPal.', 'Pagar con Tarjeta · Stripe 3DS2', 'Pagar con PayPal Business', 'Abriendo pasarela segura…', 'Confirmando pago en PayPal…',
    'Las pasarelas de pago se están finalizando. Escribe a tu especialista ELIO+ Guide en el chat abajo.', 'No se pudo iniciar el pago. Intenta de nuevo o escribe en el chat.', '¿Necesitas ayuda con esta cotización?', 'Escribir por Telegram', 'Escribir por WhatsApp',
    'PASE DE RESERVA CONFIRMADA', 'Reserva Confirmada y Protegida', 'Tu acuerdo electrónico y pago verificado están registrados. Conserva este pase para tu servicio y soporte 24/7.', 'Pagado el', 'Método de Pago', 'Referencia de Pago', 'ELIO+ Shield & Care 24/7 · Activo',
    'Línea Telefónica Privada 24/7 (Desbloqueada)', 'Disponible exclusivamente para huéspedes confirmados de MIAMI ELIO.', 'Llamar a la Línea 24/7', 'La línea telefónica directa se está activando — usa Telegram o WhatsApp prioritario abajo.', 'Imprimir / Guardar Pase',
    'Cotizaciones de Pago Verificadas', 'Genera un enlace privado /pay con firma ESIGN obligatoria antes del pago con Stripe o PayPal.', 'Aún no hay cotizaciones para esta solicitud.', 'Crear Cotización Verificada', 'Ocultar Formulario', 'Proveedor Operador', 'Monto Total (USD)',
    'Fechas Confirmadas', 'Política de Cancelación', 'Notas Opcionales', 'Expiración del Enlace (Horas)', 'Generar Enlace de Pago', 'Generando…',
    'Copiar Enlace', 'Copiado', 'Abrir', 'Cancelar Cotización', 'ESIGN Firmado', 'Pagado', 'No se pudo actualizar la cotización. Revisa los datos.', 'Pasarelas'
  ],
  he: [
    'אני מסכים/ה ל', 'תנאי השימוש', 'ול', 'מדיניות הפרטיות', 'ומבין/ה שבקשות מאושרות ידנית ללא חיוב מראש.', 'יש לאשר את תנאי השימוש ומדיניות הפרטיות לפני השליחה.',
    'בתוקף מ', 'גרסה', 'מפעיל', 'הסעיפים המשפטיים המחייבים מופיעים באנגלית על פי חוקי פלורידה.', 'חזרה אל MIAMI ELIO', 'פניות משפטיות',
    'תשלום מאומת להזמנה', 'אסמכתא', 'ממתין לחתימת ESIGN', 'ההסכם נחתם', 'אישור הזמנה פעיל', 'תוקף ההצעה פג', 'ההצעה בוטלה',
    'טוען הצעה מאומתת…', 'קישור התשלום אינו זמין', 'קישור זה אינו תקף או שכבר נסגר. פנו לצוות שלנו בצ׳אט לקבלת קישור חדש.', 'תוקף הצעה זו פג. בקשו קישור מעודכן ממומחה ELIO+ Guide בצ׳אט.', 'הצעה זו בוטלה על ידי MIAMI ELIO.', 'התשלום הופסק לפני השלמתו. ההסכם החתום שלכם נשמר למטה.',
    'פרטי ההזמנה המאומתת', 'ספק השירות', 'תאריכי השירות', 'אורח', 'מדיניות ביטולים', 'הערות מומחה', 'סה״כ לתשלום (USD)', 'בתוקף עד',
    'ELIO+ SHIELD & CARE 24/7', 'כלול בתשלום מאומת', 'ערבות חוזית של 100% לאספקה או חלופה אם ספק מאושר אינו מספק את השירות.', 'ללא תוספת נסתרת על תעריף הספק, עם הגנת Stripe 3DS2 / PayPal.', 'תמיכה אנושית 24/7 — קו טלפון ישיר ופרטי נפתח מיד לאחר התשלום.', 'ערבות חוזית של MIAMI ELIO — אינה פוליסת ביטוח (Fla. Stat. § 626.9541).',
    'שלב 01 · הסכם אלקטרוני', 'עיינו וחתמו לפני התשלום', 'אמצעי התשלום ייפתחו רק לאחר חתימה על ההסכם האלקטרוני למטה.', 'אני מאשר/ת ש-MIAMI ELIO פועלת כסוכן גבייה מוגבל ושאחריות תפעולית, פיקדון ותאונות חלים על הספק והאורח.', 'אני מאשר/ת את מדיניות הביטולים, ערבות ELIO+ Shield & Care 24/7 (בהבנה שאין מדובר בביטוח) וחתימה אלקטרונית לפי ESIGN / Florida UETA.', 'שם משפטי מלא (חתימה אלקטרונית)', 'הזינו שם מלא כפי שמופיע בתעודה',
    'חתימה ופתיחת התשלום', 'רושם חתימת ESIGN…', 'יש לסמן את שתי התיבות ולהזין שם מלא.', 'לא ניתן לשמור את החתימה כרגע. רעננו ונסו שוב.', 'ESIGN נחתם', 'נחתם על ידי', 'זמן חתימה', 'מזהה SHA-256 של המסמך',
    'שלב 02 · תשלום מאומת', 'השלימו את תשלום ההזמנה', 'השלימו את שלב 01 (הסכם אלקטרוני) כדי לפתוח תשלום בכרטיס או PayPal.', 'תשלום בכרטיס · Stripe 3DS2', 'תשלום באמצעות PayPal Business', 'פותח שער תשלום מאובטח…', 'מאמת תשלום PayPal…',
    'שערי התשלום המקוונים בהשלמת הגדרה. פנו למומחה ELIO+ Guide בצ׳אט למטה.', 'לא ניתן היה להתחיל את התשלום. נסו שוב או כתבו לצוות בצ׳אט.', 'צריכים עזרה עם הצעה זו?', 'הודעה למומחה ב-Telegram', 'הודעה למומחה ב-WhatsApp',
    'אישור הזמנה מאומת', 'ההזמנה אושרה ומוגנת', 'ההסכם האלקטרוני והתשלום המאומת שמורים אצלנו. שמרו אישור זה למסירה ולתמיכת 24/7.', 'שולם בתאריך', 'אמצעי תשלום', 'מזהה עסקה', 'ELIO+ Shield & Care 24/7 · פעיל',
    'קו טלפון פרטי ישיר 24/7 (פתוח)', 'זמין בלעדית ללקוחות מאושרים של MIAMI ELIO לאורך ההזמנה.', 'התקשרו לקו 24/7', 'הקו הישיר 24/7 בהפעלה — השתמשו ב-Telegram או WhatsApp בעדיפות למטה.', 'הדפסה / שמירה',
    'הצעות תשלום מאומתות', 'צרו קישור /pay פרטי עם חתימת ESIGN חובה לפני Stripe או PayPal.', 'טרם נוצרו הצעות תשלום לבקשה זו.', 'צור הצעת תשלום', 'הסתר טופס', 'שם הספק המפעיל', 'סכום כולל (USD)',
    'תאריכי שירות מאושרים', 'מדיניות ביטולים', 'הערות אופציונליות', 'תוקף הקישור (שעות)', 'צור קישור לתשלום', 'יוצר…',
    'העתק קישור', 'הועתק', 'פתח', 'בטל הצעה', 'ESIGN חתום', 'שולם', 'לא ניתן לעדכן את ההצעה. בדקו את השדות.', 'שערי תשלום'
  ],
  zh: [
    '我同意', '服务条款', '和', '隐私政策', '并理解提交申请后将由人工确认，不会预先扣款。', '提交前请先同意服务条款和隐私政策。',
    '生效日期', '版本', '运营方', '以下具有法律约束力的条款依据佛罗里达州法律以英文发布。', '返回 MIAMI ELIO', '法律咨询',
    '官方认证预订结账', '参考编号', '待签署 ESIGN', '协议已签署', '已确认通行证', '报价已过期', '报价已取消',
    '正在加载认证报价…', '结账链接不可用', '此支付链接无效或已关闭。请在聊天中联系我们的专员获取新链接。', '此报价已过期。请在聊天中向 ELIO+ Guide 专员申请新链接。', '此报价已被 MIAMI ELIO 取消。', '支付未完成并已取消。您签署的协议仍保留在下方。',
    '已确认报价详情', '服务供应商', '服务日期', '客户', '取消政策', '专员备注', '应付总额 (USD)', '有效期至',
    'ELIO+ SHIELD & CARE 24/7', '认证结账专享保障', '若确认供应商未能履约，MIAMI ELIO 提供合同级 100% 履约替代或全额退款保障。', '无平台隐藏加价，支持 Stripe 3DS2 / PayPal 支付保护。', '24/7 专属顾问支持——支付确认后立即解锁私人直通电话。', 'MIAMI ELIO 合同履约保障——并非保险保单 (Fla. Stat. § 626.9541)。',
    '步骤 01 · 电子协议', '支付前请审阅并签署', '完成下方电子预订协议签署后，方可解锁银行卡和 PayPal 支付。', '本人知悉 MIAMI ELIO 仅作为有限代收款代理，运营安全、押金及事故责任由指定供应商与客户承担。', '本人接受所述取消政策、ELIO+ Shield & Care 24/7 合同保障（明确知晓其非保险产品）及依据 ESIGN / Florida UETA 的电子签署。', '法定全名（电子签名）', '请输入与证件一致的全名',
    '签署协议并解锁支付', '正在记录 ESIGN 签名…', '请勾选两项并输入您的法定全名。', '暂时无法记录签名，请刷新后重试。', 'ESIGN 已签署', '签署人', '签署时间', 'SHA-256 文档哈希',
    '步骤 02 · 安全支付', '完成预订付款', '请先完成步骤 01（电子协议）以解锁银行卡与 PayPal 结账。', '银行卡支付 · Stripe 3DS2', '使用 PayPal Business 支付', '正在打开安全支付网关…', '正在确认 PayPal 结算…',
    '在线支付网关正在配置中。请通过下方聊天联系 ELIO+ Guide 专员完成付款。', '无法发起支付，请重试或在聊天中联系专员。', '对此报价有疑问？', '通过 Telegram 联系专员', '通过 WhatsApp 联系专员',
    '已确认预订通行证', '预订已确认并受保障', '您的电子协议与付款已归档。请妥善保存此通行证用于交接及 24/7 服务。', '支付时间', '支付方式', '交易参考号', 'ELIO+ Shield & Care 24/7 · 已激活',
    '24/7 私人直通电话（已解锁）', '仅向已确认付款的 MIAMI ELIO 贵宾开放。', '拨打 24/7 专线', '直通电话正在配置中，请优先使用下方 Telegram 或 WhatsApp。', '打印 / 保存通行证',
    '认证支付报价', '生成专属 /pay 结账链接，强制签署 ESIGN 后解锁 Stripe 或 PayPal。', '此申请暂无支付报价。', '创建认证报价', '隐藏表单', '服务供应商名称', '总金额 (USD)',
    '确认的服务日期', '取消政策', '可选备注', '链接有效期（小时）', '生成结账链接', '生成中…',
    '复制结账链接', '已复制', '打开', '取消报价', '已签 ESIGN', '已付款', '无法更新报价，请检查填写内容。', '支付网关'
  ],
  pt: [
    'Concordo com os', 'Termos de Serviço', 'e a', 'Política de Privacidade', 'e entendo que solicitações são confirmadas manualmente sem cobrança imediata.', 'Aceite os Termos de Serviço e a Política de Privacidade antes de enviar.',
    'Vigência', 'Versão', 'Operador', 'As cláusulas jurídicas vinculativas abaixo são publicadas em inglês sob a lei da Flórida.', 'Voltar ao MIAMI ELIO', 'Consultas jurídicas',
    'Checkout Verificado de Reserva', 'Referência', 'Aguardando ESIGN', 'Acordo Assinado', 'Passe Confirmado', 'Cotação Expirada', 'Cotação Cancelada',
    'Carregando cotação verificada…', 'Link de pagamento indisponível', 'Este link é inválido ou não está mais ativo. Fale com nossa equipe no chat para um novo link.', 'Esta cotação expirou. Peça um link atualizado ao especialista ELIO+ Guide no chat.', 'Esta cotação foi cancelada pela MIAMI ELIO.', 'O pagamento foi cancelado antes da conclusão. Seu acordo assinado continua pronto abaixo.',
    'Detalhes da Cotação Confirmada', 'Fornecedor Operador', 'Datas do Serviço', 'Hóspede', 'Política de Cancelamento', 'Notas do Especialista', 'Total a Pagar (USD)', 'Válido Até',
    'ELIO+ SHIELD & CARE 24/7', 'Incluído no Checkout Verificado', 'Garantia contratual 100% de entrega e substituição caso o fornecedor confirmado falhe.', 'Sem acréscimo oculto sobre tarifas verificadas, com proteção Stripe 3DS2 / PayPal.', 'Suporte humano 24/7 — linha telefônica direta privada desbloqueada após o pagamento.', 'Garantia contratual da MIAMI ELIO — não é apólice de seguro (Fla. Stat. § 626.9541).',
    'PASSO 01 · ACORDO ELETRÔNICO', 'Revise e Assine Antes de Pagar', 'As opções de pagamento são liberadas apenas após assinar o acordo eletrônico abaixo.', 'Reconheço que a MIAMI ELIO atua como Agente Limitado de Cobrança e que responsabilidade operacional, caução e acidentes pertencem ao fornecedor e ao cliente.', 'Aceito a política de cancelamento, a garantia contratual ELIO+ Shield & Care 24/7 (ciente de que não é seguro) e a assinatura eletrônica ESIGN / Florida UETA.', 'Nome Legal Completo (Assinatura Eletrônica)', 'Digite seu nome legal completo',
    'Assinar Acordo e Liberar Pagamento', 'Registrando Assinatura ESIGN…', 'Marque ambas as caixas e informe seu nome completo.', 'Não foi possível registrar a assinatura. Atualize e tente novamente.', 'ESIGN Assinado', 'Assinado Por', 'Data da Assinatura', 'Hash SHA-256 do Documento',
    'PASSO 02 · PAGAMENTO VERIFICADO', 'Concluir Pagamento da Reserva', 'Conclua o Passo 01 (Acordo Eletrônico) para liberar cartão e PayPal.', 'Pagar com Cartão · Stripe 3DS2', 'Pagar com PayPal Business', 'Abrindo gateway seguro…', 'Confirmando pagamento PayPal…',
    'Os gateways de pagamento online estão sendo finalizados. Fale com o especialista ELIO+ Guide no chat abaixo.', 'Não foi possível iniciar o pagamento. Tente novamente ou fale no chat.', 'Precisa de ajuda com esta cotação?', 'Falar no Telegram', 'Falar no WhatsApp',
    'PASSE DE RESERVA CONFIRMADA', 'Reserva Confirmada e Protegida', 'Seu acordo eletrônico e pagamento verificado estão registrados. Guarde este passe para entrega e suporte 24/7.', 'Pago em', 'Método de Pagamento', 'Referência de Pagamento', 'ELIO+ Shield & Care 24/7 · Ativo',
    'Linha Telefônica Privada 24/7 (Liberada)', 'Exclusiva para clientes confirmados da MIAMI ELIO durante toda a reserva.', 'Ligar para Linha 24/7', 'A linha telefônica direta está sendo ativada — use Telegram ou WhatsApp prioritário abaixo.', 'Imprimir / Salvar Passe',
    'Cotações Verificadas de Pagamento', 'Gere um link privado /pay com assinatura ESIGN obrigatória antes do Stripe ou PayPal.', 'Nenhuma cotação criada para este pedido ainda.', 'Criar Cotação Verificada', 'Ocultar Formulário', 'Nome do Fornecedor', 'Valor Total (USD)',
    'Datas Confirmadas', 'Política de Cancelamento', 'Notas Opcionais', 'Validade do Link (Horas)', 'Gerar Link de Pagamento', 'Gerando…',
    'Copiar Link', 'Copiado', 'Abrir', 'Cancelar Cotação', 'ESIGN Assinado', 'Pago', 'Não foi possível atualizar a cotação. Verifique os campos.', 'Gateways'
  ],
  uk: [
    'Я приймаю', 'Умови використання', 'та', 'Політику конфіденційності', 'і розумію, що запит підтверджується вручну без списання коштів.', 'Підтвердьте згоду з Умовами використання та Політикою конфіденційності.',
    'Чинно з', 'Версія', 'Оператор', 'Обов’язкові юридичні положення нижче опубліковані англійською мовою за правом штату Флорида.', 'Повернутися до MIAMI ELIO', 'Юридичні питання',
    'Захищена оплата бронювання', 'Номер', 'Очікує підпису ESIGN', 'Угоду підписано', 'Бронювання підтверджено', 'Термін посилання минув', 'Рахунок скасовано',
    'Завантаження підтвердженого рахунку…', 'Посилання на оплату недоступне', 'Це посилання недійсне або вже закрите. Напишіть спеціалісту в чат, щоб отримати нове.', 'Термін дії пропозиції минув. Запитайте нове посилання у спеціаліста ELIO+ Guide в чаті.', 'Цей рахунок скасовано командою MIAMI ELIO.', 'Оплату було перервано. Ваш електронний підпис збережено нижче.',
    'Деталі підтвердженої пропозиції', 'Постачальник послуги', 'Дати та деталі', 'Гість', 'Умови скасування', 'Коментар спеціаліста', 'До сплати (USD)', 'Дійсно до',
    'ELIO+ SHIELD & CARE 24/7', 'Включено до підтвердженого замовлення', 'Договірна 100% гарантія виконання та заміни, якщо постачальник не надасть послугу.', 'Без прихованої націнки до тарифу постачальника; захист Stripe 3DS2 / PayPal.', 'Жива підтримка 24/7 — приватна пряма телефонна лінія відкривається одразу після оплати.', 'Договірна гарантія виконання MIAMI ELIO — не є страховим полісом (Fla. Stat. § 626.9541).',
    'КРОК 01 · ЕЛЕКТРОННА УГОДА', 'Ознайомтеся та підпишіть до оплати', 'Способи оплати відкриються одразу після підписання електронної угоди нижче.', 'Підтверджую, що MIAMI ELIO діє як обмежений платіжний агент, а експлуатаційна відповідальність, застава та ризики належать зазначеному постачальнику і гостю.', 'Приймаю умови скасування, договірну гарантію ELIO+ Shield & Care 24/7 (розуміючи, що це не страхування) та електронний підпис ESIGN / Florida UETA.', 'Повне ім’я (електронний підпис)', 'Введіть повне ім’я як у документі',
    'Підписати угоду та відкрити оплату', 'Фіксуємо підпис ESIGN…', 'Позначте обидва пункти та введіть повне ім’я.', 'Не вдалося зберегти підпис. Оновіть сторінку та спробуйте ще раз.', 'ESIGN підписано', 'Підписант', 'Дата підпису', 'SHA-256 хеш документа',
    'КРОК 02 · БЕЗПЕЧНА ОПЛАТА', 'Завершіть оплату бронювання', 'Виконайте Крок 01 (Електронна угода), щоб відкрити оплату карткою та PayPal.', 'Оплатити карткою · Stripe 3DS2', 'Оплатити через PayPal Business', 'Перехід до захищеного платіжного шлюзу…', 'Підтверджуємо платіж PayPal…',
    'Онлайн-шлюзи оплати підключаються. Напишіть спеціалісту ELIO+ Guide в чат нижче.', 'Не вдалося запустити оплату. Спробуйте ще раз або напишіть у чат.', 'Потрібна допомога з цим рахунком?', 'Написати в Telegram', 'Написати у WhatsApp',
    'ПІДТВЕРДЖЕНИЙ ПРОПУСК БРОНЮВАННЯ', 'Бронювання підтверджено та захищено', 'Ваша електронна угода та оплата зафіксовані. Збережіть цей пропуск для отримання послуги та підтримки 24/7.', 'Оплачено', 'Спосіб оплати', 'Номер транзакції', 'ELIO+ Shield & Care 24/7 · Активно',
    'Приватна пряма лінія 24/7 (відкрита)', 'Доступна виключно підтвердженим клієнтам MIAMI ELIO на весь час бронювання.', 'Зателефонувати на лінію 24/7', 'Пряма лінія 24/7 активується — скористайтеся пріоритетним Telegram або WhatsApp нижче.', 'Друкувати / Зберегти',
    'Рахунки на оплату (Verified Quotes)', 'Створіть приватне посилання /pay з обов’язковим ESIGN перед Stripe або PayPal.', 'Для цієї заявки ще не створено рахунків.', 'Створити рахунок', 'Приховати форму', 'Назва постачальника', 'Сума (USD)',
    'Підтверджені дати', 'Умови скасування', 'Коментар спеціаліста', 'Термін дії (годин)', 'Створити посилання оплати', 'Створення…',
    'Копіювати посилання', 'Скопійовано', 'Відкрити', 'Скасувати рахунок', 'ESIGN підписано', 'Оплачено', 'Не вдалося оновити рахунок. Перевірте поля.', 'Шлюзи'
  ],
  ja: [
    '以下に同意します：', '利用規約', 'および', 'プライバシーポリシー', '（リクエストは手動確認され、送信時点で課金されません）', '送信前に利用規約とプライバシーポリシーに同意してください。',
    '発効日', 'バージョン', '運営会社', '法的拘束力のある条項はフロリダ州法に基づき英語で記載されています。', 'MIAMI ELIO へ戻る', '法務お問い合わせ',
    '認証済み予約チェックアウト', '参照番号', 'ESIGN 署名待ち', '契約署名済み', '確定パス', '見積期限切れ', '見積キャンセル済み',
    '認証済み見積を読み込み中…', '決済リンクは利用できません', 'この決済リンクは無効または終了しています。チャットで担当者へ新しいリンクをご依頼ください。', 'この見積の有効期限が切れました。チャットで ELIO+ Guide 担当者へ再発行をご依頼ください。', 'この見積は MIAMI ELIO によりキャンセルされました。', '決済は完了前にキャンセルされました。署名済み契約は下記に保持されています。',
    '確定見積の詳細', '提供サプライヤー', '利用日程', 'ゲスト', 'キャンセル規定', '担当者メモ', 'お支払い合計 (USD)', '有効期限',
    'ELIO+ SHIELD & CARE 24/7', '認証決済に含まれるサポート', '確定サプライヤーが履行できない場合、同等以上の代替手配または100%返金保証（契約保証）。', 'サプライヤー料金への隠れた上乗せなし。Stripe 3DS2 / PayPal 保護対応。', '24時間365日の専任サポート——決済確定直後に専用直通電話番号が開示されます。', 'MIAMI ELIO による契約上の履行保証であり、保険商品ではありません (Fla. Stat. § 626.9541)。',
    'STEP 01 · 電子契約', 'お支払い前の確認と署名', '以下の電子予約契約に署名すると決済ボタンが有効になります。', 'MIAMI ELIO が限定決済代行者であり、運行・安全・保証金・事故責任は指定サプライヤーおよび利用者に帰属することを確認します。', '記載のキャンセル規定、ELIO+ Shield & Care 24/7 契約保証（保険ではないことを理解）、および ESIGN / Florida UETA に基づく電子署名に同意します。', '法定氏名（電子署名）', '身分証と同じフルネームを入力',
    '契約に署名して決済へ進む', 'ESIGN 署名を記録中…', '両方の項目にチェックを入れ、氏名を入力してください。', '署名を保存できませんでした。ページを更新して再試行してください。', 'ESIGN 署名完了', '署名者', '署名日時', 'SHA-256 文書ハッシュ',
    'STEP 02 · 認証済み決済', '予約のお支払いを完了', 'カードおよび PayPal 決済を有効にするには STEP 01 の電子署名を完了してください。', 'カードで支払う · Stripe 3DS2', 'PayPal Business で支払う', '安全な決済ページを開いています…', 'PayPal 決済を確定中…',
    'オンライン決済ゲートウェイを準備中です。下のチャットより ELIO+ Guide 担当者へご連絡ください。', '決済を開始できませんでした。再試行するかチャットでお問い合わせください。', 'この見積についてサポートが必要ですか？', 'Telegram で担当者に連絡', 'WhatsApp で担当者に連絡',
    '確定予約パス', 'ご予約が確定・保護されました', '電子契約と認証済み決済が記録されました。当日の引渡しと24時間サポートのため保管してください。', '決済日時', '決済方法', '取引参照番号', 'ELIO+ Shield & Care 24/7 · 有効',
    '24時間専用直通電話（開示済み）', '決済確定済みの MIAMI ELIO ゲスト専用ラインです。', '24時間専任ラインへ発信', '専用電話回線を設定中です。下の優先 Telegram または WhatsApp をご利用ください。', 'パスを印刷 / 保存',
    '認証済み決済見積', 'Stripe・PayPal 決済前に ESIGN 署名を必須とする専用 /pay リンクを発行します。', 'このリクエストの見積はまだありません。', '決済見積を作成', 'フォームを閉じる', '提供サプライヤー名', '合計金額 (USD)',
    '確定サービス日程', 'キャンセル規定', '担当者メモ（任意）', 'リンク有効期限（時間）', '決済リンクを発行', '発行中…',
    'リンクをコピー', 'コピー済み', '開く', '見積をキャンセル', 'ESIGN 署名済', '決済済', '見積を更新できませんでした。入力内容を確認してください。', '決済ゲートウェイ'
  ],
  ko: [
    '다음에 동의합니다:', '이용약관', '및', '개인정보 처리방침', '(요청은 수동으로 확인되며 즉시 결제되지 않습니다.)', '제출하기 전에 이용약관 및 개인정보 처리방침에 동의해 주세요.',
    '시행일', '버전', '운영사', '법적 구속력이 있는 조항은 플로리다주 법률에 따라 영문으로 게시됩니다.', 'MIAMI ELIO로 돌아가기', '법무 문의',
    '인증 예약 결제', '참조 번호', 'ESIGN 서명 대기', '계약 서명 완료', '확정 패스', '견적 만료', '견적 취소됨',
    '인증 견적을 불러오는 중…', '결제 링크를 사용할 수 없습니다', '유효하지 않거나 종료된 링크입니다. 채팅으로 담당자에게 새 링크를 요청해 주세요.', '견적 유효기간이 만료되었습니다. 채팅에서 ELIO+ Guide 담당자에게 새 링크를 요청하세요.', '이 견적은 MIAMI ELIO에 의해 취소되었습니다.', '결제가 완료되기 전에 취소되었습니다. 서명된 계약은 아래에 유지됩니다.',
    '확정 견적 상세', '운영 공급업체', '서비스 일정', '고객', '취소 규정', '담당자 메모', '결제 총액 (USD)', '유효 기한',
    'ELIO+ SHIELD & CARE 24/7', '인증 결제 포함 혜택', '확정 공급업체가 미이행 시 동급 이상 대체 또는 100% 환불을 계약상 보장합니다.', '검증된 공급업체 요금 외 숨겨진 추가 비용 없음 · Stripe 3DS2 / PayPal 보호.', '24/7 전담 지원 — 결제 확정 즉시 프라이빗 직통 전화번호가 열립니다.', 'MIAMI ELIO의 계약상 이행 보장이며 보험 상품이 아닙니다 (Fla. Stat. § 626.9541).',
    'STEP 01 · 전자 계약서', '결제 전 검토 및 서명', '아래 전자 예약 계약에 서명해야 카드 및 PayPal 결제가 열립니다.', 'MIAMI ELIO가 제한적 결제 대행자이며 운영, 안전, 보증금 및 사고 책임은 지정 공급업체와 고객에게 있음을 확인합니다.', '명시된 취소 규정, ELIO+ Shield & Care 24/7 계약 보장(보험이 아님을 인지) 및 ESIGN / Florida UETA 전자 서명에 동의합니다.', '법적 성명 (전자 서명)', '신분증상 영문 또는 법적 성명 입력',
    '계약 서명 및 결제 잠금 해제', 'ESIGN 서명 기록 중…', '두 항목을 모두 체크하고 법적 성명을 입력해 주세요.', '서명을 저장할 수 없습니다. 새로고침 후 다시 시도해 주세요.', 'ESIGN 서명 완료', '서명자', '서명 일시', 'SHA-256 문서 해시',
    'STEP 02 · 인증 결제', '예약 결제 완료', '카드 및 PayPal 결제를 열려면 위 STEP 01(전자 계약)을 완료하세요.', '카드로 결제 · Stripe 3DS2', 'PayPal Business로 결제', '보안 결제 게이트웨이 여는 중…', 'PayPal 결제 확인 중…',
    '온라인 결제 게이트웨이 설정이 마무리 중입니다. 아래 채팅으로 ELIO+ Guide 담당자에게 문의하세요.', '결제를 시작할 수 없습니다. 다시 시도하거나 채팅으로 문의하세요.', '이 견적에 도움이 필요하신가요?', 'Telegram으로 담당자 문의', 'WhatsApp으로 담당자 문의',
    '확정 예약 패스', '예약이 확정 및 보호되었습니다', '전자 계약과 인증 결제가 등록되었습니다. 현장 인수 및 24/7 지원을 위해 보관하세요.', '결제 일시', '결제 수단', '결제 참조 번호', 'ELIO+ Shield & Care 24/7 · 활성',
    '프라이빗 24/7 직통 전화 (열림)', '결제 확정된 MIAMI ELIO 고객에게만 제공됩니다.', '24/7 전담 라인 전화하기', '직통 전화가 준비 중입니다. 아래 우선 Telegram 또는 WhatsApp을 이용해 주세요.', '패스 인쇄 / 저장',
    '인증 결제 견적', 'Stripe 또는 PayPal 결제 전 필수 ESIGN이 포함된 프라이빗 /pay 링크를 생성합니다.', '아직 생성된 결제 견적이 없습니다.', '인증 견적 생성', '폼 숨기기', '공급업체명', '총액 (USD)',
    '확정 서비스 일정', '취소 규정', '선택 메모', '링크 만료 시간', '결제 링크 생성', '생성 중…',
    '링크 복사', '복사됨', '열기', '견적 취소', 'ESIGN 서명됨', '결제 완료', '견적을 업데이트할 수 없습니다. 입력값을 확인하세요.', '결제 게이트웨이'
  ],
  de: [
    'Ich akzeptiere die', 'Nutzungsbedingungen', 'und die', 'Datenschutzerklärung', 'und verstehe, dass Anfragen manuell und ohne sofortige Belastung bestätigt werden.', 'Bitte akzeptieren Sie die Nutzungsbedingungen und die Datenschutzerklärung.',
    'Gültig ab', 'Version', 'Betreiber', 'Die verbindlichen Rechtsklauseln sind nach dem Recht Floridas auf Englisch veröffentlicht.', 'Zurück zu MIAMI ELIO', 'Rechtliche Anfragen',
    'Verifizierter Buchungs-Checkout', 'Referenz', 'ESIGN ausstehend', 'Vereinbarung unterzeichnet', 'Bestätigter Pass', 'Angebot abgelaufen', 'Angebot storniert',
    'Verifiziertes Angebot wird geladen…', 'Zahlungslink nicht verfügbar', 'Dieser Zahlungslink ist ungültig oder nicht mehr aktiv. Schreiben Sie unserem Team im Chat für einen neuen Link.', 'Dieses Angebot ist abgelaufen. Fordern Sie im Chat einen aktuellen Link an.', 'Dieses Angebot wurde von MIAMI ELIO storniert.', 'Die Zahlung wurde abgebrochen. Ihre unterzeichnete Vereinbarung bleibt unten gespeichert.',
    'Details des bestätigten Angebots', 'Ausführender Anbieter', 'Leistungsdaten', 'Gast', 'Stornierungsbedingungen', 'Hinweise des Spezialisten', 'Gesamtbetrag (USD)', 'Gültig bis',
    'ELIO+ SHIELD & CARE 24/7', 'Im verifizierten Checkout enthalten', 'Vertragliche 100% Erfüllungs- & Ersatzgarantie bei Ausfall eines bestätigten Anbieters.', 'Kein versteckter Plattformaufschlag; Zahlungsschutz über Stripe 3DS2 / PayPal.', '24/7 Live-Spezialisten — private Direkttelefonnummer wird sofort nach Zahlung freigeschaltet.', 'Vertragliche Erfüllungsgarantie von MIAMI ELIO — keine Versicherungspolice (Fla. Stat. § 626.9541).',
    'SCHRITT 01 · ELEKTRONISCHE VEREINBARUNG', 'Vor Zahlung prüfen & signieren', 'Zahlungsarten werden erst nach elektronischer Unterzeichnung freigeschaltet.', 'Ich bestätige, dass MIAMI ELIO als eingeschränkter Zahlungseinzugsagent handelt und Betrieb, Kaution, Sicherheit und Unfallhaftung beim genannten Anbieter und Gast liegen.', 'Ich akzeptiere die Stornierungsbedingungen, die vertragliche Garantie ELIO+ Shield & Care 24/7 (keine Versicherung) und die elektronische Signatur nach ESIGN / Florida UETA.', 'Vollständiger gesetzlicher Name (Elektronische Signatur)', 'Vollständigen Namen gemäß Ausweis eingeben',
    'Vereinbarung signieren & Zahlung öffnen', 'ESIGN-Signatur wird gespeichert…', 'Bitte beide Kästchen ankreuzen und Ihren vollständigen Namen eingeben.', 'Signatur konnte nicht gespeichert werden. Bitte neu laden und erneut versuchen.', 'ESIGN signiert', 'Unterzeichnet von', 'Signiert am', 'SHA-256 Dokument-Hash',
    'SCHRITT 02 · VERIFIZIERTE ZAHLUNG', 'Buchungszahlung abschließen', 'Schließen Sie Schritt 01 (Elektronische Vereinbarung) ab, um Karte & PayPal freizuschalten.', 'Mit Karte zahlen · Stripe 3DS2', 'Mit PayPal Business zahlen', 'Sicheres Zahlungsgateway wird geöffnet…', 'PayPal-Zahlung wird bestätigt…',
    'Online-Zahlungsgateways werden derzeit finalisiert. Schreiben Sie Ihrem ELIO+ Guide Spezialisten unten im Chat.', 'Zahlung konnte nicht gestartet werden. Bitte erneut versuchen oder im Chat schreiben.', 'Fragen zu diesem Angebot?', 'Spezialisten auf Telegram schreiben', 'Spezialisten auf WhatsApp schreiben',
    'BESTÄTIGTER RESERVIERUNGSPASS', 'Reservierung bestätigt & geschützt', 'Elektronische Vereinbarung und Zahlung sind hinterlegt. Bewahren Sie diesen Pass für Übergabe und 24/7-Support auf.', 'Bezahlt am', 'Zahlungsmethode', 'Transaktionsreferenz', 'ELIO+ Shield & Care 24/7 · Aktiv',
    'Private 24/7-Direktleitung (Freigeschaltet)', 'Exklusiv für bestätigte MIAMI ELIO Gäste während der gesamten Buchung.', '24/7-Spezialistenleitung anrufen', 'Die direkte 24/7-Leitung wird eingerichtet — nutzen Sie vorrangig Telegram oder WhatsApp unten.', 'Pass drucken / speichern',
    'Verifizierte Zahlungsangebote', 'Erstellen Sie einen privaten /pay-Link mit ESIGN-Pflicht vor Stripe oder PayPal.', 'Noch keine Zahlungsangebote für diese Anfrage.', 'Angebot erstellen', 'Formular ausblenden', 'Name des Anbieters', 'Gesamtbetrag (USD)',
    'Bestätigte Leistungsdaten', 'Stornierungsbedingungen', 'Optionale Hinweise', 'Link-Gültigkeit (Stunden)', 'Zahlungslink erstellen', 'Wird erstellt…',
    'Link kopieren', 'Kopiert', 'Öffnen', 'Angebot stornieren', 'ESIGN signiert', 'Bezahlt', 'Angebot konnte nicht aktualisiert werden. Eingaben prüfen.', 'Gateways'
  ],
  ar: [
    'أوافق على', 'شروط الخدمة', 'و', 'سياسة الخصوصية', 'وأفهم أن الطلبات تُؤكد يدوياً دون خصم فوري.', 'يرجى الموافقة على شروط الخدمة وسياسة الخصوصية قبل الإرسال.',
    'ساري من', 'الإصدار', 'المشغّل', 'البنود القانونية الملزمة أدناه منشورة باللغة الإنجليزية وفق قانون ولاية فلوريدا.', 'العودة إلى MIAMI ELIO', 'استفسارات قانونية',
    'دفع الحجز الموثق', 'المرجع', 'بانتظار توقيع ESIGN', 'تم توقيع الاتفاقية', 'تصريح حجز مؤكد', 'انتهت صلاحية العرض', 'تم إلغاء العرض',
    'جاري تحميل العرض الموثق…', 'رابط الدفع غير متاح', 'هذا الرابط غير صالح أو لم يعد نشطاً. تواصل مع فريقنا عبر الدردشة للحصول على رابط جديد.', 'انتهت صلاحية هذا العرض. اطلب رابطاً محدثاً من مختص ELIO+ Guide عبر الدردشة.', 'تم إلغاء هذا العرض من قِبل MIAMI ELIO.', 'تم إلغاء الدفع قبل إتمامه. اتفاقيتك الموقعة جاهزة أدناه.',
    'تفاصيل العرض المؤكد', 'مزود الخدمة المشغّل', 'تواريخ الخدمة', 'الضيف', 'سياسة الإلغاء', 'ملاحظات المختص', 'الإجمالي المستحق (USD)', 'صالح حتى',
    'ELIO+ SHIELD & CARE 24/7', 'مشمول مع الدفع الموثق', 'ضمان تعاقدي بنسبة 100% للتنفيذ أو البديل إذا تعذر على المزود المؤكد تقديم الخدمة.', 'دون هامش خفي على أسعار المزود، مع حماية Stripe 3DS2 / PayPal.', 'دعم مباشر 24/7 — يُفتح خط الهاتف المباشر الخاص فور تأكيد الدفع.', 'ضمان تنفيذ تعاقدي من MIAMI ELIO — ليس وثيقة تأمين (Fla. Stat. § 626.9541).',
    'الخطوة 01 · الاتفاقية الإلكترونية', 'راجع ووقّع قبل الدفع', 'تُفتح خيارات الدفع فقط بعد توقيع الاتفاقية الإلكترونية أدناه.', 'أقر بأن MIAMI ELIO تعمل كوكيل تحصيل دفع محدود وأن المسؤولية التشغيلية والوديعة والحوادث تقع على المزود المسمى والضيف.', 'أوافق على سياسة الإلغاء وضمان ELIO+ Shield & Care 24/7 التعاقدي (مع العلم أنه ليس تأميناً) والتوقيع الإلكتروني بموجب ESIGN / Florida UETA.', 'الاسم القانوني الكامل (التوقيع الإلكتروني)', 'أدخل اسمك القانوني الكامل',
    'توقيع الاتفاقية وفتح الدفع', 'جاري تسجيل توقيع ESIGN…', 'يرجى تحديد المربعين وإدخال اسمك القانوني الكامل.', 'تعذر تسجيل التوقيع الآن. يرجى التحديث والمحاولة مجدداً.', 'تم توقيع ESIGN', 'الموقّع', 'تاريخ التوقيع', 'تجزئة SHA-256 للمستند',
    'الخطوة 02 · الدفع الموثق', 'أكمل دفع الحجز', 'أكمل الخطوة 01 (الاتفاقية الإلكترونية) أعلاه لفتح الدفع بالبطاقة وPayPal.', 'الدفع بالبطاقة · Stripe 3DS2', 'الدفع عبر PayPal Business', 'جاري فتح بوابة الدفع الآمنة…', 'جاري تأكيد دفعة PayPal…',
    'يجري استكمال إعداد بوابات الدفع الإلكتروني. تواصل مع مختص ELIO+ Guide عبر الدردشة أدناه.', 'تعذر بدء الدفع. حاول مجدداً أو راسل المختص في الدردشة.', 'هل تحتاج مساعدة بخصوص هذا العرض؟', 'مراسلة المختص على Telegram', 'مراسلة المختص على WhatsApp',
    'تصريح الحجز المؤكد', 'تم تأكيد الحجز وحمايته', 'اتفاقيتك الإلكترونية ودفعك الموثق مسجلان لدينا. احتفظ بهذا التصريح للاستلام والدعم 24/7.', 'تاريخ الدفع', 'طريقة الدفع', 'مرجع العملية', 'ELIO+ Shield & Care 24/7 · نشط',
    'الخط الهاتفي المباشر الخاص 24/7 (مفتوح)', 'متاح حصرياً لضيوف MIAMI ELIO المؤكدين طوال فترة الحجز.', 'الاتصال بخط 24/7 المباشر', 'يجري تفعيل الخط الهاتفي المباشر — استخدم Telegram أو WhatsApp ذي الأولوية أدناه.', 'طباعة / حفظ التصريح',
    'عروض الدفع الموثقة', 'أنشئ رابط /pay خاصاً مع توقيع ESIGN إلزامي قبل Stripe أو PayPal.', 'لم تُنشأ عروض دفع لهذا الطلب بعد.', 'إنشاء عرض دفع موثق', 'إخفاء النموذج', 'اسم مزود الخدمة', 'المبلغ الإجمالي (USD)',
    'تواريخ الخدمة المؤكدة', 'سياسة الإلغاء', 'ملاحظات اختيارية', 'صلاحية الرابط (ساعات)', 'إنشاء رابط الدفع', 'جاري الإنشاء…',
    'نسخ الرابط', 'تم النسخ', 'فتح', 'إلغاء العرض', 'ESIGN موقّع', 'مدفوع', 'تعذر تحديث العروض. تحقق من الحقول.', 'البوابات'
  ],
  tr: [
    'Şunları kabul ediyorum:', 'Hizmet Şartları', 've', 'Gizlilik Politikası', 've taleplerin tahsilat yapılmadan manuel olarak onaylandığını anlıyorum.', 'Göndermeden önce Hizmet Şartları ve Gizlilik Politikasını onaylayın.',
    'Yürürlük', 'Sürüm', 'İşletmeci', 'Bağlayıcı yasal hükümler Florida hukuku uyarınca İngilizce olarak yayımlanmıştır.', 'MIAMI ELIO’ya Dön', 'Hukuki sorular',
    'Doğrulanmış Rezervasyon Ödemesi', 'Referans', 'ESIGN İmzası Bekleniyor', 'Sözleşme İmzalandı', 'Onaylı Geçiş Kartı', 'Teklif Süresi Doldu', 'Teklif İptal Edildi',
    'Doğrulanmış teklif yükleniyor…', 'Ödeme bağlantısı kullanılamıyor', 'Bu ödeme bağlantısı geçersiz veya aktif değil. Yeni bağlantı için sohbetten uzmanımızla görüşün.', 'Bu teklifin süresi doldu. Sohbetten ELIO+ Guide uzmanından güncel bağlantı isteyin.', 'Bu teklif MIAMI ELIO tarafından iptal edildi.', 'Ödeme tamamlanmadan iptal edildi. İmzalanmış sözleşmeniz aşağıda hazırdır.',
    'Onaylı Teklif Detayları', 'Hizmet Sağlayıcı', 'Hizmet Tarihleri', 'Misafir', 'İptal Politikası', 'Uzman Notları', 'Toplam Tutar (USD)', 'Geçerlilik',
    'ELIO+ SHIELD & CARE 24/7', 'Doğrulanmış Ödeme ile Dahil', 'Onaylı sağlayıcı hizmeti sunamazsa sözleşmesel %100 yerine getirme veya değişim garantisi.', 'Doğrulanmış sağlayıcı fiyatına gizli ek ücret yok; Stripe 3DS2 / PayPal koruması.', '7/24 canlı uzman desteği — özel direkt telefon hattı ödeme sonrası anında açılır.', 'MIAMI ELIO sözleşmesel ifa garantisidir — sigorta poliçesi değildir (Fla. Stat. § 626.9541).',
    'ADIM 01 · ELEKTRONİK SÖZLEŞME', 'Ödeme Öncesi İncele ve İmzala', 'Ödeme seçenekleri yalnızca aşağıdaki elektronik sözleşme imzalandıktan sonra açılır.', 'MIAMI ELIO’nun Sınırlı Ödeme Tahsilat Temsilcisi olduğunu; işletme, güvenlik, depozito ve kaza sorumluluğunun sağlayıcı ve misafire ait olduğunu kabul ederim.', 'Belirtilen iptal politikasını, ELIO+ Shield & Care 24/7 sözleşmesel garantisini (sigorta olmadığını bilerek) ve ESIGN / Florida UETA elektronik imzasını kabul ederim.', 'Tam Yasal Ad (Elektronik İmza)', 'Kimliğinizdeki tam adınızı girin',
    'Sözleşmeyi İmzala ve Ödemeyi Aç', 'ESIGN İmzası Kaydediliyor…', 'Lütfen iki kutuyu da işaretleyin ve tam adınızı girin.', 'İmza şu anda kaydedilemedi. Sayfayı yenileyip tekrar deneyin.', 'ESIGN İmzalandı', 'İmzalayan', 'İmza Tarihi', 'SHA-256 Belge Özeti',
    'ADIM 02 · DOĞRULANMIŞ ÖDEME', 'Rezervasyon Ödemesini Tamamla', 'Kart ve PayPal ödemesini açmak için Adım 01’i tamamlayın.', 'Kartla Öde · Stripe 3DS2', 'PayPal Business ile Öde', 'Güvenli ödeme geçidi açılıyor…', 'PayPal ödemesi onaylanıyor…',
    'Çevrimiçi ödeme geçitleri tamamlanıyor. İşlemi bitirmek için aşağıdaki sohbetten ELIO+ Guide uzmanına yazın.', 'Ödeme başlatılamadı. Tekrar deneyin veya sohbetten yazın.', 'Bu teklifle ilgili yardıma mı ihtiyacınız var?', 'Telegram’dan Uzmana Yaz', 'WhatsApp’tan Uzmana Yaz',
    'ONAYLI REZERVASYON KARTI', 'Rezervasyon Onaylandı ve Koruma Altında', 'Elektronik sözleşmeniz ve ödemeniz kaydedildi. Teslim ve 7/24 destek için bu kartı saklayın.', 'Ödeme Tarihi', 'Ödeme Yöntemi', 'İşlem Referansı', 'ELIO+ Shield & Care 24/7 · Aktif',
    'Özel 7/24 Direkt Telefon Hattı (Açıldı)', 'Yalnızca onaylı MIAMI ELIO misafirleri için rezervasyon süresince aktiftir.', '7/24 Uzman Hattını Ara', 'Direkt telefon hattı hazırlanıyor — aşağıdan öncelikli Telegram veya WhatsApp kullanın.', 'Kartı Yazdır / Kaydet',
    'Doğrulanmış Ödeme Teklifleri', 'Stripe veya PayPal öncesi zorunlu ESIGN içeren özel /pay bağlantısı oluşturun.', 'Bu talep için henüz ödeme teklifi yok.', 'Doğrulanmış Teklif Oluştur', 'Formu Gizle', 'Sağlayıcı Adı', 'Toplam Tutar (USD)',
    'Onaylı Hizmet Tarihleri', 'İptal Politikası', 'İsteğe Bağlı Notlar', 'Bağlantı Süresi (Saat)', 'Ödeme Bağlantısı Oluştur', 'Oluşturuluyor…',
    'Bağlantıyı Kopyala', 'Kopyalandı', 'Aç', 'Teklifi İptal Et', 'ESIGN İmzalı', 'Ödendi', 'Teklif güncellenemedi. Alanları kontrol edin.', 'Geçitler'
  ],
  fa: [
    'من با موارد زیر موافقم:', 'شرایط خدمات', 'و', 'سیاست حفظ حریم خصوصی', 'و می‌دانم درخواست‌ها بدون کسر وجه به‌صورت دستی تأیید می‌شوند.', 'لطفاً پیش از ارسال، شرایط خدمات و سیاست حفظ حریم خصوصی را بپذیرید.',
    'تاریخ اجرا', 'نسخه', 'اپراتور', 'بندهای حقوقی الزام‌آور زیر مطابق قوانین فلوریدا به زبان انگلیسی منتشر شده‌اند.', 'بازگشت به MIAMI ELIO', 'پرسش‌های حقوقی',
    'پرداخت تأییدشده رزرو', 'کد مرجع', 'در انتظار امضای ESIGN', 'توافق‌نامه امضا شد', 'کارت رزرو تأییدشده', 'پیشنهاد منقضی شد', 'پیشنهاد لغو شد',
    'در حال بارگذاری پیشنهاد تأییدشده…', 'لینک پرداخت در دسترس نیست', 'این لینک معتبر نیست یا بسته شده است. برای دریافت لینک جدید در چت با تیم ما تماس بگیرید.', 'مهلت این پیشنهاد به پایان رسیده است. از متخصص ELIO+ Guide در چت لینک جدید بخواهید.', 'این پیشنهاد توسط MIAMI ELIO لغو شده است.', 'پرداخت پیش از تکمیل لغو شد. توافق‌نامه امضاشده شما در پایین محفوظ است.',
    'جزئیات پیشنهاد تأییدشده', 'ارائه‌دهنده سرویس', 'تاریخ‌های سرویس', 'مهمان', 'قوانین لغو', 'یادداشت متخصص', 'مبلغ کل (USD)', 'معتبر تا',
    'ELIO+ SHIELD & CARE 24/7', 'شامل در پرداخت تأییدشده', 'تضمین قراردادی ۱۰۰٪ اجرا یا جایگزینی در صورت عدم ارائه سرویس توسط ارائه‌دهنده تأییدشده.', 'بدون افزایش پنهان روی نرخ ارائه‌دهنده؛ با حفاظت Stripe 3DS2 / PayPal.', 'پشتیبانی زنده ۲۴/۷ — خط تلفن مستقیم خصوصی بلافاصله پس از پرداخت باز می‌شود.', 'تضمین قراردادی اجرای MIAMI ELIO — بیمه‌نامه نیست (Fla. Stat. § 626.9541).',
    'گام ۰۱ · توافق‌نامه الکترونیکی', 'بررسی و امضا پیش از پرداخت', 'روش‌های پرداخت تنها پس از امضای توافق‌نامه الکترونیکی زیر باز می‌شوند.', 'تأیید می‌کنم MIAMI ELIO صرفاً نماینده محدود دریافت وجه است و مسئولیت عملیاتی، ودیعه و حوادث بر عهده ارائه‌دهنده و مهمان است.', 'قوانین لغو، تضمین قراردادی ELIO+ Shield & Care 24/7 (با آگاهی از اینکه بیمه نیست) و امضای الکترونیکی ESIGN / Florida UETA را می‌پذیرم.', 'نام قانونی کامل (امضای الکترونیکی)', 'نام کامل مطابق مدرک شناسایی را وارد کنید',
    'امضای توافق‌نامه و باز کردن پرداخت', 'در حال ثبت امضای ESIGN…', 'لطفاً هر دو گزینه را تیک بزنید و نام کامل خود را وارد کنید.', 'ثبت امضا ممکن نشد. صفحه را تازه کرده و دوباره تلاش کنید.', 'ESIGN امضا شد', 'امضاکننده', 'زمان امضا', 'هش SHA-256 سند',
    'گام ۰۲ · پرداخت تأییدشده', 'تکمیل پرداخت رزرو', 'برای باز شدن پرداخت با کارت و PayPal، ابتدا گام ۰۱ را تکمیل کنید.', 'پرداخت با کارت · Stripe 3DS2', 'پرداخت با PayPal Business', 'در حال باز کردن درگاه امن…', 'در حال تأیید پرداخت PayPal…',
    'درگاه‌های پرداخت آنلاین در حال تکمیل هستند. برای تسویه از طریق چت زیر با متخصص ELIO+ Guide در ارتباط باشید.', 'شروع پرداخت ممکن نشد. دوباره تلاش کنید یا در چت پیام دهید.', 'درباره این پیشنهاد راهنمایی نیاز دارید؟', 'پیام در Telegram', 'پیام در WhatsApp',
    'کارت رزرو تأییدشده', 'رزرو تأیید و محافظت شد', 'توافق‌نامه الکترونیکی و پرداخت شما ثبت شد. این کارت را برای تحویل و پشتیبانی ۲۴/۷ نگه دارید.', 'زمان پرداخت', 'روش پرداخت', 'شناسه تراکنش', 'ELIO+ Shield & Care 24/7 · فعال',
    'خط تلفن مستقیم خصوصی ۲۴/۷ (باز شد)', 'منحصراً برای مهمانان تأییدشده MIAMI ELIO در طول رزرو.', 'تماس با خط ۲۴/۷', 'خط مستقیم ۲۴/۷ در حال فعال‌سازی است — از Telegram یا WhatsApp اولویت‌دار زیر استفاده کنید.', 'چاپ / ذخیره کارت',
    'پیشنهادهای پرداخت تأییدشده', 'لینک خصوصی /pay با الزام امضای ESIGN پیش از Stripe یا PayPal بسازید.', 'هنوز پیشنهادی برای این درخواست ساخته نشده است.', 'ساخت پیشنهاد پرداخت', 'بستن فرم', 'نام ارائه‌دهنده', 'مبلغ کل (USD)',
    'تاریخ‌های تأییدشده', 'قوانین لغو', 'یادداشت اختیاری', 'اعتبار لینک (ساعت)', 'ساخت لینک پرداخت', 'در حال ساخت…',
    'کپی لینک', 'کپی شد', 'باز کردن', 'لغو پیشنهاد', 'ESIGN امضاشده', 'پرداخت‌شده', 'به‌روزرسانی پیشنهاد ممکن نشد. فیلدها را بررسی کنید.', 'درگاه‌ها'
  ],
  it: [
    'Accetto i', 'Termini di Servizio', 'e la', 'Privacy Policy', 'e comprendo che le richieste vengono confermate manualmente senza addebito immediato.', 'Accetta i Termini di Servizio e la Privacy Policy prima di inviare.',
    'In vigore dal', 'Versione', 'Operatore', 'Le clausole legali vincolanti di seguito sono pubblicate in inglese secondo la legge della Florida.', 'Torna a MIAMI ELIO', 'Richieste legali',
    'Checkout Verificato Prenotazione', 'Riferimento', 'In attesa di firma ESIGN', 'Accordo Firmato', 'Pass Confermato', 'Preventivo Scaduto', 'Preventivo Annullato',
    'Caricamento preventivo verificato…', 'Link di pagamento non disponibile', 'Questo link non è valido o non è più attivo. Scrivi al nostro team in chat per un nuovo link.', 'Questo preventivo è scaduto. Richiedi un link aggiornato allo specialista ELIO+ Guide in chat.', 'Questo preventivo è stato annullato da MIAMI ELIO.', 'Il pagamento è stato annullato prima del completamento. L’accordo firmato resta pronto qui sotto.',
    'Dettagli del Preventivo Confermato', 'Fornitore Operativo', 'Date del Servizio', 'Ospite', 'Politica di Cancellazione', 'Note dello Specialista', 'Totale Dovuto (USD)', 'Valido Fino Al',
    'ELIO+ SHIELD & CARE 24/7', 'Incluso nel Checkout Verificato', 'Garanzia contrattuale 100% di esecuzione e sostituzione se il fornitore confermato non adempie.', 'Nessun ricarico nascosto sulle tariffe verificate; protezione Stripe 3DS2 / PayPal.', 'Assistenza dedicata 24/7 — linea telefonica diretta privata sbloccata subito dopo il pagamento.', 'Garanzia contrattuale di esecuzione MIAMI ELIO — non è una polizza assicurativa (Fla. Stat. § 626.9541).',
    'FASE 01 · ACCORDO ELETTRONICO', 'Esamina e Firma Prima del Pagamento', 'I metodi di pagamento si sbloccano solo dopo la firma elettronica qui sotto.', 'Riconosco che MIAMI ELIO agisce come Agente Limitato di Incasso e che responsabilità operativa, cauzione e incidenti spettano al fornitore nominato e all’ospite.', 'Accetto la politica di cancellazione, la garanzia contrattuale ELIO+ Shield & Care 24/7 (comprendendo che non è un’assicurazione) e la firma elettronica ESIGN / Florida UETA.', 'Nome Legale Completo (Firma Elettronica)', 'Inserisci il nome completo come da documento',
    'Firma Accordo e Sblocca Pagamento', 'Registrazione firma ESIGN…', 'Seleziona entrambe le caselle e inserisci il tuo nome completo.', 'Impossibile salvare la firma. Aggiorna e riprova.', 'ESIGN Firmato', 'Firmato Da', 'Data Firma', 'Hash SHA-256 del Documento',
    'FASE 02 · PAGAMENTO VERIFICATO', 'Completa il Pagamento', 'Completa la Fase 01 (Accordo Elettronico) per sbloccare carta e PayPal.', 'Paga con Carta · Stripe 3DS2', 'Paga con PayPal Business', 'Apertura gateway sicuro…', 'Conferma pagamento PayPal…',
    'I gateway di pagamento online sono in fase di attivazione. Scrivi allo specialista ELIO+ Guide in chat qui sotto.', 'Impossibile avviare il pagamento. Riprova o scrivi in chat.', 'Serve aiuto con questo preventivo?', 'Scrivi su Telegram', 'Scrivi su WhatsApp',
    'PASS DI PRENOTAZIONE CONFERMATA', 'Prenotazione Confermata e Protetta', 'Accordo elettronico e pagamento verificato sono registrati. Conserva questo pass per la consegna e il supporto 24/7.', 'Pagato Il', 'Metodo di Pagamento', 'Riferimento Pagamento', 'ELIO+ Shield & Care 24/7 · Attivo',
    'Linea Telefonica Privata 24/7 (Sbloccata)', 'Riservata esclusivamente agli ospiti confermati MIAMI ELIO.', 'Chiama Linea 24/7', 'La linea telefonica diretta è in attivazione — usa Telegram o WhatsApp prioritario qui sotto.', 'Stampa / Salva Pass',
    'Preventivi di Pagamento Verificati', 'Genera un link privato /pay con firma ESIGN obbligatoria prima di Stripe o PayPal.', 'Nessun preventivo creato per questa richiesta.', 'Crea Preventivo Verificato', 'Nascondi Modulo', 'Nome Fornitore', 'Importo Totale (USD)',
    'Date Confermate', 'Politica di Cancellazione', 'Note Opzionali', 'Scadenza Link (Ore)', 'Genera Link Pagamento', 'Generazione…',
    'Copia Link', 'Copiato', 'Apri', 'Annulla Preventivo', 'ESIGN Firmato', 'Pagato', 'Impossibile aggiornare il preventivo. Controlla i campi.', 'Gateway'
  ],
  fr: [
    'J’accepte les', 'Conditions d’utilisation', 'et la', 'Politique de confidentialité', 'et je comprends que chaque demande est confirmée manuellement sans débit immédiat.', 'Veuillez accepter les Conditions d’utilisation et la Politique de confidentialité.',
    'En vigueur le', 'Version', 'Opérateur', 'Les clauses juridiques contraignantes ci-dessous sont publiées en anglais selon le droit de Floride.', 'Retour à MIAMI ELIO', 'Questions juridiques',
    'Paiement Vérifié de Réservation', 'Référence', 'Signature ESIGN requise', 'Accord Signé', 'Pass Confirmé', 'Devis Expiré', 'Devis Annulé',
    'Chargement du devis vérifié…', 'Lien de paiement indisponible', 'Ce lien est invalide ou expiré. Contactez notre équipe par chat pour obtenir un nouveau lien.', 'Ce devis a expiré. Demandez un lien actualisé à votre spécialiste ELIO+ Guide dans le chat.', 'Ce devis a été annulé par MIAMI ELIO.', 'Le paiement a été annulé avant finalisation. Votre accord signé reste prêt ci-dessous.',
    'Détails du Devis Confirmé', 'Prestataire Opérateur', 'Dates de Prestation', 'Client', 'Politique d’Annulation', 'Notes du Spécialiste', 'Total à Régler (USD)', 'Valable Jusqu’au',
    'ELIO+ SHIELD & CARE 24/7', 'Inclus avec le Paiement Vérifié', 'Garantie contractuelle 100% d’exécution et de remplacement en cas de défaillance du prestataire.', 'Aucune majoration cachée sur le tarif vérifié ; protection Stripe 3DS2 / PayPal.', 'Assistance dédiée 24/7 — ligne téléphonique privée directe débloquée dès le paiement.', 'Garantie contractuelle de MIAMI ELIO — ne constitue pas une police d’assurance (Fla. Stat. § 626.9541).',
    'ÉTAPE 01 · ACCORD ÉLECTRONIQUE', 'Relire et Signer Avant Paiement', 'Les moyens de paiement se débloquent uniquement après signature électronique ci-dessous.', 'Je reconnais que MIAMI ELIO agit en qualité d’Agent Limité d’Encaissement et que l’exploitation, la caution et la responsabilité d’accident incombent au prestataire nommé et au client.', 'J’accepte la politique d’annulation, la garantie contractuelle ELIO+ Shield & Care 24/7 (sans caractère d’assurance) et la signature électronique ESIGN / Florida UETA.', 'Nom Légal Complet (Signature Électronique)', 'Saisissez votre nom complet tel que sur votre pièce d’identité',
    'Signer l’Accord et Débloquer le Paiement', 'Enregistrement ESIGN…', 'Veuillez cocher les deux cases et saisir votre nom complet.', 'Impossible d’enregistrer la signature. Actualisez et réessayez.', 'ESIGN Signé', 'Signé Par', 'Signé Le', 'Empreinte SHA-256 du Document',
    'ÉTAPE 02 · PAIEMENT VÉRIFIÉ', 'Finaliser le Paiement', 'Complétez l’Étape 01 (Accord Électronique) pour débloquer carte et PayPal.', 'Payer par Carte · Stripe 3DS2', 'Payer avec PayPal Business', 'Ouverture de la passerelle sécurisée…', 'Confirmation du règlement PayPal…',
    'Les passerelles en ligne sont en cours d’activation. Contactez votre spécialiste ELIO+ Guide dans le chat ci-dessous.', 'Impossible de lancer le paiement. Réessayez ou écrivez dans le chat.', 'Besoin d’aide pour ce devis ?', 'Contacter sur Telegram', 'Contacter sur WhatsApp',
    'PASS DE RÉSERVATION CONFIRMÉE', 'Réservation Confirmée et Protégée', 'Votre accord électronique et votre paiement vérifié sont enregistrés. Conservez ce pass pour la remise et l’assistance 24/7.', 'Payé Le', 'Moyen de Paiement', 'Référence de Règlement', 'ELIO+ Shield & Care 24/7 · Actif',
    'Ligne Téléphonique Privée 24/7 (Débloquée)', 'Réservée exclusivement aux clients confirmés MIAMI ELIO.', 'Appeler la Ligne 24/7', 'La ligne téléphonique directe est en cours d’activation — utilisez Telegram ou WhatsApp prioritaire ci-dessous.', 'Imprimer / Enregistrer',
    'Devis de Paiement Vérifiés', 'Générez un lien privé /pay avec signature ESIGN obligatoire avant Stripe ou PayPal.', 'Aucun devis créé pour cette demande.', 'Créer un Devis Vérifié', 'Masquer le Formulaire', 'Nom du Prestataire', 'Montant Total (USD)',
    'Dates Confirmées', 'Politique d’Annulation', 'Notes Optionnelles', 'Expiration du Lien (Heures)', 'Générer le Lien de Paiement', 'Génération…',
    'Copier le Lien', 'Copié', 'Ouvrir', 'Annuler le Devis', 'ESIGN Signé', 'Payé', 'Impossible de mettre à jour le devis. Vérifiez les champs.', 'Passerelles'
  ],
  pl: [
    'Akceptuję', 'Regulamin', 'oraz', 'Politykę prywatności', 'i rozumiem, że zapytania są potwierdzane ręcznie bez natychmiastowego obciążenia.', 'Zaakceptuj Regulamin i Politykę prywatności przed wysłaniem.',
    'Obowiązuje od', 'Wersja', 'Operator', 'Wiążące klauzule prawne poniżej zostały opublikowane po angielsku zgodnie z prawem stanu Floryda.', 'Powrót do MIAMI ELIO', 'Sprawy prawne',
    'Zweryfikowana Płatność Rezerwacji', 'Numer referencyjny', 'Oczekuje na podpis ESIGN', 'Umowa Podpisana', 'Potwierdzona Przepustka', 'Oferta Wygasła', 'Oferta Anulowana',
    'Ładowanie zweryfikowanej oferty…', 'Link płatności niedostępny', 'Ten link jest nieprawidłowy lub nieaktywny. Napisz do naszego zespołu na czacie po nowy link.', 'Ta oferta wygasła. Poproś specjalistę ELIO+ Guide na czacie o aktualny link.', 'Ta oferta została anulowana przez MIAMI ELIO.', 'Płatność została przerwana przed ukończeniem. Twoja podpisana umowa jest gotowa poniżej.',
    'Szczegóły Potwierdzonej Oferty', 'Dostawca Usługi', 'Termin Usługi', 'Gość', 'Polityka Anulowania', 'Uwagi Specjalisty', 'Kwota Do Zapłaty (USD)', 'Ważne Do',
    'ELIO+ SHIELD & CARE 24/7', 'W Cenie Zweryfikowanej Płatności', 'Umowna 100% gwarancja realizacji lub zamiany, jeśli potwierdzony dostawca zawiedzie.', 'Bez ukrytych marż platformy; ochrona Stripe 3DS2 / PayPal.', 'Wsparcie specjalistów 24/7 — prywatna bezpośrednia linia telefoniczna otwiera się po opłaceniu.', 'Umowna gwarancja realizacji MIAMI ELIO — nie jest polisą ubezpieczeniową (Fla. Stat. § 626.9541).',
    'KROK 01 · UMOWA ELEKTRONICZNA', 'Przeczytaj i Podpisz Przed Płatnością', 'Metody płatności odblokują się dopiero po podpisaniu poniższej umowy elektronicznej.', 'Potwierdzam, że MIAMI ELIO działa jako Ograniczony Agent Płatniczy, a odpowiedzialność operacyjna, kaucja i szkody spoczywają na dostawcy i gościu.', 'Akceptuję politykę anulowania, umowną gwarancję ELIO+ Shield & Care 24/7 (rozumiejąc, że nie jest to ubezpieczenie) oraz podpis elektroniczny ESIGN / Florida UETA.', 'Pełne Imię i Nazwisko (Podpis Elektroniczny)', 'Wpisz pełne imię i nazwisko jak w dokumencie',
    'Podpisz Umowę i Odblokuj Płatność', 'Zapisywanie podpisu ESIGN…', 'Zaznacz oba pola i wpisz pełne imię i nazwisko.', 'Nie udało się zapisać podpisu. Odśwież stronę i spróbuj ponownie.', 'ESIGN Podpisano', 'Podpisał(a)', 'Data Podpisu', 'Skrót SHA-256 Dokumentu',
    'KROK 02 · ZWERYFIKOWANA PŁATNOŚĆ', 'Dokończ Płatność Rezerwacji', 'Ukończ Krok 01 (Umowa Elektroniczna), aby odblokować kartę i PayPal.', 'Zapłać Kartą · Stripe 3DS2', 'Zapłać przez PayPal Business', 'Otwieranie bezpiecznej bramki płatności…', 'Potwierdzanie płatności PayPal…',
    'Bramki płatności online są w trakcie finalizacji. Napisz do specjalisty ELIO+ Guide na czacie poniżej.', 'Nie udało się rozpocząć płatności. Spróbuj ponownie lub napisz na czacie.', 'Potrzebujesz pomocy z tą ofertą?', 'Napisz na Telegram', 'Napisz na WhatsApp',
    'POTWIERDZONA PRZEPUSTKA REZERWACJI', 'Rezerwacja Potwierdzona i Chroniona', 'Twoja umowa elektroniczna i płatność zostały zapisane. Zachowaj tę przepustkę do odbioru i wsparcia 24/7.', 'Opłacono', 'Metoda Płatności', 'Numer Transakcji', 'ELIO+ Shield & Care 24/7 · Aktywne',
    'Prywatna Bezpośrednia Linia 24/7 (Odblokowana)', 'Dostępna wyłącznie dla potwierdzonych gości MIAMI ELIO.', 'Zadzwoń na Linię 24/7', 'Bezpośrednia linia 24/7 jest w trakcie uruchamiania — użyj priorytetowego Telegrama lub WhatsApp poniżej.', 'Drukuj / Zapisz',
    'Zweryfikowane Oferty Płatności', 'Wygeneruj prywatny link /pay z obowiązkowym ESIGN przed Stripe lub PayPal.', 'Brak ofert płatności dla tego zapytania.', 'Utwórz Ofertę Płatności', 'Ukryj Formularz', 'Nazwa Dostawcy', 'Kwota Całkowita (USD)',
    'Potwierdzone Terminy', 'Polityka Anulowania', 'Opcjonalne Uwagi', 'Ważność Linku (Godziny)', 'Generuj Link Płatności', 'Generowanie…',
    'Kopiuj Link', 'Skopiowano', 'Otwórz', 'Anuluj Ofertę', 'ESIGN Podpisano', 'Opłacono', 'Nie udało się zaktualizować oferty. Sprawdź pola.', 'Bramki'
  ]
};

export const CHECKOUT_COPY = Object.fromEntries(
  Object.entries(rows).map(([locale, values]) => {
    if (values.length !== keys.length) {
      throw new Error(`Incomplete checkout copy for ${locale}: got ${values.length}, expected ${keys.length}`);
    }
    return [locale, Object.freeze(Object.fromEntries(keys.map((key, index) => [key, values[index]])))];
  })
);

export function getCheckoutCopy(locale) {
  return CHECKOUT_COPY[locale] || CHECKOUT_COPY.en;
}
