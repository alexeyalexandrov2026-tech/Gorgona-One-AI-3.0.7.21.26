// 16-language Booking OS 2.0 copy for /pay/[token] and AdminQuotePanel:
// All-In Transparent Breakdown, NOAA Weather Shield, Group Split-Pay links,
// Refundable Security Deposit Pre-Auth, and 24-Hour Price Lock.

const keys = [
  'breakdownTitle', 'breakdownBadge', 'breakdownTotalDue', 'breakdownDepositSeparate',
  'weatherEyebrow', 'weatherTitle', 'weatherBody', 'weatherActive',
  'splitEyebrow', 'splitTitle', 'splitProgress', 'splitGuestLabel', 'splitPaid', 'splitOpen',
  'splitCopyLink', 'splitCopied', 'splitPayStripe', 'splitPayPayPal', 'splitActiveHint',
  'splitPayerName', 'splitAutoUnlock', 'splitOrPayFull',
  'depositEyebrow', 'depositTitle', 'depositBody', 'depositZeroCharge',
  'depositPending', 'depositHeld', 'depositReleased', 'depositHoldButton',
  'lockEyebrow', 'lockTitle', 'lockBody', 'lockButton', 'lockActive', 'lockReleased',
  'adminSplitWays', 'adminDepositUsd', 'adminPriceLockUsd', 'adminWeatherShield',
  'adminLineItems', 'adminAddLine', 'adminLineLabel', 'adminLineAmount',
  'adminReleaseDeposit', 'adminReleaseLock', 'adminHoldBadge', 'adminLockBadge'
];

const en = [
  'All-In Transparent Breakdown', 'Zero Hidden Fees', 'Total Due Today', 'Refundable Deposit Pre-Auth (Hold Only · Not Charged)',
  'NOAA WEATHER SHIELD', 'Automatic Weather Protection', 'If NOAA issues a Small Craft Advisory or severe storm warning for Miami/Biscayne Bay, reschedule free or receive a 100% refund.', 'NOAA Weather Shield · Active',
  'GROUP SPLIT-PAY', 'Split Payment Across Guests', 'Funded', 'Guest Share', 'Paid', 'Open',
  'Copy Share Link', 'Link Copied', 'Pay This Share · Card', 'Pay Share · PayPal', 'You opened a personal Split-Pay share link below.',
  'Your name (optional)', 'Reservation Pass & 24/7 private phone unlock automatically once all shares reach 100%.', 'Or settle the full remaining balance at once',
  'SECURITY DEPOSIT PRE-AUTH', 'Refundable Card Hold (Not Charged)', 'Authorized separately via Stripe manual capture. Zero charge upfront — released in 1 click after clean handover.', '$0 Charged Upfront',
  'Pre-Auth Pending', 'Hold Active · Not Charged', 'Hold Released', 'Authorize Refundable Deposit Hold',
  '24-HOUR PRICE LOCK', 'Lock Rate & Availability for 24h', 'Place a refundable card hold to freeze this exact verified rate and hold inventory for 24 hours while your group finalizes.', 'Lock Price for 24h (Refundable Hold)', 'Price Locked · 24h Active', 'Lock Released',
  'Group Split-Pay (Guests 1–12)', 'Refundable Deposit Hold (USD)', '24h Price Lock Hold (USD)', 'Include NOAA Weather Shield guarantee',
  'All-In Line Items (optional)', '+ Add Line Item', 'Item description (e.g. Base Rate, FL Tax)', 'Amount (USD)',
  'Release Deposit Hold', 'Release Price Lock', 'Deposit', 'Price Lock'
];

