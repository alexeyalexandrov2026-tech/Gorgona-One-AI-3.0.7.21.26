# Native Workers AI concierge pilot

This follows the navigation/UI acceptance in `VERIFICATION_20261101.md`. It adds a real-model path to the existing chat adapter, initially confined to the existing authenticated staging Worker. Production publication is a separate release decision.

## Current result

**PASS for the protected staging pilot.** Final application source `5029462fce7ae0da32979653c27dc306afcb3be4`, tree `fed12ed176368446f77400c39eed54a762c172d7`, is active on private staging as version `0a2f854f-7916-4f1d-8ee7-92c2767705fc`. Public production is unchanged. This supersedes the earlier report's unavailable-model finding for private staging only; the public-rollout limitations below remain.

| Final check | Actual outcome | Evidence in sibling `outputs/` |
| --- | --- | --- |
| Immutable content/i18n/concierge tests | PASS: 315/315, zero skipped, exit 0 | `concierge-ai-release-tests.log` |
| Actual route and adapter contracts | PASS: 10/10, exit 0 | `concierge-ai-token-green.log` |
| Saved translations | PASS: all 16 catalogues match, exit 0 | `concierge-ai-release-i18n.log` |
| Linux Next/OpenNext build and package | PASS: one handler, 108 referenced assets, exit 0 | `concierge-ai-release-build.log` |
| Artifact identity and secret scan | PASS: exact source/project/hash, 2,210 files, five protected server values excluded, exit 0 | `concierge-ai-release-validate.log` |
| Packaging, binding/runtime preservation and private activation | PASS, exit 0 | `concierge-ai-release-dry-run.log`, `concierge-ai-release-guard.json`, `concierge-ai-release-activation.log` |
| Real-model multilingual and multi-turn acceptance | PASS: 17/17, exit 0 | `concierge-live-ai-5029462f.json` |
| Hosted input/navigation/destination/API acceptance | PASS: 112/112, exit 0 | `concierge-api-5029462f.json` |
| Hosted browser acceptance | PASS: 42/42, exit 0 | `concierge-browser-5029462f/results.json` |

All 96 navigation cases in the hosted API suite received actual model responses, with zero navigation-only fallbacks in that run. The separate 17-check live suite requires `source: workers-ai`, `configured: true`, nonempty bounded text, the expected destination and selected non-Latin script where applicable; it also rejects raw route paths and model-authored Markdown links. Those checks passed against the final deployed source. Responses were inspected as synthetic samples; these tests are not a guarantee of native-quality translation or factual accuracy on arbitrary inputs.

The final browser run completed November 2 at 02:41 UTC. A fresh Cloudflare deployment read at 02:41 UTC confirmed production remains version `2fb0f528-3310-44ec-b833-26c0bc418e14` and only the private Worker serves the new model integration. Post-acceptance read-only SQL returned the same row counts and digests as the earlier baseline: bookings 13, request events 30, notification events 107, notification deliveries 214. No rows changed in those four measured booking/request/notification tables.

Final artifact SHA-256: `c12cd2eb3201dcc40752ef0a71707e5d3a2b0a92889c4e782eb0e4425f26e912`, built at 02:30 UTC. All 13,487 tracked source files matched the saved Git tree. Immediate private rollback is `61832485-942c-4d53-b653-49bb90180667`; rollback to `f3304e77-a53e-4d45-997a-73188036e090` also disables the model pilot by restoring the prior version without its binding/flag.

## Acceptance and architecture

- A valid synthetic request must receive a nonempty actual model response, `source: workers-ai`, `configured: true`, and the existing canonical navigation buttons.
- Invalid requests must fail before any model call. Disabled, missing, unavailable, malformed, truncated or overdue model responses must fall through to the existing engines and honest navigation fallback.
- The pilot must preserve staging authentication, current project/secret boundaries, reservation data, navigation behavior and production configuration.
- The deployed endpoint must pass real-model checks in all sixteen supported locales and a multi-turn exchange; a health response or mocked adapter result is insufficient.

