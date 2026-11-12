// Supplied by the activated PrivateJetFinder partner dashboard, 2026-10-31.
export const PRIVATE_JETS = Object.freeze({
  trackerCode: '716179668192',
  href: 'https://www.privatejetfinder.com/?tk=716179668192',
  script: 'https://www.privatejetfinder.com/js/partner.min.js'
});

// The official embed runs in an opaque sandbox, outside the application origin.
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
