// ===========================================================================
// Wave 1 (P0) — ELIO+ Package & Split-Pay Estimator (Zero Hallucinations).
//
// Computes an exact, deterministic package summary directly from selected
// catalog items in AiPlan:
//   - Verified multi-day car totals (exact daily rate × days)
//   - Transparent per-person Split-Pay math (1..12 guests)
//   - Partner-quoted items clearly marked (zero invented dollar estimates)
//   - Structured Split-Pay & security-deposit pre-auth note for POST /api/plan
//   - Full 16-locale copy (strictly ELIO+ Guide brand, zero "concierge")
// ===========================================================================

import { normalizeLocale } from './locale.js';
import { parseDailyPrice } from './tripProfile.mjs';

const PACKAGE_COPY = Object.freeze({
  en: {
    heading: 'ELIO+ Package & Split-Pay',
    daysLabel: 'Days',
    splitLabel: 'Split',
    verifiedCars: 'Verified fleet total',
    perPerson: 'Per guest (Split-Pay)',
    partnerItems: 'Partner quote items',
    partnerQuoteTag: 'Live partner quote',
    depositNote: 'Refundable security deposit pre-auth confirmed in Live Trip Room before payment.',
    splitToggle: 'Request Split-Pay links for {n} guests',
    submitPackage: 'Lock {n}-item package & get quote',
    guestsUnit: 'guests'
  },
  ru: {
    heading: 'Пакет ELIO+ и Split-Pay',
    daysLabel: 'Дни',
    splitLabel: 'Разделить',
    verifiedCars: 'Автопарк (точная цена)',
    perPerson: 'На гостя (Split-Pay)',
    partnerItems: 'Позиции партнёров',
    partnerQuoteTag: 'По котировке партнёра',
    depositNote: 'Возвратный залог (преавторизация) фиксируется в Live Trip Room до оплаты.',
    splitToggle: 'Разделить оплату (Split-Pay) на {n} чел.',
    submitPackage: 'Зафиксировать пакет ({n}) и получить расчёт',
    guestsUnit: 'чел.'
  },
  es: {
    heading: 'Paquete ELIO+ y Split-Pay',
    daysLabel: 'Días',
    splitLabel: 'Dividir',
    verifiedCars: 'Flota verificada',
    perPerson: 'Por persona (Split-Pay)',
    partnerItems: 'Cotización de socios',
    partnerQuoteTag: 'Cotización en vivo',
    depositNote: 'La preautorización del depósito reembolsable se confirma en Live Trip Room.',
    splitToggle: 'Solicitar enlaces Split-Pay para {n} personas',
    submitPackage: 'Fijar paquete ({n}) y solicitar cotización',
    guestsUnit: 'pers.'
  },
  uk: {
    heading: 'Пакет ELIO+ та Split-Pay',
    daysLabel: 'Дні',
    splitLabel: 'Поділити',
    verifiedCars: 'Автопарк (точна ціна)',
    perPerson: 'На гостя (Split-Pay)',
    partnerItems: 'Позиції партнерів',
    partnerQuoteTag: 'За котируванням партнера',
    depositNote: 'Поворотний депозит (преавторизація) підтверджується у Live Trip Room.',
    splitToggle: 'Розділити оплату (Split-Pay) на {n} гостей',
    submitPackage: 'Зафіксувати пакет ({n}) і отримати розрахунок',
    guestsUnit: 'гостей'
  },
  pt: {
    heading: 'Pacote ELIO+ e Split-Pay',
    daysLabel: 'Dias',
    splitLabel: 'Dividir',
    verifiedCars: 'Frota verificada',
    perPerson: 'Por pessoa (Split-Pay)',
    partnerItems: 'Cotação de parceiros',
    partnerQuoteTag: 'Cotação ao vivo',
    depositNote: 'Pré-autorização de depósito reembolsável confirmada no Live Trip Room.',
    splitToggle: 'Solicitar links Split-Pay para {n} pessoas',
    submitPackage: 'Fixar pacote ({n}) e solicitar cotação',
    guestsUnit: 'pessoas'
  },
  fr: {
    heading: 'Pack ELIO+ et Split-Pay',
    daysLabel: 'Jours',
    splitLabel: 'Partager',
    verifiedCars: 'Flotte vérifiée',
    perPerson: 'Par invité (Split-Pay)',
    partnerItems: 'Devis partenaires',
    partnerQuoteTag: 'Tarif partenaire',
    depositNote: 'Pré-autorisation de caution remboursable confirmée dans Live Trip Room.',
    splitToggle: 'Demander des liens Split-Pay pour {n} invités',
    submitPackage: 'Valider le pack ({n}) et recevoir le devis',
    guestsUnit: 'invités'
  },
  de: {
    heading: 'ELIO+ Paket & Split-Pay',
    daysLabel: 'Tage',
    splitLabel: 'Teilen',
    verifiedCars: 'Verifizierte Flotte',
    perPerson: 'Pro Gast (Split-Pay)',
    partnerItems: 'Partner-Positionen',
    partnerQuoteTag: 'Partner-Angebot',
    depositNote: 'Erstattungsfähige Kautions-Vorautorisierung im Live Trip Room bestätigt.',
    splitToggle: 'Split-Pay-Links für {n} Gäste anfordern',
    submitPackage: 'Paket ({n}) sichern & Angebot erhalten',
    guestsUnit: 'Gäste'
  },
  it: {
    heading: 'Pacchetto ELIO+ e Split-Pay',
    daysLabel: 'Giorni',
    splitLabel: 'Dividi',
    verifiedCars: 'Flotta verificata',
    perPerson: 'A ospite (Split-Pay)',
    partnerItems: 'Quote partner',
    partnerQuoteTag: 'Preventivo partner',
    depositNote: 'Pre-autorizzazione deposito rimborsabile confermata nella Live Trip Room.',
    splitToggle: 'Richiedi link Split-Pay per {n} ospiti',
    submitPackage: 'Blocca pacchetto ({n}) e ricevi preventivo',
    guestsUnit: 'ospiti'
  },
  he: {
    heading: 'חבילת ELIO+ ו-Split-Pay',
    daysLabel: 'ימים',
    splitLabel: 'חלוקה',
    verifiedCars: 'רכבים מאומתים',
    perPerson: 'לאורח (Split-Pay)',
    partnerItems: 'הצעות שותפים',
    partnerQuoteTag: 'הצעת מחיר חיה',
    depositNote: 'פיקדון מוחזר מאושר ב-Live Trip Room לפני תשלום.',
    splitToggle: 'בקש קישורי Split-Pay ל-{n} אורחים',
    submitPackage: 'נעל חבילה ({n}) וקבל הצעת מחיר',
    guestsUnit: 'אורחים'
  },
  ar: {
    heading: 'باقة ELIO+ والدفع المشترك',
    daysLabel: 'الأيام',
    splitLabel: 'تقسيم',
    verifiedCars: 'الأسطول المعتمد',
    perPerson: 'لكل ضيف (Split-Pay)',
    partnerItems: 'عروض الشركاء',
    partnerQuoteTag: 'عرض شريك مباشر',
    depositNote: 'يتم تأكيد التفويض المسبق للتأمين المسترد في Live Trip Room قبل الدفع.',
    splitToggle: 'طلب روابط Split-Pay لـ {n} ضيوف',
    submitPackage: 'تثبيت الباقة ({n}) وطلب عرض سعر',
    guestsUnit: 'ضيوف'
  },
  zh: {
    heading: 'ELIO+ 套餐与分摊支付',
    daysLabel: '天数',
    splitLabel: '分摊',
    verifiedCars: '已验证车队合计',
    perPerson: '人均 (Split-Pay)',
    partnerItems: '合作方报价项目',
    partnerQuoteTag: '实时合作方报价',
    depositNote: '可退还押金预授权将在付款前于 Live Trip Room 确认。',
    splitToggle: '申请 {n} 位宾客的 Split-Pay 分摊链接',
    submitPackage: '锁定 {n} 项套餐并获取报价',
    guestsUnit: '人'
  },
  ja: {
    heading: 'ELIO+ パッケージ & 割り勘',
    daysLabel: '日数',
    splitLabel: '分割',
    verifiedCars: '車両合計（確定料金）',
    perPerson: '1名あたり (Split-Pay)',
    partnerItems: 'パートナー見積り項目',
    partnerQuoteTag: 'パートナー個別見積り',
    depositNote: '返金可能なデポジット事前承認は決済前に Live Trip Room で確定します。',
    splitToggle: '{n}名分の Split-Pay リンクをリクエスト',
    submitPackage: '{n}件のパッケージを確定して見積り取得',
    guestsUnit: '名'
  },
  ko: {
    heading: 'ELIO+ 패키지 & 분할결제',
    daysLabel: '일수',
    splitLabel: '분할',
    verifiedCars: '차량 확정 합계',
    perPerson: '1인당 (Split-Pay)',
    partnerItems: '파트너 견적 항목',
    partnerQuoteTag: '실시간 파트너 견적',
    depositNote: '환불 가능한 보증금 사전 승인은 결제 전 Live Trip Room에서 확정됩니다.',
    splitToggle: '{n}명용 Split-Pay 결제 링크 요청',
    submitPackage: '{n}개 패키지 확정 및 견적 받기',
    guestsUnit: '명'
  },
  pl: {
    heading: 'Pakiet ELIO+ i Split-Pay',
    daysLabel: 'Dni',
    splitLabel: 'Podziel',
    verifiedCars: 'Zweryfikowana flota',
    perPerson: 'Na osobę (Split-Pay)',
    partnerItems: 'Pozycje partnerskie',
    partnerQuoteTag: 'Wycena partnera',
    depositNote: 'Zwrotna preautoryzacja kaucji potwierdzana w Live Trip Room przed płatnością.',
    splitToggle: 'Poproś o linki Split-Pay dla {n} gości',
    submitPackage: 'Zablokuj pakiet ({n}) i uzyskaj wycenę',
    guestsUnit: 'os.'
  },
  tr: {
    heading: 'ELIO+ Paket ve Split-Pay',
    daysLabel: 'Gün',
    splitLabel: 'Böl',
    verifiedCars: 'Doğrulanmış filo toplamı',
    perPerson: 'Kişi başı (Split-Pay)',
    partnerItems: 'İş ortağı teklifleri',
    partnerQuoteTag: 'Canlı ortak teklifi',
    depositNote: 'İade edilebilir depozito ön provizyonu ödeme öncesi Live Trip Room’da onaylanır.',
    splitToggle: '{n} misafir için Split-Pay bağlantısı iste',
    submitPackage: '{n} öğeli paketi kilitle ve teklif al',
    guestsUnit: 'kişi'
  },
  fa: {
    heading: 'پکیج ELIO+ و پرداخت اشتراکی',
    daysLabel: 'روز',
    splitLabel: 'تقسیم',
    verifiedCars: 'مجموع ناوگان تاییدشده',
    perPerson: 'به ازای هر نفر (Split-Pay)',
    partnerItems: 'موارد همکاران',
    partnerQuoteTag: 'استعلام قیمت همکار',
    depositNote: 'پیش‌تایید ودیعه قابل‌استرداد پیش از پرداخت در Live Trip Room تایید می‌شود.',
    splitToggle: 'درخواست لینک Split-Pay برای {n} نفر',
    submitPackage: 'ثبت پکیج ({n}) و دریافت پیش‌فاکتور',
    guestsUnit: 'نفر'
  }
});

