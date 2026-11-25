// 16-language Social OAuth (Apple, Google, Facebook Meta, Microsoft) & Passwordless Magic Link copy.

const keys = [
  'divider', 'apple', 'google', 'facebook', 'microsoft',
  'magicLinkToggle', 'passwordToggle', 'magicLinkButton', 'magicLinkSending',
  'magicLinkSent', 'magicLinkHint', 'providerPending',
  'callbackLoading', 'callbackError', 'backToLogin'
];

const rows = {
  en: [
    'or continue with email', 'Continue with Apple', 'Continue with Google', 'Continue with Facebook (Meta)', 'Continue with Microsoft',
    'Sign in without password (Magic Link)', 'Sign in with password', 'Send 1-Tap Magic Link', 'Sending Magic Link…',
    'Magic Link sent! Check your email to sign in instantly.', 'Enter your email and we will send a secure 1-tap sign-in link.', 'This sign-in provider is being activated. Please use another provider or Magic Link below.',
    'Completing secure sign-in…', 'Sign-in could not be completed. Please try again.', 'Back to Sign In'
  ],
  ru: [
    'или войти по email', 'Продолжить с Apple', 'Продолжить с Google', 'Продолжить с Facebook (Meta)', 'Продолжить с Microsoft',
    'Войти без пароля (Magic Link)', 'Войти по паролю', 'Отправить Magic Link в 1 клик', 'Отправляем ссылку…',
    'Ссылка отправлена! Проверьте почту для мгновенного входа.', 'Введите email — мы отправим защищённую ссылку для входа без пароля.', 'Этот провайдер входа сейчас активируется. Используйте другой способ или вход без пароля ниже.',
    'Завершаем безопасный вход…', 'Не удалось завершить вход. Попробуйте ещё раз.', 'Вернуться ко входу'
  ],
  es: [
    'o continúa con email', 'Continuar con Apple', 'Continuar con Google', 'Continuar con Facebook (Meta)', 'Continuar con Microsoft',
    'Entrar sin contraseña (Magic Link)', 'Entrar con contraseña', 'Enviar Magic Link', 'Enviando enlace…',
    '¡Magic Link enviado! Revisa tu correo para entrar al instante.', 'Ingresa tu correo y te enviaremos un enlace seguro de acceso.', 'Este proveedor se está activando. Usa otro método o Magic Link abajo.',
    'Completando acceso seguro…', 'No se pudo completar el acceso. Inténtalo de nuevo.', 'Volver a Iniciar Sesión'
  ],
  he: [
    'או המשך עם אימייל', 'המשך עם Apple', 'המשך עם Google', 'המשך עם Facebook (Meta)', 'המשך עם Microsoft',
    'כניסה ללא סיסמה (Magic Link)', 'כניסה עם סיסמה', 'שלח קישור Magic Link', 'שולח קישור…',
    'הקישור נשלח! בדקו את האימייל לכניסה מיידית.', 'הזינו אימייל ונשלח קישור מאובטח לכניסה בלחיצה אחת.', 'ספק כניסה זה בהפעלה. השתמשו באפשרות אחרת או ב-Magic Link למטה.',
    'משלים כניסה מאובטחת…', 'לא ניתן היה להשלים את הכניסה. נסו שוב.', 'חזרה לכניסה'
  ],
  zh: [
    '或使用邮箱继续', '使用 Apple 继续', '使用 Google 继续', '使用 Facebook (Meta) 继续', '使用 Microsoft 继续',
    '免密登录 (Magic Link)', '使用密码登录', '发送一键登录链接', '正在发送…',
    '登录链接已发送！请查收邮件一键登录。', '输入邮箱即可收到安全的免密登录链接。', '该登录方式正在激活中，请使用其他方式或下方免密登录。',
    '正在完成安全登录…', '无法完成登录，请重试。', '返回登录'
  ],
  pt: [
    'ou continue com email', 'Continuar com Apple', 'Continuar com Google', 'Continuar com Facebook (Meta)', 'Continuar com Microsoft',
    'Entrar sem senha (Magic Link)', 'Entrar com senha', 'Enviar Magic Link', 'Enviando link…',
    'Magic Link enviado! Verifique seu email para entrar na hora.', 'Digite seu email para receber um link seguro de acesso em 1 clique.', 'Este provedor está sendo ativado. Use outro método ou Magic Link abaixo.',
    'Concluindo login seguro…', 'Não foi possível concluir o login. Tente novamente.', 'Voltar ao Login'
  ],
  uk: [
    'або увійти через email', 'Продовжити з Apple', 'Продовжити з Google', 'Продовжити з Facebook (Meta)', 'Продовжити з Microsoft',
    'Увійти без пароля (Magic Link)', 'Увійти за паролем', 'Надіслати Magic Link у 1 клік', 'Надсилаємо посилання…',
    'Посилання надіслано! Перевірте пошту для миттєвого входу.', 'Введіть email — ми надішлемо захищене посилання для входу без пароля.', 'Цей провайдер зараз активується. Оберіть інший спосіб або Magic Link нижче.',
    'Завершуємо безпечний вхід…', 'Не вдалося завершити вхід. Спробуйте ще раз.', 'Повернутися до входу'
  ],
  ja: [
    'またはメールで続行', 'Apple で続ける', 'Google で続ける', 'Facebook (Meta) で続ける', 'Microsoft で続ける',
    'パスワードなしでログイン (Magic Link)', 'パスワードでログイン', 'ワンタップ Magic Link を送信', '送信中…',
    'Magic Link を送信しました。メールから即座にログインできます。', 'メールアドレスを入力すると安全なワンタップログインリンクをお送りします。', 'この認証プロバイダーは設定中です。他の方法または Magic Link をご利用ください。',
    '安全なログインを完了しています…', 'ログインを完了できませんでした。再試行してください。', 'ログインに戻る'
  ],
  ko: [
    '또는 이메일로 계속하기', 'Apple로 계속하기', 'Google로 계속하기', 'Facebook (Meta)로 계속하기', 'Microsoft로 계속하기',
    '비밀번호 없이 로그인 (Magic Link)', '비밀번호로 로그인', '원탭 Magic Link 보내기', '전송 중…',
    'Magic Link가 전송되었습니다! 이메일을 확인해 즉시 로그인하세요.', '이메일을 입력하면 안전한 원탭 로그인 링크를 보내드립니다.', '이 로그인 제공업체는 활성화 중입니다. 다른 방법이나 Magic Link를 이용해 주세요.',
    '안전한 로그인을 완료하는 중…', '로그인을 완료할 수 없습니다. 다시 시도해 주세요.', '로그인으로 돌아가기'
  ],
  de: [
    'oder per E-Mail fortfahren', 'Mit Apple fortfahren', 'Mit Google fortfahren', 'Mit Facebook (Meta) fortfahren', 'Mit Microsoft fortfahren',
    'Ohne Passwort anmelden (Magic Link)', 'Mit Passwort anmelden', '1-Klick Magic Link senden', 'Wird gesendet…',
    'Magic Link gesendet! Prüfen Sie Ihr Postfach für den sofortigen Zugang.', 'Geben Sie Ihre E-Mail ein für einen sicheren 1-Klick-Anmeldelink.', 'Dieser Anbieter wird gerade aktiviert. Nutzen Sie eine andere Option oder Magic Link unten.',
    'Sichere Anmeldung wird abgeschlossen…', 'Anmeldung konnte nicht abgeschlossen werden. Bitte erneut versuchen.', 'Zurück zur Anmeldung'
  ],
  ar: [
    'أو المتابعة بالبريد الإلكتروني', 'المتابعة باستخدام Apple', 'المتابعة باستخدام Google', 'المتابعة باستخدام Facebook (Meta)', 'المتابعة باستخدام Microsoft',
    'الدخول بدون كلمة مرور (Magic Link)', 'الدخول بكلمة المرور', 'إرسال رابط الدخول الفوري', 'جاري الإرسال…',
    'تم إرسال الرابط! تحقق من بريدك للدخول فوراً.', 'أدخل بريدك الإلكتروني وسنرسل رابط دخول آمن بنقرة واحدة.', 'يجري تفعيل مزود الدخول هذا. استخدم خياراً آخر أو Magic Link أدناه.',
    'جاري إتمام تسجيل الدخول الآمن…', 'تعذر إتمام تسجيل الدخول. حاول مجدداً.', 'العودة لتسجيل الدخول'
  ],
  tr: [
    'veya e-posta ile devam et', 'Apple ile Devam Et', 'Google ile Devam Et', 'Facebook (Meta) ile Devam Et', 'Microsoft ile Devam Et',
    'Şifresiz Giriş (Magic Link)', 'Şifre ile Giriş', 'Tek Tıkla Magic Link Gönder', 'Gönderiliyor…',
    'Magic Link gönderildi! Anında giriş için e-postanızı kontrol edin.', 'E-postanızı girin, güvenli tek tık giriş bağlantısı gönderelim.', 'Bu giriş sağlayıcısı etkinleştiriliyor. Aşağıdan başka bir seçenek veya Magic Link kullanın.',
    'Güvenli giriş tamamlanıyor…', 'Giriş tamamlanamadı. Lütfen tekrar deneyin.', 'Girişe Dön'
  ],
  fa: [
    'یا ادامه با ایمیل', 'ادامه با Apple', 'ادامه با Google', 'ادامه با Facebook (Meta)', 'ادامه با Microsoft',
    'ورود بدون رمز (Magic Link)', 'ورود با رمز عبور', 'ارسال لینک ورود یک‌کلیکی', 'در حال ارسال…',
    'لینک ورود ارسال شد! برای ورود فوری ایمیل خود را بررسی کنید.', 'ایمیل خود را وارد کنید تا لینک ورود امن ارسال شود.', 'این سرویس ورود در حال فعال‌سازی است. از روش دیگر یا Magic Link زیر استفاده کنید.',
    'در حال تکمیل ورود امن…', 'ورود تکمیل نشد. لطفاً دوباره تلاش کنید.', 'بازگشت به ورود'
  ],
  it: [
    'oppure continua con email', 'Continua con Apple', 'Continua con Google', 'Continua con Facebook (Meta)', 'Continua con Microsoft',
    'Accedi senza password (Magic Link)', 'Accedi con password', 'Invia Magic Link', 'Invio in corso…',
    'Magic Link inviato! Controlla la tua email per accedere subito.', 'Inserisci la tua email per ricevere un link sicuro di accesso.', 'Questo provider è in fase di attivazione. Usa un’altra opzione o Magic Link qui sotto.',
    'Completamento accesso sicuro…', 'Impossibile completare l’accesso. Riprova.', 'Torna al Login'
  ],
  fr: [
    'ou continuer par e-mail', 'Continuer avec Apple', 'Continuer avec Google', 'Continuer avec Facebook (Meta)', 'Continuer avec Microsoft',
    'Connexion sans mot de passe (Magic Link)', 'Connexion par mot de passe', 'Envoyer le Magic Link', 'Envoi en cours…',
    'Magic Link envoyé ! Vérifiez votre boîte mail pour vous connecter.', 'Saisissez votre e-mail pour recevoir un lien sécurisé en 1 clic.', 'Ce fournisseur est en cours d’activation. Utilisez un autre choix ou le Magic Link ci-dessous.',
    'Finalisation de la connexion…', 'Connexion impossible. Veuillez réessayer.', 'Retour à la connexion'
  ],
  pl: [
    'lub kontynuuj przez e-mail', 'Kontynuuj z Apple', 'Kontynuuj z Google', 'Kontynuuj z Facebook (Meta)', 'Kontynuuj z Microsoft',
    'Zaloguj bez hasła (Magic Link)', 'Zaloguj hasłem', 'Wyślij Magic Link (1 klik)', 'Wysyłanie…',
    'Magic Link wysłany! Sprawdź pocztę, aby zalogować się od razu.', 'Wpisz adres e-mail, aby otrzymać bezpieczny link logowania.', 'Ten dostawca jest w trakcie aktywacji. Użyj innej opcji lub Magic Link poniżej.',
    'Kończenie bezpiecznego logowania…', 'Nie udało się zakończyć logowania. Spróbuj ponownie.', 'Powrót do logowania'
  ]
};

export const SOCIAL_AUTH_COPY = Object.fromEntries(
  Object.entries(rows).map(([locale, values]) => {
    if (values.length !== keys.length) {
      throw new Error(`Incomplete Social Auth copy for ${locale}: got ${values.length}, expected ${keys.length}`);
    }
    return [locale, Object.freeze(Object.fromEntries(keys.map((key, index) => [key, values[index]])))];
  })
);

export function getSocialAuthCopy(locale) {
  return SOCIAL_AUTH_COPY[locale] || SOCIAL_AUTH_COPY.en;
}
