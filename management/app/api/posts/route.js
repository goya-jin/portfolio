import {randomUUID} from 'node:crypto';
import {requireOwner} from '../../../lib/owner';
import {github,decodeFile} from '../../../lib/github';
import {validatePost,parsePost,serializePost,ext} from '../../../lib/posts.mjs';
export async function GET(request){const access=await requireOwner(request);if(access.error)return access.error;try{const slug=new URL(request.url).searchParams.get('slug');if(slug){if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw Error('글 주소를 확인해 주세요.');const f=await github(access.token,`/contents/content/posts/${slug}.md?ref=main`);return Response.json({sha:f.sha,slug,...parsePost(decodeFile(f))},{headers:{'Cache-Control':'no-store'}})}const fs=await github(access.token,'/contents/content/posts?ref=main');return Response.json({posts:fs.filter(f=>f.name.endsWith('.md')).map(f=>({slug:f.name.slice(0,-3)}))},{headers:{'Cache-Control':'no-store'}})}catch(e){return Response.json({error:e.message},{status:400})}}
export async function POST(request){const access=await requireOwner(request,true);if(access.error)return access.error;try{
 if(Number(request.headers.get('content-length')||0)>4*1024*1024)return Response.json({error:'전체 첨부파일 크기는 3MB 이하여야 합니다.'},{status:413});
 const form=await request.formData(),p=JSON.parse(form.get('post')),files=form.getAll('files');validatePost(p,files);
 const editing=Boolean(p.slug);p.slug=p.slug||`${p.date}-${randomUUID().replaceAll('-','').slice(0,12)}`;if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug))throw Error('글 주소를 확인해 주세요.');
 const head=(await github(access.token,'/git/ref/heads/main')).object.sha,base=await github(access.token,`/git/commits/${head}`),tree=await github(access.token,`/git/trees/${base.tree.sha}?recursive=1`);if(tree.truncated)throw Error('저장소 파일을 전부 확인하지 못했습니다.');
 const path=`content/posts/${p.slug}.md`,old=tree.tree.find(x=>x.path===path);if(editing?old?.sha!==p.sha:Boolean(old))return Response.json({error:'이 글이 다른 곳에서 변경되었습니다. 최신 글을 다시 불러와 주세요.'},{status:409});
 const entries=[],uploads=[];for(let i=0;i<files.length;i++){const f=files[i],id=randomUUID().replaceAll('-','');const blob=await github(access.token,'/git/blobs','POST',{content:Buffer.from(await f.arrayBuffer()).toString('base64'),encoding:'base64'});entries.push({path:`assets/writing/${p.slug}/${id}.${ext(f.name)}`,mode:'100644',type:'blob',sha:blob.sha});uploads.push({name:f.name,id,marker:`[첨부 ${i+1}]`})}
 const content=serializePost(p,uploads),blob=await github(access.token,'/git/blobs','POST',{content,encoding:'utf-8'});entries.push({path,mode:'100644',type:'blob',sha:blob.sha});
 const updated=await github(access.token,'/git/trees','POST',{base_tree:base.tree.sha,tree:entries}),commit=await github(access.token,'/git/commits','POST',{message:`${editing?'Update':'Publish'} writing: ${p.title.trim()}`,tree:updated.sha,parents:[head]});
 if((await github(access.token,'/git/ref/heads/main')).object.sha!==head)return Response.json({error:'동시에 다른 수정이 있었습니다. 내용을 보관한 뒤 다시 게시해 주세요.'},{status:409});
 await github(access.token,'/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});return Response.json({slug:p.slug,sha:blob.sha,body:parsePost(content).body,url:`https://goya-jin.github.io/portfolio/writing/${p.slug}/index.html?v=${commit.sha.slice(0,12)}`});
 }catch(e){return Response.json({error:e.message},{status:400})}}
