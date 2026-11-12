import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRIVATE_JETS_COPY,getPrivateJetsCopy} from '../../lib/privateJetsCopy.mjs';
import {getTranslation} from '../../lib/i18n.js';
import {SUPPORTED_LANGUAGES} from '../../lib/languages.js';
const read=file=>readFileSync(new URL('../../'+file,import.meta.url),'utf8');

test('every site language has Private Jets interface text and a navigation label',()=>{
 assert.deepEqual(new Set(Object.keys(PRIVATE_JETS_COPY)),new Set(SUPPORTED_LANGUAGES.map(item=>item.code)));
 for(const [locale,copy] of Object.entries(PRIVATE_JETS_COPY)){
  assert.deepEqual(Object.keys(copy),Object.keys(PRIVATE_JETS_COPY.en));
  assert.ok(Object.values(copy).every(value=>value.trim()));
  assert.equal(getTranslation(locale).nav.privateJets,copy.nav);
 }
 assert.equal(getPrivateJetsCopy('unknown'),PRIVATE_JETS_COPY.en);
});

test('Private Jets replaces Discovery in navigation and the home directory',()=>{
 for(const file of ['app/components/Header.jsx','app/page.js']){
  const source=read(file);
  assert.match(source,/href: '\/private-jets'/);
  assert.doesNotMatch(source,/href: '\/discovery'/);
 }
 assert.match(read('app/sitemap.js'),/'\/private-jets'/);
});

test('the official partner widget is isolated and an attributed fallback is always available',()=>{
 const component=read('app/private-jets/PrivateJetsContent.jsx');
 assert.match(component,/srcDoc=/);
 assert.match(component,/sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"/);
 assert.doesNotMatch(component,/allow-same-origin|dangerouslySetInnerHTML/);
 assert.match(component,/rel="sponsored noopener noreferrer"/);
 const integration=read('lib/privateJets.mjs');
 assert.match(integration,/716179668192/);
 assert.match(integration,/https:\/\/www\.privatejetfinder\.com\/js\/partner\.min\.js/);
 assert.match(read('app/private-jets/page.js'),/canonical/);
});