The owning path remains `/api/chat`. Input validation, local navigation, catalogue search, language instructions, conversation storage and UI are reused. The new `lib/ai/workersBrain.mjs` adapter uses the already installed OpenNext `getCloudflareContext()` to obtain the request-local native `CONCIERGE_AI` binding. The alternative existing OpenAI-compatible HTTP adapter would require a server credential; the native binding avoids creating or deploying a persistent key. No dependency, authentication system, database table or migration is added.

The adapter requires **all three** of: `APP_ENV=dashboard-staging`, `CONCIERGE_WORKERS_AI_ENABLED=true`, and a native binding with `run()`. Production configuration has no AI binding and cannot enable this pilot merely by setting the flag. The existing staging gate authenticates requests before application code or assets run. The local FastAPI/router engines are retained as fallbacks.

Follow-up catalogue retrieval reuses the shared conversation-topic matcher and includes an existing capacity attribute when present. Output uses the site's existing localized section names instead of model-authored internal Markdown links or route tokens. Whole route tokens, including query/hash/encoded suffixes, are validated using the existing navigation boundary before replacement; unknown or external targets are rejected. Ordinary prose such as `and/or` and `Miami/Orlando` remains intact, and Discovery Room retains its label. Failed regression fixtures for partial-token cleanup are retained in `concierge-ai-token-red.log`; the corrected checks passed in `concierge-ai-token-green.log`. The model still does not own destination buttons or transaction actions.

Model: `@cf/qwen/qwen3-30b-a3b-fp8`, pinned in server code. The input combines the current ecosystem prompt, selected-language instruction, a bounded projection of existing catalogue matches and recent conversation turns. Retired `/stores` and `/coupons` destinations are removed from the prompt; `/private-jets` is included. Catalogue matches are explicitly data, not instructions or real-time availability.

Limits: 24,000 UTF-8 bytes for the model message array, at most twelve conversation turns, at most 384 output tokens, and a fifteen-second response deadline. Older turns are removed first; the newest user message is preserved. Final text must fit the same exported 4,000-character limit as the request validator. Empty, malformed, truncated, unresolved reasoning-block and known false-confirmation replies are rejected. Neither raw provider errors nor prompt/transcript data are logged by the adapter.

## Safety and cost boundaries

This is a private pilot, **not public launch readiness**. The model has no booking, payment, cancellation, customer-record or other write tool. A reply never creates a reservation or provides a verified confirmation. The underlying booking/request systems retain ownership of transaction status.

Prompt grounding and the known-phrase confirmation filter are defence in depth, **not deterministic guarantees of factual accuracy**. Independent review demonstrated that unconstrained model text can invent a venue/address or paraphrase a confirmation. The reported confirmation paraphrases and oversized-reply regression were fixed, but unknown paraphrases and factual errors remain possible. Public rollout still needs an accepted response policy and further adversarial/factual evaluation.

The fifteen-second deadline limits the guest's wait; it does **not** guarantee cancellation of native model compute. There is no pretend per-isolate global spending cap. Before any public model rollout, add a durable abuse/cost policy and review account-wide quota/overage behavior. The private worker gate is the access restriction for this pilot, not a billing guarantee.

No new subscription, permanent API credential, commercial agreement or billing setting is created by this change. Existing account authentication was used only locally for one synthetic REST diagnostic. The diagnostic returned HTTP 200, 83 total tokens and approximately 1.108 neurons; it is distinct from deployed binding verification. No customer data was used. Cloudflare's daily allocation does not imply that account-wide quota is available or that overage cannot be billed.

Official references checked against installed capabilities:

