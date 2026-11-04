import {randomUUID} from 'node:crypto';
import {requireOwner} from '../../../lib/owner';
import {github} from '../../../lib/github';
import {ext,image,validatePost} from '../../../lib/posts.mjs';
export async function POST(request){const a=await requireOwner(request,true);if(a.error)return a.error;try{
 if(Number(request.headers.get('content-length')||0)>4*1024*1024)return Response.json({error:'사진은 한 번에 합계 3MB까지 올릴 수 있습니다.'},{status:413});
 const files=(await request.formData()).getAll('files');validatePost({title:'사진 업로드',date:'2026-01-01',body:''},files);if(!files.length||files.some(f=>!image(f.name)))throw Error('JPG, PNG, WebP, GIF, AVIF 사진을 선택해 주세요.');
 const head=(await github(a.token,'/git/ref/heads/main')).object.sha,base=await github(a.token,`/git/commits/${head}`),entries=[],items=[];
 for(const f of files){const path=`assets/writing/uploads/${randomUUID().replaceAll('-','')}.${ext(f.name)}`,blob=await github(a.token,'/git/blobs','POST',{content:Buffer.from(await f.arrayBuffer()).toString('base64'),encoding:'base64'});entries.push({path,mode:'100644',type:'blob',sha:blob.sha});items.push({name:f.name,src:`https://goya-jin.github.io/portfolio/${path}`})}
 const tree=await github(a.token,'/git/trees','POST',{base_tree:base.tree.sha,tree:entries}),commit=await github(a.token,'/git/commits','POST',{message:'Upload editor images',tree:tree.sha,parents:[head]});
 if((await github(a.token,'/git/ref/heads/main')).object.sha!==head)return Response.json({error:'다른 저장과 겹쳤습니다. 사진을 다시 선택해 주세요.'},{status:409});
 await github(a.token,'/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});return Response.json({items});
 }catch(e){return Response.json({error:e.message},{status:400})}}
