import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSpeechText } from '../../lib/ai/speechNormalize.mjs';
import { ruNumberWords, ruOrdinalGenitive, ruTimeWords, ruYearGenitive } from '../../lib/ai/ruNumbers.mjs';

const plain = (s) => s.replace(/\u0301/g, '');

test('Russian numeral engine produces stressed orthoepic Russian words without swallowed -десят / -сот', () => {
  assert.equal(ruNumberWords(79), 'се\u0301мдисят де\u0301вять');
  assert.equal(ruNumberWords(78), 'се\u0301мдисят во\u0301семь');
  assert.equal(ruNumberWords(84), 'во\u0301семдисят четы\u0301ре');
  assert.equal(ruNumberWords(59), 'пятдеся\u0301т де\u0301вять');
  assert.equal(ruNumberWords(68), 'шестдеся\u0301т во\u0301семь');
  assert.equal(ruNumberWords(540), 'пятсо\u0301т со\u0301рок');
  assert.equal(ruNumberWords(780), 'семсо\u0301т во\u0301семдисят');
  assert.equal(plain(ruNumberWords(78, { gramCase: 'gen' })), 'семидесяти восьми');
  assert.equal(plain(ruNumberWords(4, { gramCase: 'gen' })), 'четырёх');
  assert.equal(plain(ruNumberWords(15, { gender: 'fem', gramCase: 'gen' })), 'пятнадцати');
  assert.equal(plain(ruNumberWords(1300)), 'тысяча триста');
  assert.equal(plain(ruNumberWords(1300, { gramCase: 'gen' })), 'тысячи трёхсот');
  assert.equal(plain(ruNumberWords(8000)), 'восемь тысяч');
  assert.equal(plain(ruNumberWords(1, { gender: 'fem', gramCase: 'acc' })), 'одну');
  assert.equal(plain(ruOrdinalGenitive(27)), 'двадцать седьмого');
  assert.equal(plain(ruYearGenitive(2026)), 'две тысячи двадцать шестого');
  assert.equal(plain(ruTimeWords(20, 30)), 'двадцать часов тридцать минут');
  assert.equal(plain(ruTimeWords(19, 0)), 'девятнадцать часов');
});

test('Russian speech normalizer spells out numbers with orthoepic stress and expands all abbreviations cleanly', () => {
  const sample =
    'В чт., 27 нояб., в Майами 26°C (79°F), ветер 10 mph. ' +
    'Подача Lamborghini Urus (ок. 15 мин.) на 4 чел., от $1,300/день, работаем 24/7. ' +
    'Также в сб. и вс. доступны яхты 70 ft., перелёт 1h 34m, рестораны $$$$, отели 5★ и т.д. ' +
    'График пн–пт, служба ELIO+ Guide. Что ещё подсказать?';

  const rawOut = normalizeSpeechText(sample, 'ru');
  assert.match(rawOut, /се\u0301мдисят де\u0301вять гра\u0301дусов по Фаренге\u0301йту/);
  const out = plain(rawOut);
  assert.match(out, /В четверг, двадцать седьмого ноября/);
  assert.match(out, /двадцать шесть градусов/);
  assert.match(out, /семдисят девять градусов по Фаренгейту/);
  assert.match(out, /десять миль в час/);
  assert.match(out, /около пятнадцати минут/);
  assert.match(out, /на четыре человека/);
  assert.match(out, /от тысячи трёхсот долларов в день/);
  assert.match(out, /круглосуточно/);
  assert.match(out, /в субботу и воскресенье/);
  assert.match(out, /семдисят футов/);
  assert.match(out, /один час тридцать четыре минуты/);
  assert.match(out, /ультра-люкс/);
  assert.match(out, /пять звёзд/);
  assert.match(out, /и так далее\. График/);
  assert.match(out, /понедельник–пятница/);
  assert.match(out, /Элио Плюс Гайд/);
  assert.match(out, /Что ещё подсказать\?/);
  assert.doesNotMatch(out, /\d|чт\.|нояб?\.|мин\.|чел\.|т\.д\.|\$/);
});

test('Russian speech normalizer handles ranges, percentages, horsepower, ratings, ordinals, spelled words, and protects 720S/G63', () => {
  const specs = normalizeSpeechText(
    'McLaren 720S: 720 л.с., 0–60 mph за 2.8s, депозит 15%, цена $1,000–$1,500 или $5k, рейтинг 4.9/5, 1-й класс. Температура 75–82°F, 20–30 мин., 4–6 чел., семьдесят девять градусов.',
    'ru'
  );
  assert.match(specs, /McLaren 720S/);
  assert.match(specs, /се\u0301мдисят де\u0301вять гра\u0301дусов/);
  const p = plain(specs);
  assert.match(p, /семсот двадцать лошадиных сил/);
  assert.match(p, /от нуля до шестидесяти миль в час/);
  assert.match(p, /два и восемь секунды/);
  assert.match(p, /пятнадцать процентов/);
  assert.match(p, /от тысячи до тысячи пятисот долларов/);
  assert.match(p, /пять тысяч долларов/);
  assert.match(p, /четыре и девять из пяти/);
  assert.match(p, /первый класс/);
  assert.match(p, /от семидесяти пяти до восьмидесяти двух градусов по Фаренгейту/);
  assert.match(p, /от двадцати до тридцати минут/);
  assert.match(p, /от четырёх до шести человек/);
});