- [Cloudflare model input/output and parameters](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/)
- [Native Workers AI bindings](https://developers.cloudflare.com/workers-ai/configuration/bindings/)
- [OpenNext request-local bindings](https://opennext.js.org/cloudflare/bindings)
- [Cloudflare pricing and daily allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/)

## Verification evidence

Before deployment, `audit-live-ai.mjs` ran against the previous immutable staging source `b6225003`: **0/17 passed, 17 failed, exit 1**, all because the endpoint returned `source: navigation` instead of an actual model response. This deliberately red baseline is retained at `../outputs/concierge-live-ai-red.json`.

Source contracts: **8/8 passed, exit 0** across actual route and cloud adapter tests, including native request-local binding resolution and shared reply length. The combined content/i18n/concierge suite passed **313/313, zero skipped, exit 0**. All sixteen saved translation catalogues matched. Independent review separately reported **14 focused tests passed** and verified the previously reported oversized and false-confirmation examples are rejected. Review found no remaining blocker for the protected staging pilot, while preserving the public-rollout limitations above.

Runtime/build evidence is recorded below after immutable deployment. Tests use synthetic inputs and do not submit bookings. Voice browser fixtures do not prove real microphone recognition. Existing intermittent hydration risk from the earlier acceptance remains separate from this provider integration.

Saved application source: `d82245a4bd28f7eee733b2543feb6f246168c670`, tree `cd36e913b543e73c725d4055b2fcd08a1680b00b`. All 13,487 tracked files were materialized from Git objects and hash-checked with zero mismatches, excluding concurrent working-tree changes. The Linux Next/OpenNext build passed with one handler and 108 referenced client assets; artifact SHA-256 `8d95306a4fd34db901d94d2739050823441f6061bc16f3310253edb92b6e8884`, built November 2, 2026 at 02:11 UTC. Existing staging catalogue-table warnings were retained in the build log.

The artifact scan checked 2,210 files, excluded the five existing protected server values and the browser voice test fixture, and verified the retained Linux hash. Dry-run packaging passed. Private staging version `61832485-942c-4d53-b653-49bb90180667` was activated at 100%; rollback version `f3304e77-a53e-4d45-997a-73188036e090` remains available. The activation guard required that rollback version still be current, preserved every existing binding and normalized runtime setting, and allowed only the native AI binding plus its explicit enabled flag as additions. No production route or worker configuration was changed.

On the same immutable Linux source, all **117 dashboard/server tests passed**, exit 0. The first additional Linux content/i18n/concierge run had **311 passed and 2 failed**, exit 1, because Miniflare/workerd could not start without system CA certificates. The application source was unchanged. Supplying a temporary PEM bundle from the official installed Node runtime through `SSL_CERT_FILE` restored the test runtime while keeping TLS verification enabled; the full **313/313 passed**, exit 0. The temporary bundle was removed and system trust was not modified. This environment behavior is supported by the [TLS library's documented certificate lookup](https://github.com/rustls/rustls-native-certs). Logs: `../outputs/concierge-ai-immutable-tests.log`, `concierge-ai-immutable-tests-ca.log`, and `concierge-ai-dashboard-tests.log`.

## Files changed

```text
app/api/chat/route.js
lib/ai/chatRequest.mjs
lib/ai/workersBrain.mjs
lib/aiEcosystemContext.js
scripts/concierge/audit-live-ai.mjs
tests/concierge/route.test.mjs
tests/concierge/workers-ai.test.mjs
wrangler.dashboard-staging.json
docs/concierge/WORKERS_AI_20261101.md
```

Concurrent R5 dining editor/dashboard/migration changes are preserved and excluded from the immutable release source. The production Worker and production database are not changed by this pilot.

The final copy/token changes were independently reviewed with the 10 focused contracts and explicit previously failing fixtures; no blocker remained for the protected pilot. Public cost/factual policy, real microphone recognition, Safari/iOS hardware acceptance, load/soak behavior and a proven resolution of the earlier intermittent hydration exception remain unverified. That exception did not recur in the final 42-scenario hosted run. No new dependency, partner API approval, direct reservation integration or production release is claimed.
