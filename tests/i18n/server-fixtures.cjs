// Read-only local QA data. Never loaded by the application or deployment.
// Only the deliberately unconfigured Supabase placeholder is intercepted.
const originalFetch = globalThis.fetch;
globalThis.fetch = async function(input, init) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  const method = (init?.method || input?.method || 'GET').toUpperCase();
  if (url.hostname === 'placeholder.supabase.co' && url.pathname === '/rest/v1/sportsbooks' && method === 'GET') {
    const row = {id:'i18n-fixture-sportsbook',slug:'hard-rock-bet',name:'Hard Rock Bet',website:'https://www.hardrock.bet/',description:'Read-only local QA fixture.',status:'active',promo_code:null,bonus_offer:null};
    const headers = new Headers(init?.headers || input?.headers);
    const data = headers.get('accept')?.includes('application/vnd.pgrst.object+json') ? row : [row];
    return new Response(JSON.stringify(data), {status:200,headers:{'content-type':'application/json','content-range':'0-0/1'}});
  }
  return originalFetch.call(this,input,init);
};
