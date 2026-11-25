import test from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';
import { buildPackagePlanNote, computePackageSummary, formatUsd, getPackageCopy } from '../../lib/ai/packageCalculator.mjs';
import { buildBudgetMath } from '../../lib/ai/budgetEstimator.mjs';
import { analyzeSemanticIntent, semanticConceptScore, semanticRerankWithEmbeddings } from '../../lib/ai/semanticSearch.mjs';

test('Wave 1 package calculator computes exact fleet total, Split-Pay per guest, and never invents partner prices', () => {
  const summary = computePackageSummary(
    [
      { kind: 'car', slug: 'lamborghini-urus-se', title: 'Lamborghini Urus SE', price: '$1,300/day' },
      { kind: 'dining', slug: 'komodo', title: 'Komodo', price: '$$$$' },
      { kind: 'yacht', slug: '70-azimut', title: '70ft Azimut', price: '' }
    ],
    { days: 2, splitWays: 4 }
  );
  assert.equal(summary.days, 2);
  assert.equal(summary.splitWays, 4);
  assert.equal(summary.itemCount, 3);
  assert.equal(summary.verifiedCarCount, 1);
  assert.equal(summary.verifiedCarTotal, 2600);
  assert.equal(summary.perPersonVerified, 650);
  assert.equal(summary.partnerQuotedCount, 2);
  assert.equal(summary.hasSecurityDepositNote, true);
  assert.equal(formatUsd(summary.perPersonVerified), '$650');

  const note = buildPackagePlanNote(summary, { userNote: 'Sunset pickup at Brickell', requestSplitPay: true });
  assert.match(note, /ELIO\+ Package \(3 items, 2d\)/);
  assert.match(note, /Verified fleet: \$2,600/);
  assert.match(note, /Split-Pay requested x4 \(~\$650\/guest fleet\)/);
  assert.match(note, /Security deposit pre-auth/);
  assert.match(note, /Sunset pickup at Brickell/);
});

test('Wave 1 package copy covers all 16 locales without concierge wording', () => {
  for (const { code } of SUPPORTED_LANGUAGES) {
    const copy = getPackageCopy(code);
    assert.ok(copy.heading && copy.daysLabel && copy.splitLabel && copy.verifiedCars && copy.perPerson && copy.submitPackage, code);
    assert.doesNotMatch(JSON.stringify(copy), /\bconcierge\b|консьерж/i, code);
  }
});

test('Wave 1 budget estimator calculates and whitelists per-guest Split-Pay figures for Fact Guard', () => {
  const math = buildBudgetMath({
    text: 'Уикенд в Майами на 4 чел. с Lamborghini Urus, сколько выйдет на человека?',
    facts: [{ type: 'Car', title: 'Lamborghini Urus SE', price: '$1,300/day' }],
    profile: { guests: 4 }
  });
  assert.equal(math.days, 2);
  assert.equal(math.guests, 4);
  assert.equal(math.derivedPrices.has(1300), true);
  assert.equal(math.derivedPrices.has(2600), true);
  assert.equal(math.derivedPrices.has(650), true);
  assert.match(math.budgetNote, /\$2,600/);
  assert.match(math.budgetNote, /~\$650\/guest split 4 ways/);
});

test('Wave 1 hybrid semantic search understands multilingual vibes, family luggage, sunset, convertible, and rainy-day intents', () => {
  const fam = analyzeSemanticIntent('Едем семьёй с детьми и 5 чемоданами, нужен просторный внедорожник');
  assert.ok(fam.vibes.includes('family-spacious'));
  assert.match(fam.searchBoostTerms, /Escalade/);
  assert.ok(
    semanticConceptScore({ title: 'Cadillac Escalade ESV', category: 'SUV' }, fam) >
    semanticConceptScore({ title: 'Ferrari 488', category: 'Supercar' }, fam)
  );

  const sunset = analyzeSemanticIntent('Романтический ужин на закате с видом на воду и мишлен');
  assert.ok(sunset.vibes.includes('waterfront-sunset'));
  assert.ok(sunset.vibes.includes('michelin-gastronomy'));

  const cabrio = analyzeSemanticIntent('Хочу кабриолет прокатиться вдоль океана');
  assert.ok(cabrio.vibes.includes('convertible-coastal-drive'));

  const rain = analyzeSemanticIntent('Rainy afternoon Plan B indoor shopping and dining');
  assert.ok(rain.vibes.includes('rainy-day-indoor'));
});

test('Wave 1 BGE-M3 dense embedding reranker boosts closest semantic candidate and fails safe when unavailable', async () => {
  const candidates = [
    { href: '/rentals/lamborghini-huracan', title: 'Lamborghini Huracan', type: 'Car', collections: ['supercar'] },
    { href: '/rentals/cadillac-escalade', title: 'Cadillac Escalade ESV', type: 'Car', collections: ['suv', 'family'] }
  ];

  // Without binding: preserves order cleanly
  const untouched = await semanticRerankWithEmbeddings('family SUV with luggage', candidates, null);
  assert.equal(untouched[0].href, '/rentals/lamborghini-huracan');

  // With Workers AI bge-m3 mock enabled: promotes Escalade above Huracan
  const fakeEnv = {
    SEMANTIC_EMBEDDINGS_ENABLED: 'true',
    CONCIERGE_AI: {
      run: async (model, { text }) => {
        assert.equal(model, '@cf/baai/bge-m3');
        return {
          data: text.map((t) =>
            /family|escalade|suv/i.test(t) ? [1, 0] : [0, 1]
          )
        };
      }
    }
  };
  const reranked = await semanticRerankWithEmbeddings('family SUV with luggage', candidates, fakeEnv);
  assert.equal(reranked[0].href, '/rentals/cadillac-escalade');
});
