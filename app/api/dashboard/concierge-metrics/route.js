import { database, failure, json, RequestError } from '../../../../lib/server/dashboardCore.mjs';
import { getConciergeMetricsSnapshot } from '../../../../lib/server/conciergeTelemetry.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const db = database(process.env);
    const actor = await db.identity(request);
    if (actor.role !== 'admin') throw new RequestError(403, 'Access denied');

    let openReportsCount = null;
    let persisted7d = null;
    let funnel7d = null;
    let investorRoi30d = null;
    try {
      const [rows, summary, funnel, roi] = await Promise.all([
        db.call(
          '/rest/v1/app_support_requests?select=id&kind=eq.ai_report&resolved_at=is.null&limit=200',
          { service: true }
        ).catch(() => null),
        db.rpc('elio_metrics_summary_7d', {}).catch(() => null),
        db.rpc('funnel_metrics_summary_7d', {}).catch(() => null),
        db.rpc('elio_investor_roi_30d', {}).catch(() => null)
      ]);
      if (Array.isArray(rows)) openReportsCount = rows.length;
      if (summary && typeof summary === 'object') persisted7d = summary;
      if (funnel && typeof funnel === 'object') funnel7d = funnel;
      if (roi && typeof roi === 'object') investorRoi30d = roi;
    } catch {
      openReportsCount = null;
    }

    return json({
      metrics: getConciergeMetricsSnapshot(),
      openReportsCount,
      ...(persisted7d ? { persisted7d } : {}),
      ...(funnel7d ? { funnel7d } : {}),
      ...(investorRoi30d ? { investorRoi30d } : {})
    });
  } catch (error) {
    return failure(error);
  }
}
