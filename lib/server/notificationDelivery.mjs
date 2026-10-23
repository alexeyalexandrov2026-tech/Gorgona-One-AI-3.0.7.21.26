import { database, digest, json, failure, RequestError } from './dashboardCore.mjs';

export function configuredChannels(env) {
  return ['telegram','email'].filter(channel => channel === 'telegram'
    ? env.TELEGRAM_BOT_TOKEN && /^-?\d+$/.test(env.TELEGRAM_OWNER_CHAT_ID || '')
    : env.RESEND_API_KEY && env.ADMIN_EMAIL && env.NOTIFICATIONS_FROM_EMAIL);
}

export async function dispatchNotifications(env, fetcher = fetch, pause = ms => new Promise(resolve => setTimeout(resolve,ms))) {
  const channels = configuredChannels(env);
  if (!channels.length) return { claimed:0, sent:0, configured:[] };
  const db = database(env,fetcher), deliveries = await db.call('/rest/v1/rpc/dashboard_claim', { service:true, method:'POST', body:{ p_channels:channels, p_limit:5 } });
  let sent = 0, telegramAt = 0;
  for (const delivery of deliveries) {
    let ok = false, provider = null, errorCode = 'provider_unavailable', delay = Math.min(3600,30 * 2 ** delivery.attempts);
    try {
      const text = ['Miami Elio',delivery.event_type,delivery.title || '',delivery.booking_id ? 'Заявка: ' + delivery.booking_id : '',
        'Открыть кабинет: https://gorgona-one.com/admin'].filter(Boolean).join('\n').slice(0,3500);
      let url, body, headers = { 'Content-Type':'application/json' };
      if (delivery.channel === 'telegram') {
        if (telegramAt) await pause(Math.max(0,1100-(Date.now()-telegramAt)));
        telegramAt = Date.now();
        url = 'https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage';
        body = { chat_id:env.TELEGRAM_OWNER_CHAT_ID, text, allow_paid_broadcast:false, link_preview_options:{ is_disabled:true } };
      } else {
        const reserved = await db.rpc('dashboard_reserve_email',{});
        if (!reserved) { errorCode='quota'; delay=3600; throw new Error('quota'); }
        url = 'https://api.resend.com/emails';
        headers = { ...headers, Authorization:'Bearer ' + env.RESEND_API_KEY, 'Idempotency-Key':'owner-event/' + delivery.event_id };
        body = { from:env.NOTIFICATIONS_FROM_EMAIL, to:env.ADMIN_EMAIL, subject:'Miami Elio — ' + delivery.event_type, text };
      }
      const response = await fetcher(url,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
      const result = await response.json().catch(()=>({}));
      ok = response.ok && (delivery.channel === 'telegram' ? result.ok === true && Number.isInteger(result.result?.message_id) : typeof result.id === 'string');
      if (ok) provider = String(delivery.channel === 'telegram' ? result.result.message_id : result.id);
      else {
        errorCode = response.status === 429 ? 'rate_limit' : [400,401,403].includes(response.status) ? 'configuration' : 'provider_unavailable';
        const retry = Number(result.parameters?.retry_after || response.headers.get('retry-after'));
        if (Number.isFinite(retry) && retry>0) delay=Math.min(86400,Math.ceil(retry));
      }
    } catch { /* Failure state is stored below without logging tokens or payloads. */ }
    const settled = await db.rpc('dashboard_settle',{p_id:delivery.id,p_lease:delivery.lease_id,p_ok:ok,p_provider:provider,p_error:ok?null:errorCode,p_delay:delay});
    if (settled && ok) sent++;
  }
  return { claimed:deliveries.length, sent, configured:channels };
}

export async function notificationJob(request, env, fetcher = fetch) {
  try {
    const secret = env.DASHBOARD_OUTBOX_TOKEN;
    if (!secret || secret.length<32) throw new RequestError(503,'Service unavailable');
    const actual = request.headers.get('authorization') || '';
    const received=await digest(actual),expected=await digest('Bearer '+secret);
    let difference=0;for(let i=0;i<expected.length;i++)difference|=received.charCodeAt(i)^expected.charCodeAt(i);
    if (difference) throw new RequestError(401,'Access denied');
    return json(await dispatchNotifications(env,fetcher));
  } catch (error) { return failure(error); }
}
