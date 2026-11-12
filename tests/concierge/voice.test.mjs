import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SUPPORTED_LANGUAGES} from '../../lib/languages.js';
import {voiceInputUnavailable} from '../../lib/ai/voiceInputCopy.mjs';
test('voice failure guidance exists in every supported language',()=>{for(const {code}of SUPPORTED_LANGUAGES){assert.ok(voiceInputUnavailable(code).trim());if(code!=='en')assert.notEqual(voiceInputUnavailable(code),voiceInputUnavailable('en'));}assert.equal(voiceInputUnavailable('unknown'),voiceInputUnavailable('en'));});
