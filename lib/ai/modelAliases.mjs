// Names guests type when they are not using the Latin catalogue title.
const GROUPS = [
  [/urus/i, ['урус', 'אורוס', 'أوروس', 'اوروس', 'ウルス', '우루스', '乌鲁斯', '烏魯斯']],
  [/hurac[aá]n/i, ['huracan', 'уракан', 'хуракан', 'هوراكين', 'هوراکان', 'הוראקן', '飓风', 'ウラカン', '우라칸']],
  [/aventador/i, ['aventador', 'авентадор', 'أفينتادور', 'اونتادور', 'אוונטדור', '大牛', 'アヴェンタドール', '아벤타도르']],
  [/lamborghini/i, ['ламборгини', 'ламборджини', 'ламборгіні', 'لامبورغيني', 'لامبورگینی', 'למבורגיני', '兰博基尼', 'ランボルギーニ', '람보르기니']],
  [/ferrari/i, ['феррари', 'ферари', 'феррарі', 'فيراري', 'فراری', 'פרארי', '法拉利', 'フェラーリ', '페라리']],
  [/porsche/i, ['порше', 'порш', 'بورش', 'پورشه', 'פורשה', '保时捷', '保時捷', 'ポルシェ', '포르쉐']],
  [/bentley/i, ['бентли', 'бэнтли', 'بنتلي', 'بنتلی', 'בנטלי', '宾利', 'ベントレー', '벤틀리']],
  [/cullinan/i, ['cullinan', 'куллинан', 'кулинан', 'كولينان', 'کولینان', 'קולינן', '库里南', 'カリナン', '컬리넌']],
  [/rolls/i, ['роллс', 'роллс ройс', 'ролс ройс', 'رولز', 'רולס', '劳斯莱斯', 'ロールス', '롤스']],
  [/mclaren/i, ['макларен', 'ماكلارين', 'מקלרן', '迈凯伦', 'マクラーレン', '맥라렌']],
  [/maybach/i, ['maybach', 'майбах', 'مايباخ', 'مایباخ', 'מייבאך', '迈巴赫', 'マイバッハ', '마이바흐']],
  [/\bg[\s-]?class\b|\bg63\b|\bg550\b|brabus/i, ['g-class', 'g class', 'g63', 'g-wagon', 'gwagon', 'гелендваген', 'гелик', 'геленваген', 'г класс', 'جي كلاس', 'گلاس', 'ג׳י קלאס', '大G', 'ゲレンデ', '지바겐']],
  [/mercedes/i, ['мерседес', 'мерс', 'مرسيدس', 'מרצדס', '奔驰', 'メルセデス', '메르세데스']],
  [/\bbmw\b/i, ['бмв', 'بي ام دبليو', 'بی‌ام‌و', 'ב.מ.וו', '宝马', 'ビーエム', '비엠더블유']],
  [/range rover/i, ['range rover', 'рендж ровер', 'рэндж ровер', 'рейндж ровер', 'рендж', 'رينج روفر', 'رنجروور', 'ריינג׳ רובר', '揽胜', 'レンジローバー', '레인지로버']],
  [/escalade|cadillac/i, ['escalade', 'эскалейд', 'эскалад', 'кадиллак', 'اسكاليد', 'اسکالید', 'אסקלייד', '凯雷德', 'エスカレード', '에스컬레이드']],
  [/bugatti/i, ['бугатти', 'بوغاتي', 'בוגאטי', '布加迪', 'ブガッティ', '부가티']],
  [/maserati/i, ['мазерати', 'مازيراتي', 'מזראטי', '玛莎拉蒂', 'マセラティ', '마세라티']],
  [/aston/i, ['астон', 'أستون', 'אסטון', '阿斯顿', 'アストン', '애스턴']],
  [/corvette/i, ['корвет', 'كورفيت', 'קורבט', '科尔维特', 'コルベット', '콜벳']],
  [/cabriolet|convertible|spyder|spider|roadster/i, ['cabriolet', 'convertible', 'cabrio', 'кабриолет', 'кабрио', 'descapotable', 'conversível', 'مكشوف', 'کروک', 'גג נפתח', '敞篷', 'オープンカー', '컨버터블']],
  [/ferrari|hurac[aá]n|aventador|gallardo|temerario|mclaren|bugatti|corvette|audi r8|911|nsx|mc20|gt3/i, ['supercar', 'sports car', 'суперкар', 'спорткар', 'deportivo', 'sportwagen', '超跑', 'スーパーカー', '슈퍼카']],
  [/range rover|cullinan|bentayga|urus|escalade|\bg63\b|\bg550\b|\bg[\s-]?class\b|\bgls\b|\bgle\b|\bx5\b|\bx6\b|\bx7\b|cayenne|macan|levante|dbx|hummer|r1s|vf9|model x|purosangue/i, ['внедорожник', 'позашляховик', 'кроссовер']]
];

export function modelAliases(title) {
  const name = String(title || '');
  const aliases = [];
  for (const [pattern, list] of GROUPS) if (pattern.test(name)) aliases.push(...list);
  return [...new Set(aliases)];
}
