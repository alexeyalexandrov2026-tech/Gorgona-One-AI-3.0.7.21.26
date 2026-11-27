import { pushRegisterHandlers } from '../../../../lib/server/pushRegisterHandler.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  return pushRegisterHandlers(process.env).register(request);
}

export async function DELETE(request) {
  return pushRegisterHandlers(process.env).unregister(request);
}
