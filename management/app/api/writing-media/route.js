import {randomUUID} from 'node:crypto';
import {requireOwner} from '../../../lib/owner';
import {github,decodeFile} from '../../../lib/github';
import {mediaCatalog,appendMedia} from '../../../lib/media-catalog.mjs';
import {ext,image,validatePost} from '../../../lib/posts.mjs';
async function catalog(token,tree){const file=tree.find(f=>f.path==='content/editor-media.json');let existing=[];if(file){const blob=await github(token,`/git/blobs/${file.sha}`);existing=JSON.parse(decodeFile(blob));if(!Array.isArray(existing))throw Error('첨부 사진 목록을 확인해 주세요.')}return mediaCatalog(tree,existing)}
export async function GET(request){const a=await requireOwner(request);if(a.error)return a.error;try{const tree=await github(a.token,'/git/trees/main?recursive=1');if(tree.truncated)throw Error('첨부 사진을 전부 확인하지 못했습니다.');return Response.json({items:await catalog(a.token,tree.tree)},{headers:{'Cache-Control':'no-store'}})}catch(e){return Response.json({error:e.message},{status:400})}}
export async function POST(request){const a=await requireOwner(request,true);if(a.error)return a.error;try{
 if(Number(request.headers.get('content-length')||0)>4*1024*1024)return Response.json({error:'사진은 한 번에 합계 3MB까지 올릴 수 있습니다.'},{status:413});
 const files=(await request.formData()).getAll('files');validatePost({title:'사진 업로드',date:'2026-01-01',body:''},files);if(!files.length||files.some(f=>!image(f.name)))throw Error('JPG, PNG, WebP, GIF, AVIF 사진을 선택해 주세요.');
 const head=(await github(a.token,'/git/ref/heads/main')).object.sha,base=await github(a.token,`/git/commits/${head}`),entries=[],items=[];
 const snapshot=await github(a.token,`/git/trees/${base.tree.sha}?recursive=1`);if(snapshot.truncated)throw Error('첨부 사진을 전부 확인하지 못했습니다.');const previous=await catalog(a.token,snapshot.tree);
 for(const f of files){const path=`assets/writing/uploads/${randomUUID().replaceAll('-','')}.${ext(f.name)}`,blob=await github(a.token,'/git/blobs','POST',{content:Buffer.from(await f.arrayBuffer()).toString('base64'),encoding:'base64'});entries.push({path,mode:'100644',type:'blob',sha:blob.sha});items.push({name:f.name,src:`https://goya-jin.github.io/portfolio/${path}`})}
 const all=appendMedia(previous,items),added=all.slice(previous.length);entries.push({path:'content/editor-media.json',mode:'100644',type:'blob',content:JSON.stringify(all,null,2)+'\n'});
 const tree=await github(a.token,'/git/trees','POST',{base_tree:base.tree.sha,tree:entries}),commit=await github(a.token,'/git/commits','POST',{message:'Upload editor images',tree:tree.sha,parents:[head]});
 if((await github(a.token,'/git/ref/heads/main')).object.sha!==head)return Response.json({error:'다른 저장과 겹쳤습니다. 사진을 다시 선택해 주세요.'},{status:409});
 await github(a.token,'/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});return Response.json({items:added});
 }catch(e){return Response.json({error:e.message},{status:400})}}
