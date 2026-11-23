import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fixture, ids, rpc } from './database.mjs';
import { provider, fixtureEnv } from './provider.mjs';
import { paymentQuoteHandlers } from '../../lib/server/paymentQuoteHandlers.mjs';
import { tripRoomHandlers } from '../../lib/server/tripRoomHandlers.mjs';
import { TRIP_ROOM_COPY } from '../../lib/tripRoomCopy.mjs';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';
import { rentalMediaUrl, rewriteRentalImages, normalizedMediaBase } from '../../lib/rentalMedia.mjs';

test('Live Trip Room aggregates customer bookings/quotes, isolates users, and unlocks 24/7 phone strictly after verified payment', async () => {
  const db = await fixture();
  try {
    const dbFetch = provider(db);
    const env = {
      ...fixtureEnv,
      PLAN_REQUESTS_ENABLED: 'true',
      CONFIRMED_SUPPORT_PHONE: '+1 (305) 555-0199'
    };

    // Seed bookings for customer and another user
    const custBooking = await rpc(db, 'dashboard_submit', {
      p_key: crypto.randomUUID(),
      p_fingerprint: 'trip-room-cust-1',
      p_rate: 'trip-room-rate-1',
      p_user: ids.customer,
      p_input: {
        name: 'Demo customer',
        email: 'customer@example.com',
        phone: '+13055550100',
        dates: '2026-12-18 → 2026-12-20',
        itemSlug: 'lamborghini-urus-se',
        itemTitle: 'Lamborghini Urus SE',
        kind: 'car'
      }
    });
    const otherBooking = await rpc(db, 'dashboard_submit', {
      p_key: crypto.randomUUID(),
      p_fingerprint: 'trip-room-other-1',
      p_rate: 'trip-room-rate-2',
      p_user: ids.other,
      p_input: {
        name: 'Other guest',
        email: 'other@example.com',
        phone: '+13055550101',
        dates: '2026-12-21 → 2026-12-22',
        itemSlug: 'lamborghini-urus-se',
        itemTitle: 'Other Private Car',
        kind: 'car'
      }
    });

    const quoteApi = paymentQuoteHandlers(env, dbFetch);
    const mockWeather = [
      { date: '2026-11-24', name: 'Tuesday', isDaytime: true, tempC: 26, tempF: 79, rainChance: 10, wind: '9 mph', shortForecast: 'Mostly Sunny' }
    ];
    const tripApi = tripRoomHandlers(env, dbFetch, { forecastLoader: async () => mockWeather });

    // Unauthenticated call rejected with 401
    const unauth = await tripApi.overview(new Request('http://localhost/api/dashboard/trip-room'));
    assert.equal(unauth.status, 401);

    // Admin creates open quote for customer AND paid quote for other user
    const createFor = async (bookingId, title, email, amountCents) => {
      const res = await quoteApi.createQuote(new Request('http://localhost/api/dashboard/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
          Authorization: 'Bearer ' + ids.admin
        },
        body: JSON.stringify({
          bookingId,
          itemTitle: title,
          kind: 'car',
          supplierName: 'Sunset Exotics Miami',
          serviceDates: 'Dec 18 – Dec 20, 2026',
          cancellationPolicy: 'Free cancellation 48h before start.',
          amountCents,
          clientName: 'Guest',
          clientEmail: email,
          expiresHours: 24
        })
      }));
      assert.equal(res.status, 200);
      return (await res.json()).quote;
    };

    const custQuote = await createFor(custBooking.bookingId, 'Lamborghini Urus SE', 'customer@example.com', 390000);
    const otherQuote = await createFor(otherBooking.bookingId, 'Other Private Car', 'other@example.com', 500000);

    // Mark OTHER user's quote as signed + paid -> must NEVER leak to customer!
    await quoteApi.signQuote(new Request(`http://localhost/api/pay/${otherQuote.publicToken}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Other Guest', acceptedAgencyTerms: true, acceptedShieldTerms: true })
    }), otherQuote.publicToken);
    await rpc(db, 'payment_quote_mark_paid', {
      p_quote_id: otherQuote.id,
      p_provider: 'stripe',
      p_session_id: 'cs_other_001',
      p_payment_id: 'pi_other_001'
    });

    // Customer checks Live Trip Room BEFORE paying -> sees own open quote only, phone strictly hidden
    const beforePayRes = await tripApi.overview(new Request('http://localhost/api/dashboard/trip-room', {
      headers: { Authorization: 'Bearer ' + ids.customer }
    }));
    assert.equal(beforePayRes.status, 200);
    const beforePay = await beforePayRes.json();
    assert.equal(beforePay.quotes.length, 1);
    assert.equal(beforePay.quotes[0].id, custQuote.id);
    assert.equal(beforePay.summary.awaitingAction, 1);
    assert.equal(beforePay.summary.confirmedPasses, 0);
    assert.equal(beforePay.confirmedSupport, null);
    assert.equal(JSON.stringify(beforePay).includes('555-0199'), false, 'private phone must not leak before payment');
    assert.equal(beforePay.weather.length, 1);

    // Customer signs ESIGN and completes verified payment -> 24/7 direct phone unlocks!
    await quoteApi.signQuote(new Request(`http://localhost/api/pay/${custQuote.publicToken}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Demo Customer', acceptedAgencyTerms: true, acceptedShieldTerms: true })
    }), custQuote.publicToken);
    await rpc(db, 'payment_quote_mark_paid', {
      p_quote_id: custQuote.id,
      p_provider: 'paypal',
      p_session_id: 'PP_ORD_100',
      p_payment_id: 'PP_CAP_100'
    });

    const afterPayRes = await tripApi.overview(new Request('http://localhost/api/dashboard/trip-room', {
      headers: { Authorization: 'Bearer ' + ids.customer }
    }));
    assert.equal(afterPayRes.status, 200);
    const afterPay = await afterPayRes.json();
    assert.equal(afterPay.summary.confirmedPasses, 1);
    assert.equal(afterPay.summary.awaitingAction, 0);
    assert.equal(afterPay.confirmedSupport?.active, true);
    assert.equal(afterPay.confirmedSupport?.phoneDisplay, '+1 (305) 555-0199');
    assert.equal(afterPay.confirmedSupport?.phoneHref, 'tel:+13055550199');
  } finally {
    await db.close();
  }
});

