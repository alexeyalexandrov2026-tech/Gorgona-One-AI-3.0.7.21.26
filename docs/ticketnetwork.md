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

`/events/category/sports`, `/events/category/concerts` and all 22 visible genre
and sports-league pages embed the official supplier catalogue. Subcategories
filter the supplier's taxonomy rather than showing the entire parent list.
Each has its own alphanumeric reporting SID; the two pillar SIDs stay unchanged.
Every catalogue starts with Miami and nearby South Florida venue cities,
including Sunrise, Miami Gardens and Fort Lauderdale. The supplier query
requires Florida as well as the explicit city list in `ticketnetworkLocation.js`;
it does not request the visitor's device location. Area can be changed to
All Florida or All cities. Dates, Teams/Artists and Cities stay visible, even
when the supplier returns only one city. Changing area resets pagination and
clears the previous city selection while preserving dates and performers.
Load More and the supplier filters retain the chosen area. Empty local results
stay empty with guidance to change filters or area; there is no silent global
fallback.

Curated local event data remains empty until independently verified listings
are available, independently of the live supplier feed.

The taxonomy paths come from the Sports, Concerts and Theater dropdowns in the
official builder. Hip-Hop & R&B, Classical & Opera and Festivals combine their
corresponding taxonomy paths. Formula 1 applies the supplier's keyword search
within Auto Racing. Theater & Broadway uses the Theater taxonomy. The two
catch-all categories use the broader Sports and Concerts/Theater taxonomies.

TicketNetwork is the only marketplace with commission tracking in this UI.
Only TicketNetwork is displayed in the public provider section. Vivid Seats,
Eventbrite, Ticket Tailor and Online Ticket Seller are hidden; their data and
artwork remain available for future verified integrations.

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

Runtime loading has a separate 45-second deadline. Catalogue requests have a
30-second timeout and retry transient network/5xx failures at most twice
(after 2 and 4 seconds). A visible Try again button preserves the exact failed
query and page; script-load failures ask the parent to recreate the isolated
frame. Failed Load More requests retain previously rendered rows. Only the
official catalogue request can affect this error state; unrelated vendor AJAX
failures are ignored. The server-rendered CJ link remains available.
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

Subcategory QA also covered Pop & Rock, NBA, Formula 1, Hip-Hop & R&B,
Classical & Opera and Theater & Broadway; each loaded 10 relevant results.
Pop & Rock's Albany filter returned 10 events in Albany. Its 390 px mobile
viewport retained readable purchase buttons and no internal overflow. The old
"No dated Pop & Rock listings" placeholder is absent when the live feed is used.
All 22 directory categories have a configured supplier filter and distinct SID.

Previous integration checks against `main` at `2724cc7`: all 36 content tests passed, the
Next.js production build passed, and OpenNext generated the Cloudflare Worker
successfully with the project's standalone build setting. The unchanged
`ai-router` application was outside this ticket-catalogue check.

Publish according to `CLAUDE.md`: start from current `main`, use a task branch,
and merge through a user-created or user-approved PR. Never push this change
directly to `main`.

## Miami defaults and provider cleanup

Follow-up browser QA on 2026-10-20 verified NHL defaults to Sunrise home games,
NBA to Miami Heat home games, and Sports, Concerts and Pop & Rock to Florida
venue cities. NHL Load More went from 10 to 20 Sunrise games. All Florida
added Tampa NHL games; All cities displayed national inventory and reset to
10 results. Pop & Rock's Cities filter returned only Miami; widening the area
cleared that selection. Boxing showed the local empty state, then real events
after selecting All cities. Only TicketNetwork was present in the provider
section. The 390 px mobile calendar retained Dates, Teams and Cities,
112 × 44 px purchase buttons, and no internal horizontal overflow or vertical
scrollbar. The site's generic page title, optional supplier telemetry failure
and existing Framer Motion warning remain unchanged.

The content suite now contains 38 passing tests, including all-category Miami
defaults and changing area without losing dates/teams or retaining a stale city.

Follow-up Next.js production and OpenNext Cloudflare Worker builds both passed.
Changes are saved on the task branch; no PR, merge or production deployment
has been performed.

## Catalogue outage recovery — 2026-10-20

A production Sports page reproduced the reported error with zero rows. Both
the Miami widget query and a basic supplier query without geographic filters
returned HTTP 503 with an upstream connection-termination response in a
read-only diagnostic. This establishes failed requests at verification time,
not a permanent supplier outage or a browser-specific root cause.

The former global AJAX error handler and cumulative 20-second deadline hid
the entire widget without a recovery action. Catalogue errors are now scoped,
requests have bounded retries, filters remain available after the runtime has
loaded, and manual retry can recover without advancing pagination. A new area
hides the old area's rows until its own query succeeds. Security isolation and
CJ reporting are unchanged.

41 content tests passed, including consecutive 503 responses, manual recovery,
failed page 2 retaining page 1, exact query/page reuse, and unrelated AJAX
failures. Browser QA used a clearly labelled local fixture with real jQuery:
three simulated 503 responses showed the error and Try again; clicking it
rendered the synthetic test row. The fixture was removed before building and
is not production inventory. Live supplier recovery was not established by
that simulated test.

Recovery fix validation: Next.js production and OpenNext Cloudflare Worker
builds passed. This fix does not manufacture events or bypass the supplier.
