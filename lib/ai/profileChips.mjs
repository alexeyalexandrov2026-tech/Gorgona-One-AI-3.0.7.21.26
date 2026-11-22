// ===========================================================================
// 16-language localized Trip Profile memory chips for AiConversation.jsx.
//
// Displays remembered trip context (guests, dates, neighborhood, car budget,
// occasion, airport, cuisine/dietary) directly above the chat so VIP guests
// see that the concierge remembers their preferences and can tap a chip to
// refine a parameter or reset the session in one click.
// ===========================================================================

import { normalizeLocale } from './locale.js';

const LABELS = Object.freeze({
  en: {
    guests: (n) => `${n} guests`,
    budget: (n) => `≤ $${n}/day`,
    budgetFriendly: 'Best value',
    reset: 'Clear',
    editGuests: 'Change group size to ',
    editNeighborhood: 'Change Miami area to ',
    editBudget: 'Change car budget to $',
    editDates: 'Change dates to ',
    occasions: {
      anniversary: 'Anniversary', birthday: 'Birthday', 'family-kids': 'With kids',
      business: 'Business', romantic: 'Date night', party: 'Party', proposal: 'Proposal'
    },
    cuisines: {
      sushi: 'Sushi', steakhouse: 'Steakhouse', italian: 'Italian', seafood: 'Seafood',
      mediterranean: 'Mediterranean', halal: 'Halal', kosher: 'Kosher', vegan: 'Vegan', 'no-seafood': 'No seafood'
    }
  },
  ru: {
    guests: (n) => `${n} гост.`,
    budget: (n) => `до $${n}/день`,
    budgetFriendly: 'Выгодно',
    reset: 'Сброс',
    editGuests: 'Нас будет ',
    editNeighborhood: 'Поменяй район на ',
    editBudget: 'Бюджет на авто до $',
    editDates: 'Поменяй даты на ',
    occasions: {
      anniversary: 'Годовщина', birthday: 'День рождения', 'family-kids': 'С детьми',
      business: 'Бизнес', romantic: 'Романтика', party: 'Вечеринка', proposal: 'Предложение'
    },
    cuisines: {
      sushi: 'Суши', steakhouse: 'Стейки', italian: 'Итальянская', seafood: 'Морепродукты',
      mediterranean: 'Средиземноморская', halal: 'Халяль', kosher: 'Кошер', vegan: 'Веган', 'no-seafood': 'Без морепродуктов'
    }
  },
  es: {
    guests: (n) => `${n} pers.`,
    budget: (n) => `≤ $${n}/día`,
    budgetFriendly: 'Económico',
    reset: 'Limpiar',
    editGuests: 'Cambiar grupo a ',
    editNeighborhood: 'Cambiar zona a ',
    editBudget: 'Presupuesto de auto hasta $',
    editDates: 'Cambiar fechas a ',
    occasions: {
      anniversary: 'Aniversario', birthday: 'Cumpleaños', 'family-kids': 'Con niños',
      business: 'Negocios', romantic: 'Romántico', party: 'Fiesta', proposal: 'Propuesta'
    },
    cuisines: {
      sushi: 'Sushi', steakhouse: 'Steakhouse', italian: 'Italiana', seafood: 'Mariscos',
      mediterranean: 'Mediterránea', halal: 'Halal', kosher: 'Kosher', vegan: 'Vegano', 'no-seafood': 'Sin mariscos'
    }
  },
  uk: {
    guests: (n) => `${n} гост.`,
    budget: (n) => `до $${n}/день`,
    budgetFriendly: 'Вигідно',
    reset: 'Скинути',
    editGuests: 'Нас буде ',
    editNeighborhood: 'Зміни район на ',
    editBudget: 'Бюджет на авто до $',
    editDates: 'Зміни дати на ',
    occasions: {
      anniversary: 'Річниця', birthday: 'День народження', 'family-kids': 'З дітьми',
      business: 'Бізнес', romantic: 'Романтика', party: 'Вечірка', proposal: 'Освідчення'
    },
    cuisines: {
      sushi: 'Суші', steakhouse: 'Стейки', italian: 'Італійська', seafood: 'Морепродукти',
      mediterranean: 'Середземноморська', halal: 'Халяль', kosher: 'Кошер', vegan: 'Веган', 'no-seafood': 'Без морепродуктів'
    }
  },
  fr: {
    guests: (n) => `${n} pers.`,
    budget: (n) => `≤ $${n}/jour`,
    budgetFriendly: 'Meilleur prix',
    reset: 'Effacer',
    editGuests: 'Changer pour ',
    editNeighborhood: 'Changer de quartier : ',
    editBudget: 'Budget voiture max $',
    editDates: 'Changer les dates pour ',
    occasions: {
      anniversary: 'Anniversaire', birthday: 'Anniversaire', 'family-kids': 'En famille',
      business: 'Affaires', romantic: 'Romantique', party: 'Fête', proposal: 'Demande en mariage'
    },
    cuisines: {
      sushi: 'Sushi', steakhouse: 'Steakhouse', italian: 'Italien', seafood: 'Fruits de mer',
      mediterranean: 'Méditerranéen', halal: 'Halal', kosher: 'Casher', vegan: 'Végan', 'no-seafood': 'Sans fruits de mer'
    }
  },
  de: {
    guests: (n) => `${n} Gäste`,
    budget: (n) => `≤ $${n}/Tag`,
    budgetFriendly: 'Preiswert',
    reset: 'Zurücksetzen',
    editGuests: 'Gruppe ändern auf ',
    editNeighborhood: 'Stadtteil ändern auf ',
    editBudget: 'Auto-Budget bis $',
    editDates: 'Datum ändern auf ',
    occasions: {
      anniversary: 'Jahrestag', birthday: 'Geburtstag', 'family-kids': 'Mit Kindern',
      business: 'Business', romantic: 'Romantisch', party: 'Party', proposal: 'Heiratsantrag'
    },
    cuisines: {
      sushi: 'Sushi', steakhouse: 'Steakhouse', italian: 'Italienisch', seafood: 'Meeresfrüchte',
      mediterranean: 'Mediterran', halal: 'Halal', kosher: 'Koscher', vegan: 'Vegan', 'no-seafood': 'Ohne Meeresfrüchte'
    }
  },
  it: {
    guests: (n) => `${n} ospiti`,
    budget: (n) => `≤ $${n}/giorno`,
    budgetFriendly: 'Conveniente',
    reset: 'Cancella',
    editGuests: 'Cambia gruppo a ',
    editNeighborhood: 'Cambia zona a ',
    editBudget: 'Budget auto fino a $',
    editDates: 'Cambia date a ',
    occasions: {
      anniversary: 'Anniversario', birthday: 'Compleanno', 'family-kids': 'Con bambini',
      business: 'Business', romantic: 'Romantico', party: 'Festa', proposal: 'Proposta'
    },
    cuisines: {
      sushi: 'Sushi', steakhouse: 'Steakhouse', italian: 'Italiano', seafood: 'Pesce',
      mediterranean: 'Mediterraneo', halal: 'Halal', kosher: 'Kosher', vegan: 'Vegano', 'no-seafood': 'Senza pesce'
    }
  },
  pt: {
    guests: (n) => `${n} pessoas`,
    budget: (n) => `≤ $${n}/dia`,
    budgetFriendly: 'Custo-benefício',
    reset: 'Limpar',
    editGuests: 'Mudar grupo para ',
    editNeighborhood: 'Mudar bairro para ',
    editBudget: 'Orçamento carro até $',
    editDates: 'Mudar datas para ',
    occasions: {
      anniversary: 'Aniversário de casamento', birthday: 'Aniversário', 'family-kids': 'Com crianças',
      business: 'Negócios', romantic: 'Romântico', party: 'Festa', proposal: 'Pedido'
    },
    cuisines: {
      sushi: 'Sushi', steakhouse: 'Steakhouse', italian: 'Italiana', seafood: 'Frutos do mar',
      mediterranean: 'Mediterrânea', halal: 'Halal', kosher: 'Kosher', vegan: 'Vegano', 'no-seafood': 'Sem frutos do mar'
    }
  },
  pl: {
    guests: (n) => `${n} osób`,
    budget: (n) => `do $${n}/dzień`,
    budgetFriendly: 'Korzystnie',
    reset: 'Wyczyść',
    editGuests: 'Zmień liczbę osób na ',
    editNeighborhood: 'Zmień dzielnicę na ',
    editBudget: 'Budżet na auto do $',
    editDates: 'Zmień daty na ',
    occasions: {
      anniversary: 'Rocznica', birthday: 'Urodziny', 'family-kids': 'Z dziećmi',
      business: 'Biznes', romantic: 'Romantycznie', party: 'Impreza', proposal: 'Zaręczyny'
    },
    cuisines: {
      sushi: 'Sushi', steakhouse: 'Steki', italian: 'Włoska', seafood: 'Owoce morza',
      mediterranean: 'Śródziemnomorska', halal: 'Halal', kosher: 'Koszerne', vegan: 'Wegańskie', 'no-seafood': 'Bez owoców morza'
    }
  },
  tr: {
    guests: (n) => `${n} kişi`,
    budget: (n) => `≤ $${n}/gün`,
    budgetFriendly: 'Ekonomik',
    reset: 'Temizle',
    editGuests: 'Kişi sayısını değiştir: ',
    editNeighborhood: 'Bölgeyi değiştir: ',
    editBudget: 'Araç bütçesi max $',
    editDates: 'Tarihleri değiştir: ',
    occasions: {
      anniversary: 'Yıldönümü', birthday: 'Doğum günü', 'family-kids': 'Çocuklu',
      business: 'İş', romantic: 'Romantik', party: 'Parti', proposal: 'Evlilik teklifi'
    },
    cuisines: {
      sushi: 'Suşi', steakhouse: 'Steakhouse', italian: 'İtalyan', seafood: 'Deniz ürünleri',
      mediterranean: 'Akdeniz', halal: 'Helal', kosher: 'Koşer', vegan: 'Vegan', 'no-seafood': 'Deniz ürünsüz'
    }
  },
  he: {
    guests: (n) => `${n} אורחים`,
    budget: (n) => `עד $${n}/יום`,
    budgetFriendly: 'משתלם',
    reset: 'נקה',
    editGuests: 'שנה מספר אורחים ל-',
    editNeighborhood: 'שנה אזור ל-',
    editBudget: 'תקציב רכב עד $',
    editDates: 'שנה תאריכים ל-',
    occasions: {
      anniversary: 'יום נישואין', birthday: 'יום הולדת', 'family-kids': 'עם ילדים',
      business: 'עסקים', romantic: 'רומנטי', party: 'מסיבה', proposal: 'הצעת נישואין'
    },
    cuisines: {
      sushi: 'סושי', steakhouse: 'סטייקים', italian: 'איטלקי', seafood: 'פירות ים',
      mediterranean: 'ים תיכוני', halal: 'חלאל', kosher: 'כשר', vegan: 'טבעוני', 'no-seafood': 'ללא פירות ים'
    }
  },
  ar: {
    guests: (n) => `${n} ضيوف`,
    budget: (n) => `حتى $${n}/يوم`,
    budgetFriendly: 'اقتصادي',
    reset: 'مسح',
    editGuests: 'تغيير العدد إلى ',
    editNeighborhood: 'تغيير الحي إلى ',
    editBudget: 'ميزانية السيارة حتى $',
    editDates: 'تغيير التواريخ إلى ',
    occasions: {
      anniversary: 'ذكرى زواج', birthday: 'عيد ميلاد', 'family-kids': 'مع أطفال',
      business: 'عمل', romantic: 'رومانسي', party: 'حفلة', proposal: 'عرض زواج'
    },
    cuisines: {
      sushi: 'سوشي', steakhouse: 'ستيك', italian: 'إيطالي', seafood: 'مأكولات بحرية',
      mediterranean: 'متوسطي', halal: 'حلال', kosher: 'كوشير', vegan: 'نباتي', 'no-seafood': 'بدون مأكولات بحرية'
    }
  },
  fa: {
    guests: (n) => `${n} مهمان`,
    budget: (n) => `تا $${n}/روز`,
    budgetFriendly: 'به‌صرفه',
    reset: 'پاک کردن',
    editGuests: 'تغییر تعداد نفرات به ',
    editNeighborhood: 'تغییر محله به ',
    editBudget: 'بودجه خودرو تا $',
    editDates: 'تغییر تاریخ‌ها به ',
    occasions: {
      anniversary: 'سالگرد', birthday: 'تولد', 'family-kids': 'با کودکان',
      business: 'کاری', romantic: 'رمانتیک', party: 'مهمانی', proposal: 'خواستگاری'
    },
    cuisines: {
      sushi: 'سوشی', steakhouse: 'استیک', italian: 'ایتالیایی', seafood: 'دریایی',
      mediterranean: 'مدیترانه‌ای', halal: 'حلال', kosher: 'کوشر', vegan: 'وگان', 'no-seafood': 'بدون غذای دریایی'
    }
  },
  zh: {
    guests: (n) => `${n}人`,
    budget: (n) => `≤ $${n}/天`,
    budgetFriendly: '高性价比',
    reset: '清除',
    editGuests: '人数改为',
    editNeighborhood: '区域改为',
    editBudget: '租车预算改为$',
    editDates: '日期改为',
    occasions: {
      anniversary: '纪念日', birthday: '生日', 'family-kids': '亲子',
      business: '商务', romantic: '浪漫', party: '派对', proposal: '求婚'
    },
    cuisines: {
      sushi: '寿司', steakhouse: '牛排', italian: '意餐', seafood: '海鲜',
      mediterranean: '地中海', halal: '清真', kosher: '犹太洁食', vegan: '纯素', 'no-seafood': '不含海鲜'
    }
  },
  ja: {
    guests: (n) => `${n}名`,
    budget: (n) => `≤ $${n}/日`,
    budgetFriendly: 'お得',
    reset: 'クリア',
    editGuests: '人数を変更：',
    editNeighborhood: 'エリアを変更：',
    editBudget: '車予算を変更：$',
    editDates: '日程を変更：',
    occasions: {
      anniversary: '記念日', birthday: '誕生日', 'family-kids': '子連れ',
      business: 'ビジネス', romantic: 'ロマンチック', party: 'パーティー', proposal: 'プロポーズ'
    },
    cuisines: {
      sushi: '寿司', steakhouse: 'ステーキ', italian: 'イタリアン', seafood: 'シーフード',
      mediterranean: '地中海', halal: 'ハラール', kosher: 'コーシャ', vegan: 'ヴィーガン', 'no-seafood': 'シーフードなし'
    }
  },
  ko: {
    guests: (n) => `${n}명`,
    budget: (n) => `≤ $${n}/일`,
    budgetFriendly: '가성비',
    reset: '초기화',
    editGuests: '인원 변경: ',
    editNeighborhood: '지역 변경: ',
    editBudget: '차량 예산 변경: $',
    editDates: '날짜 변경: ',
    occasions: {
      anniversary: '기념일', birthday: '생일', 'family-kids': '아이 동반',
      business: '비즈니스', romantic: '로맨틱', party: '파티', proposal: '프로포즈'
    },
    cuisines: {
      sushi: '스시', steakhouse: '스테이크', italian: '이탈리안', seafood: '해산물',
      mediterranean: '지중해식', halal: '할랄', kosher: '코셔', vegan: '비건', 'no-seafood': '해산물 제외'
    }
  }
});

