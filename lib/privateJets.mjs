// Private jet charter partners & verified route guides for Miami Elio.
// Partner 1: PereJets (primary Miami & Caribbean charter referral).
// Partner 2: PrivateJetFinder (activated partner dashboard, 2026-10-31).

export const PEREJETS = Object.freeze({
  name: 'PereJets',
  refCode: 'WEBS5K',
  href: 'https://perejets.com/r/WEBS5K'
});

export const PRIVATE_JETS = Object.freeze({
  name: 'PrivateJetFinder',
  trackerCode: '716179668192',
  href: 'https://www.privatejetfinder.com/?tk=716179668192',
  script: 'https://www.privatejetfinder.com/js/partner.min.js'
});

// One-way guide estimates from PereJets published route pages (taxes & handling extra).
export const PRIVATE_JET_ROUTES = Object.freeze([
  Object.freeze({
    id: 'miami-nassau',
    from: 'Miami',
    to: 'Nassau',
    codes: 'MIA → NAS',
    flightTime: '1h 00m',
    priceUsd: 'US$8,000',
    href: 'https://perejets.com/miami-nassau/?ref=WEBS5K'
  }),
  Object.freeze({
    id: 'miami-providenciales',
    from: 'Miami',
    to: 'Providenciales',
    codes: 'MIA → PLS',
    flightTime: '1h 34m',
    priceUsd: 'US$23,000',
    href: 'https://perejets.com/miami-providenciales/?ref=WEBS5K'
  }),
  Object.freeze({
    id: 'miami-punta-cana',
    from: 'Miami',
    to: 'Punta Cana',
    codes: 'MIA → PUJ',
    flightTime: '2h 14m',
    priceUsd: 'US$32,000',
    href: 'https://perejets.com/miami-punta-cana/?ref=WEBS5K'
  }),
  Object.freeze({
    id: 'miami-san-juan',
    from: 'Miami',
    to: 'San Juan',
    codes: 'MIA → SJU',
    flightTime: '2h 30m',
    priceUsd: 'US$35,000',
    href: 'https://perejets.com/miami-san-juan/?ref=WEBS5K'
  }),
  Object.freeze({
    id: 'new-york-miami',
    from: 'New York',
    to: 'Miami',
    codes: 'JFK → MIA',
    flightTime: '2h 36m',
    priceUsd: 'US$36,500',
    href: 'https://perejets.com/new-york-miami/?ref=WEBS5K'
  })
]);

// The official PrivateJetFinder embed runs in an opaque sandbox, outside the app origin.
// Keep the provider's attribution anchor intact; its loader requires it.
export const PRIVATE_JET_WIDGET_DOCUMENT = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PrivateJetFinder flight search</title>
<style>html,body{margin:0;padding:0;background:#fff;color:#151515;font-family:Arial,sans-serif}body{padding:16px;box-sizing:border-box}*,*:before,*:after{box-sizing:border-box}</style>
<script type="text/javascript" src="${PRIVATE_JETS.script}"></script></head><body>
<div class="_pjf" data-usercode="${PRIVATE_JETS.trackerCode}" data-lang="en" data-skin="BG">
    <a href="${PRIVATE_JETS.href}" style="display:block;text-align:right;">
        <img src="https://www.privatejetfinder.com/skins/partners/img/pjf.png" alt="Privatejetfinder.com" width="100" height="20" border="0" />
    </a>
</div></body></html>`;
