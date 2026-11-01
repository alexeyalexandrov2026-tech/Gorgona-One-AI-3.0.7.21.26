import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HEADOUT_COPY} from '../../lib/headoutCopy.mjs';
import {getViatorCopy} from '../../lib/viatorCatalogue.mjs';
import {PRIVATE_JETS_COPY} from '../../lib/privateJetsCopy.mjs';
import {translations} from '../../lib/i18n.js';
import {LOCALES,readLocale} from '../../scripts/i18n/catalogue.mjs';

const commission=/commission|комисс|комісі|comisi|comiss|provis|prowiz|עמל|佣金|紹介料|手数料|報酬|수수료|عمول|komisyon|کمیسیون/iu;

test('all sixteen languages omit platform commission claims from partner notices',()=>{
 for(const locale of LOCALES){
  const saved=readLocale(locale);
  const notices={headout:HEADOUT_COPY[locale].disclosure,viator:getViatorCopy(locale).disclosure,jets:PRIVATE_JETS_COPY[locale].disclosure,yachts:saved['yatr.disclosure'],stays:saved['stay22.disclosure'],legalTitle:translations[locale].legal.disclosureTitle,legalBody:translations[locale].legal.disclosureBody};
  for(const [name,text] of Object.entries(notices)){
   assert.ok(text?.trim(),locale+'/'+name+' is empty');
   assert.doesNotMatch(text,commission,locale+'/'+name+' still contains a commission claim');
  }
  assert.match(notices.headout,/Headout/);
  assert.match(notices.viator,/Viator/);
  assert.match(notices.jets,/PrivateJetFinder/);
  assert.match(notices.yachts,/YATR/);
  for(const key of ['ui.9b864ba64f10a3b4','ui.7ab18ba3fd0d9837','ui.682579866a580ded']){
   assert.ok(saved[key]?.trim(),locale+'/'+key+' is missing');
   assert.doesNotMatch(saved[key],commission,locale+'/'+key+' retains old translated copy');
   if(key!=='ui.682579866a580ded')assert.match(saved[key],/TicketNetwork/);
  }
 }
});
