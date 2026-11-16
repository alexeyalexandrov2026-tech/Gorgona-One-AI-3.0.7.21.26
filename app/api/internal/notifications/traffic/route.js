import { ownerTrafficJob } from '../../../../../lib/server/ownerTraffic.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  return ownerTrafficJob(request,process.env);
}