test('16-language Live Trip Room copy, /trip privacy guards, and R2 rental media URL resolver', () => {
  const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
  const enKeys = Object.keys(TRIP_ROOM_COPY.en).sort();
  for (const lang of langs) {
    assert.ok(TRIP_ROOM_COPY[lang], `missing trip room copy for ${lang}`);
    assert.deepEqual(Object.keys(TRIP_ROOM_COPY[lang]).sort(), enKeys, lang);
    for (const key of enKeys) assert.ok(TRIP_ROOM_COPY[lang][key].trim().length > 0, `${lang}.${key}`);
  }

  // R2 CDN resolver: noop when unset, clean rewrite when HTTPS base set, rejects unsafe bases
  assert.equal(rentalMediaUrl('/images/rentals/lamborghini-urus-se/cover.jpg', ''), '/images/rentals/lamborghini-urus-se/cover.jpg');
  assert.equal(
    rentalMediaUrl('/images/rentals/lamborghini-urus-se/cover.jpg', 'https://media.gorgona-one.com/'),
    'https://media.gorgona-one.com/images/rentals/lamborghini-urus-se/cover.jpg'
  );
  assert.equal(
    rentalMediaUrl('/images/dining/carbone.jpg', 'https://media.gorgona-one.com'),
    '/images/dining/carbone.jpg'
  );
  assert.equal(normalizedMediaBase('http://insecure.example'), '');
  assert.equal(normalizedMediaBase('javascript:alert(1)'), '');

  const rewritten = rewriteRentalImages({
    slug: 'demo',
    image: '/images/rentals/demo/cover.jpg',
    card: '/images/rentals/demo/card.webp',
    gallery: ['/images/rentals/demo/1.jpg', '/images/other/2.jpg']
  }, 'https://media.gorgona-one.com');
  assert.equal(rewritten.image, 'https://media.gorgona-one.com/images/rentals/demo/cover.jpg');
  assert.equal(rewritten.card, 'https://media.gorgona-one.com/images/rentals/demo/card.webp');
  assert.deepEqual(rewritten.gallery, ['https://media.gorgona-one.com/images/rentals/demo/1.jpg', '/images/other/2.jpg']);

  // Middleware and /trip layout enforce private no-store + noindex
  const mw = fs.readFileSync(new URL('../../middleware.js', import.meta.url), 'utf8');
  assert.match(mw, /'\/trip'/);
  const tripLayout = fs.readFileSync(new URL('../../app/trip/layout.js', import.meta.url), 'utf8');
  assert.match(tripLayout, /PRIVATE_METADATA/);
});
