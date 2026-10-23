import { notificationJob } from '../../../../lib/server/notificationDelivery.mjs';
export const dynamic = 'force-dynamic';
export async function POST(request) { return notificationJob(request,process.env); }