test('Russian speech normalizer handles Intl schedules, genitive guests, paired C/F weather, phones, and model codes', () => {
  const evt = plain(normalizeSpeechText('чт, 27 нояб. · 19:30 · Kaseya Center', 'ru'));
  assert.equal(evt, 'четверг, двадцать седьмого ноября, девятнадцать часов тридцать минут, Kaseya Center');

  const range = plain(normalizeSpeechText('Работаем с пн. по пт., в ср. и пт. подача за 1 мин. для 4 чел. До сб.', 'ru'));
  assert.match(range, /с понедельника по пятницу/);
  assert.match(range, /в среду и пятницу/);
  assert.match(range, /за одну минуту/);
  assert.match(range, /для четырёх человек/);
  assert.match(range, /До субботы\./);

  const weather = plain(normalizeSpeechText('Сейчас 26 °C / 78 °F, вылет в 8:30 PM из а/п Майами, в т.ч. трансфер на G63. Тел. +1 786-492-8880. Heat vs. Celtics.', 'ru'));
  assert.match(weather, /двадцать шесть градусов по Цельсию, или семдисят восемь градусов по Фаренгейту/);
  assert.match(weather, /двадцать часов тридцать минут/);
  assert.match(weather, /из аэропорта Майами/);
  assert.match(weather, /в том числе трансфер на G63/);
  assert.match(weather, /Телефон \+1 786-492-8880/);
  assert.match(weather, /Heat против Celtics/);

  assert.match(
    plain(normalizeSpeechText('В пт. 27 дек. 2026 г., 2 чел., $8,000', 'ru')),
    /В пятницу двадцать седьмого декабря две тысячи двадцать шестого года, два человека, восемь тысяч долларов/
  );
  assert.equal(normalizeSpeechText('Ок. Понял, что вы хотите.', 'ru'), 'Ок. Понял, что вы хотите.');
});

test('English speech normalizer expands Thu., Nov., mins., ft., sq. ft., pax, prices, weather, and protects St. Regis', () => {
  const sample = 'On Thu., Nov. 27, 78°F, 15 mins. to Brickell for 6 pax. Urus $1,300/day, 70 ft. yacht, 1,200 sq. ft. villa on Collins Ave. & 44th St., St. Regis 5★ hotel, 1h 34m jet, $$$$ dining, 24/7 ELIO+ support, e.g. Komodo & Carbone, etc. Next step?';
  const out = normalizeSpeechText(sample, 'en');
  assert.match(out, /On Thursday, November 27/);
  assert.match(out, /78 degrees Fahrenheit/);
  assert.match(out, /15 minutes to Brickell/);
  assert.match(out, /6 guests/);
  assert.match(out, /1,300 dollars per day/);
  assert.match(out, /70 feet yacht/);
  assert.match(out, /1,200 square feet villa on Collins Avenue and 44th Street/);
  assert.match(out, /St\. Regis 5-star hotel/);
  assert.match(out, /1 hour 34 minutes jet/);
  assert.match(out, /ultra-luxury/);
  assert.match(out, /twenty-four seven Elio Plus/);
  assert.match(out, /for example Komodo and Carbone/);
  assert.match(out, /and so on\. Next step\?/);
});

test('Spanish, Ukrainian, Portuguese, French, German, and Italian speech normalizers expand Intl dates and units', () => {
  const es = normalizeSpeechText('jue, 27 nov en 15 min. para 4 pax, 24/7 ELIO+ 5★', 'es');
  assert.match(es, /jueves, 27 de noviembre/);
  assert.match(es, /15 minutos/);
  assert.match(es, /4 personas/);
  assert.match(es, /5 estrellas/);

  const uk = normalizeSpeechText('У чт., 27 лист., за 15 хв., 24/7 і т.д.', 'uk');
  assert.match(uk, /четвер, 27 листопада/);
  assert.match(uk, /15 хвилин/);
  assert.match(uk, /цілодобово/);
  assert.match(uk, /і так далі/);

  const pt = normalizeSpeechText('qui., 27 de nov. em 15 min. 5★', 'pt');
  assert.match(pt, /quinta-feira, 27 de novembro/);
  assert.match(pt, /15 minutos/);
  assert.match(pt, /5 estrelas/);

  const fr = normalizeSpeechText('jeu., 27 nov. en 15 min. 5★', 'fr');
  assert.match(fr, /jeudi, 27 novembre/);
  assert.match(fr, /15 minutes/);
  assert.match(fr, /5 étoiles/);

  const de = normalizeSpeechText('Do., 27. Nov. in 15 Min. 5★', 'de');
  assert.match(de, /Donnerstag, 27\. November/);
  assert.match(de, /15 Minuten/);
  assert.match(de, /5 Sterne/);

  const it = normalizeSpeechText('gio, 27 nov in 15 min. 5★', 'it');
  assert.match(it, /giovedì, 27 novembre/);
  assert.match(it, /15 minuti/);
  assert.match(it, /5 stelle/);
});
