import { tripRoomHandlers } from '../../../../lib/server/tripRoomHandlers.mjs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  return tripRoomHandlers(process.env).overview(request);
}