function formatDateChip(dateRange, locale) {
  if (!dateRange?.from) return '';
  try {
    const fmt = new Intl.DateTimeFormat(locale || 'en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const start = new Date(`${dateRange.from}T12:00:00Z`);
    if (!dateRange.to || dateRange.to === dateRange.from) return fmt.format(start);
    const end = new Date(`${dateRange.to}T12:00:00Z`);
    if (typeof fmt.formatRange === 'function') return fmt.formatRange(start, end);
    return `${fmt.format(start)}–${fmt.format(end)}`;
  } catch {
    return dateRange.to && dateRange.to !== dateRange.from ? `${dateRange.from}–${dateRange.to}` : dateRange.from;
  }
}

/**
 * Convert a structured TripProfile into localized, interactive memory chips.
 */
export function formatProfileChips(profile, locale = 'en') {
  const code = normalizeLocale(locale);
  const copy = LABELS[code] || LABELS.en;
  if (!profile || typeof profile !== 'object') {
    return { chips: [], resetLabel: copy.reset };
  }
  const chips = [];
  if (profile.guests) {
    chips.push({ key: 'guests', label: copy.guests(profile.guests), editPrefix: copy.editGuests });
  }
  if (profile.dateRange?.from) {
    chips.push({ key: 'dates', label: formatDateChip(profile.dateRange, code), editPrefix: copy.editDates });
  }
  if (profile.neighborhood) {
    chips.push({ key: 'neighborhood', label: profile.neighborhood, editPrefix: copy.editNeighborhood });
  }
  if (profile.maxDailyBudget) {
    chips.push({ key: 'budget', label: copy.budget(profile.maxDailyBudget), editPrefix: copy.editBudget });
  } else if (profile.cheapest) {
    chips.push({ key: 'cheapest', label: copy.budgetFriendly, editPrefix: copy.editBudget });
  }
  if (profile.occasion && copy.occasions[profile.occasion]) {
    chips.push({ key: 'occasion', label: copy.occasions[profile.occasion], editPrefix: '' });
  }
  if (profile.airport) {
    chips.push({ key: 'airport', label: profile.airport, editPrefix: '' });
  }
  if (Array.isArray(profile.dietaryOrCuisine)) {
    for (const tag of profile.dietaryOrCuisine.slice(0, 2)) {
      if (copy.cuisines[tag]) {
        chips.push({ key: `cuisine-${tag}`, label: copy.cuisines[tag], editPrefix: '' });
      }
    }
  }
  return { chips: chips.slice(0, 6), resetLabel: copy.reset };
}
