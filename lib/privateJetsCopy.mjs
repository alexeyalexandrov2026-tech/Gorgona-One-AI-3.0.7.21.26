// Owned interface text. The partner's flight search remains in English.
const keys=['nav','description','search','open','disclosure','language'];
const rows={
 en:"Private Jets|Private charters with PrivateJetFinder.|Plan your flight|Request a quote on PrivateJetFinder|Flight quotes, availability, booking and payment are handled by PrivateJetFinder and its providers.|The partner flight search is in English. If it does not load, use the direct link.",
 ru:"Частные самолёты|Частные чартеры с PrivateJetFinder.|Спланируйте полёт|Запросить расчёт на PrivateJetFinder|Расчёт стоимости, наличие, бронирование и оплату обрабатывают PrivateJetFinder и его поставщики.|Поиск партнёра работает на английском. Если форма не загрузилась, воспользуйтесь прямой ссылкой.",
 es:"Jets privados|Vuelos chárter privados con PrivateJetFinder.|Planifica tu vuelo|Solicitar presupuesto en PrivateJetFinder|PrivateJetFinder y sus proveedores gestionan los presupuestos, la disponibilidad, las reservas y los pagos.|El buscador del socio está en inglés. Si no carga, usa el enlace directo.",
 he:"מטוסים פרטיים|טיסות שכר פרטיות עם PrivateJetFinder.|תכננו את הטיסה|בקשת הצעת מחיר ב־PrivateJetFinder|הצעות מחיר, זמינות, הזמנות ותשלומים מטופלים בידי PrivateJetFinder וספקיו.|חיפוש הטיסות של השותף באנגלית. אם הטופס אינו נטען, השתמשו בקישור הישיר.",
 zh:"私人飞机|通过 PrivateJetFinder 安排私人包机。|规划您的航程|在 PrivateJetFinder 获取报价|报价、余量、预订和付款由 PrivateJetFinder 及其供应商处理。|合作伙伴的航班搜索使用英语。若无法加载，请使用直达链接。",
 pt:"Jatos privados|Voos charter privados com a PrivateJetFinder.|Planeje seu voo|Solicitar orçamento na PrivateJetFinder|A PrivateJetFinder e seus fornecedores cuidam dos orçamentos, disponibilidade, reservas e pagamentos.|A busca do parceiro está em inglês. Se não carregar, use o link direto.",
 uk:"Приватні літаки|Приватні чартери з PrivateJetFinder.|Сплануйте політ|Запросити розрахунок на PrivateJetFinder|Розрахунок вартості, наявність, бронювання й оплату обробляють PrivateJetFinder та його постачальники.|Пошук партнера працює англійською. Якщо форма не завантажилася, скористайтеся прямим посиланням.",
 ja:"プライベートジェット|PrivateJetFinderでプライベートチャーター。|フライトを計画|PrivateJetFinderで見積もりを依頼|見積もり、空き状況、予約、決済はPrivateJetFinderとその提供業者が担当します。|提携先の検索は英語です。読み込めない場合は直接リンクをご利用ください。",
 ko:"프라이빗 제트|PrivateJetFinder와 함께하는 전용기 전세.|항공편 계획|PrivateJetFinder에서 견적 요청|견적, 예약 가능 여부, 예약 및 결제는 PrivateJetFinder와 공급업체에서 처리합니다.|파트너 항공편 검색은 영어로 제공됩니다. 로드되지 않으면 직접 링크를 이용하세요.",
 de:"Privatjets|Private Charterflüge mit PrivateJetFinder.|Flug planen|Angebot bei PrivateJetFinder anfragen|Angebote, Verfügbarkeit, Buchungen und Zahlungen werden von PrivateJetFinder und seinen Anbietern bearbeitet.|Die Flugsuche des Partners ist auf Englisch. Falls sie nicht lädt, nutzen Sie den direkten Link.",
 ar:"طائرات خاصة|رحلات خاصة مع PrivateJetFinder.|خطط لرحلتك|اطلب عرض سعر من PrivateJetFinder|تتولى PrivateJetFinder ومزودوها عروض الأسعار والتوافر والحجوزات والمدفوعات.|البحث لدى الشريك باللغة الإنجليزية. إذا لم يتم تحميل النموذج، استخدم الرابط المباشر.",
 tr:"Özel jetler|PrivateJetFinder ile özel charter uçuşları.|Uçuşunuzu planlayın|PrivateJetFinder üzerinden teklif isteyin|Teklifler, müsaitlik, rezervasyon ve ödemeler PrivateJetFinder ve sağlayıcıları tarafından yürütülür.|Ortağın uçuş araması İngilizcedir. Yüklenmezse doğrudan bağlantıyı kullanın.",
 fa:"جت‌های خصوصی|پرواز چارتر خصوصی با PrivateJetFinder.|پرواز خود را برنامه‌ریزی کنید|درخواست قیمت از PrivateJetFinder|قیمت، ظرفیت، رزرو و پرداخت توسط PrivateJetFinder و ارائه‌دهندگان آن انجام می‌شود.|جستجوی پرواز شریک به انگلیسی است. اگر بارگیری نشد، از پیوند مستقیم استفاده کنید.",
 it:"Jet privati|Voli charter privati con PrivateJetFinder.|Pianifica il tuo volo|Richiedi un preventivo su PrivateJetFinder|Preventivi, disponibilità, prenotazioni e pagamenti sono gestiti da PrivateJetFinder e dai suoi fornitori.|La ricerca del partner è in inglese. Se non si carica, usa il link diretto.",
 fr:"Jets privés|Vols charter privés avec PrivateJetFinder.|Planifiez votre vol|Demander un devis sur PrivateJetFinder|Les devis, disponibilités, réservations et paiements sont gérés par PrivateJetFinder et ses prestataires.|La recherche du partenaire est en anglais. Si elle ne charge pas, utilisez le lien direct.",
 pl:"Prywatne odrzutowce|Prywatne loty czarterowe z PrivateJetFinder.|Zaplanuj lot|Poproś o wycenę w PrivateJetFinder|Wyceny, dostępność, rezerwacje i płatności obsługuje PrivateJetFinder i jego dostawcy.|Wyszukiwarka partnera jest w języku angielskim. Jeśli się nie ładuje, użyj bezpośredniego odnośnika."
};
export const PRIVATE_JETS_COPY=Object.freeze(Object.fromEntries(Object.entries(rows).map(([locale,row])=>{
 const values=row.split('|');
 if(values.length!==keys.length)throw Error('Invalid Private Jets translation: '+locale);
 return [locale,Object.freeze(Object.fromEntries(keys.map((key,index)=>[key,values[index]])))];
})));
export function getPrivateJetsCopy(locale){return PRIVATE_JETS_COPY[locale]||PRIVATE_JETS_COPY.en;}
