# Miami Elio — password recovery release

## Implemented

- `/login` displays a localized **Forgot password?** link.
- `/forgot-password` validates the email locally and calls Supabase Auth `resetPasswordForEmail` without revealing whether the account exists.
- The email redirects to the existing authenticated `/account/setup` route.
- Password changes are executed with the authenticated user's own bearer token; no privileged backend key or direct `auth.users` change is performed.
- After updating a password, the protected account role determines the destination: `admin` → `/admin`, `partner` → `/partner`, otherwise `/profile`.
- Expired/used recovery links lead back to `/forgot-password`.
- Copy is provided in all 16 supported languages, including RTL languages.
- This release does not create users, alter role grants, touch bookings or change passwords automatically.

## Required production Auth configuration and email delivery check

Project: `ctszqhhvalyqxhbfqifx`.

Before enabling traffic for this feature, confirm in **Authentication → URL Configuration**:

- Site URL: `https://gorgona-one.com`
- Allowed redirect URL: **exact** `https://gorgona-one.com/account/setup`
- If the app also serves `www.gorgona-one.com`, either force canonical redirects to the non-www host or separately approve and configure the www redirect. Never use a broad `**` wildcard for production.

In **Authentication → Email Templates → Reset password**, ensure the link uses the Supabase-provided `{{ .ConfirmationURL }}` (or an equivalently reviewed redirect-aware template), not a hardcoded homepage.

Confirm Auth SMTP delivery independently of the site's Resend booking notifications. Supabase's default Auth sender is best effort and unsuitable as a production guarantee. Do not infer SMTP readiness from working `notifications@gorgona-one.com` booking messages.

## Acceptance gates (no real account mutation in CI)

1. `node --test tests/dashboard/password-recovery.test.mjs tests/dashboard/password-setup.test.mjs`
2. `npm run i18n:check`
3. Run the existing dashboard regression suite and the regular Next/Cloudflare build on the exact proposed commit.
4. Confirm Auth URL settings and the approved email channel. With an explicitly approved test account and mailbox, request one recovery email, open it on iPhone Safari and desktop, set a new test password, and confirm login/role are unchanged. Do not run this live against the owner's administrator credentials without separate consent.
5. Confirm expired/reused tokens cannot update a password, email does not disclose account existence, and unrelated routes/booking submissions still work.

A pull request passing source/unit tests is not proof of a deployed, functional email recovery flow; record the production release and provider delivery separately.
