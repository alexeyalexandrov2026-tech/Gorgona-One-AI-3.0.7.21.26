// European Corporate Checkout standards:
// 1. Multi-Currency Display (USD · EUR · GBP · CHF · AED) with transparent USD settlement notice
// 2. Live Order Status Timeline (Quote -> ESIGN -> Payment/Split-Pay -> KYC -> Flight Handover)
// 3. Business / VAT Corporate Invoice Mode (Company Name, VAT/EIN, Billing Address -> Print/PDF)
// 16 languages, zero concierge wording.

export const DISPLAY_CURRENCIES = Object.freeze([
  { code: 'USD', symbol: '$', rate: 1.0 },
  { code: 'EUR', symbol: '€', rate: 0.92 },
  { code: 'GBP', symbol: '£', rate: 0.79 },
  { code: 'CHF', symbol: 'CHF ', rate: 0.88 },
  { code: 'AED', symbol: 'AED ', rate: 3.67 }
]);

export function formatDisplayCurrency(amountCents, currencyCode = 'USD') {
  const num = Number(amountCents || 0);
  const spec = DISPLAY_CURRENCIES.find((c) => c.code === currencyCode) || DISPLAY_CURRENCIES[0];
  const converted = (num / 100) * spec.rate;
  const rounded = Math.round(converted * 100) / 100;
  const hasCents = Math.abs(rounded - Math.round(rounded)) > 0.004;
  const formatted = rounded.toLocaleString('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0
  });
  return `${spec.code === 'USD' ? '' : '≈ '}${spec.symbol}${formatted}`;
}

const keys = [
  'currencyLabel', 'usdSettlementNote',
  'timelineTitle', 'stepQuote', 'stepEsign', 'stepPayment', 'stepKyc', 'stepDispatch',
  'invoiceToggle', 'invoiceTitle', 'invoiceSubtitle',
  'companyNameLabel', 'taxIdLabel', 'billingAddressLabel', 'printInvoiceButton', 'invoiceStamp'
];

