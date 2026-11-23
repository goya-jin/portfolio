import test from 'node:test';
import assert from 'node:assert/strict';
import {managePost} from '../lib/post-management.mjs';
import {parsePost,serializePost,validatePost} from '../lib/posts.mjs';

const sha='a'.repeat(40),head='b'.repeat(40),saved='c'.repeat(40);
function fixture({draft=false,stale=false,race=false}={}){
 const body='\n<p>본문 &amp; 사진</p>\n<figure><img src="../../assets/original.jpg"></figure>\n';
 const source=JSON.stringify({title:'테스트 글',date:'2026-11-24',draft,format:'html',extra:'keep'})+'\n---\n'+body;
 const calls=[];let reads=0;
 const api=async(path,method='GET',data)=>{
  calls.push({path,method,data});
  if(path==='/git/ref/heads/main')return {object:{sha:race&&reads++?saved:head}};
  if(path===`/git/commits/${head}`)return {tree:{sha:'tree'}};
  if(path==='/git/trees/tree?recursive=1')return {tree:[{path:'content/posts/example.md',sha:stale?saved:sha,type:'blob'},{path:'assets/original.jpg',sha:'asset',type:'blob'}]};
  if(path===`/git/blobs/${sha}`)return {content:Buffer.from(source).toString('base64')};
  if(path==='/git/blobs')return {sha:saved};
  if(path==='/git/trees')return {sha:'updated'};
  if(path==='/git/commits')return {sha:'commit'};
  if(path==='/git/refs/heads/main')return {};
  throw Error('Unexpected '+path);
 };
 return {api,calls,source,body};
}
for(const draft of [true,false])test(`${draft?'hide':'unhide'} preserves body bytes and all other metadata`,async()=>{
 const f=fixture({draft:!draft});const result=await managePost(f.api,{slug:'example',sha,draft},'visibility');
 const content=f.calls.find(x=>x.path==='/git/blobs').data.content,p=parsePost(content);
 assert.equal(p.body,f.body);assert.equal(p.extra,'keep');assert.equal(p.draft,draft);assert.equal(result.sha,saved);
 assert.deepEqual(f.calls.find(x=>x.path==='/git/trees').data.tree,[{path:'content/posts/example.md',mode:'100644',type:'blob',sha:saved}]);
 assert.deepEqual(f.calls.at(-1).data,{sha:'commit',force:false});
});
test('delete removes only the selected markdown, leaving uploaded assets untouched',async()=>{
 const f=fixture();const result=await managePost(f.api,{slug:'example',sha},'delete');
 assert.equal(result.deleted,true);assert.deepEqual(f.calls.find(x=>x.path==='/git/trees').data.tree,[{path:'content/posts/example.md',mode:'100644',type:'blob',sha:null}]);
 assert.equal(f.calls.some(x=>x.path.startsWith('/git/blobs')),false);
});
for(const action of ['visibility','delete'])for(const problem of ['stale','race'])test(`${action} rejects ${problem} without moving main`,async()=>{
 const f=fixture({[problem]:true});await assert.rejects(managePost(f.api,{slug:'example',sha,draft:true},action),e=>e.status===409);
 assert.equal(f.calls.some(x=>x.path==='/git/refs/heads/main'),false);
});
test('invalid paths, missing revisions and nonboolean states never reach GitHub',async()=>{
 const f=fixture();for(const input of [{slug:'../x',sha,draft:true},{slug:'example',draft:true},{slug:'example',sha,draft:'false'}])await assert.rejects(managePost(f.api,input,'visibility'));
 assert.equal(f.calls.length,0);
});
test('repeating the existing visibility creates no commit',async()=>{
 const f=fixture({draft:true});assert.equal((await managePost(f.api,{slug:'example',sha,draft:true},'visibility')).sha,sha);
 assert.equal(f.calls.some(x=>x.method!=='GET'),false);
});
test('saving hidden HTML and Markdown keeps them hidden; public defaults remain public',()=>{
 for(const format of ['html','markdown']){
  const p={title:'글',date:'2026-11-24',body:'<p>본문</p>',format,draft:true};
  assert.equal(parsePost(serializePost(p,[])).draft,true);
  assert.equal(parsePost(serializePost({...p,draft:undefined},[])).draft,false);
  assert.throws(()=>validatePost({...p,draft:'false'},[]));
 }
});
