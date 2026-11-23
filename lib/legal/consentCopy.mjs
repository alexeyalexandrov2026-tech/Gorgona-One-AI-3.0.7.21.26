// Lightweight 16-language clickwrap consent labels for BookingForm.
// Kept separate from checkout/admin copy so rental detail pages stay lean.

const keys = ['consentPrefix', 'termsLink', 'consentAnd', 'privacyLink', 'consentSuffix', 'consentRequired'];

const rows = {
  en: ['I agree to the', 'Terms of Service', 'and', 'Privacy Policy', 'and understand that requests are confirmed manually before any charge.', 'Please accept the Terms of Service and Privacy Policy before submitting.'],
  ru: ['Я принимаю', 'Условия использования', 'и', 'Политику конфиденциальности', 'и понимаю, что заявка подтверждается вручную без списания средств.', 'Подтвердите согласие с Условиями использования и Политикой конфиденциальности.'],
  es: ['Acepto los', 'Términos de Servicio', 'y la', 'Política de Privacidad', 'y entiendo que las solicitudes se confirman manualmente antes de cualquier cobro.', 'Acepta los Términos de Servicio y la Política de Privacidad antes de enviar.'],
  he: ['אני מסכים/ה ל', 'תנאי השימוש', 'ול', 'מדיניות הפרטיות', 'ומבין/ה שבקשות מאושרות ידנית ללא חיוב מראש.', 'יש לאשר את תנאי השימוש ומדיניות הפרטיות לפני השליחה.'],
  zh: ['我同意', '服务条款', '和', '隐私政策', '并理解提交申请后将由人工确认，不会预先扣款。', '提交前请先同意服务条款和隐私政策。'],
  pt: ['Concordo com os', 'Termos de Serviço', 'e a', 'Política de Privacidade', 'e entendo que solicitações são confirmadas manualmente sem cobrança imediata.', 'Aceite os Termos de Serviço e a Política de Privacidade antes de enviar.'],
  uk: ['Я приймаю', 'Умови використання', 'та', 'Політику конфіденційності', 'і розумію, що запит підтверджується вручну без списання коштів.', 'Підтвердьте згоду з Умовами використання та Політикою конфіденційності.'],
  ja: ['以下に同意します：', '利用規約', 'および', 'プライバシーポリシー', '（リクエストは手動確認され、送信時点で課金されません）', '送信前に利用規約とプライバシーポリシーに同意してください。'],
  ko: ['다음에 동의합니다:', '이용약관', '및', '개인정보 처리방침', '(요청은 수동으로 확인되며 즉시 결제되지 않습니다.)', '제출하기 전에 이용약관 및 개인정보 처리방침에 동의해 주세요.'],
  de: ['Ich akzeptiere die', 'Nutzungsbedingungen', 'und die', 'Datenschutzerklärung', 'und verstehe, dass Anfragen manuell und ohne sofortige Belastung bestätigt werden.', 'Bitte akzeptieren Sie die Nutzungsbedingungen und die Datenschutzerklärung.'],
  ar: ['أوافق على', 'شروط الخدمة', 'و', 'سياسة الخصوصية', 'وأفهم أن الطلبات تُؤكد يدوياً دون خصم فوري.', 'يرجى الموافقة على شروط الخدمة وسياسة الخصوصية قبل الإرسال.'],
  tr: ['Şunları kabul ediyorum:', 'Hizmet Şartları', 've', 'Gizlilik Politikası', 've taleplerin tahsilat yapılmadan manuel olarak onaylandığını anlıyorum.', 'Göndermeden önce Hizmet Şartları ve Gizlilik Politikasını onaylayın.'],
  fa: ['من با موارد زیر موافقم:', 'شرایط خدمات', 'و', 'سیاست حفظ حریم خصوصی', 'و می‌دانم درخواست‌ها بدون کسر وجه به‌صورت دستی تأیید می‌شوند.', 'لطفاً پیش از ارسال، شرایط خدمات و سیاست حفظ حریم خصوصی را بپذیرید.'],
  it: ['Accetto i', 'Termini di Servizio', 'e la', 'Privacy Policy', 'e comprendo che le richieste vengono confermate manualmente senza addebito immediato.', 'Accetta i Termini di Servizio e la Privacy Policy prima di inviare.'],
  fr: ['J’accepte les', 'Conditions d’utilisation', 'et la', 'Politique de confidentialité', 'et je comprends que chaque demande est confirmée manuellement sans débit immédiat.', 'Veuillez accepter les Conditions d’utilisation et la Politique de confidentialité.'],
  pl: ['Akceptuję', 'Regulamin', 'oraz', 'Politykę prywatności', 'i rozumiem, że zapytania są potwierdzane ręcznie bez natychmiastowego obciążenia.', 'Zaakceptuj Regulamin i Politykę prywatności przed wysłaniem.']
};

export const CONSENT_COPY = Object.fromEntries(
  Object.entries(rows).map(([locale, values]) => {
    if (values.length !== keys.length) throw new Error('Incomplete consent copy: ' + locale);
    return [locale, Object.freeze(Object.fromEntries(keys.map((key, index) => [key, values[index]])))];
  })
);

export function getConsentCopy(locale) {
  return CONSENT_COPY[locale] || CONSENT_COPY.en;
}
