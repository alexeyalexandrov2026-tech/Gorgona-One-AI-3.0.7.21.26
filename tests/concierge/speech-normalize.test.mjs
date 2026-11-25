import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSpeechText } from '../../lib/ai/speechNormalize.mjs';

test('Russian speech normalizer expands weekdays, months, units, prices, weather, and abbreviations with zero false positives', () => {
  const sample =
    'В чт., 27 нояб., в Майами 26°C (78°F), ветер 10 mph. ' +
    'Подача Lamborghini Urus (ок. 15 мин.) на 4 чел., от $1,300/день, работаем 24/7. ' +
    'Также в сб. и вс. доступны яхты 70 ft., перелёт 1h 34m, рестораны $$$$, отели 5★ и т.д. ' +
    'График пн–пт, служба ELIO+ Guide. Что ещё подсказать?';

  const out = normalizeSpeechText(sample, 'ru');
  assert.match(out, /В четверг, 27 ноября/);
  assert.match(out, /26 градусов/);
  assert.match(out, /78 градусов по Фаренгейту/);
  assert.match(out, /10 миль в час/);
  assert.match(out, /около 15 минут/);
  assert.match(out, /4 человека/);
  assert.match(out, /1300 долларов в день/);
  assert.match(out, /круглосуточно/);
  assert.match(out, /в субботу и воскресенье/);
  assert.match(out, /70 футов/);
  assert.match(out, /1 час 34 минуты/);
  assert.match(out, /ультра-люкс/);
  assert.match(out, /5 звёзд/);
  assert.match(out, /и так далее\. График/);
  assert.match(out, /понедельник–пятница/);
  assert.match(out, /Элио Плюс Гайд/);
  // Must NEVER corrupt real Russian words starting with day letters ("Что", "почта", "среда/среди")
  assert.match(out, /Что ещё подсказать\?/);
  assert.doesNotMatch(out, /чт\.|нояб?\.|мин\.|чел\.|т\.д\.|\$/);
});

test('Russian speech normalizer handles Intl.DateTimeFormat outputs, declensions, AM/PM, and paired C/F weather', () => {
  // Exact Intl.DateTimeFormat('ru') schedule format from conciergeEvents.mjs
  const evt = normalizeSpeechText('чт, 27 нояб. · 19:30 · Kaseya Center', 'ru');
  assert.equal(evt, 'четверг, 27 ноября, 19:30, Kaseya Center');

  const range = normalizeSpeechText('Работаем с пн. по пт., в ср. и пт. подача за 1 мин. для 4 чел. До сб.', 'ru');
  assert.match(range, /с понедельника по пятницу/);
  assert.match(range, /в среду и пятницу/);
  assert.match(range, /за 1 минуту/);
  assert.match(range, /для 4 человек/);
  assert.match(range, /До субботы\./);

  const weather = normalizeSpeechText('Сейчас 26 °C / 78 °F, вылет в 8:30 PM из а/п Майами, в т.ч. трансфер.', 'ru');
  assert.match(weather, /26 градусов по Цельсию, или 78 по Фаренгейту/);
  assert.match(weather, /20:30/);
  assert.match(weather, /аэропорт Майами/);
  assert.match(weather, /в том числе трансфер/);

  assert.match(normalizeSpeechText('В пт. 27 дек. 2026 г., 2 чел., $8,000', 'ru'), /В пятницу 27 декабря 2026 года, 2 человека, 8000 долларов/);
  assert.equal(normalizeSpeechText('Ок. Понял, что вы хотите.', 'ru'), 'Ок. Понял, что вы хотите.');
});

test('English speech normalizer expands Thu., Nov., mins, pax, prices, weather, and flight times', () => {
  const sample = 'On Thu., Nov. 27, 78°F, 15 mins to Brickell for 6 pax. Urus $1,300/day, jet 1h 34m, $$$$ dining, 5★ hotel, 24/7 ELIO+ support, e.g. Komodo & Carbone, etc. Next step?';
  const out = normalizeSpeechText(sample, 'en');
  assert.match(out, /On Thursday, November 27/);
  assert.match(out, /78 degrees Fahrenheit/);
  assert.match(out, /15 minutes/);
  assert.match(out, /6 guests/);
  assert.match(out, /1,300 dollars per day/);
  assert.match(out, /1 hour 34 minutes/);
  assert.match(out, /ultra-luxury/);
  assert.match(out, /5 stars/);
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
