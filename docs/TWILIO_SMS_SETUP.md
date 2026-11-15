# Miami Elio — secure Twilio owner SMS activation

Status: **code staged in a draft PR only**. No production dispatch, schema update, Twilio billing or message delivery is implied by this file.

## Scope

The existing internal notification job (`/api/internal/notifications`) sends events from `private.notification_events` via `private.notification_deliveries`. This additive change allows a third channel, `sms`, without replacing Telegram or email. Only durable business events already entered in that queue are eligible: bookings, request updates, relevant account/listing changes and plan submissions. Page views, generic clicks, partner-side external bookings and unintegrated payments are **not** covered.

SMS payloads contain only the event type, shortened booking reference and administrator URL. No customer name, email or phone is transmitted. The short ASCII payload is limited to 160 characters to reduce segment charges.

## Security and rollout gates

Two independent switches must be enabled:

1. `private.sms_notification_settings.enabled` defaults to **false**, so new business events do not enqueue SMS at all until the explicit database activation. Existing events are never backfilled. This switch is protected in schema `private` and is not available to the public roles.
2. Server-only `TWILIO_SMS_ENABLED=true`, plus *all* required Twilio credentials, are needed before the dispatcher even claims SMS rows.

Do **not** turn on either switch before A2P/toll-free compliance, destination verification, migration/application deployment and a scheduled Worker check. Adding secrets must never trigger delivery of historical events. Disable the DB switch to stop new SMS enqueueing; disable the server switch to stop all SMS dispatch.

This implementation marks a row `sent` after Twilio returns a valid Message SID. This means **accepted by Twilio**, not confirmed delivered to the handset. A signed Twilio status callback plus reconciliation is required for actual carrier-delivery reporting. Transport retries following ambiguous network timeouts can create duplicate SMS; the system provides at-least-once attempts, not exactly-once carrier delivery.

## Register/verify the sender in Twilio Console

1. Open https://console.twilio.com/ in your own authenticated browser (do not copy credentials or screenshots revealing credentials into any chat).
2. Verify that the account is upgraded from trial if production sends are needed.
3. In Messaging Services, create or select a Messaging Service; ensure its sender pool uses a verified, eligible sender.
4. For US 10-digit local numbers register the business Brand and the relevant A2P 10DLC Campaign, wait for approval, and bind that sender. Alternatively, complete toll-free verification for a verified toll-free sender. Internal owner alerts remain application-originated traffic.
5. Create a dedicated **Standard** API Key in Console (or a Restricted key with the verified minimum permission to POST Messages). Copy the secret once, directly to the server secret field; do not use the account Auth Token as an application credential.

Official references: https://www.twilio.com/docs/iam/api-keys ; https://www.twilio.com/docs/messaging/api/message-resource ; https://www.twilio.com/docs/messaging/compliance/a2p-10dlc

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
2. Run the SQL-backed tests, build and code review in the PR; reconcile schema drift; back up the production database.
3. Deploy the additive migration `20261115154500_twilio_sms_notifications.sql`; verify `private.sms_notification_settings.enabled=false` and zero pre-existing `sms` deliveries. Leave the switch disabled.
4. Deploy the application with `TWILIO_SMS_ENABLED=false`, validate that the existing email/Telegram notifications still work and that `/api/internal/notifications` is properly authenticated.
5. Add the five Twilio values as Cloudflare encrypted secrets. Keep `TWILIO_SMS_ENABLED=false`; verify the sender and destination privately.
6. Once Twilio sender approvals and the worker schedule are confirmed, enable the database setting with an owner-authorized service-role session:
   ```sql
   update private.sms_notification_settings
      set enabled = true, updated_at = now()
    where singleton = true and enabled = false;
   ```
7. Set `TWILIO_SMS_ENABLED=true` in the **same production application Worker** and deploy that configuration. Create **one synthetic test booking** through the real booking path, observing one `sms` row and a matching Twilio Message SID. Independently inspect Twilio message delivery status and confirm the message arrives on the owner's phone; do not claim delivery from the API acceptance alone.
8. Check that registration/listing events enqueue only once, that unsuccessful credentials produce permanent errors, and the budget limits prevent runaway spending.

The SMS budget is **50 reserved send attempts per UTC day** and **500 per UTC month**, shared by this application's SMS channel only. Twilio fees, sender costs and carrier surcharges are separate; outbound messages can be billed even if the receiving device does not confirm delivery. Budget reservations occur before the HTTP send and are conservative on unknown outcomes.

## Operational rollback

- Emergency: set `TWILIO_SMS_ENABLED=false` in the application Worker to stop dispatch; set the private DB switch to `false` to stop enqueueing. Do not delete queues, bookings, triggers or old delivery records.
- Disable/revoke a compromised API Key in Twilio Console and replace the Cloudflare encrypted secret.
- Never expose the outbox bearer token, Supabase service role or Twilio API key in client bundles.
