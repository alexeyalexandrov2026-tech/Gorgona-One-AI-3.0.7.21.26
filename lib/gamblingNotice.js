// Copy for the legal and responsible-gambling notice shown wherever the site
// mentions a sportsbook. Languages without a translation fall back to English.

const TEXT = {
  en: {
    title: 'Bet only where it is legal',
    body: 'Sports betting is legal only in some states, and only with operators licensed there. You must be 21 or older and physically located in a state where the operator is licensed. Offers and availability change, so check the operator’s terms before you sign up.',
    florida: 'In Florida, the only legal online sportsbook is Hard Rock Bet.',
    help: 'Gambling problem? Call',
    whereLegal: 'Where it is legal',
    checked: 'checked',
    sources: 'Sources',
    inFlorida: 'Available in Florida',
    notInFlorida: 'Not available in Florida'
  },
  es: {
    title: 'Apuesta solo donde es legal',
    body: 'Las apuestas deportivas son legales solo en algunos estados y solo con operadores con licencia allí. Debes tener 21 años o más y estar físicamente en un estado donde el operador tenga licencia. Las ofertas y la disponibilidad cambian; revisa los términos del operador antes de registrarte.',
    florida: 'En Florida, la única casa de apuestas deportivas en línea legal es Hard Rock Bet.',
    help: '¿Problemas con el juego? Llama al',
    whereLegal: 'Dónde es legal',
    checked: 'verificado',
    sources: 'Fuentes',
    inFlorida: 'Disponible en Florida',
    notInFlorida: 'No disponible en Florida'
  },
  pt: {
    title: 'Aposte só onde é legal',
    body: 'Apostas esportivas são legais apenas em alguns estados e apenas com operadores licenciados lá. Você precisa ter 21 anos ou mais e estar fisicamente em um estado onde o operador tem licença. Ofertas e disponibilidade mudam; confira os termos do operador antes de se cadastrar.',
    florida: 'Na Flórida, a única casa de apostas esportivas online legal é a Hard Rock Bet.',
    help: 'Problemas com jogo? Ligue',
    whereLegal: 'Onde é legal',
    checked: 'verificado em',
    sources: 'Fontes',
    inFlorida: 'Disponível na Flórida',
    notInFlorida: 'Indisponível na Flórida'
  },
  ru: {
    title: 'Ставки только там, где это законно',
    body: 'Ставки на спорт законны только в некоторых штатах и только у операторов с лицензией в этом штате. Вам должно быть не меньше 21 года, и вы должны физически находиться в штате, где у оператора есть лицензия. Предложения и доступность меняются, поэтому проверяйте условия оператора перед регистрацией.',
    florida: 'Во Флориде единственный законный онлайн-букмекер — Hard Rock Bet.',
    help: 'Проблемы с азартными играми? Позвоните',
    whereLegal: 'Где законно',
    checked: 'проверено',
    sources: 'Источники',
    inFlorida: 'Доступен во Флориде',
    notInFlorida: 'Недоступен во Флориде'
  },
  he: {
    title: 'מהמרים רק איפה שזה חוקי',
    body: 'הימורי ספורט חוקיים רק בחלק מהמדינות, ורק אצל מפעילים בעלי רישיון בהן. עליכם להיות בני 21 ומעלה ולהימצא פיזית במדינה שבה למפעיל יש רישיון. ההצעות והזמינות משתנות, לכן בדקו את תנאי המפעיל לפני ההרשמה.',
    florida: 'בפלורידה, אתר הימורי הספורט המקוון החוקי היחיד הוא Hard Rock Bet.',
    help: 'בעיית הימורים? התקשרו',
    whereLegal: 'איפה זה חוקי',
    checked: 'נבדק',
    sources: 'מקורות',
    inFlorida: 'זמין בפלורידה',
    notInFlorida: 'לא זמין בפלורידה'
  }
};

export function getGamblingText(locale) {
  return TEXT[locale] || TEXT.en;
}

export function formatCheckedDate(isoDate, locale) {
  try {
    return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString(locale || 'en', {
      year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
    });
  } catch {
    return isoDate;
  }
}