const rows = {
  en: [
    'Display currency', 'Indicative reference · Settled in USD via Stripe / PayPal',
    'LIVE RESERVATION TIMELINE', 'Quote Issued', 'ESIGN Signed', 'Payment / Split-Pay', 'ID KYC', 'Flight Handover',
    'Corporate / Family Office Invoice (VAT / EIN)', 'Business & Corporate Invoice Details', 'Add your company entity and VAT / Tax ID to generate a formal corporate receipt for accounting.',
    'Legal Company / Entity Name', 'VAT / EIN / Tax ID', 'Corporate Billing Address', 'Print / Save Corporate Invoice (PDF)', 'CORPORATE RECEIPT · MIAMI ELIO LLC (FL)'
  ],
  ru: [
    'Валюта отображения', 'Ориентировочный курс · Списание в USD через Stripe / PayPal',
    'СТАТУС БРОНИРОВАНИЯ В РЕАЛЬНОМ ВРЕМЕНИ', 'Счёт выставлен', 'ESIGN подписан', 'Оплата / Split-Pay', 'Онлайн KYC', 'Подача по рейсу',
    'Корпоративный счёт / Family Office (VAT / ИНН)', 'Реквизиты компании для бухгалтерии', 'Укажите юрлицо и VAT / Tax ID — они автоматически добавятся в печатный корпоративный инвойс (PDF).',
    'Название компании / юрлица', 'VAT / EIN / Tax ID / ИНН', 'Юридический адрес компании', 'Распечатать корпоративный счёт (PDF)', 'КОРПОРАТИВНЫЙ ИНВОЙС · MIAMI ELIO'
  ],
  es: [
    'Moneda de visualización', 'Referencia indicativa · Cobro en USD vía Stripe / PayPal',
    'ESTADO DE RESERVA EN VIVO', 'Cotización', 'ESIGN Firmado', 'Pago / Split-Pay', 'KYC ID', 'Entrega Vuelo',
    'Factura Corporativa / Family Office (VAT / Tax ID)', 'Datos de Factura Empresarial', 'Agrega tu empresa y VAT / Tax ID para generar el recibo corporativo en PDF.',
    'Nombre Legal de la Empresa', 'VAT / EIN / NIF', 'Dirección Fiscal', 'Imprimir / Guardar Factura (PDF)', 'FACTURA CORPORATIVA · MIAMI ELIO'
  ],
  he: [
    'מטבע תצוגה', 'שער משוער · חיוב ב-USD דרך Stripe / PayPal',
    'מעקב הזמנה בזמן אמת', 'הצעה הופקה', 'ESIGN נחתם', 'תשלום / Split-Pay', 'אימות KYC', 'מסירה לטיסה',
    'חשבונית עסקית / חברה (VAT / ח.פ.)', 'פרטי חשבונית עסקית', 'הוסיפו שם חברה ומספר מע״מ להפקת קבלה עסקית להדפסה/PDF.',
    'שם החברה המשפטי', 'מספר עוסק / VAT / Tax ID', 'כתובת לחשבונית', 'הדפס / שמור חשבונית עסקית (PDF)', 'חשבונית עסקית · MIAMI ELIO'
  ],
  zh: [
    '显示货币', '参考汇率 · 通过 Stripe / PayPal 以美元结算',
    '实时预订进度', '报价已生成', 'ESIGN 已签', '付款 / AA拼单', 'KYC 认证', '航班交接',
    '企业 / 家族办公室发票 (VAT / 税号)', '企业发票抬头信息', '填写公司名称和税号即可生成标准企业报销发票 (PDF)。',
    '公司法定名称', 'VAT / EIN / 税号', '公司账单地址', '打印 / 保存企业发票 (PDF)', '企业收据 · MIAMI ELIO'
  ],
  pt: [
    'Moeda de exibição', 'Referência indicativa · Cobrança em USD via Stripe / PayPal',
    'LINHA DO TEMPO DA RESERVA', 'Cotação', 'ESIGN Assinado', 'Pagamento / Split', 'KYC ID', 'Entrega Voo',
    'Fatura Corporativa / Family Office (VAT / CNPJ)', 'Dados da Fatura Empresarial', 'Adicione razão social e VAT / Tax ID para gerar fatura corporativa em PDF.',
    'Razão Social da Empresa', 'VAT / EIN / CNPJ', 'Endereço Fiscal', 'Imprimir / Salvar Fatura (PDF)', 'FATURA CORPORATIVA · MIAMI ELIO'
  ],
  uk: [
    'Валюта відображення', 'Орієнтовний курс · Списання в USD через Stripe / PayPal',
    'СТАТУС БРОНЮВАННЯ НАЖИВО', 'Рахунок створено', 'ESIGN підписано', 'Оплата / Split-Pay', 'Онлайн KYC', 'Подача за рейсом',
    'Корпоративний рахунок / Family Office (VAT / ЄДРПОУ)', 'Реквізити компанії для бухгалтерії', 'Вкажіть юрособу та VAT / Tax ID для генерації корпоративного інвойсу (PDF).',
    'Назва компанії / юрособи', 'VAT / EIN / Tax ID', 'Юридична адреса компанії', 'Друкувати корпоративний рахунок (PDF)', 'КОРПОРАТИВНИЙ ІНВОЙС · MIAMI ELIO'
  ],
  ja: [
    '表示通貨', '参考レート · Stripe / PayPal にて USD 決済',
    'リアルタイム予約ステータス', '見積発行', 'ESIGN 署名', '決済 / 分割', 'KYC 認証', 'フライト引渡し',
    '法人・ファミリーオフィス領収書 (VAT / 税番号)', '法人請求書情報', '法人名・税番号を入力すると会計用 PDF 領収書を出力できます。',
    '法人名', 'VAT / EIN / 法人番号', '請求先住所', '法人請求書を印刷 / 保存 (PDF)', '法人領収書 · MIAMI ELIO'
  ],
  ko: [
    '표시 통화', '참고 환율 · Stripe / PayPal USD 결제',
    '실시간 예약 진행 현황', '견적 발행', 'ESIGN 서명', '결제 / 분할', 'KYC 인증', '항공편 인수',
    '법인 / 패밀리오피스 인보이스 (VAT / 사업자번호)', '법인 인보이스 정보', '법인명과 세무번호를 입력해 회계용 PDF 인보이스를 출력하세요.',
    '법인명', 'VAT / EIN / 사업자번호', '법인 청구 주소', '법인 인보이스 인쇄 / 저장 (PDF)', '법인 영수증 · MIAMI ELIO'
  ],
  de: [
    'Anzeigewährung', 'Richtkurs · Abrechnung in USD über Stripe / PayPal',
    'LIVE-BUCHUNGSSTATUS', 'Angebot', 'ESIGN signiert', 'Zahlung / Split', 'ID KYC', 'Flug-Übergabe',
    'Firmenrechnung / Family Office (USt-IdNr.)', 'Unternehmensdaten für Rechnung', 'Firmenname und USt-IdNr. ergänzen für eine druckfertige Firmenrechnung (PDF).',
    'Firmenname (Rechtsform)', 'USt-IdNr. / VAT / EIN', 'Rechnungsadresse', 'Firmenrechnung drucken / PDF', 'FIRMENRECHNUNG · MIAMI ELIO'
  ],
  ar: [
    'عملة العرض', 'سعر إرشادي · التسوية بالدولار USD عبر Stripe / PayPal',
    'الجدول الزمني المباشر للحجز', 'إصدار العرض', 'توقيع ESIGN', 'الدفع / Split-Pay', 'توثيق KYC', 'تسليم الرحلة',
    'فاتورة شركات / مكتب عائلي (VAT / الرقم الضريبي)', 'بيانات فاتورة الشركة', 'أضف اسم الشركة والرقم الضريبي لإصدار إيصال شركات رسمي بصيغة PDF.',
    'الاسم القانوني للشركة', 'الرقم الضريبي / VAT / EIN', 'عنوان الفوترة', 'طباعة / حفظ فاتورة الشركات (PDF)', 'فاتورة شركات · MIAMI ELIO'
  ],
  tr: [
    'Görüntüleme para birimi', 'Gösterge kur · Stripe / PayPal ile USD tahsilat',
    'CANLI REZERVASYON DURUMU', 'Teklif', 'ESIGN İmzalı', 'Ödeme / Split', 'KYC Kimlik', 'Uçuş Teslimi',
    'Kurumsal Fatura / Family Office (KDV / Vergi No)', 'Kurumsal Fatura Bilgileri', 'Muhasebe için PDF kurumsal makbuz oluşturmak üzere şirket bilgilerini girin.',
    'Şirket Unvanı', 'Vergi No / VAT / EIN', 'Fatura Adresi', 'Kurumsal Faturayı Yazdır (PDF)', 'KURUMSAL FATURA · MIAMI ELIO'
  ],
  fa: [
    'ارز نمایش', 'نرخ تقریبی · تسویه به دلار USD از طریق Stripe / PayPal',
    'وضعیت زنده رزرو', 'صدور پیشنهاد', 'امضای ESIGN', 'پرداخت / Split', 'احراز KYC', 'تحویل پرواز',
    'فاکتور شرکتی / Family Office (شناسه مالیاتی)', 'مشخصات فاکتور شرکتی', 'نام شرکت و شناسه مالیاتی را برای چاپ فاکتور رسمی PDF وارد کنید.',
    'نام قانونی شرکت', 'شناسه مالیاتی / VAT / EIN', 'آدرس صورتحساب', 'چاپ / ذخیره فاکتور شرکتی (PDF)', 'فاکتور شرکتی · MIAMI ELIO'
  ],
  it: [
    'Valuta di visualizzazione', 'Cambio indicativo · Addebito in USD tramite Stripe / PayPal',
    'STATO PRENOTAZIONE LIVE', 'Preventivo', 'ESIGN Firmato', 'Pagamento / Split', 'KYC ID', 'Consegna Volo',
    'Fattura Aziendale / Family Office (P.IVA / VAT)', 'Dati Fattura Aziendale', 'Inserisci ragione sociale e P.IVA per stampare la ricevuta aziendale in PDF.',
    'Ragione Sociale', 'Partita IVA / VAT / EIN', 'Indirizzo di Fatturazione', 'Stampa / Salva Fattura (PDF)', 'RICEVUTA AZIENDALE · MIAMI ELIO'
  ],
  fr: [
    'Devise d’affichage', 'Taux indicatif · Règlement en USD via Stripe / PayPal',
    'SUIVI DE RÉSERVATION EN DIRECT', 'Devis émis', 'ESIGN signé', 'Paiement / Split', 'KYC ID', 'Remise Vol',
    'Facture Entreprise / Family Office (TVA / SIRET)', 'Coordonnées de Facturation', 'Ajoutez votre société et numéro de TVA pour imprimer un justificatif comptable PDF.',
    'Raison Sociale', 'N° TVA / EIN / SIRET', 'Adresse de Facturation', 'Imprimer / Enregistrer Facture (PDF)', 'FACTURE ENTREPRISE · MIAMI ELIO'
  ],
  pl: [
    'Waluta wyświetlania', 'Kurs orientacyjny · Rozliczenie w USD przez Stripe / PayPal',
    'STATUS REZERWACJI NA ŻYWO', 'Oferta', 'Podpis ESIGN', 'Płatność / Split', 'KYC ID', 'Odbiór z Lotu',
    'Faktura Firmowa / Family Office (NIP / VAT)', 'Dane do Faktury Firmowej', 'Dodaj dane firmy i NIP / VAT, aby wydrukować firmowe potwierdzenie PDF.',
    'Pełna Nazwa Firmy', 'NIP / VAT / EIN', 'Adres Rozliczeniowy', 'Drukuj / Zapisz Fakturę (PDF)', 'POTWIERDZENIE FIRMOWE · MIAMI ELIO'
  ]
};

export const CORPORATE_CHECKOUT_COPY = Object.fromEntries(
  Object.entries(rows).map(([locale, values]) => {
    if (values.length !== keys.length) {
      throw new Error(`Incomplete Corporate Checkout copy for ${locale}: got ${values.length}, expected ${keys.length}`);
    }
    return [locale, Object.freeze(Object.fromEntries(keys.map((key, index) => [key, values[index]])))];
  })
);

export function getCorporateCheckoutCopy(locale) {
  return CORPORATE_CHECKOUT_COPY[locale] || CORPORATE_CHECKOUT_COPY.en;
}
