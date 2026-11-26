# Miami Elio on Google Play

## Listing copy

| Field | Value |
| --- | --- |
| App name | Miami Elio |
| Default language | English (United States) |
| Proposed category | Travel & Local |
| Short description | Plan Miami trips, find yachts and villas, and save your favorites. |
| Website | https://gorgona-one.com |
| Privacy policy | https://gorgona-one.com/privacy |
| Account deletion URL after deployment | https://gorgona-one.com/account/delete |

**Full description**

Plan time in Miami with a private AI concierge. Explore yacht charters, villas,
car rentals, dining and local experiences. Save places and rentals in My Miami
so you can revisit them as your plans take shape.

Ask the concierge for ideas, choose the options that suit your trip and send a
request to the Miami Elio team. The team confirms availability and details.

Keep track of upcoming Miami events with optional reminders. Use dictation to
draft a question on supported devices, or type it directly.

**Release notes**

Explore Miami with native search and an AI concierge. Save favorites, prepare
trip requests and set reminders for upcoming events.

**Release notes, 1.1.0 (version code 3), English (United States)**

The AI concierge now shows real yachts, villas, cars and restaurants with
photos and prices right in its answers. Tap one to open it. A new Telegram
button at the top of the concierge reaches a live manager. The Home tab shows
the redesigned Miami Elio home page with its new AI concierge.

**Release notes, 1.2.0 (version code 4), English (United States)**

A new home screen: the Miami Elio AI concierge from our website, with quick
requests for yachts, villas, cars, jets and dining. The concierge has a new
gold look with photos and prices in its answers, and a live manager one tap
away. New Events tab with the Miami season and reminders.

**Release notes, 1.2.1 (version code 5), English (United States)**

Uses less battery on the home screen. Includes everything from 1.2.0: the
Miami Elio AI concierge on the home screen, the gold concierge with photos and
prices, a live manager one tap away, and the Events tab with reminders.

**Release notes, 1.2.2 (version code 6), English (United States)**

Yacht searches open the YATR catalogue. The concierge lets you retry a
request after a temporary outage. Opening a catalogue result closes the
keyboard, and going back keeps your search.

**Release notes, 1.3.0 (version code 7), English (United States)**

A new look: the deep sea behind Events, Catalog and the AI concierge, with
frosted-glass cards and a new menu. The home screen shows every Miami Elio
section at the top, with cars, jets and event tickets that change right over
the photo. Exclusive Destinations has its own tab, and the menu takes you
anywhere in the app, Events included. Stays are booked through Stay22 and
yachts through YATR. The keyboard stays down until you tap a field.

**Release notes, 1.3.1 (version code 8), English (United States)**

A new menu over the same sea as the Catalog: your places on cards of frosted
glass and every Miami Elio section as a photograph. The home screen, Exclusive
Destinations and your profile now sit over the sea too, with a lighter tab bar.
New photographs for Travel and Experiences. In Exclusive Destinations, each
experience opens on its own page with a list of offers to choose from.

**Release notes, 1.4.0 (version code 9), English (United States)**

Upgraded Miami Elio AI with hands-free Live Voice conversation, natural spoken
replies in 16 languages with one-tap interrupt, and a Listen button under every
answer. Car recommendations and trip plans now display live calendar availability
and multi-day price estimates directly inside chat.

## Graphics

The local handoff is in `app/build/outputs/play-listing/`. The app icon
uses Miami Elio's existing monogram. The phone screenshots show the running
Android app on an API 36 emulator. Review the seasonal screenshot against the
calendar at submission.

| Asset | Format | Suggested screenshot alt text |
| --- | --- | --- |
| `icon-512.png` | 512 × 512 RGBA PNG | |
| `feature-graphic-1024x500.png` | 1024 × 500 RGB PNG | |
| `01-concierge.png` | 1080 × 1920 RGB PNG | Miami Elio concierge with trip prompts and the Miami Season calendar. |
| `02-search.png` | 1080 × 1920 RGB PNG | Miami Elio search showing categories for cars, yachts and villas. |

[Google Play asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151)

## App content to verify before submission

Use the actual deployed build, its WebView routes and live provider configuration
when completing the Data safety and App access forms. Confirm the public support
email and provide Google with a dedicated reviewer account for protected screens.

| Flow | Observed data path |
| --- | --- |
| Account | Supabase Auth and profile data, including name, email and account ID. |
| Favorites | Guest choices stay on the device. Signed-in favorites link catalogue references to the account. |
| Trip request | Name, email, phone, dates, party size, selected catalogue items and optional notes reach the request service. |
| AI concierge | Messages and a session handle reach the concierge service. Review the active model providers, session storage, logs and retention in production. |
| AI answer report | The reported question, answer, optional note, language and session handle go to the private support queue. |
| Dictation | The OS recognition service returns text for the draft. Confirm service handling of audio and its applicability to Data safety. |
| Reminders | Schedules and notification preferences are handled on the device. |
| Embedded and partner pages | Check live WebView flows, including telemetry and user-initiated transfers to partners. |

Keep the store's data declarations in sync with the live privacy notice and
the account-deletion process. Check the AI reporting action using the signed
test build. [Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469)
[Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
[AI content policy](https://support.google.com/googleplay/android-developer/answer/13985936)

## Submission sequence

1. Open Miami Elio in a verified Play Console account and confirm its package
   name and available release tracks.
2. Validate the signed bundle and upload it to internal testing. Exercise live
   catalogue, sign-in, plan receipt, favorite synchronization, report delivery,
   account-deletion request and fulfillment on a test account, dictation and
   notifications. Verify the staff side in the same environment.
3. Enter the listing, contact and App content details. Use the signed bundle
   and completed pre-launch checks for the next eligible track.
4. For a personal developer account created after November 13, 2023, run a
   closed test with at least 12 testers opted in continuously for 14 days and
   apply for production access. Google reviews production access and releases.
   [Testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)
