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
