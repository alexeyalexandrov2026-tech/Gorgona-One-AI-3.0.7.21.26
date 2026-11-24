// 16-language supplemental Privacy & US CCPA/CPRA + Cookie Policy disclosures
// covering on-site Stripe/PayPal checkout, optional AI voice (ElevenLabs/Whisper),
// web-only campaign attribution (`me_attr`, Meta CAPI), and Global Privacy Control.

const COPY = {
  en: {
    updated: 'Supplemental web, payment & US privacy disclosures (November 2026)',
    processorsTitle: 'Payments, AI Voice & Web Attribution Processors',
    processorsBody:
      'When you complete an on-site verified checkout (/pay), Stripe or PayPal processes your payment method (card, Apple Pay, Google Pay, Link, or bank transfer) under PCI-DSS standards; we store only the verification status and receipt reference. Optional web voice features use Cloudflare Workers AI (Whisper) for speech-to-text and ElevenLabs (or fallback TTS) for spoken replies; audio is never stored in our database. Partner listing images uploaded in the Partner Portal are stored securely for catalogue display. When you tap thumbs-up on an ELIO answer on the web, a PII-redacted sample may be retained to improve answer quality.',
    usRightsTitle: 'US State Privacy Rights (CCPA/CPRA) & Global Privacy Control',
    usRightsBody:
      'On the web (never inside the Android app), we may set a 30-day first-party attribution cookie (me_attr) for campaign/UTM measurement and forward non-PII conversion events to Meta Conversions API. We honor browser Global Privacy Control (GPC / Sec-GPC: 1) signals automatically: when GPC is enabled, we do not set the me_attr cookie, do not load Cloudflare Web Analytics, and do not forward conversion events to Meta. You may also opt out or request access/deletion anytime via support@gorgona-one.com.',
    cookiesBody:
      'In addition to essential language and sign-in cookies, the public website (never the Android app) uses a 30-day first-party attribution cookie (me_attr) to measure campaign sources (UTM parameters and ad click IDs) and optional privacy-focused Cloudflare Web Analytics. Both are automatically disabled whenever your browser sends a Global Privacy Control (GPC) signal or when you clear site cookies.'
  },
  ru: {
    updated: 'Дополнительные сведения о платежах, голосовых функциях и приватности США (ноябрь 2026)',
    processorsTitle: 'Платежи, голосовой ИИ и веб-атрибуция',
    processorsBody:
      'При оплате подтверждённой квоты на сайте (/pay) платёжные данные (карта, Apple Pay, Google Pay, Link или банковский перевод) обрабатываются Stripe или PayPal по стандарту PCI-DSS; мы храним только статус и номер квитанции. Опциональный голосовой ввод и озвучка на сайте используют Cloudflare Workers AI (Whisper) и ElevenLabs; аудиозаписи не сохраняются в базе данных. Фото, загружаемые партнёрами в Partner Portal, хранятся для отображения в каталоге. При положительной оценке ответа ELIO на сайте обезличенный образец может сохраняться для повышения качества ответов.',
    usRightsTitle: 'Права конфиденциальности в США (CCPA/CPRA) и Global Privacy Control',
    usRightsBody:
      'Только на сайте (никогда внутри Android-приложения) мы можем сохранять 30-дневную first-party cookie атрибуции (me_attr) для учёта UTM-источников и передавать события конверсии в Meta Conversions API. Мы автоматически соблюдаем сигнал браузера Global Privacy Control (GPC / Sec-GPC: 1): при активном GPC cookie me_attr не устанавливается, Cloudflare Web Analytics не загружается, а события в Meta не отправляются. Запрос на отказ, копию или удаление данных всегда доступен через support@gorgona-one.com.',
    cookiesBody:
      'Помимо обязательных cookies языка и входа, публичный сайт (никогда Android-приложение) использует 30-дневную first-party cookie атрибуции (me_attr) для учёта рекламных источников (UTM и click-ID) и опциональную аналитику Cloudflare Web Analytics. Обе функции автоматически отключаются при включённом в браузере сигнале Global Privacy Control (GPC) или очистке cookies.'
  },
  es: {
    updated: 'Divulgaciones complementarias de pagos, voz IA y privacidad en EE. UU. (noviembre 2026)',
    processorsTitle: 'Pagos, Voz IA y Atribución Web',
    processorsBody:
      'Al pagar una cotización verificada (/pay), Stripe o PayPal procesan el pago (tarjeta, Apple Pay, Google Pay, Link o transferencia) bajo PCI-DSS; solo guardamos el estado y la referencia. Las funciones opcionales de voz web usan Cloudflare Workers AI (Whisper) y ElevenLabs; el audio no se almacena en nuestra base de datos. Al valorar positivamente una respuesta de ELIO en la web, puede guardarse una muestra anonimizada para mejorar la calidad.',
    usRightsTitle: 'Derechos de privacidad en EE. UU. (CCPA/CPRA) y Global Privacy Control',
    usRightsBody:
      'Solo en la web (nunca en la app de Android), podemos usar una cookie first-party de atribución de 30 días (me_attr) y enviar eventos de conversión a Meta Conversions API. Respetamos automáticamente la señal Global Privacy Control (GPC / Sec-GPC: 1): cuando está activa, no guardamos me_attr, no cargamos Cloudflare Web Analytics y no enviamos eventos a Meta.',
    cookiesBody:
      'Además de las cookies esenciales de idioma e inicio de sesión, el sitio web (nunca la app de Android) utiliza la cookie first-party me_attr (30 días) para medir campañas y Cloudflare Web Analytics. Ambas se desactivan automáticamente cuando el navegador envía una señal Global Privacy Control (GPC).'
  },
  pt: {
    updated: 'Divulgações complementares de pagamentos, voz IA e privacidade nos EUA (novembro 2026)',
    processorsTitle: 'Pagamentos, Voz IA e Atribuição Web',
    processorsBody:
      'Ao pagar uma cotação verificada (/pay), Stripe ou PayPal processam o pagamento (cartão, Apple Pay, Google Pay, Link ou transferência) sob PCI-DSS; armazenamos apenas o status e a referência. Recursos opcionais de voz web usam Cloudflare Workers AI (Whisper) e ElevenLabs; nenhum áudio é salvo no banco.',
    usRightsTitle: 'Direitos de Privacidade nos EUA (CCPA/CPRA) e Global Privacy Control',
    usRightsBody:
      'Apenas na web (nunca no app Android), podemos definir um cookie first-party de 30 dias (me_attr) e enviar eventos de conversão à Meta Conversions API. Respeitamos automaticamente o sinal Global Privacy Control (GPC / Sec-GPC: 1), desativando me_attr, Cloudflare Web Analytics e o envio à Meta.',
    cookiesBody:
      'Além dos cookies essenciais de idioma e login, o site (nunca o app Android) usa o cookie first-party me_attr (30 dias) e Cloudflare Web Analytics. Ambos são desativados automaticamente quando o navegador envia Global Privacy Control (GPC).'
  },
  he: {
    updated: 'גילויים משלימים לתשלומים, קול AI ופרטיות בארה״ב (נובמבר 2026)',
    processorsTitle: 'תשלומים, קול AI ושיוך קמפיינים באתר',
    processorsBody:
      'בעת תשלום מאומת באתר (/pay), Stripe או PayPal מעבדים את אמצעי התשלום בתקן PCI-DSS; אנו שומרים רק את סטטוס האישור. תכונות קול אופציונליות באתר משתמשות ב-Cloudflare Workers AI (Whisper) וב-ElevenLabs ואינן שומרות הקלטות.',
    usRightsTitle: 'זכויות פרטיות בארה״ב (CCPA/CPRA) ו-Global Privacy Control',
    usRightsBody:
      'באתר בלבד (לעולם לא באפליקציית Android), ייתכן עוגיית שיוך first-party ל-30 יום (me_attr) ושליחת אירועי המרה ל-Meta CAPI. אנו מכבדים אוטומטית אות Global Privacy Control (GPC / Sec-GPC: 1) ומכבים את me_attr, Cloudflare Analytics ו-Meta.',
    cookiesBody:
      'בנוסף לעוגיות שפה והתחברות חיוניות, האתר (לעולם לא אפליקציית Android) משתמש בעוגיית שיוך me_attr ל-30 יום וב-Cloudflare Web Analytics, המושבתים אוטומטית כאשר הדפדפן שולח אות GPC.'
  },
  zh: {
    updated: '网页支付、AI 语音与美国隐私补充说明（2026 年 11 月）',
    processorsTitle: '支付、AI 语音与网页归因服务商',
    processorsBody:
      '当您在网站（/pay）完成核验付款时，Stripe 或 PayPal 按 PCI-DSS 标准处理支付方式（银行卡、Apple Pay、Google Pay 等）；我们仅保存状态与凭证号。网页端可选语音功能使用 Cloudflare Workers AI（Whisper）与 ElevenLabs，不会在数据库中存储音频。',
    usRightsTitle: '美国州隐私权（CCPA/CPRA）与 Global Privacy Control',
    usRightsBody:
      '仅限网页端（绝不用于 Android 应用），我们可能设置 30 天第一方归因 Cookie（me_attr）并向 Meta Conversions API 发送转化事件。我们自动尊重浏览器 Global Privacy Control（GPC / Sec-GPC: 1）信号：开启 GPC 时不设置 me_attr，不加载 Cloudflare 统计，也不向 Meta 发送事件。',
    cookiesBody:
      '除语言与登录必需 Cookie 外，网站（绝非 Android 应用）使用 30 天第一方归因 Cookie（me_attr）和 Cloudflare Web Analytics；当浏览器发送 GPC 信号时两者均自动停用。'
  },
  uk: {
    updated: 'Додаткові відомості про платежі, голосовий ШІ та приватність у США (листопад 2026)',
    processorsTitle: 'Платежі, голосовий ШІ та веб-атрибуція',
    processorsBody:
      'Під час оплати підтвердженої квоти (/pay) платіжні дані обробляються Stripe або PayPal за стандартом PCI-DSS; ми зберігаємо лише статус і номер квитанції. Опціональний голос на сайті використовує Cloudflare Workers AI (Whisper) та ElevenLabs без збереження аудіо.',
    usRightsTitle: 'Права приватності у США (CCPA/CPRA) та Global Privacy Control',
    usRightsBody:
      'Лише на сайті (ніколи в Android-застосунку) може використовуватися 30-денна first-party cookie атрибуції (me_attr) та передача подій у Meta CAPI. Сигнал браузера Global Privacy Control (GPC / Sec-GPC: 1) автоматично вимикає me_attr, Cloudflare Analytics і передачу в Meta.',
    cookiesBody:
      'Окрім обов’язкових cookies мови та входу, сайт (ніколи Android-застосунок) використовує 30-денну cookie атрибуції me_attr і Cloudflare Web Analytics, які автоматично вимикаються за сигналом GPC.'
  },
  ja: {
    updated: '決済・AI音声・米国プライバシー補足開示（2026年11月）',
    processorsTitle: '決済・AI音声・Web計測プロバイダー',
    processorsBody:
      'サイト内の認証済み決済（/pay）では Stripe または PayPal が PCI-DSS 基準で処理し、当社はステータスと参照番号のみ保持します。Web の任意音声機能は Cloudflare Workers AI（Whisper）と ElevenLabs を使用し、音声は保存しません。',
    usRightsTitle: '米国プライバシー権（CCPA/CPRA）および Global Privacy Control',
    usRightsBody:
      'Web 限定（Android アプリでは無効）で 30 日間のファーストパーティ計測 Cookie（me_attr）および Meta CAPI 送信を行う場合があります。ブラウザの Global Privacy Control（GPC / Sec-GPC: 1）信号を自動尊重し、有効時はこれらを停止します。',
    cookiesBody:
      '言語・ログイン用の必須 Cookie に加え、Web サイト（Android アプリ除く）は me_attr（30 日間）と Cloudflare Web Analytics を使用します。GPC 信号送信時は自動的に無効化されます。'
  },
  ko: {
    updated: '결제·AI 음성·미국 개인정보 보충 고지 (2026년 11월)',
    processorsTitle: '결제, AI 음성 및 웹 어트리뷰션 처리자',
    processorsBody:
      '웹사이트 인증 결제(/pay) 시 Stripe 또는 PayPal이 PCI-DSS 기준으로 결제 수단을 처리하며 당사는 상태와 참조 코드만 보관합니다. 선택적 웹 음성 기능은 Cloudflare Workers AI(Whisper)와 ElevenLabs를 사용하며 오디오를 저장하지 않습니다.',
    usRightsTitle: '미국 개인정보 권리(CCPA/CPRA) 및 Global Privacy Control',
    usRightsBody:
      '웹 전용(Android 앱 제외)으로 30일 자사 어트리뷰션 쿠키(me_attr)와 Meta CAPI 전송을 사용할 수 있습니다. 브라우저의 Global Privacy Control(GPC / Sec-GPC: 1) 신호가 감지되면 자동으로 비활성화됩니다.',
    cookiesBody:
      '필수 언어·로그인 쿠키 외에 웹사이트(Android 앱 제외)는 30일 me_attr 쿠키와 Cloudflare Web Analytics를 사용하며, 브라우저가 GPC 신호를 보내면 자동 차단됩니다.'
  },
  de: {
    updated: 'Ergänzende Hinweise zu Zahlungen, KI-Stimme & US-Datenschutz (November 2026)',
    processorsTitle: 'Zahlungen, KI-Stimme & Web-Attribution',
    processorsBody:
      'Bei verifizierten Zahlungen (/pay) verarbeiten Stripe oder PayPal die Zahlungsmethode gemäß PCI-DSS; wir speichern nur Status und Referenz. Optionale Web-Sprachfunktionen nutzen Cloudflare Workers AI (Whisper) und ElevenLabs ohne Audiospeicherung.',
    usRightsTitle: 'US-Datenschutzrechte (CCPA/CPRA) & Global Privacy Control',
    usRightsBody:
      'Nur im Web (nie in der Android-App) können ein 30-Tage-First-Party-Cookie (me_attr) und Meta Conversions API genutzt werden. Browser-Signale für Global Privacy Control (GPC / Sec-GPC: 1) deaktivieren me_attr, Cloudflare Analytics und Meta-Übertragungen automatisch.',
    cookiesBody:
      'Zusätzlich zu essenziellen Sprach- und Login-Cookies nutzt die Website (nie die Android-App) das 30-Tage-Cookie me_attr sowie Cloudflare Web Analytics. Bei aktivem GPC-Signal werden beide automatisch deaktiviert.'
  },
  ar: {
    updated: 'إفصاحات إضافية للدفع والصوت بالذكاء الاصطناعي وخصوصية الولايات المتحدة (نوفمبر 2026)',
    processorsTitle: 'معالجو الدفع والصوت وقياس الحملات على الويب',
    processorsBody:
      'عند إتمام الدفع الموثق (/pay)، تعالج Stripe أو PayPal وسيلة الدفع وفق معيار PCI-DSS ولا نحتفظ إلا بحالة الدفع والمرجع. تستخدم ميزات الصوت الاختيارية Cloudflare Workers AI (Whisper) وElevenLabs دون تخزين الصوت.',
    usRightsTitle: 'حقوق الخصوصية الأمريكية (CCPA/CPRA) وإشارة Global Privacy Control',
    usRightsBody:
      'على الويب فقط (وليس في تطبيق Android)، قد نستخدم ملف ارتباط me_attr لمدة 30 يوماً ونرسل أحداث التحويل إلى Meta CAPI. نحترم تلقائياً إشارة Global Privacy Control (GPC / Sec-GPC: 1) ونوقف me_attr وCloudflare Analytics وMeta عند تفعيلها.',
    cookiesBody:
      'إضافة إلى ملفات الارتباط الأساسية للغة وتسجيل الدخول، يستخدم الموقع (وليس تطبيق Android) ملف me_attr لمدة 30 يوماً وCloudflare Web Analytics، ويتم تعطيلهما تلقائياً عند إرسال إشارة GPC.'
  },
  tr: {
    updated: 'Ödeme, Yapay Zeka Ses ve ABD Gizlilik Ek Bildirimi (Kasım 2026)',
    processorsTitle: 'Ödemeler, Yapay Zeka Ses ve Web Atıf Sağlayıcıları',
    processorsBody:
      'Doğrulanmış ödemelerde (/pay) Stripe veya PayPal, ödeme yöntemini PCI-DSS kapsamında işler; biz yalnızca durum ve referans bilgisini tutarız. İsteğe bağlı web ses özellikleri Cloudflare Workers AI (Whisper) ve ElevenLabs kullanır; ses kaydı saklanmaz.',
    usRightsTitle: 'ABD Gizlilik Hakları (CCPA/CPRA) ve Global Privacy Control',
    usRightsBody:
      'Yalnızca web sitesinde (Android uygulamasında asla) 30 günlük me_attr çerezi ve Meta CAPI kullanılabilir. Tarayıcınızın Global Privacy Control (GPC / Sec-GPC: 1) sinyali otomatik olarak tanınır ve bu işlemler kapatılır.',
    cookiesBody:
      'Zorunlu dil ve oturum çerezlerine ek olarak web sitesi (Android uygulaması hariç) 30 günlük me_attr çerezini ve Cloudflare Web Analytics aracını kullanır; GPC sinyali aktifken her ikisi de otomatik devre dışı kalır.'
  },
  fa: {
    updated: 'اطلاعیه تکمیلی پرداخت، صوت هوش مصنوعی و حریم خصوصی آمریکا (نوامبر ۲۰۲۶)',
    processorsTitle: 'پردازشگرهای پرداخت، صوت هوش مصنوعی و سنجش وب',
    processorsBody:
      'هنگام پرداخت تأییدشده (/pay)، Stripe یا PayPal اطلاعات پرداخت را تحت استاندارد PCI-DSS پردازش می‌کنند و ما تنها وضعیت و شناسه رسید را ذخیره می‌کنیم. قابلیت صوتی وب از Cloudflare Workers AI (Whisper) و ElevenLabs بدون ذخیره صدا استفاده می‌کند.',
    usRightsTitle: 'حقوق حریم خصوصی آمریکا (CCPA/CPRA) و Global Privacy Control',
    usRightsBody:
      'فقط در وب (هرگز در اپلیکیشن اندروید)، ممکن است کوکی ۳۰ روزه me_attr و Meta CAPI استفاده شود. سیگنال مرورگر Global Privacy Control (GPC / Sec-GPC: 1) به‌صورت خودکار رعایت شده و این موارد غیرفعال می‌شوند.',
    cookiesBody:
      'علاوه بر کوکی‌های ضروری زبان و ورود، وب‌سایت (هرگز اپلیکیشن اندروید) از کوکی ۳۰ روزه me_attr و Cloudflare Web Analytics استفاده می‌کند که با سیگنال GPC به‌طور خودکار غیرفعال می‌شوند.'
  },
  it: {
    updated: 'Informative integrative su pagamenti, voce IA e privacy USA (novembre 2026)',
    processorsTitle: 'Pagamenti, Voce IA e Attribuzione Web',
    processorsBody:
      'Per i pagamenti verificati (/pay), Stripe o PayPal gestiscono il metodo di pagamento secondo PCI-DSS; conserviamo solo lo stato e il riferimento. Le funzioni vocali opzionali usano Cloudflare Workers AI (Whisper) ed ElevenLabs senza archiviare audio.',
    usRightsTitle: 'Diritti Privacy USA (CCPA/CPRA) e Global Privacy Control',
    usRightsBody:
      'Solo sul web (mai nell’app Android), possiamo usare il cookie first-party di 30 giorni me_attr e inviare eventi a Meta CAPI. Rispettiamo automaticamente il segnale Global Privacy Control (GPC / Sec-GPC: 1), disattivando me_attr, Cloudflare Analytics e Meta.',
    cookiesBody:
      'Oltre ai cookie essenziali di lingua e accesso, il sito web (mai l’app Android) utilizza il cookie me_attr (30 giorni) e Cloudflare Web Analytics, entrambi disattivati automaticamente in presenza del segnale GPC.'
  },
  fr: {
    updated: 'Mentions complémentaires paiements, voix IA et confidentialité US (novembre 2026)',
    processorsTitle: 'Paiements, Voix IA et Attribution Web',
    processorsBody:
      'Lors d’un règlement vérifié (/pay), Stripe ou PayPal traitent le paiement selon la norme PCI-DSS ; nous conservons uniquement le statut et la référence. Les fonctions vocales web optionnelles utilisent Cloudflare Workers AI (Whisper) et ElevenLabs sans stocker d’audio.',
    usRightsTitle: 'Droits de confidentialité US (CCPA/CPRA) et Global Privacy Control',
    usRightsBody:
      'Sur le web uniquement (jamais dans l’application Android), un cookie first-party de 30 jours (me_attr) et Meta CAPI peuvent être utilisés. Nous respectons automatiquement le signal Global Privacy Control (GPC / Sec-GPC: 1), désactivant me_attr, Cloudflare Analytics et Meta.',
    cookiesBody:
      'En plus des cookies essentiels de langue et de connexion, le site web (jamais l’app Android) utilise le cookie first-party me_attr (30 jours) et Cloudflare Web Analytics, désactivés automatiquement lorsqu’un signal GPC est actif.'
  },
  pl: {
    updated: 'Dodatkowe informacje o płatnościach, głosie AI i prywatności USA (listopad 2026)',
    processorsTitle: 'Płatności, Głos AI i Atrybucja Web',
    processorsBody:
      'Podczas zweryfikowanej płatności (/pay) Stripe lub PayPal przetwarzają metodę płatności zgodnie z PCI-DSS; zapisujemy wyłącznie status i numer referencyjny. Opcjonalne funkcje głosowe korzystają z Cloudflare Workers AI (Whisper) i ElevenLabs bez zapisywania nagrań.',
    usRightsTitle: 'Prawa prywatności w USA (CCPA/CPRA) i Global Privacy Control',
    usRightsBody:
      'Wyłącznie w przeglądarce (nigdy w aplikacji Android) możemy używać 30-dniowego pliku cookie me_attr oraz Meta CAPI. Automatycznie honorujemy sygnał Global Privacy Control (GPC / Sec-GPC: 1), wyłączając me_attr, Cloudflare Analytics i Meta.',
    cookiesBody:
      'Oprócz niezbędnych plików cookie języka i logowania strona (nigdy aplikacja Android) używa 30-dniowego pliku me_attr oraz Cloudflare Web Analytics; oba są automatycznie wyłączane przy aktywnym sygnale GPC.'
  }
};

export function getPrivacySupplementCopy(locale = 'en') {
  return COPY[locale] || COPY.en;
}

export const PRIVACY_SUPPLEMENT_LOCALES = Object.keys(COPY);
