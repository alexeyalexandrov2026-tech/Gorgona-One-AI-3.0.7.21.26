# GORGONA ONE — Sportsbook affiliate onboarding

Last updated: 2026-10-20. **Not a statement of partnership or regulatory approval.**

## Status at this checkpoint

| Sportsbook | Verified action | Status |
| --- | --- | --- |
| Hard Rock Bet | Email sent to affiliate-inquiry@hardrockdigital.com, 2026-10-20; Income Access introduction also requested | Inquiry sent, no approval |
| DraftKings Sportsbook | Official `DraftKings Affiliates Interest Survey` submitted on 2026-10-20; confirmation "Your response has been recorded" | Interest submitted, no approval |
| FanDuel Sportsbook | `affiliates.fanduel.com` inaccessible during browser audit; routing request sent to official press@fanduel.com, 2026-10-20 | Awaiting correct affiliate contact, no approval |
| BetMGM Sportsbook | Inquiry sent to partners@betmgm.com, 2026-10-20 | Inquiry sent, no approval |
| Caesars Sportsbook | Inquiry sent to affiliates@williamhill.us, 2026-10-20 | Inquiry sent, no approval |
| Fanatics Sportsbook | No verified sportsbook-specific affiliate onboarding; Fanatics merchandise program is not equivalent | Contact needed |
| bet365 Sportsbook | Inquiry sent to support@bet365partners.com, 2026-10-20 | Inquiry sent, no approval |
| BetRivers Sportsbook | Inquiry sent to affiliates@rush-affiliates.com, 2026-10-20 | Inquiry sent, no approval |
| theScore Bet | No verified sportsbook-specific affiliate onboarding | Contact needed |
| Bally Bet | Inquiry sent to affiliatepartners@ballysinteractive.com, 2026-10-20 | Inquiry sent, no approval |

Income Access introduction requested separately at network@incomeaccess.com on 2026-10-20.

## Policy and activation requirements

The site currently links to official operator websites for informational navigation. These are **not** confirmed affiliate URLs and should not be described as commission-earning links.

The staging policy is in `lib/sportsbookAffiliateRegistry.mjs` and intentionally enables **zero** offers. Before turning on a tracked link for any operator, complete all of the following:

1. Obtain written acceptance, a signed applicable agreement and operator approval for the publisher website and proposed placements.
2. Have counsel/compliance review required state-by-state affiliate/vendor licensing, permitted advertising language, disclosures, responsible-gambling resources, age requirements and applicable state rules.
3. Obtain an operator-approved tracking URL and exact hostname, creative/promo text, approved state list and explicit allowed traffic sources.
4. Implement independent, **verified** age 21+ and user-jurisdiction checks. A city typed in a search box, selected UI language or IP-only assumption must not be treated as definitive proof.
5. Explicitly gate Florida to Hard Rock Bet only, subject to written Hard Rock approval; no other sportsbook affiliate offers to Florida users.
6. Implement non-PII aggregate click reporting only with approved privacy/consent controls. Do not log user gambling behavior or sensitive personal information by default.
7. Confirm cancellation/expired campaign behavior, monitor broken links, document approval expiry and regularly revalidate licensed states.

`getSportsbookAffiliateDestination` is deliberately **not wired to a public CTA or redirect route**. It returns `null` for all ten operators. When a partnership is approved, an implementation PR must add the approved URL, host and states with evidence, a server-side verified age/geo gate, and a proper review and deployment test. Do not bypass the gate by inserting direct URLs into React components.

## Sources

- Hard Rock Florida: https://www.hardrock.bet/florida/
- Hard Rock affiliate form: https://hardrockaffiliates.com/registration.asp (banking required, terms page contained placeholder at time of audit)
- Hard Rock affiliate contact: https://hardrockaffiliates.com/contact.asp
- DraftKings official affiliate program: https://www.draftkings.com/affiliates
- FanDuel official partnerships: https://www.fanduel.com/about/partners
- bet365 Partners: https://www.bet365partners.com/en
- bet365 North America terms: https://www.bet365partners.com/en/termsandconditions/usa
- BetMGM Partners: https://www.betmgmpartners.com/
- BetRivers / Rush Affiliates: https://partners.rush-affiliates.com/registration.asp
- Caesars: https://affiliates.williamhill.us/registration.asp
- Bally's Interactive Partners: https://www.ballysinteractivepartners.com/

## Verification

Run `node --test tests/sportsbookAffiliateRegistry.test.mjs` before merging a policy change. The tests verify that all ten operators are disabled by default, unknown/insecure tracking hosts are rejected, all approval conditions are mandatory, and non-Hard Rock Florida offers are denied.
