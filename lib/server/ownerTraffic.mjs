import { database, failure, json, RequestError } from './dashboardCore.mjs';
import { configuredChannels, requireNotificationToken } from './notificationDelivery.mjs';
import { validTrafficCounts } from './ownerNotificationText.mjs';

const hourMs = 60 * 60 * 1000;
const query = `query OwnerHourlyTraffic($account:String!,$site:String!,$from:Time!,$to:Time!) {
  viewer {
    accounts(filter:{accountTag:$account}) {
      traffic:rumPageloadEventsAdaptiveGroups(limit:1,filter:{
        siteTag:$site, datetime_geq:$from, datetime_lt:$to, bot:0
      }) { count sum { visits } }
    }
  }
}`;

export async function readTraffic(env, from, to, fetcher) {
  const response = await fetcher('https://api.cloudflare.com/client/v4/graphql',{
    method:'POST', redirect:'manual', signal:AbortSignal.timeout(8000),
    headers:{ Authorization:`Bearer ${env.CLOUDFLARE_WEB_ANALYTICS_API_TOKEN}`, 'Content-Type':'application/json' },
    body:JSON.stringify({ query, variables:{
      account:env.CLOUDFLARE_WEB_ANALYTICS_ACCOUNT_ID,
      site:env.CLOUDFLARE_WEB_ANALYTICS_SITE_ID, from, to
    } })
  });
  const body = await response.json().catch(()=>null);
  const accounts = body?.data?.viewer?.accounts;
  const rows = accounts?.[0]?.traffic;
  if (!response.ok || (body?.errors != null && (!Array.isArray(body.errors) || body.errors.length))
    || !Array.isArray(accounts) || accounts.length !== 1 || !Array.isArray(rows) || rows.length > 1) {
    throw new RequestError(502,'Cloudflare Web Analytics unavailable');
  }
  if (!rows.length) return { visits:0, pageviews:0 };
  const visits = rows[0]?.sum?.visits;
  const pageviews = rows[0]?.count;
  if (!validTrafficCounts(visits,pageviews)) throw new RequestError(502,'Invalid Cloudflare traffic aggregate');
  return { visits,pageviews };
}

export async function ownerTrafficJob(request, env, fetcher = fetch, now = Date.now()) {
  try {
    await requireNotificationToken(request,env);
    if (!configuredChannels(env).includes('telegram') || !env.CLOUDFLARE_WEB_ANALYTICS_API_TOKEN
      || !/^[a-f\d]{32}$/i.test(env.CLOUDFLARE_WEB_ANALYTICS_ACCOUNT_ID || '')
      || !/^[a-f\d]{32}$/i.test(env.CLOUDFLARE_WEB_ANALYTICS_SITE_ID || '')) return json({ status:'disabled' });
    const end = Math.floor(now / hourMs) * hourMs;
    if (now - end < 15 * 60 * 1000) return json({ status:'outside_window' });
    const from = new Date(end - hourMs).toISOString(), to = new Date(end).toISOString();
    const db = database(env,fetcher);
    const due = await db.rpc('dashboard_traffic_hour_due',{ p_hour:from });
    if (due !== true) return json({ status:'not_due' });
    const { visits,pageviews } = await readTraffic(env,from,to,fetcher);
    const recorded = await db.rpc('dashboard_record_traffic_hour',{ p_hour:from,p_visits:visits,p_pageviews:pageviews });
    return json({ status:recorded ? 'recorded' : 'not_due' });
  } catch (error) { return failure(error); }
}