const rows = {
  en,
  ru: [
    'Прозрачная детализация All-In', 'Без скрытых сборов', 'Итого к оплате сейчас', 'Возвратный депозит (Преавторизация · Без списания)',
    'NOAA WEATHER SHIELD', 'Защита от непогоды Майами', 'При штормовом предупреждении NOAA для Майами / Бискейн-Бэй — бесплатный перенос даты или 100% возврат.', 'NOAA Weather Shield · Активно',
    'ГРУППОВОЙ SPLIT-PAY', 'Разделить оплату между гостями', 'Оплачено', 'Доля гостя', 'Оплачено', 'Ожидает',
    'Ссылка для гостя', 'Скопировано', 'Оплатить долю · Карта', 'Оплатить долю · PayPal', 'Вы открыли персональную ссылку Split-Pay для оплаты своей доли.',
    'Ваше имя (опционально)', 'Пропуск бронирования и прямая линия 24/7 откроются автоматически при 100% оплате долей.', 'Или оплатите всю сумму целиком',
    'ВОЗВРАТНЫЙ ДЕПОЗИТ (PRE-AUTH)', 'Холд на карте без списания', 'Оформляется отдельным холдом Stripe (manual capture). Средства не списываются и снимаются в 1 клик после возврата.', '$0 списания сразу',
    'Ожидает холда', 'Холд активен · Не списано', 'Холд снят', 'Заблокировать возвратный депозит',
    'ФИКСАЦИЯ ЦЕНЫ НА 24 ЧАСА', 'Заморозить цену и слот на 24ч', 'Поставьте возвратный холд, чтобы закрепить эту точную котировку и наличие на 24 часа, пока группа согласует детали.', 'Зафиксировать цену на 24ч (холд)', 'Цена зафиксирована · 24ч', 'Холд снят',
    'Групповой Split-Pay (гостей 1–12)', 'Возвратный депозит Pre-Auth (USD)', 'Холд фиксации цены 24ч (USD)', 'Включить гарантию NOAA Weather Shield',
    'Позиции детализации All-In (опционально)', '+ Добавить строку', 'Описание (напр. Тариф, Налог FL)', 'Сумма (USD)',
    'Снять холд депозита', 'Снять холд фиксации', 'Депозит', 'Фиксация 24ч'
  ],
  es: [
    'Desglose Transparente All-In', 'Sin Cargos Ocultos', 'Total a Pagar Hoy', 'Depósito Reembolsable Pre-Auth (Solo Retención)',
    'NOAA WEATHER SHIELD', 'Protección Climática Automática', 'Si NOAA emite aviso de tormenta o embarcaciones menores en Miami, reprograma gratis o recibe 100% de reembolso.', 'NOAA Weather Shield · Activo',
    'SPLIT-PAY GRUPAL', 'Dividir Pago Entre Invitados', 'Pagado', 'Parte del Invitado', 'Pagado', 'Pendiente',
    'Copiar Enlace', 'Copiado', 'Pagar Esta Parte · Tarjeta', 'Pagar Parte · PayPal', 'Abriste un enlace personal de Split-Pay.',
    'Tu nombre (opcional)', 'El Pase Confirmado y la línea 24/7 se desbloquean al llegar al 100%.', 'O paga el total completo ahora',
    'DEPÓSITO PRE-AUTORIZADO', 'Retención Reembolsable (Sin Cargo)', 'Retención separada con Stripe manual capture. $0 cobrado por adelantado; se libera en 1 clic tras la entrega.', '$0 Cobrado Hoy',
    'Retención Pendiente', 'Retención Activa · Sin Cargo', 'Retención Liberada', 'Autorizar Depósito Reembolsable',
    'BLOQUEO DE PRECIO 24H', 'Congelar Tarifa por 24 Horas', 'Coloca una retención reembolsable para congelar esta tarifa verificada durante 24 horas.', 'Bloquear Precio 24h (Retención)', 'Precio Bloqueado · 24h', 'Liberado',
    'Split-Pay Grupal (1–12)', 'Depósito Pre-Auth (USD)', 'Bloqueo 24h (USD)', 'Incluir garantía NOAA Weather Shield',
    'Conceptos All-In (opcional)', '+ Añadir Concepto', 'Descripción (Tarifa, Impuestos FL)', 'Monto (USD)',
    'Liberar Depósito', 'Liberar Bloqueo 24h', 'Depósito', 'Bloqueo 24h'
  ],
  he: [
    'פירוט מחיר שקוף All-In', 'ללא עמלות נסתרות', 'סה״כ לתשלום היום', 'פיקדון מוחזר Pre-Auth (מסגרת בלבד)',
    'NOAA WEATHER SHIELD', 'הגנת מזג אוויר אוטומטית', 'בהתראת סערה של NOAA במיאמי — דחייה ללא עלות או החזר מלא של 100%.', 'NOAA Weather Shield · פעיל',
    'תשלום משותף SPLIT-PAY', 'חלוקת תשלום בין אורחים', 'שולם', 'חלק אורח', 'שולם', 'פתוח',
    'העתק קישור', 'הועתק', 'שלם חלק זה · כרטיס', 'שלם חלק · PayPal', 'פתחת קישור אישי לתשלום חלקך ב-Split-Pay.',
    'שמך (אופציונלי)', 'אישור ההזמנה והקו הפרטי 24/7 נפתחים אוטומטית ב-100% תשלום.', 'או שלם את מלוא הסכום כעת',
    'פיקדון ביטחון PRE-AUTH', 'שמירת מסגרת מוחזרת (ללא חיוב)', 'שמירת מסגרת נפרדת ב-Stripe ללא חיוב מראש — משוחררת בלחיצה אחת בסיום.', '$0 חיוב מראש',
    'ממתין לאישור', 'מסגרת שמורה · ללא חיוב', 'מסגרת שוחררה', 'אשר שמירת פיקדון מוחזר',
    'נעילת מחיר ל-24 שעות', 'הקפאת מחיר וזמינות ל-24 שעות', 'שריינו מחיר זה ל-24 שעות באמצעות מסגרת מוחזרת בזמן שהקבוצה מאשרת.', 'נעל מחיר ל-24 שעות', 'מחיר נעול · 24 שעות', 'שוחרר',
    'חלוקת Split-Pay (1–12)', 'פיקדון Pre-Auth (USD)', 'נעילת מחיר 24ש (USD)', 'כלול הגנת NOAA Weather Shield',
    'שורות פירוט All-In', '+ הוסף שורה', 'תיאור (תעריף, מס)', 'סכום (USD)',
    'שחרר פיקדון', 'שחרר נעילת מחיר', 'פיקדון', 'נעילה 24ש'
  ],
  zh: [
    '全包透明明细 (All-In)', '零隐藏费用', '今日应付总额', '可退押金预授权（仅冻结·不扣款）',
    'NOAA 气象保障', '自动天气改期/退款保障', '若 NOAA 发布迈阿密恶劣天气预警，可免费改期或享 100% 全额退款。', 'NOAA 气象保障 · 已激活',
    '多人 AA 拼单 SPLIT-PAY', '与同行宾客分摊付款', '已筹集', '宾客份额', '已支付', '待支付',
    '复制专属链接', '已复制', '支付此份额 · 银行卡', '支付份额 · PayPal', '您正在查看专属 Split-Pay 分摊支付链接。',
    '您的姓名（可选）', '所有份额达到 100% 后自动解锁确认通行证与 24/7 专线。', '或一次性支付全额',
    '押金预授权 PRE-AUTH', '可退银行卡预授权（不扣款）', '通过 Stripe 单独预授权冻结，零预扣款，归还无损后一键释放。', '预扣 $0',
    '待预授权', '已冻结 · 未扣款', '已释放', '授权可退押金冻结',
    '24小时锁价保障', '锁定此价格与档期 24 小时', '通过可退预授权锁定当前认证报价 24 小时，方便团队确认行程。', '锁定价格 24 小时（预授权）', '已锁价 · 24h 生效中', '已释放',
    '多人 Split-Pay（1–12人）', '可退押金预授权 (USD)', '24小时锁价预授权 (USD)', '包含 NOAA 气象保障',
    '全包明细项目（可选）', '+ 添加明细', '项目名称（如基础租金、税费）', '金额 (USD)',
    '释放押金预授权', '释放锁价预授权', '押金', '24h锁价'
  ],
  pt: [
    'Detalhamento Transparente All-In', 'Zero Taxas Ocultas', 'Total Devido Hoje', 'Caução Reembolsável Pré-Auth (Apenas Retenção)',
    'NOAA WEATHER SHIELD', 'Proteção Climática Automática', 'Em caso de alerta NOAA para Miami/Biscayne Bay, reagende grátis ou receba 100% de reembolso.', 'NOAA Weather Shield · Ativo',
    'SPLIT-PAY EM GRUPO', 'Dividir Pagamento Entre Convidados', 'Pago', 'Parte do Convidado', 'Pago', 'Aberto',
    'Copiar Link', 'Copiado', 'Pagar Esta Parte · Cartão', 'Pagar Parte · PayPal', 'Você abriu um link pessoal de Split-Pay.',
    'Seu nome (opcional)', 'O Passe Confirmado e o telefone 24/7 são liberados ao atingir 100%.', 'Ou pague o total de uma vez',
    'CAUÇÃO PRÉ-AUTORIZADA', 'Retenção Reembolsável (Sem Cobrança)', 'Retenção separada via Stripe manual capture. $0 cobrado na hora; liberada em 1 clique.', '$0 Cobrado Agora',
    'Pré-Auth Pendente', 'Retenção Ativa · Sem Cobrança', 'Retenção Liberada', 'Autorizar Retenção de Caução',
    'TRAVA DE PREÇO 24H', 'Congelar Tarifa por 24 Horas', 'Faça uma retenção reembolsável para travar tarifa e disponibilidade por 24h.', 'Travar Preço 24h (Retenção)', 'Preço Travado · 24h', 'Liberado',
    'Split-Pay Grupo (1–12)', 'Caução Pré-Auth (USD)', 'Trava 24h (USD)', 'Incluir NOAA Weather Shield',
    'Itens All-In (opcional)', '+ Adicionar Item', 'Descrição (Tarifa, Imposto FL)', 'Valor (USD)',
    'Liberar Caução', 'Liberar Trava 24h', 'Caução', 'Trava 24h'
  ],
  uk: [
    'Прозора деталізація All-In', 'Без прихованих зборів', 'Разом до сплати зараз', 'Поворотна застава (Преавторизація · Без списання)',
    'NOAA WEATHER SHIELD', 'Захист від негоди Маямі', 'За штормового попередження NOAA для Маямі — безкоштовне перенесення або 100% повернення.', 'NOAA Weather Shield · Активно',
    'ГРУПОВИЙ SPLIT-PAY', 'Розділити оплату між гостями', 'Сплачено', 'Частка гостя', 'Сплачено', 'Очікує',
    'Посилання гостю', 'Скопійовано', 'Сплатити частку · Картка', 'Сплатити частку · PayPal', 'Ви відкрили персональне посилання Split-Pay.',
    'Ваше ім’я (опціонально)', 'Пропуск бронювання та лінія 24/7 відкриються автоматично при 100% оплаті.', 'Або сплатіть всю суму одразу',
    'ПОВОРОТНА ЗАСТАВА (PRE-AUTH)', 'Холд на картці без списання', 'Оформлюється окремим холдом Stripe без списання коштів; знімається в 1 клік.', '$0 списання одразу',
    'Очікує холду', 'Холд активний · Не списано', 'Холд знято', 'Авторизувати поворотну заставу',
    'ФІКСАЦІЯ ЦІНИ НА 24 ГОДИНИ', 'Заморозити ціну та слот на 24г', 'Поставте поворотний холд, щоб закріпити тариф і наявність на 24 години.', 'Зафіксувати ціну на 24г (холд)', 'Ціну зафіксовано · 24г', 'Холд знято',
    'Груповий Split-Pay (1–12)', 'Поворотна застава Pre-Auth (USD)', 'Фіксація ціни 24г (USD)', 'Включити гарантію NOAA Weather Shield',
    'Рядки деталізації All-In', '+ Додати рядок', 'Опис (Тариф, Податок FL)', 'Сума (USD)',
    'Зняти холд застави', 'Зняти холд фіксації', 'Застава', 'Фіксація 24г'
  ],
  ja: [
    'オールイン透明明細', '隠れ手数料ゼロ', '本日のお支払い合計', '返金可能デポジット仮押さえ（引き落としなし）',
    'NOAA 気象シールド', '自動悪天候プロテクション', 'マイアミ海域に NOAA 警報発令時は無料日程変更または 100% 返金。', 'NOAA Weather Shield · 有効',
    'グループ分割払い SPLIT-PAY', 'ゲスト間で料金を分割', '決済済み', 'ゲスト負担分', '決済済', '未決済',
    '専用リンクをコピー', 'コピー済', 'この枠をカード決済', 'この枠を PayPal 決済', '専用の Split-Pay 決済リンクを開いています。',
    'お名前（任意）', '全員の決済が 100% 完了すると確定パスと 24/7 専任電話が自動開示されます。', 'または全額を一括決済',
    'デポジット仮押さえ PRE-AUTH', 'カード与信枠確保（即時請求なし）', 'Stripe 手動確定による仮押さえ。返却後にワンクリックで即時解除されます。', '事前請求 $0',
    '仮押さえ待ち', '与信確保中 · 未請求', '解除済み', '返金可能デポジットを仮押さえ',
    '24時間プライスロック', '24時間料金と在庫を固定', '返金可能な仮押さえで、グループ確認中の 24 時間この料金を保証します。', '24時間価格をロック（仮押さえ）', '価格ロック中 · 24h', '解除済',
    'グループ分割 (1–12名)', 'デポジット仮押さえ (USD)', '24h プライスロック (USD)', 'NOAA 気象シールドを含める',
    'オールイン明細項目（任意）', '+ 項目を追加', '項目名（基本料金、税など）', '金額 (USD)',
    'デポジット仮押さえ解除', 'プライスロック解除', 'デポジット', '24hロック'
  ],
  ko: [
    '투명한 All-In 요금 명세', '숨겨진 수수료 없음', '오늘 결제 총액', '환불 가능 보증금 사전승인 (결제 없음)',
    'NOAA 기상 쉴드', '자동 기상 보호 보장', '마이애미 NOAA 악천후 경보 시 무료 일정 변경 또는 100% 환불.', 'NOAA Weather Shield · 활성',
    '그룹 분할 결제 SPLIT-PAY', '일행과 결제 나누기', '결제 완료', '게스트 몫', '완료', '대기',
    '링크 복사', '복사됨', '내 몫 카드 결제', '내 몫 PayPal 결제', '개인 Split-Pay 결제 링크로 접속했습니다.',
    '이름 (선택)', '모든 몫이 100% 완료되면 확정 패스와 24/7 직통 전화가 자동 열립니다.', '또는 전체 금액 일괄 결제',
    '보증금 사전승인 PRE-AUTH', '환불 가능 카드 홀드 (미청구)', 'Stripe 수동 승인 홀드로 선결제 $0. 정상 반납 후 원클릭 해제됩니다.', '선결제 $0',
    '사전승인 대기', '홀드 활성 · 미청구', '홀드 해제됨', '환불 가능 보증금 사전승인',
    '24시간 가격 고정', '24시간 요금 및 재고 잠금', '환불 가능한 카드 홀드로 24시간 동안 이 요금을 안전하게 고정하세요.', '24시간 가격 고정 (홀드)', '가격 고정됨 · 24h', '해제됨',
    '그룹 Split-Pay (1–12명)', '보증금 홀드 (USD)', '24시간 가격 고정 (USD)', 'NOAA 기상 쉴드 포함',
    'All-In 세부 항목 (선택)', '+ 항목 추가', '항목 설명 (기본 요금, 세금)', '금액 (USD)',
    '보증금 홀드 해제', '가격 고정 해제', '보증금', '24h 고정'
  ],
  de: [
    'Transparente All-In Aufschlüsselung', 'Keine versteckten Gebühren', 'Heute fälliger Gesamtbetrag', 'Erstattungsfähige Kaution (Pre-Auth · Keine Belastung)',
    'NOAA WEATHER SHIELD', 'Automatischer Wetterschutz', 'Bei NOAA-Sturmwarnung für Miami/Biscayne Bay kostenlos umbuchen oder 100% Rückerstattung.', 'NOAA Weather Shield · Aktiv',
    'GRUPPEN SPLIT-PAY', 'Zahlung unter Gästen aufteilen', 'Finanziert', 'Gästeanteil', 'Bezahlt', 'Offen',
    'Anteil-Link kopieren', 'Kopiert', 'Diesen Anteil zahlen · Karte', 'Anteil · PayPal', 'Sie haben einen persönlichen Split-Pay-Link geöffnet.',
    'Ihr Name (optional)', 'Bestätigter Pass & 24/7-Direktleitung werden bei 100% automatisch freigeschaltet.', 'Oder Gesamtbetrag direkt begleichen',
    'KAUTIONS-VORAUTORISIERUNG', 'Erstattungsfähige Reservierung (Keine Abbuchung)', 'Separate Stripe-Vorautorisierung ohne Abbuchung — nach Rückgabe mit 1 Klick freigegeben.', '$0 sofort belastet',
    'Pre-Auth ausstehend', 'Reservierung aktiv · Nicht belastet', 'Freigegeben', 'Erstattungsfähige Kaution autorisieren',
    '24-STUNDEN PREISGARANTIE', 'Preis & Verfügbarkeit 24h sichern', 'Sichern Sie diesen verifizierten Preis 24 Stunden lang per erstattungsfähiger Vorautorisierung.', 'Preis 24h fixieren (Pre-Auth)', 'Preis fixiert · 24h aktiv', 'Freigegeben',
    'Gruppen Split-Pay (1–12)', 'Kautions-Pre-Auth (USD)', '24h Preissicherung (USD)', 'NOAA Weather Shield einschließen',
    'All-In Positionen (optional)', '+ Position hinzufügen', 'Beschreibung (Grundpreis, Steuer)', 'Betrag (USD)',
    'Kaution freigeben', 'Preissicherung freigeben', 'Kaution', '24h Lock'
  ],
  ar: [
    'تفصيل شفاف شامل (All-In)', 'بدون رسوم خفية', 'الإجمالي المستحق اليوم', 'وديعة ضمان قابلة للاسترداد (حجز مؤقت دون خصم)',
    'درع الطقس NOAA', 'حماية تلقائية للطقس', 'في حال تحذير NOAA من عاصفة في ميامي، إعادة جدولة مجانية أو استرداد 100%.', 'درع الطقس NOAA · نشط',
    'الدفع الجماعي SPLIT-PAY', 'قسّم الدفع بين الضيوف', 'تم سداد', 'حصة الضيف', 'مدفوع', 'مفتوح',
    'نسخ رابط الحصة', 'تم النسخ', 'ادفع هذه الحصة · بطاقة', 'ادفع الحصة · PayPal', 'لقد فتحت رابط Split-Pay الشخصي الخاص بك.',
    'اسمك (اختياري)', 'يُفتح التصريح والخط المباشر 24/7 تلقائياً عند اكتمال 100%.', 'أو ادفع المبلغ كاملاً دفعة واحدة',
    'حجز وديعة الضمان PRE-AUTH', 'حجز مؤقت على البطاقة (دون خصم)', 'تفويض منفصل عبر Stripe دون خصم مسبق؛ يُفك الحجز بنقرة واحدة بعد التسليم.', '$0 خصم مسبق',
    'بانتظار التفويض', 'الحجز نشط · دون خصم', 'تم فك الحجز', 'تفويض حجز الوديعة المستردة',
    'تثبيت السعر لمدة 24 ساعة', 'جمّد السعر والتوفر لمدة 24 ساعة', 'ضع تفويضاً مؤقتاً لتجميد هذا السعر المؤكد لمدة 24 ساعة أثناء تنسيق المجموعة.', 'تثبيت السعر 24 ساعة (حجز مؤقت)', 'السعر مثبت · 24 ساعة', 'تم فك التثبيت',
    'الدفع الجماعي (1–12)', 'وديعة الضمان (USD)', 'تثبيت السعر 24س (USD)', 'تفعيل درع الطقس NOAA',
    'بنود التفصيل الشامل', '+ إضافة بند', 'الوصف (السعر الأساسي، الضريبة)', 'المبلغ (USD)',
    'فك حجز الوديعة', 'فك تثبيت السعر', 'الوديعة', 'تثبيت 24س'
  ],
  tr: [
    'Şeffaf All-In Fiyat Dökümü', 'Gizli Ücret Yok', 'Bugün Ödenecek Toplam', 'İade Edilebilir Depozito Provizyonu (Tahsil Edilmez)',
    'NOAA HAVA KALKANI', 'Otomatik Hava Koruması', 'Miami için NOAA fırtına uyarısında ücretsiz tarih değişikliği veya %100 iade.', 'NOAA Weather Shield · Aktif',
    'GRUP SPLIT-PAY', 'Ödemeyi Misafirler Arasında Böl', 'Ödendi', 'Misafir Payı', 'Ödendi', 'Açık',
    'Pay Linkini Kopyala', 'Kopyalandı', 'Bu Payı Öde · Kart', 'Payı Öde · PayPal', 'Kişisel Split-Pay ödeme bağlantınızı açtınız.',
    'Adınız (isteğe bağlı)', 'Tüm paylar %100 olduğunda Onaylı Kart ve 7/24 özel hat otomatik açılır.', 'Veya tüm tutarı tek seferde öde',
    'DEPOZİTO PROVİZYONU', 'İade Edilebilir Kart Blokesi (Tahsil Edilmez)', 'Stripe manuel provizyon ile peşin $0 tahsilat; sorunsuz teslim sonrası tek tıkla kalkar.', '$0 Peşin Tahsilat',
    'Provizyon Bekliyor', 'Bloke Aktif · Tahsil Edilmedi', 'Bloke Kaldırıldı', 'Depozito Provizyonunu Onayla',
    '24 SAAT FİYAT KİLİDİ', 'Fiyat ve Müsaitliği 24 Saat Dondur', 'Grubunuz karar verirken bu doğrulanmış fiyatı 24 saat boyunca iade edilebilir blokeyle kilitleyin.', 'Fiyatı 24 Saat Kilitle (Bloke)', 'Fiyat Kilitli · 24s', 'Kilit Kaldırıldı',
    'Grup Split-Pay (1–12)', 'Depozito Provizyonu (USD)', '24s Fiyat Kilidi (USD)', 'NOAA Hava Kalkanı dahil et',
    'All-In Kalemler (isteğe bağlı)', '+ Kalem Ekle', 'Açıklama (Taban Fiyat, Vergi)', 'Tutar (USD)',
    'Depozito Blokesini Kaldır', 'Fiyat Kilidini Kaldır', 'Depozito', '24s Kilit'
  ],
  fa: [
    'جزئیات شفاف All-In', 'بدون هزینه پنهان', 'مبلغ قابل پرداخت امروز', 'ودیعه قابل استرداد Pre-Auth (فقط مسدودسازی)',
    'سپر آب‌وهوایی NOAA', 'محافظت خودکار جوی', 'در صورت هشدار طوفان NOAA برای میامی، تغییر تاریخ رایگان یا بازگشت ۱۰۰٪ وجه.', 'NOAA Weather Shield · فعال',
    'پرداخت گروهی SPLIT-PAY', 'تقسیم پرداخت بین مهمانان', 'پرداخت‌شده', 'سهم مهمان', 'پرداخت‌شده', 'باز',
    'کپی لینک سهم', 'کپی شد', 'پرداخت این سهم · کارت', 'پرداخت سهم · PayPal', 'شما لینک شخصی Split-Pay خود را باز کرده‌اید.',
    'نام شما (اختیاری)', 'با تکمیل ۱۰۰٪ سهم‌ها، کارت تایید و خط ۲۴/۷ به‌صورت خودکار باز می‌شود.', 'یا کل مبلغ را یکجا پرداخت کنید',
    'ودیعه امنیتی PRE-AUTH', 'مسدودسازی قابل استرداد (بدون کسر وجه)', 'مجوز جداگانه Stripe بدون برداشت اولیه؛ پس از تحویل با یک کلیک آزاد می‌شود.', '$0 برداشت اولیه',
    'در انتظار مسدودسازی', 'مسدود فعال · بدون کسر', 'آزاد شد', 'تأیید مسدودسازی ودیعه',
    'قفل قیمت ۲۴ ساعته', 'ثابت نگه‌داشتن نرخ برای ۲۴ ساعت', 'با یک مسدودسازی قابل استرداد، این نرخ تاییدشده را ۲۴ ساعت نگه دارید.', 'قفل قیمت ۲۴ ساعته', 'قیمت قفل شد · ۲۴س', 'آزاد شد',
    'پرداخت گروهی (۱–۱۲)', 'ودیعه Pre-Auth (USD)', 'قفل قیمت ۲۴س (USD)', 'شامل سپر NOAA Weather Shield',
    'اقلام All-In (اختیاری)', '+ افزودن ردیف', 'شرح (نرخ پایه، مالیات)', 'مبلغ (USD)',
    'آزادسازی ودیعه', 'آزادسازی قفل قیمت', 'ودیعه', 'قفل ۲۴س'
  ],
  it: [
    'Dettaglio Trasparente All-In', 'Zero Costi Nascosti', 'Totale Dovuto Oggi', 'Cauzione Rimborsabile Pre-Auth (Solo Blocco)',
    'NOAA WEATHER SHIELD', 'Protezione Meteo Automatica', 'In caso di allerta NOAA per Miami/Biscayne Bay, riprogrammazione gratuita o rimborso 100%.', 'NOAA Weather Shield · Attivo',
    'SPLIT-PAY DI GRUPPO', 'Dividi il Pagamento tra Ospiti', 'Raccolto', 'Quota Ospite', 'Pagato', 'Aperto',
    'Copia Link Quota', 'Copiato', 'Paga Questa Quota · Carta', 'Paga Quota · PayPal', 'Hai aperto un link personale Split-Pay.',
    'Il tuo nome (opzionale)', 'Pass Confermato e linea 24/7 si sbloccano automaticamente al 100%.', 'Oppure paga l’intero saldo subito',
    'PRE-AUTORIZZAZIONE CAUZIONE', 'Blocco Carta Rimborsabile (Nessun Addebito)', 'Pre-autorizzazione separata Stripe senza addebito; rilasciata in 1 clic alla riconsegna.', '$0 Addebitato Ora',
    'Pre-Auth In Attesa', 'Blocco Attivo · Non Addebitato', 'Blocco Rilasciato', 'Autorizza Blocco Cauzione',
    'BLOCCO PREZZO 24 ORE', 'Congela Tariffa e Disponibilità 24h', 'Inserisci una pre-autorizzazione rimborsabile per bloccare questa tariffa per 24 ore.', 'Blocca Prezzo 24h (Pre-Auth)', 'Prezzo Bloccato · 24h', 'Rilasciato',
    'Split-Pay Gruppo (1–12)', 'Cauzione Pre-Auth (USD)', 'Blocco 24h (USD)', 'Includi NOAA Weather Shield',
    'Voci All-In (opzionale)', '+ Aggiungi Voce', 'Descrizione (Tariffa, Tasse FL)', 'Importo (USD)',
    'Rilascia Cauzione', 'Rilascia Blocco 24h', 'Cauzione', 'Blocco 24h'
  ],
  fr: [
    'Détail Transparent All-In', 'Zéro Frais Cachés', 'Total Dû Aujourd’hui', 'Caution Remboursable Pré-Auth (Empreinte Seule)',
    'NOAA WEATHER SHIELD', 'Protection Météo Automatique', 'En cas d’alerte NOAA à Miami/Biscayne Bay, report gratuit ou remboursement à 100%.', 'NOAA Weather Shield · Actif',
    'SPLIT-PAY DE GROUPE', 'Partager le Paiement entre Invités', 'Financé', 'Part Invité', 'Payé', 'En attente',
    'Copier le Lien', 'Copié', 'Payer Cette Part · Carte', 'Payer Part · PayPal', 'Vous avez ouvert votre lien personnel Split-Pay.',
    'Votre nom (optionnel)', 'Le Pass Confirmé et la ligne 24/7 s’ouvrent automatiquement à 100%.', 'Ou régler le montant total maintenant',
    'PRÉ-AUTORISATION CAUTION', 'Empreinte Bancaire Remboursable (Non Débitée)', 'Empreinte séparée Stripe sans débit immédiat — libérée en 1 clic après restitution.', '$0 Débité',
    'Empreinte en attente', 'Empreinte Active · Non Débitée', 'Empreinte Libérée', 'Autoriser l’Empreinte Caution',
    'VERROUILLAGE PRIX 24H', 'Bloquer Tarif & Disponibilité 24h', 'Placez une empreinte remboursable pour bloquer ce tarif vérifié pendant 24 heures.', 'Bloquer le Prix 24h (Empreinte)', 'Prix Bloqué · 24h Actif', 'Libéré',
    'Split-Pay Groupe (1–12)', 'Empreinte Caution (USD)', 'Verrouillage 24h (USD)', 'Inclure NOAA Weather Shield',
    'Lignes All-In (optionnel)', '+ Ajouter une Ligne', 'Libellé (Tarif, Taxes FL)', 'Montant (USD)',
    'Libérer la Caution', 'Libérer le Blocage 24h', 'Caution', 'Blocage 24h'
  ],
  pl: [
    'Przejrzyste Rozliczenie All-In', 'Zero Ukrytych Opłat', 'Łącznie Do Zapłaty Dziś', 'Zwrotna Kaucja Pre-Auth (Tylko Blokada)',
    'NOAA WEATHER SHIELD', 'Automatyczna Ochrona Pogodowa', 'Przy ostrzeżeniu sztormowym NOAA dla Miami — bezpłatna zmiana terminu lub 100% zwrotu.', 'NOAA Weather Shield · Aktywne',
    'GRUPOWY SPLIT-PAY', 'Podziel Płatność Między Gości', 'Opłacono', 'Część Gościa', 'Opłacono', 'Otwarte',
    'Kopiuj Link', 'Skopiowano', 'Zapłać Tę Część · Karta', 'Zapłać · PayPal', 'Otwarto osobisty link Split-Pay.',
    'Twoje imię (opcjonalnie)', 'Potwierdzona Przepustka i linia 24/7 odblokują się automatycznie przy 100%.', 'Lub opłać pełną kwotę od razu',
    'PREAUTORYZACJA KAUCJI', 'Zwrotna Blokada Karty (Bez Obciążenia)', 'Oddzielna blokada Stripe bez pobrania środków — zwalniana 1 kliknięciem po zwrocie.', '$0 Pobrane Teraz',
    'Oczekuje Blokady', 'Blokada Aktywna · Bez Poboru', 'Blokada Zwolniona', 'Autoryzuj Zwrotną Kaucję',
    'BLOKADA CENY NA 24H', 'Zamroź Cenę i Termin na 24h', 'Ustaw zwrotną blokadę, aby zamrozić tę zweryfikowaną cenę na 24 godziny.', 'Zablokuj Cenę na 24h (Pre-Auth)', 'Cena Zablokowana · 24h', 'Zwolniono',
    'Grupowy Split-Pay (1–12)', 'Kaucja Pre-Auth (USD)', 'Blokada Ceny 24h (USD)', 'Dołącz gwarancję NOAA Weather Shield',
    'Pozycje All-In (opcjonalnie)', '+ Dodaj Pozycję', 'Opis (Stawka, Podatek FL)', 'Kwota (USD)',
    'Zwolnij Kaucję', 'Zwolnij Blokadę 24h', 'Kaucja', 'Blokada 24h'
  ]
};

export const BOOKING_OS_COPY = Object.fromEntries(
  Object.entries(rows).map(([locale, values]) => {
    if (values.length !== keys.length) {
      throw new Error(`Incomplete Booking OS copy for ${locale}: got ${values.length}, expected ${keys.length}`);
    }
    return [locale, Object.freeze(Object.fromEntries(keys.map((key, index) => [key, values[index]])))];
  })
);

export function getBookingOsCopy(locale) {
  return BOOKING_OS_COPY[locale] || BOOKING_OS_COPY.en;
}
