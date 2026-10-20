# TicketNetwork event catalogue

Last audited: 2026-10-20. CJ website PID `101825540` belongs to
`https://gorgona-one.com/`. The CJ widget creative is `10793961` at
`https://www.tkqlhce.com`. Each category has a distinct alphanumeric SID;
Sports and Concerts retain `GorgonaSports` and `GorgonaConcerts`.
Commission rate and sale attribution have not been verified by a purchase.

## Outage findings and replacement

The former Event Results Widget loaded its JavaScript, but its public legacy
`https://www.tn-apis.com/catalog/v2/events/search` request failed. A direct
diagnostic returned HTTP 503 with a connection-termination message; a separate
fetch also could not reach the target. This does not establish a permanent
supplier outage. The official storefront still displayed real events.

The storefront's currently deployed public Event search returned real inventory
and facets. The portal now renders its own React list and fetches that search
through `/api/events/ticketnetwork`. The iframe, remote jQuery, remote styles,
datepicker runtime, global AJAX hooks and their timeout/pagination races have
been removed from the application.

The server resolves the intentionally public search configuration from scripts
linked by the official `https://www.ticketnetwork.com/en/affiliate-plugin`
page. It parses the current Event search configuration as data and executes no
remote code. Script fetches stay on the official origin; the search host must
match the supplier's Typesense host pattern. No account credentials, private
API, or committed supplier key is used. The key stays on the server.

**Dependency:** this is the public storefront search protocol, which the supplier
can change. It is not a contracted affiliate data-feed API. Configuration is
rediscovered after six hours, or on the next attempt after a 401/403. Invalid
configuration or response schemas fail visibly. A long-term supplier feed with
documented credentials and support remains an appropriate future upgrade.

## Lists, regions and filters

The Events overview, Sports, Concerts and all 22 sports/genre categories load
upcoming events automatically. The default is Miami and explicit nearby South
Florida venue cities, together with state `FL`. Sunrise, Miami Gardens,
Homestead and Fort Lauderdale are included. The page never requests the
visitor's location and never silently falls back to national inventory.

Area offers Miami & South Florida, All Florida and All cities. From date, To
date, Team/Artist and City stay visible even during failure. Changing Area
clears City, preserves dates and Team/Artist and restarts on page 1. Reset
returns to the Miami defaults. Text filters and dates apply with Show events.
Mobile filters use two columns and ticket controls are at least 44 px high.

All search filters are built from validated parameters and an explicit category
mapping. Raw supplier filters, arbitrary upstream URLs, unknown/duplicate
parameters, invalid dates and unbounded pagination are rejected. Each response
contains at most 10 rows and pagination is capped at 100 pages. Empty local
results remain empty with instructions to widen Area.

Dates start on the current Miami calendar day and have a two-year horizon.
The supplier's `event_local_timestamp` represents venue-local wall time in a
UTC-shaped value; the display preserves that wall time instead of converting
it to the visitor's timezone. Prices, ticket counts, scarcity and unverified
availability guarantees are not displayed. Each row links through CJ to the
corresponding TicketNetwork event. Checkout/support remain on TicketNetwork.

Only TicketNetwork appears in the public provider section. Other marketplace
records and artwork remain hidden and retained.

## Cache and recovery

Successful searches are fresh for five minutes. A bounded in-memory cache and
Cloudflare Cache API retain exact-query results for up to 24 hours. During a
temporary upstream failure, a matching saved response is explicitly labelled
with its update time and a current-availability reminder. Cache failures never
block a valid live result. Failed requests and malformed supplier responses
are not cached as empty lists. Cache API entries are local to the Cloudflare
data center and may be evicted; they are not a guaranteed offline archive.

Concurrent identical requests are coalesced. At most 20 distinct supplier
requests run per server instance. Source discovery has an eight-second budget;
searches have a ten-second budget and a three-MiB response limit. No error body
or key is returned to the browser. Server warnings record only error type/code.

The React client aborts superseded requests and ignores late responses. A failed
first page shows Try again without Load More. A failed later page retains
existing rows and retries that exact page. Pagination advances only after a
successful response, with ID-based duplicate suppression.

## Validation

`node --test tests/content/*.test.mjs` covers CJ destinations, category boundaries,
Miami defaults, date handling, invalid/injected parameters, response validation,
cache isolation by query/page/area, stale/expired results, concurrent request
coalescing, public key rediscovery and cache failures.

Independent live service checks passed for all 25 catalogue configurations on
2026-10-20. Examples: NBA returned 41 Miami games, NHL 39 Sunrise games, NFL six
Miami Gardens games. Concerts returned South Florida listings. UFC and Boxing
had no local matches; widening Boxing to All cities returned real inventory.
These counts are observations, not static content or guarantees.

The internal browser preview cannot resolve external supplier DNS
(`EAI_AGAIN www.ticketnetwork.com`). UI QA therefore used temporary recorded
live responses, with explicitly simulated first-page and second-page 503s.
Retry recovered 10 initial NBA rows; a page-2 failure retained those rows;
retry produced 20 unique rows. A November/Miami Heat/Miami filter returned five
matching rows. All cities plus New York returned Knicks home games. Category
navigation reset NHL to Sunrise. Concerts and the Events overview rendered
their own lists. Boxing's empty local list recovered after widening Area.

At a 390 px embedded viewport, filters and rows fit without internal overflow;
ticket controls measured 119 by 44 px. The event pages' viewport-wide backgrounds
no longer create horizontal page scrolling. Existing Framer Motion diagnostics
and browser-extension errors were observed; no application/framework error
overlay appeared. All temporary responses, diagnostic output and preview files
are removed before building and committing.

Production must be checked against the real server route after the GitHub PR
and Cloudflare build. Run Next.js with `NEXT_PRIVATE_STANDALONE=true`, followed
by `opennextjs-cloudflare build --skipNextBuild --openNextConfigPath
open-next.config.mjs`. The unrelated `ai-router` application is outside this
catalogue change. Publish from fresh `main` through an approved PR under
`CLAUDE.md`; never push directly to `main`.
