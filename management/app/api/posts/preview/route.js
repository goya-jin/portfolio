import {requireOwner} from '../../../../lib/owner';
import {writingCanvasHTML,editorHTML} from '../../../../lib/rich-posts.mjs';
export async function POST(request){const a=await requireOwner(request,true);if(a.error)return a.error;try{const p=await request.json();if(typeof p.body!=='string'||p.body.length>100000)throw Error('본문이 너무 깁니다.');return Response.json({canvasHtml:writingCanvasHTML(p.body,p.format),html:editorHTML(p.body,p.format)})}catch(e){return Response.json({error:e.message},{status:400})}}
