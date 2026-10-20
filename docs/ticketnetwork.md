# TicketNetwork / CJ integration

Verified 2026-10-20 for the existing GORGONA ONE / MIAMI ELIO portal.

- CJ website PID: `101825540`, promotional property `https://gorgona-one.com/`.
- The official [Event Results Widget builder](https://www.ticketnetwork.com/en/affiliate-plugin)
  generated CJ link ID `10793961` at `www.tkqlhce.com` with that PID.
- This widget version uses `params.url`; it does not require `data-pageid`.
- SID `GorgonaSports` identifies Sports; `GorgonaConcerts` identifies Concerts.
- The existing CJ-generated Journey link uses a different creative ID (`10852752`)
  and must not be used as the general catalogue destination.
- Current commission is **not verified**. Earlier relationship history showed
  12.5%, while Links showed 10%. Neither figure is a guaranteed forecast.

## Surfaces and behavior

`/events/category/sports` and `/events/category/concerts` embed the official
supplier catalogue. Existing subcategory pages also offer a tracked
TicketNetwork link to their parent catalogue. Curated local event data remains
empty until independently verified listings are available.

The vendor scripts execute inside a sandboxed iframe without `allow-same-origin`.
They cannot read the portal's DOM, cookies or local storage. Only that iframe's
window can send its height to the parent. Navigating away destroys its scripts;
the React message listener is removed on unmount.
The iframe and parent exchange a measurement request after hydration, so an
early supplier response cannot leave the catalogue clipped to its initial height.

The official scripts use jQuery and TicketNetwork's public widget runtime. No
supplier secret or custom booking API is needed. The two-year date horizon is
recalculated per render instead of freezing the builder's end date.
An explicit current-day lower bound excludes past events; the supplier's default
Concerts query returned past dates even with `hasTickets=true`.

Loading failures time out after 20 seconds and retain a server-rendered CJ link.
That link also works without JavaScript. Price and ticket-count presentation is
disabled: the builder preview displayed incomplete prices. No availability,
price or commission guarantee should be inferred from the portal.
The supplier's optional `traff` page-view request can log a CORS error from the
opaque sandbox. Browser QA confirms that the catalogue still loads and the
independent CJ click redirect preserves this site's PID. Do not remove the
sandbox solely to silence this vendor diagnostic.

Checkout, payment, delivery and order support happen on TicketNetwork in a new
tab. A resale and affiliate disclosure appears beside the catalogue.

## Validation

Run `node --test tests/content/*.test.mjs` and `npx next build`.
Browser QA must cover both catalogues, a filter, Load More, category navigation
and the CJ redirect. A successful redirect verifies the destination and PID;
it does **not** prove CJ sale attribution or commission payout. No purchase is
required or authorized for this integration check.

Browser QA on 2026-10-20 used the cloud Chrome preview, at desktop width and a
390 px embedded mobile viewport. Both catalogues loaded 10 real events. The
Miami Heat filter replaced the results; Load More increased the list to 20.
Navigation through Events, Sports and NBA preserved the expected catalogue and
tracked fallback. The mobile widget has no horizontal overflow, readable
112 × 44 px purchase links, and an automatically sized frame without its own
vertical scrollbar. No framework error overlay or new application error was
observed. The vendor diagnostic above, browser-extension messages and an
existing Framer Motion scroll warning were present.

A HEAD redirect check of the Sports CJ link reached TicketNetwork with
`utm_campaign=101825540`. Content tests also exercise script-load failure and
confirm the visible fallback instead of a permanent loading state.

Final checks against `main` at `2724cc7`: all 33 content tests passed, the
Next.js production build passed, and OpenNext generated the Cloudflare Worker
successfully with the project's standalone build setting. The unchanged
`ai-router` application was outside this ticket-catalogue check.

Publish according to `CLAUDE.md`: start from current `main`, use a task branch,
and merge through a user-created or user-approved PR. Never push this change
directly to `main`.
