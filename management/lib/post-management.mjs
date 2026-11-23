import {parsePost} from './posts.mjs';

function fail(message,status=400){throw Object.assign(new Error(message),{status})}

// Mutate the saved source, never the browser's possibly unsaved editor content.
export async function managePost(api,input,action){
  const {slug,sha,draft}=input||{};
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug||'')||! /^[a-f0-9]{40}$/.test(sha||''))fail('글을 다시 불러온 뒤 시도해 주세요.');
  if(!['visibility','delete'].includes(action)||(action==='visibility'&&typeof draft!=='boolean'))fail('공개 상태를 확인해 주세요.');
  const head=(await api('/git/ref/heads/main')).object.sha;
  const base=await api(`/git/commits/${head}`);
  const tree=await api(`/git/trees/${base.tree.sha}?recursive=1`);
  if(tree.truncated)fail('저장소 파일을 전부 확인하지 못했습니다.');
  const path=`content/posts/${slug}.md`,old=tree.tree.find(f=>f.path===path&&f.type==='blob');
  if(old?.sha!==sha)fail('이 글이 다른 곳에서 변경되거나 삭제되었습니다. 최신 글을 다시 불러와 주세요.',409);
  let entry={path,mode:'100644',type:'blob',sha:null},title=slug;
  if(action==='visibility'){
    const blob=await api(`/git/blobs/${sha}`),text=Buffer.from(blob.content,'base64').toString('utf8');
    const post=parsePost(text);title=post.title||slug;
    if(Boolean(post.draft)===draft)return {slug,sha,draft,commit:head};
    const separator=text.indexOf('\n---\n'),meta=JSON.parse(text.slice(0,separator));
    const content=JSON.stringify({...meta,draft})+text.slice(separator);
    const saved=await api('/git/blobs','POST',{content,encoding:'utf-8'});
    entry={...entry,sha:saved.sha};
  }
  const updated=await api('/git/trees','POST',{base_tree:base.tree.sha,tree:[entry]});
  const commit=await api('/git/commits','POST',{message:`${action==='delete'?'Delete':draft?'Hide':'Unhide'} writing: ${title}`,tree:updated.sha,parents:[head]});
  if((await api('/git/ref/heads/main')).object.sha!==head)fail('동시에 다른 수정이 있었습니다. 최신 글을 다시 불러와 주세요.',409);
  await api('/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});
  return {slug,sha:entry.sha,draft:action==='visibility'?draft:undefined,deleted:action==='delete',commit:commit.sha};
}
