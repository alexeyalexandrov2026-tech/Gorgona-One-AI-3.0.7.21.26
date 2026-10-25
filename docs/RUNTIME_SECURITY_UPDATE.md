# Runtime security update candidate

Local preparation on 25 October 2026, isolated from main and production. The dashboard integration remains at `d670ac2fc05371dd25dccf9397da2837f2d3c4f5`; this branch evaluates the smallest supported dependency update before release.

## Trigger and scope

The unchanged production lockfile reports 33 affected packages: 4 critical, 12 high, 11 moderate and 6 low. These are package advisories, not proof of four remotely exploitable production flaws. The baseline report is retained outside Git as `release-candidate-audit.json`.

Next 14 is unsupported. The reviewed advisories identify Next 15.5.28 as a patched maintenance release. For this App Router application, the official migration guide requires React 19; the broad npm React 18 peer range is not sufficient evidence of App Router support. Pin matching React/ReactDOM 19.0.9 and the React-19-compatible Framer Motion 11.18.2, retaining its existing major. OpenNext 1.20.13 explicitly supports Next 15.5.28; its required Wrangler peer must be resolved and verified in the lockfile. The rclone.js peer is optional and was not added. No automatic forced audit fix or speculative new provider is used.

Concurrently stays within major 10 at 10.0.6. PostCSS stays within major 8 at 8.5.31, including Next's pinned nested copy through a scoped override. Two other scoped overrides retain their existing majors: `@node-minify/core` uses Glob 10.5.0 and Miniflare uses Undici 7.30.1. Existing exact upstream pins otherwise retained affected versions; no global Glob major replacement is used. Regenerating the lockfile was necessary to apply the nested overrides; the intermediate lock was retained outside Git.

Preserve authentication, authorization, listings, photographs, translations, booking idempotency, private contacts and the outbox contracts. Server pages/metadata and route handlers explicitly await Next's promised params/searchParams. The shared server locale helper awaits the request cookie store; its callers await the locale result. Three new SQL-backed tests first failed on promised route contexts, then passed after the wrappers were adapted, retaining customer ownership and protected commands. Source absence of Server Actions, native image optimization or middleware can reduce particular advisory exposure; it does not make an unsupported dependency generally safe.

## Fresh dependency checkpoint

`npm ci` succeeds from the regenerated lock. `npm audit --audit-level=high` succeeds with 0 critical and 0 high. CI now includes that same gate. The raw audit still reports 3 moderate package warnings for `postcss-selector-parser` and its PostCSS Nested/Tailwind dependents; they represent one advisory, not three separate runtime flaws. Installed selector-parser is 6.1.5. The [maintainer advisory](https://github.com/postcss/postcss-selector-parser/security/advisories/GHSA-rj75-hqrm-r3gf) explicitly lists 6.1.5 as patched, whereas the registry snapshot still reports all versions below 7.1.6. Keep this discrepancy visible and recheck it; do not claim a zero-warning audit or rewrite Tailwind to major 4 merely to remove that database warning. The parser only processes trusted build sources in this application, with no partner-supplied CSS/request-path parsing.

The baseline already passes 147 local tests and normal-entry Worker packaging. Those results do not validate the update. The update requires fresh dependency audit, focused and full tests, Next build, Worker dry-run, browser fixtures, independent review and exact-head CI. No production migration, deployment, role grant, email send, scheduler activation or credential rotation is part of this local update.

## Toolchain compatibility regressions

The first full update run preserved a failure in the native Worker tests: the current Miniflare requires its new options shape. Use its exported `convertV4MiniflareOptions`, as Wrangler does, to retain the original native Request/outbound-service fixture and every redirect-rejection assertion. Do not replace workerd with a Node mock or skip those tests.

Independent review also found an old hardcoded Next/OpenNext version pair in the immutable staging build. A new regression first rejected the correctly installed saved pins. The build now reads exact pins from its archived manifest, still rejecting stale caches and version ranges. Focused native Worker/staging checks pass 7/7 after these fixes; these local checks do not authorize staging deployment.

## Primary references

- [Next.js support policy](https://nextjs.org/support-policy)
- [Official Next 15 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-15)
- [Next image optimization security advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw)
- [Next App Router Server Actions advisory](https://github.com/advisories/GHSA-p3m5-59mp-jv5r)
- [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare)
