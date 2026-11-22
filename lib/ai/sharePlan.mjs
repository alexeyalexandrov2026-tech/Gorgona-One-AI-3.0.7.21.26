// ===========================================================================
// 16-language VIP Plan Share & Copy Helper for AiConversation.jsx.
//
// Lets guests copy or share a curated Miami concierge answer + verified
// partner/site links to WhatsApp or clipboard in one tap.
// ===========================================================================

import { normalizeLocale } from './locale.js';

const COPY = Object.freeze({
  en: { copy: 'Copy plan', copied: 'Copied', whatsapp: 'Share to WhatsApp', header: 'MIAMI ELIO — Personal Miami Concierge Plan' },
  ru: { copy: 'Скопировать план', copied: 'Скопировано', whatsapp: 'В WhatsApp', header: 'MIAMI ELIO — Персональный план в Майами' },
  es: { copy: 'Copiar plan', copied: 'Copiado', whatsapp: 'WhatsApp', header: 'MIAMI ELIO — Plan personal en Miami' },
  uk: { copy: 'Скопіювати план', copied: 'Скопійовано', whatsapp: 'У WhatsApp', header: 'MIAMI ELIO — Персональний план у Маямі' },
  fr: { copy: 'Copier le plan', copied: 'Copié', whatsapp: 'WhatsApp', header: 'MIAMI ELIO — Programme personnel à Miami' },
  de: { copy: 'Plan kopieren', copied: 'Kopiert', whatsapp: 'WhatsApp', header: 'MIAMI ELIO — Persönlicher Miami-Plan' },
  it: { copy: 'Copia piano', copied: 'Copiato', whatsapp: 'WhatsApp', header: 'MIAMI ELIO — Piano personale a Miami' },
  pt: { copy: 'Copiar plano', copied: 'Copiado', whatsapp: 'WhatsApp', header: 'MIAMI ELIO — Plano pessoal em Miami' },
  pl: { copy: 'Kopiuj plan', copied: 'Skopiowano', whatsapp: 'WhatsApp', header: 'MIAMI ELIO — Osobisty plan w Miami' },
  tr: { copy: 'Planı kopyala', copied: 'Kopyalandı', whatsapp: 'WhatsApp', header: 'MIAMI ELIO — Kişisel Miami Planı' },
  he: { copy: 'העתק תוכנית', copied: 'הועתק', whatsapp: 'WhatsApp', header: 'MIAMI ELIO — תוכנית אישית למיאמי' },
  ar: { copy: 'نسخ الخطة', copied: 'تم النسخ', whatsapp: 'واتساب', header: 'MIAMI ELIO — خطة ميامي الشخصية' },
  fa: { copy: 'کپی برنامه', copied: 'کپی شد', whatsapp: 'واتساپ', header: 'MIAMI ELIO — برنامه اختصاصی میامی' },
  zh: { copy: '复制行程', copied: '已复制', whatsapp: 'WhatsApp', header: 'MIAMI ELIO — 迈阿密专属行程' },
  ja: { copy: 'プランをコピー', copied: 'コピー済み', whatsapp: 'WhatsApp', header: 'MIAMI ELIO — マイアミ専用プラン' },
  ko: { copy: '일정 복사', copied: '복사됨', whatsapp: 'WhatsApp', header: 'MIAMI ELIO — 마이애미 맞춤 일정' }
});

export function getShareCopy(locale = 'en') {
  const code = normalizeLocale(locale);
  return COPY[code] || COPY.en;
}

const ORIGIN = 'https://gorgona-one.com';

/** Build a clean, shareable plain-text VIP plan with verified site/partner links. */
export function buildShareablePlanText({ reply = '', plan = null, listings = [], locale = 'en' } = {}) {
  const copy = getShareCopy(locale);
  const lines = [copy.header, ''];
  if (reply && typeof reply === 'string') {
    lines.push(reply.trim(), '');
  }

  const seen = new Set();
  const addLink = (title, href, price) => {
    if (!title || !href) return;
    const full = href.startsWith('http') ? href : `${ORIGIN}${href}`;
    if (seen.has(full)) return;
    seen.add(full);
    lines.push(`• ${title}${price ? ` (${price})` : ''}: ${full}`);
  };

  for (const section of plan?.sections || []) {
    const top = section?.candidates?.[0];
    if (top) addLink(top.title, top.booking?.href || top.href, top.price);
  }
  for (const item of (listings || []).slice(0, 3)) {
    addLink(item.title, item.booking?.href || item.href, item.price);
  }
  lines.push('', ORIGIN);
  return lines.join('\n').trim();
}

export function buildWhatsAppShareUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(String(text || '').slice(0, 1800))}`;
}
