import { emailPlanHandlers } from '../../../../lib/server/emailPlanHandler.mjs';
export const dynamic = 'force-dynamic';
export async function POST(request) {
  return emailPlanHandlers(process.env).send(request);
}
