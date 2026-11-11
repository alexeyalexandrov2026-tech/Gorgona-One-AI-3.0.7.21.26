import {headoutPreviewHandler} from '../../../../../lib/server/headoutPreview.mjs';
export const dynamic='force-dynamic';
export async function GET(request){return headoutPreviewHandler(process.env)(request);}
