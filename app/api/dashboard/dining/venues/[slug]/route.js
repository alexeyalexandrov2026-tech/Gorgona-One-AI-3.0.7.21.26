import {diningEditorHandlers} from '../../../../../../lib/server/diningEditorHandlers.mjs';
export const dynamic='force-dynamic';
export async function GET(request,{params}){return diningEditorHandlers(process.env).read(request,(await params).slug);}
export async function POST(request,{params}){return diningEditorHandlers(process.env).command(request,(await params).slug);}
