import {randomUUID} from 'node:crypto';
import {requireOwner} from '../../../lib/owner';
import {github,decodeFile} from '../../../lib/github';
import {projectList,readProject,applyProject,previewProject,newProject,addProjectLink} from '../../../lib/projects.mjs';
export async function GET(request){const a=await requireOwner(request);if(a.error)return a.error;try{
 const index=await github(a.token,'/contents/index.html?ref=main'),projects=projectList(decodeFile(index)),path=new URL(request.url).searchParams.get('path');
 if(!path)return Response.json({projects},{headers:{'Cache-Control':'no-store'}});
 if(!projects.some(p=>p.path===path))throw Error('편집 가능한 프로젝트를 선택해 주세요.');
 const f=await github(a.token,`/contents/${path}?ref=main`);return Response.json({path,sha:f.sha,project:readProject(decodeFile(f))},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e.message},{status:400})}}
export async function POST(request){const a=await requireOwner(request,true);if(a.error)return a.error;try{
 if(Number(request.headers.get('content-length')||0)>4*1024*1024)throw Error('전체 이미지 크기는 3MB 이하여야 합니다.');
 const form=await request.formData(),data=JSON.parse(form.get('project')),files=form.getAll('files');
 if(files.length>40||files.reduce((s,f)=>s+f.size,0)>3*1024*1024||files.some(f=>!f.size||!/^image\/(jpeg|png|gif|webp|avif)$/.test(f.type)))throw Error('JPG·PNG·GIF·WebP·AVIF 이미지를 전체 3MB, 최대 40개까지 올릴 수 있습니다.');
 const head=(await github(a.token,'/git/ref/heads/main')).object.sha,base=await github(a.token,`/git/commits/${head}`),index=await github(a.token,`/contents/index.html?ref=${head}`),indexHTML=decodeFile(index),list=projectList(indexHTML);
 let html,old;if(data.create){if(list.some(p=>p.path===data.path))throw Error('이미 사용 중인 프로젝트 주소입니다.');const root=await github(a.token,`/git/trees/${base.tree.sha}`);if(root.tree.some(f=>f.path===data.path))throw Error('이미 사용 중인 파일 주소입니다.');html=newProject(indexHTML,data);data.project=readProject(html)}
 else{if(!list.some(p=>p.path===data.path))throw Error('프로젝트를 선택해 주세요.');old=await github(a.token,`/contents/${data.path}?ref=${head}`);if(old.sha!==data.sha)return Response.json({error:'다른 곳에서 수정된 페이지입니다. 최신 내용을 다시 불러와 주세요.'},{status:409});html=decodeFile(old)}
 if(data.preview){if(files.length)throw Error('새 이미지 파일은 저장 후 실제 페이지에서 확인할 수 있습니다.');return Response.json({html:previewProject(data.create?html:applyProject(html,data.project),data.language||'en')})}
 const entries=[];for(let i=0;i<files.length;i++){const f=files[i],extension={ 'image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/webp':'webp','image/avif':'avif'}[f.type],path=`assets/projects/${data.path.replace('.html','')}/${randomUUID()}.${extension}`,blob=await github(a.token,'/git/blobs','POST',{content:Buffer.from(await f.arrayBuffer()).toString('base64'),encoding:'base64'});entries.push({path,mode:'100644',type:'blob',sha:blob.sha});const media=data.project.media.find(m=>m.src===`upload:${i}`);if(!media)throw Error('첨부 이미지 연결을 확인해 주세요.');media.src=path}
 html=data.create?html:applyProject(html,data.project);
 if(data.create){const root=await github(a.token,`/git/trees/${base.tree.sha}`);for(const f of root.tree.filter(f=>f.path.endsWith('.html'))){const current=f.path==='index.html'?index:await github(a.token,`/contents/${f.path}?ref=${head}`);entries.push({path:f.path,mode:'100644',type:'blob',content:addProjectLink(decodeFile(current),data)})}html=addProjectLink(html,data)}
 entries.push({path:data.path,mode:'100644',type:'blob',content:html});
 const tree=await github(a.token,'/git/trees','POST',{base_tree:base.tree.sha,tree:entries}),commit=await github(a.token,'/git/commits','POST',{message:`${data.create?'Add':'Update'} portfolio project: ${data.path}`,tree:tree.sha,parents:[head]});
 if((await github(a.token,'/git/ref/heads/main')).object.sha!==head)return Response.json({error:'동시에 다른 수정이 있었습니다. 내용을 보관하고 다시 저장해 주세요.'},{status:409});
 await github(a.token,'/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});const file=await github(a.token,`/contents/${data.path}?ref=${commit.sha}`);return Response.json({sha:file.sha,path:data.path,project:readProject(html),url:`https://goya-jin.github.io/portfolio/${data.path}?v=${commit.sha.slice(0,12)}`});
 }catch(e){return Response.json({error:e.message},{status:400})}}
