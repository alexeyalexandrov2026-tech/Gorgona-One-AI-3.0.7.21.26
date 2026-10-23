export default {
  async scheduled(_controller, env, context) {
    context.waitUntil((async () => {
      if (!env.NOTIFICATIONS_JOB_URL || !env.DASHBOARD_OUTBOX_TOKEN) throw new Error('Notification job is not configured');
      const url=new URL(env.NOTIFICATIONS_JOB_URL);
      if(url.protocol!=='https:')throw new Error('HTTPS is required');
      const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+env.DASHBOARD_OUTBOX_TOKEN},signal:AbortSignal.timeout(55000)});
      if(!response.ok)throw new Error('Notification job failed: '+response.status);
    })());
  },
  fetch() { return new Response('Not found',{status:404}); }
};
