export const trafficCron = '15,25,35,45,55 * * * *';

export default {
  async scheduled(controller, env, context) {
    context.waitUntil((async () => {
      if (!env.NOTIFICATIONS_JOB_URL || !env.DASHBOARD_OUTBOX_TOKEN) throw new Error('Notification job is not configured');
      const url=new URL(env.NOTIFICATIONS_JOB_URL);
      if(url.protocol!=='https:')throw new Error('HTTPS is required');
      const traffic = controller.cron === trafficCron;
      if (traffic) url.pathname = url.pathname.replace(/\/$/,'') + '/traffic';
      const response=await fetch(url,{method:'POST', redirect:'manual',
        headers:{Authorization:'Bearer '+env.DASHBOARD_OUTBOX_TOKEN},
        signal:AbortSignal.timeout(traffic ? 20000 : 55000)});
      if(!response.ok)throw new Error('Notification job failed: '+response.status);
    })());
  },
  fetch() { return new Response('Not found',{status:404}); }
};
