// Owned interface text across all 16 languages.
// Legacy 6-key table preserved for nav/tests compatibility; extended page copy below.
const keys = ['nav', 'description', 'search', 'open', 'disclosure', 'language'];
const rows = {
  en: 'Private Jets|Private charters with PereJets and PrivateJetFinder.|Plan your flight|Request a quote on PrivateJetFinder|Charter arranged with licensed partner operators (PereJets, PrivateJetFinder). Guide prices are one-way estimates, including positioning; taxes and handling are extra.|The partner flight search is in English. If it does not load, use the direct link.',
  ru: 'Частные самолёты|Частные чартеры с PereJets и PrivateJetFinder.|Спланируйте полёт|Запросить расчёт на PrivateJetFinder|Чартер организуется через лицензированных партнёров (PereJets, PrivateJetFinder). Ориентировочные цены указаны в одну сторону с учётом позиционирования; налоги и сборы отдельно.|Поиск партнёра работает на английском. Если форма не загрузилась, воспользуйтесь прямой ссылкой.',
  es: 'Jets privados|Vuelos chárter privados con PereJets y PrivateJetFinder.|Planifica tu vuelo|Solicitar presupuesto en PrivateJetFinder|Chárter coordinado con operadores socios con licencia (PereJets, PrivateJetFinder). Precios orientativos solo de ida, incluyendo posicionamiento; impuestos y tasas aparte.|El buscador del socio está en inglés. Si no carga, usa el enlace directo.',
  he: 'מטוסים פרטיים|טיסות שכר פרטיות עם PereJets ו-PrivateJetFinder.|תכננו את הטיסה|בקשת הצעת מחיר ב־PrivateJetFinder|טיסות השכר מתואמות עם שותפים מורשים (PereJets, PrivateJetFinder). מחירי ההכוונה הם לכיוון אחד כולל מיצוב; מסים ודמי טיפול בנפרד.|חיפוש הטיסות של השותף באנגלית. אם הטופס אינו נטען, השתמשו בקישור הישיר.',
  zh: '私人飞机|通过 PereJets 与 PrivateJetFinder 安排私人包机。|规划您的航程|在 PrivateJetFinder 获取报价|包机由持牌合作运营商（PereJets、PrivateJetFinder）安排。参考价为单程预估（含调机费），税费与地面服务费另计。|合作伙伴的航班搜索使用英语。若无法加载，请使用直达链接。',
  pt: 'Jatos privados|Voos charter privados com PereJets e PrivateJetFinder.|Planeje seu voo|Solicitar orçamento na PrivateJetFinder|Charter organizado com operadores parceiros licenciados (PereJets, PrivateJetFinder). Preços de referência só de ida, incluindo posicionamento; impostos e taxas à parte.|A busca do parceiro está em inglês. Se não carregar, use o link direto.',
  uk: 'Приватні літаки|Приватні чартери з PereJets та PrivateJetFinder.|Сплануйте політ|Запросити розрахунок на PrivateJetFinder|Чартер організовується через ліцензованих партнерів (PereJets, PrivateJetFinder). Орієнтовні ціни вказані в один бік із позиціонуванням; податки та збори окремо.|Пошук партнера працює англійською. Якщо форма не завантажилася, скористайтеся прямим посиланням.',
  ja: 'プライベートジェット|PereJets と PrivateJetFinder でプライベートチャーター。|フライトを計画|PrivateJetFinderで見積もりを依頼|チャーターは認可パートナー（PereJets、PrivateJetFinder）が手配します。目安料金は片道（機材回送込み）で、税金・ハンドリング料は別途となります。|提携先の検索は英語です。読み込めない場合は直接リンクをご利用ください。',
  ko: '프라이빗 제트|PereJets 및 PrivateJetFinder와 함께하는 전용기 전세.|항공편 계획|PrivateJetFinder에서 견적 요청|전세기는 인가된 파트너 운항사(PereJets, PrivateJetFinder)가 진행합니다. 안내 요금은 편도 기준(포지셔닝 포함)이며 세금 및 핸들링 비용은 별도입니다.|파트너 항공편 검색은 영어로 제공됩니다. 로드되지 않으면 직접 링크를 이용하세요.',
  de: 'Privatjets|Private Charterflüge mit PereJets und PrivateJetFinder.|Flug planen|Angebot bei PrivateJetFinder anfragen|Charter erfolgt über lizenzierte Partner-Betreiber (PereJets, PrivateJetFinder). Richtpreise gelten für einfache Flüge inkl. Positionierung; Steuern und Gebühren extra.|Die Flugsuche des Partners ist auf Englisch. Falls sie nicht lädt, nutzen Sie den direkten Link.',
  ar: 'طائرات خاصة|رحلات خاصة مع PereJets وPrivateJetFinder.|خطط لرحلتك|اطلب عرض سعر من PrivateJetFinder|يتم ترتيب الرحلات عبر مشغلين شركاء مرخصين (PereJets, PrivateJetFinder). الأسعار الاسترشادية لاتجاه واحد وتشمل التموضع؛ الضرائب والرسوم منفصلة.|البحث لدى الشريك باللغة الإنجليزية. إذا لم يتم تحميل النموذج، استخدم الرابط المباشر.',
  tr: 'Özel jetler|PereJets ve PrivateJetFinder ile özel charter uçuşları.|Uçuşunuzu planlayın|PrivateJetFinder üzerinden teklif isteyin|Charter uçuşları lisanslı iş ortaklarıyla (PereJets, PrivateJetFinder) düzenlenir. Rehber fiyatlar tek yön tahmindir; vergiler ve hizmet ücretleri hariçtir.|Ortağın uçuş araması İngilizcedir. Yüklenmezse doğrudan bağlantıyı kullanın.',
  fa: 'جت‌های خصوصی|پرواز چارتر خصوصی با PereJets و PrivateJetFinder.|پرواز خود را برنامه‌ریزی کنید|درخواست قیمت از PrivateJetFinder|پرواز چارتر توسط اپراتورهای شریک دارای مجوز (PereJets, PrivateJetFinder) انجام می‌شود. قیمت‌های راهنما یک‌طرفه هستند؛ مالیات و هزینه‌های فرودگاهی جداگانه است.|جستجوی پرواز شریک به انگلیسی است. اگر بارگیری نشد، از پیوند مستقیم استفاده کنید.',
  it: 'Jet privati|Voli charter privati con PereJets e PrivateJetFinder.|Pianifica il tuo volo|Richiedi un preventivo su PrivateJetFinder|Charter organizzato con operatori partner autorizzati (PereJets, PrivateJetFinder). I prezzi indicativi sono di sola andata, posizionamento incluso; tasse e handling esclusi.|La ricerca del partner è in inglese. Se non si carica, usa il link diretto.',
  fr: 'Jets privés|Vols charter privés avec PereJets et PrivateJetFinder.|Planifiez votre vol|Demander un devis sur PrivateJetFinder|Affrètement assuré par des opérateurs partenaires agréés (PereJets, PrivateJetFinder). Les tarifs indicatifs sont aller simple, positionnement inclus ; taxes et frais en sus.|La recherche du partenaire est en anglais. Si elle ne charge pas, utilisez le lien direct.',
  pl: 'Prywatne odrzutowce|Prywatne loty czarterowe z PereJets i PrivateJetFinder.|Zaplanuj lot|Poproś o wycenę w PrivateJetFinder|Czarter organizują licencjonowani operatorzy partnerscy (PereJets, PrivateJetFinder). Ceny orientacyjne dotyczą lotu w jedną stronę z pozycjonowaniem; podatki i opłaty osobno.|Wyszukiwarka partnera jest w języku angielskim. Jeśli się nie ładuje, użyj bezpośredniego odnośnika.'
};

export const PRIVATE_JETS_COPY = Object.freeze(
  Object.fromEntries(
    Object.entries(rows).map(([locale, row]) => {
      const values = row.split('|');
      if (values.length !== keys.length) throw Error('Invalid Private Jets translation: ' + locale);
      return [locale, Object.freeze(Object.fromEntries(keys.map((key, index) => [key, values[index]])))];
    })
  )
);

export function getPrivateJetsCopy(locale) {
  return PRIVATE_JETS_COPY[locale] || PRIVATE_JETS_COPY.en;
}

export { getPrivateJetsPageCopy } from './privateJetsPageCopy.mjs';
