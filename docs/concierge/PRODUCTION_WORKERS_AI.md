# Public Workers AI concierge

The production Worker uses Qwen 3.8 through the native `CONCIERGE_AI` binding. Only `https://gorgona-one.com` with the production Supabase project can use production admission. The model reads the conversation and selects catalogue sections, advice, itinerary stops or a follow-up question. The server validates those selections and renders localized copy. The privacy page explains what the chat sends to Workers AI.

Simple greetings and direct questions about current Miami weather or time bypass model admission. Weather uses the latest KMIA observation from the [National Weather Service](https://www.weather.gov/documentation/services-web-api) and requires no API key. That fixed request carries no chat text. Local time uses `America/New_York`.

## Activation

1. Keep the active production version ID for rollback. Verify the deployment retains the existing runtime secrets and points to production Supabase project `ctszqhhvalyqxhbfqifx`.
2. Apply [the existing usage migration](../../supabase/migrations/20261102030000_concierge_usage.sql) to production Supabase. Verify the policy is enabled and that only the service role can call `public.concierge_ai_reserve`. The policy reserves at most 64 calls, 400,000 input bytes and 24,576 output tokens per UTC day, with up to 24 admissions per client in 10 minutes. These counters limit the concierge. Cloudflare meters usage across the account. [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
3. Set `CONCIERGE_WORKERS_AI_ENABLED` to `"true"` in the production Wrangler configuration for the activation release. Keep the same setting in source for subsequent builds.
4. Submit synthetic requests on the public [Discovery page](https://gorgona-one.com/discovery). Verify that a greeting works without inference and that an explicit weather query includes the observation timestamp and source. Compare yacht outings, then add a short time limit and verify that the reply narrows the advice. Verify `source: "workers-ai"` with `responsePolicy: "conversation-v1"` for advice, and `"catalogue-v1"` for section-only requests. Check that an invalid request is rejected and a preview host cannot reach the production model.

To turn off inference immediately, set `private.concierge_ai_policy.enabled` to `false` for the policy row. To revert the code or binding, restore the preceding Worker version and revert the source change before the next automatic build. Keep the quota tables and their records during rollback. [Cloudflare version rollback](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
