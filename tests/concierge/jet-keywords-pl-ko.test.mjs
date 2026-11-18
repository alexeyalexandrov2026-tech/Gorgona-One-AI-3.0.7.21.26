import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';

const {lexiconHits} = load('lib/ai/intentLexicon.mjs');
const jets = text => (lexiconHits(text) || []).some(hit => hit.href === '/private-jets');

// When Workers AI is unavailable or its daily budget is spent, the concierge
// answers from these keywords, so private charter wording must still land on
// Private Jets in Polish and Korean.
test('Polish and Korean private charter wording opens Private Jets', () => {
  for (const text of [
    'prywatny odrzutowiec do Nowego Jorku',
    'Potrzebuję prywatnego odrzutowca do Nowego Jorku',
    'Lecę prywatnym odrzutowcem do Aspen',
    'wynająć prywatny samolot',
    'czarter samolotu do Miami',
    'Chcę wynająć samolot na weekend',
    '뉴욕까지 전세기가 필요해요',
    '전세기 예약',
    '개인 제트기',
    '비행기 전세 가능한가요',
    '전용기 빌리고 싶어요',
  ]) assert.ok(jets(text), text);
});

test('similar non-charter wording stays out of Private Jets', () => {
  for (const text of [
    'wynająć samochód na weekend',
    'tanie bilety lotnicze do Miami',
    'Chcę wypożyczyć skuter wodny (jet ski)',
    '전세 아파트 찾고 있어요',
    '전세 계약 문의',
    '비행기 표 싸게',
  ]) assert.equal(jets(text), false, text);
});
