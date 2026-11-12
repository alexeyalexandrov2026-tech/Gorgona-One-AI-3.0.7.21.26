import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SUPPORTED_LANGUAGES} from '../../lib/languages.js';
import {HEADOUT_PREVIEW_COPY,getHeadoutPreviewCopy} from '../../lib/dining/headoutPreviewCopy.mjs';
test('Headout preview controls and test/handoff warnings cover all sixteen locales',()=>{
 const keys=Object.keys(HEADOUT_PREVIEW_COPY.en);
 for(const {code} of SUPPORTED_LANGUAGES){const copy=HEADOUT_PREVIEW_COPY[code];assert.ok(copy,code);assert.deepEqual(Object.keys(copy),keys,code);assert.ok(Object.values(copy).every(value=>typeof value==='string'&&value.trim()),code);assert.ok(copy.title.includes('Headout'),code);}
 assert.equal(getHeadoutPreviewCopy('unsupported'),HEADOUT_PREVIEW_COPY.en);
});
