import { dashboardHandlers } from '../../../lib/server/dashboardHandlers.mjs';
export const dynamic = 'force-dynamic';
// Compatibility endpoint: persisted listing/profile triggers own notifications.
export async function POST(request) {
  return dashboardHandlers(process.env).legacyNotify(request);
}
