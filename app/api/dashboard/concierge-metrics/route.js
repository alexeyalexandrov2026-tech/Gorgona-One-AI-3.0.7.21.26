import { database, failure, json, RequestError } from '../../../../lib/server/dashboardCore.mjs';
import { getConciergeMetricsSnapshot } from '../../../../lib/server/conciergeTelemetry.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const db = database(process.env);
    const actor = await db.identity(request);
    if (actor.role !== 'admin') throw new RequestError(403, 'Access denied');

    let openReportsCount = null;
    try {
      const rows = await db.call(
        '/rest/v1/app_support_requests?select=id&kind=eq.ai_report&status=eq.open&limit=200',
        { service: true }
      );
      if (Array.isArray(rows)) openReportsCount = rows.length;
    } catch {
      openReportsCount = null;
    }

    return json({
      metrics: getConciergeMetricsSnapshot(),
      openReportsCount
    });
  } catch (error) {
    return failure(error);
  }
}
