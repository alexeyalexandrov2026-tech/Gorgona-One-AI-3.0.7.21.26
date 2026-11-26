import { mcpHandlers } from '../../../lib/server/mcpServer.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return mcpHandlers(process.env).options();
}

export async function GET() {
  return mcpHandlers(process.env).discovery();
}

export async function POST(request) {
  return mcpHandlers(process.env).post(request);
}