export function getPackageCopy(locale = 'en') {
  return PACKAGE_COPY[normalizeLocale(locale)] || PACKAGE_COPY.en;
}

/** Format USD cleanly ("$2,600"). */
export function formatUsd(amount) {
  const n = Math.round(Number(amount));
  if (!Number.isFinite(n) || n <= 0) return '$0';
  return `$${n.toLocaleString('en-US')}`;
}

/**
 * Compute deterministic package estimate from selected AiPlan items.
 * Never invents dollar prices for partner-quoted yachts, villas, or dining.
 */
export function computePackageSummary(selectedItems = [], { days = 2, splitWays = 1 } = {}) {
  const safeDays = Math.max(1, Math.min(14, Math.trunc(Number(days) || 1)));
  const safeSplit = Math.max(1, Math.min(12, Math.trunc(Number(splitWays) || 1)));

  let verifiedCarTotal = 0;
  let verifiedCarCount = 0;
  let partnerQuotedCount = 0;
  const lineItems = [];

  for (const item of Array.isArray(selectedItems) ? selectedItems : []) {
    if (!item?.slug) continue;
    const daily = item.kind === 'car' ? parseDailyPrice(item.price) : null;
    if (daily && daily > 0) {
      const subtotal = daily * safeDays;
      verifiedCarTotal += subtotal;
      verifiedCarCount += 1;
      lineItems.push({
        kind: item.kind,
        slug: item.slug,
        title: item.title || item.slug,
        daily,
        days: safeDays,
        subtotal,
        verified: true
      });
    } else {
      partnerQuotedCount += 1;
      lineItems.push({
        kind: item.kind || 'item',
        slug: item.slug,
        title: item.title || item.slug,
        daily: null,
        days: safeDays,
        subtotal: null,
        verified: false
      });
    }
  }

  const perPersonVerified = verifiedCarTotal > 0 ? Math.ceil(verifiedCarTotal / safeSplit) : null;

  return {
    days: safeDays,
    splitWays: safeSplit,
    itemCount: lineItems.length,
    verifiedCarCount,
    verifiedCarTotal,
    perPersonVerified,
    partnerQuotedCount,
    hasSecurityDepositNote: verifiedCarCount > 0,
    lineItems
  };
}

/** Build a compact structured note appended to POST /api/plan for the owner & Live Trip Room. */
export function buildPackagePlanNote(summary, { userNote = '', requestSplitPay = false } = {}) {
  const parts = [];
  if (summary?.itemCount) {
    const bits = [`ELIO+ Package (${summary.itemCount} items, ${summary.days}d)`];
    if (summary.verifiedCarTotal > 0) {
      bits.push(`Verified fleet: ${formatUsd(summary.verifiedCarTotal)}`);
    }
    if (requestSplitPay && summary.splitWays >= 2) {
      const share = summary.perPersonVerified ? ` (~${formatUsd(summary.perPersonVerified)}/guest fleet)` : '';
      bits.push(`Split-Pay requested x${summary.splitWays}${share}`);
    }
    if (summary.hasSecurityDepositNote) {
      bits.push('Security deposit pre-auth');
    }
    parts.push(bits.join(' · '));
  }
  const cleanUser = String(userNote || '').trim();
  if (cleanUser) parts.push(cleanUser);
  return parts.join(' | ').slice(0, 950);
}
