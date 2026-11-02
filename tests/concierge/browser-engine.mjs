// QA-only engine selection. Never silently substitute Chromium for WebKit.
import assert from 'node:assert/strict';
import {chromium,webkit} from '@playwright/test';

export async function launchConciergeBrowser(){
 const engine=process.env.CONCIERGE_BROWSER_ENGINE||'chromium';
 assert.ok(['chromium','webkit'].includes(engine),'Use chromium or webkit');
 const executablePath=process.env.I18N_BROWSER_EXECUTABLE;
 assert.ok(!executablePath||engine==='chromium','Custom Chromium executable cannot verify WebKit');
 return ({chromium,webkit})[engine].launch({headless:true,...(executablePath?{executablePath}:{})});
}
