# Miami Elio — secure Twilio owner SMS activation

Status: **code staged in a draft PR only**. No production dispatch, schema update, Twilio billing or message delivery is implied by this file.

## Scope

The existing internal notification job (`/api/internal/notifications`) sends events from `private.notification_events` via `private.notification_deliveries`. This additive change allows a third channel, `sms`, without replacing Telegram or email. Only durable business events already entered in that queue are eligible: bookings, request updates, relevant account/listing changes and plan submissions. Page views, generic clicks, partner-side external bookings and unintegrated payments are **not** covered.

SMS payloads contain the Miami Elio sender name, event type, shortened booking reference, administrator URL and STOP instructions. No customer name, email or phone is transmitted. The bounded fields keep the payload within one SMS segment.

## Security and rollout gates

Two independent switches must be enabled:

1. `private.sms_notification_settings.enabled` defaults to **false**, so new business events do not enqueue SMS at all until the explicit database activation. Existing events are never backfilled. This switch is protected in schema `private` and is not available to the public roles.
2. Server-only `TWILIO_SMS_ENABLED=true`, plus *all* required Twilio credentials, are needed before the dispatcher even claims SMS rows.

Do **not** turn on either switch before A2P/toll-free compliance, destination verification, migration/application deployment and a scheduled Worker check. Adding secrets must never trigger delivery of historical events. Disable the DB switch to stop new SMS enqueueing; disable the server switch to stop all SMS dispatch.

This implementation marks a row `sent` after Twilio returns a valid Message SID. For delivery evidence, look up that SID in Twilio Messaging Logs. A signed status callback and reconciliation would be needed for automated delivery reporting.

The dispatcher records the attempt before calling Twilio. After a timeout, an ambiguous response or an interrupted worker, the delivery records `sms_outcome_unknown` without automatically sending again. Check Twilio Messaging Logs before deciding whether to replay it. Twilio HTTP 429 responses are explicitly rejected and can be retried with backoff.

## Register/verify the sender in Twilio Console

1. Open https://console.twilio.com/ in your own authenticated browser (do not copy credentials or screenshots revealing credentials into any chat).
2. Verify that the account is upgraded from trial and supports Messaging Services.
3. In Messaging Services, create or select a service whose sender pool is approved for Miami Elio's owner alerts. Collect the destination owner's consent for these alerts and verify STOP handling for the selected sender.
4. For a US 10-digit local number, verify that the business Brand and A2P 10DLC Campaign are approved and the number is registered on that campaign. For a toll-free number, verify its approved toll-free SMS registration. Internal owner alerts remain application-originated traffic.
5. Create a dedicated **Restricted** API Key with only permission to create Messages. Transfer the one-time secret directly from Twilio to the Cloudflare Secret field.

[Twilio Restricted API keys](https://www.twilio.com/docs/iam/api-keys/restricted-api-keys), [Twilio Messaging Policy](https://www.twilio.com/en-us/legal/messaging-policy), [A2P 10DLC](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc), [Toll-free verification](https://www.twilio.com/docs/messaging/compliance/toll-free/console-onboarding)

## Store keys without sharing them with an agent

The production dispatcher runs inside the **Miami Elio Cloudflare Workers/Next.js application**, *not* inside `miami-elio-telegram-dispatch` in Supabase. Therefore store the credentials in **Cloudflare Workers & Pages → the actual production application Worker → Settings → Variables and Secrets → Add → Secret**, checking the Worker identity against the live website first.

Required server values (never prefix with `NEXT_PUBLIC_` and never put real values in GitHub, chat or screenshots):

| Secret name | Value from the Twilio account |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Account SID beginning `AC` |
| `TWILIO_API_KEY_SID` | Dedicated API Key SID beginning `SK` |
| `TWILIO_API_KEY_SECRET` | One-time API Key secret |
| `TWILIO_MESSAGING_SERVICE_SID` | Messaging Service SID beginning `MG` |
| `TWILIO_OWNER_PHONE` | Owner iPhone SMS destination in E.164 (e.g. `+1...`) |
| `TWILIO_SMS_ENABLED` | String `false` until activation |

Cloudflare reference: https://developers.cloudflare.com/workers/configuration/secrets/

Supabase dashboard secrets **will not reach this dispatcher**. They are appropriate only for the separate Supabase Edge Function; do not mix the two runtimes.

## Release / acceptance sequence

1. Confirm that `Gorgona-One-AI-3.0.7.21.26` main actually powers `https://gorgona-one.com` and identify the Cloudflare Worker serving `/api/internal/notifications`.
2. Verify the Twilio sender and destination, then review CI, the database contracts and the recoverable production backup. Rehearse the trigger and claim path on staging with a rollback and no external sends.
3. Apply `20261115154500_twilio_sms_notifications.sql` in environments where it is absent, followed by `20261115172400_twilio_sms_attempt_guard.sql`. Verify `private.sms_notification_settings.enabled=false` and zero SMS deliveries.
4. Deploy the application with `TWILIO_SMS_ENABLED=false`. Check the authenticated scheduler, existing email/Telegram channels and scope of the Worker bindings.
5. Install the Twilio values as Cloudflare encrypted Secrets. Keep the database switch off. Enable only the Worker switch and use one synthetic event in the private outbox with just an SMS delivery row. This leaves booking records and the email/Telegram queue out of the delivery test.
6. Match the persisted Message SID to Twilio Messaging Logs, wait for `delivered` and confirm receipt on the owner's phone. If the status is uncertain, reconcile that attempt before any replay.
7. After the test is delivered, enable enqueueing for new business events with an owner-authorized service-role session:
   ```sql
   update private.sms_notification_settings
      set enabled = true, updated_at = now()
    where singleton = true and enabled = false;
   ```

The SMS budget is **50 reserved send attempts per UTC day** and **500 per UTC month**, shared by this application's SMS channel only. Twilio fees, sender costs and carrier surcharges are separate; outbound messages can be billed even if the receiving device does not confirm delivery. Budget reservations occur before the HTTP send and are conservative on unknown outcomes.

## Operational rollback

- Emergency: set `TWILIO_SMS_ENABLED=false` in the application Worker to stop dispatch; set the private DB switch to `false` to stop enqueueing. Do not delete queues, bookings, triggers or old delivery records.
- Disable/revoke a compromised API Key in Twilio Console and replace the Cloudflare encrypted secret.
- Never expose the outbox bearer token, Supabase service role or Twilio API key in client bundles.
