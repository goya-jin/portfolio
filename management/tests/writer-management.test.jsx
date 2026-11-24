import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://goya-jin-management.vercel.app',pretendToBeVisual:true});
for(const key of ['window','document','Node','Element','HTMLElement','Text','DocumentFragment','DOMParser','MutationObserver','Event','MouseEvent','KeyboardEvent','getComputedStyle','localStorage'])Object.defineProperty(globalThis,key,{value:key==='getComputedStyle'?dom.window.getComputedStyle.bind(dom.window):dom.window[key],configurable:true,writable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
dom.window.Range.prototype.getBoundingClientRect=()=>({top:0,left:0,right:0,bottom:0,width:0,height:0});dom.window.Range.prototype.getClientRects=()=>[];dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
const React=await import('react');globalThis.React=React;
const {render,fireEvent,waitFor,act,cleanup}=await import('@testing-library/react');
const {default:RichEditor}=await import('../app/components/rich-editor.jsx');
const {default:Writer}=await import('../app/(owner)/write/writer.jsx');
const requireDraftModule=await import('../lib/writing-draft.mjs');
test.afterEach(()=>{cleanup();localStorage.clear()});
function setup({draft=false,error=false}={}){
 localStorage.clear();const requests=[],questions=[];let confirmed=true,post={slug:'example',title:'저장된 제목',date:'2026-11-24',body:'<p>원래 본문</p>',editorHtml:'<p>원래 본문</p>',format:'html',draft,sha:'a'.repeat(40)};
 globalThis.confirm=q=>{questions.push(q);return confirmed};
 globalThis.fetch=async(url,options={})=>{
  const method=options.method||'GET';requests.push({url,...options});
  const response=(data,ok=true)=>({ok,json:async()=>data});
  if(url==='/api/writing-settings')return response({settings:{fontSize:11,lineHeight:1.4,paragraphGap:1.2},sha:'settings'});
  if(url==='/api/posts?slug=example')return response({...post});
  if(method==='GET')return response({posts:[{slug:post.slug,title:post.title,draft:post.draft}]});
  if(error)return response({error:'다른 곳에서 변경되었습니다.'},false);
  if(method==='PATCH'){post={...post,...JSON.parse(options.body),sha:'b'.repeat(40)};return response({...post,url:post.draft?null:'https://example.com/post'})}
  if(method==='DELETE')return response({deleted:true,slug:post.slug});
  if(method==='POST'){post={...JSON.parse(options.body.get('post')),sha:'c'.repeat(40)};return response({...post,editorHtml:post.body,url:'https://example.com/post'})}
  throw Error('Unexpected request');
 };
 return {requests,questions,setConfirmed:v=>confirmed=v};
}
async function open(screen){
 await waitFor(()=>assert.ok(screen.getByRole('option',{name:/저장된 제목/})));
 fireEvent.change(screen.getByLabelText('기존 글'),{target:{value:'example'}});
 fireEvent.click(screen.getByRole('button',{name:'불러오기'}));
 await waitFor(()=>assert.equal(screen.getByLabelText('제목').value,'저장된 제목'));
}
test('hide preserves unsaved text, hidden save stays hidden, explicit unhide republishes',async()=>{
 const f=setup(),screen=render(<Writer Editor={RichEditor}/>);await open(screen);
 fireEvent.change(screen.getByLabelText('제목'),{target:{value:'작성 중인 제목'}});
 fireEvent.click(screen.getByRole('button',{name:'숨기기'}));
 await waitFor(()=>assert.ok(screen.getByRole('button',{name:'숨김 상태로 저장'})));
 assert.equal(screen.getByLabelText('제목').value,'작성 중인 제목');
 assert.equal(JSON.parse(f.requests.find(r=>r.method==='PATCH').body).draft,true);
 assert.equal(JSON.parse(localStorage.getItem('goya-owner-draft')).draft,true);
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'숨김 상태로 저장'})));
 await waitFor(()=>assert.ok(f.requests.find(r=>r.method==='POST')));
 assert.equal(JSON.parse(f.requests.find(r=>r.method==='POST').body.get('post')).draft,true);
 await waitFor(()=>assert.equal(screen.getByRole('button',{name:'다시 공개'}).disabled,false));
 fireEvent.click(screen.getByRole('button',{name:'다시 공개'}));
 await waitFor(()=>assert.ok(screen.getByRole('button',{name:'수정 게시'})));
 assert.equal(JSON.parse(f.requests.filter(r=>r.method==='PATCH').at(-1).body).draft,false);
});
test('delete cancellation sends nothing; confirmed deletion clears post and its browser draft',async()=>{
 const f=setup(),screen=render(<Writer Editor={RichEditor}/>);await open(screen);f.setConfirmed(false);
 fireEvent.click(screen.getByRole('button',{name:'게시물 삭제'}));
 assert.equal(f.requests.some(r=>r.method==='DELETE'),false);assert.match(f.questions.at(-1),/저장된 제목/);
 f.setConfirmed(true);fireEvent.click(screen.getByRole('button',{name:'게시물 삭제'}));
 await waitFor(()=>assert.equal(Boolean(screen.queryByRole('region',{name:'게시물 관리'})),false));
 assert.equal(screen.getByLabelText('제목').value,'');
 assert.equal(Boolean(screen.queryByRole('option',{name:/저장된 제목/})),false);
 assert.equal(JSON.parse(localStorage.getItem('goya-owner-draft')).slug,undefined);
});
test('failed mutation retains unsaved content, saved revision and public status',async()=>{
 const f=setup({error:true}),screen=render(<Writer Editor={RichEditor}/>);await open(screen);
 fireEvent.change(screen.getByLabelText('제목'),{target:{value:'보관할 수정'}});
 fireEvent.click(screen.getByRole('button',{name:'숨기기'}));
 await waitFor(()=>assert.match(screen.getByRole('status').textContent,/다른 곳/));
 assert.equal(screen.getByLabelText('제목').value,'보관할 수정');
 assert.equal(screen.getByRole('button',{name:'숨기기'}).disabled,false);
 assert.equal(JSON.parse(f.requests.find(r=>r.method==='PATCH').body).sha,'a'.repeat(40));
});

test('publishing reads the latest continuous editor body and preserves its column layout',async()=>{
 const f=setup();const latest='<column-set><column-unit><p>마지막 입력</p></column-unit><column-unit><p>두 번째 열</p></column-unit></column-set>';
 const screen=render(<Writer/>);await open(screen);
 await waitFor(()=>assert.ok(screen.getByRole('textbox',{name:'내용'})));
 const editor=screen.container.querySelector('.tiptap').editor;
 await act(async()=>editor.commands.setContent(latest));
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'수정 게시'})));
 await waitFor(()=>assert.ok(f.requests.find(r=>r.method==='POST')));
 const submitted=JSON.parse(f.requests.find(r=>r.method==='POST').body.get('post'));
 assert.match(submitted.body,/마지막 입력/);assert.match(submitted.body,/<column-set/);assert.match(submitted.body,/두 번째 열/);assert.equal(submitted.canvas,true);
});

test('publish does not rely on a native confirmation dialog and shows the result beside the button',async()=>{
 const f=setup();f.setConfirmed(false);
 const screen=render(<Writer Editor={RichEditor}/>);await open(screen);
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'수정 게시'})));
 await waitFor(()=>assert.ok(f.requests.find(r=>r.method==='POST')));
 assert.equal(f.questions.length,0);
 await waitFor(()=>assert.match(screen.container.querySelector('.publish-status').textContent,/게시했습니다/));
});
test('invalid title reports an inline error instead of silently blocking native form submission',async()=>{
 const f=setup();const screen=render(<Writer Editor={RichEditor}/>);await open(screen);
 fireEvent.change(screen.getByLabelText('제목'),{target:{value:''}});
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'수정 게시'})));
 await waitFor(()=>assert.match(screen.getByRole('status').textContent,/제목과 게시 날짜/));
 assert.equal(f.requests.some(r=>r.method==='POST'),false);
});

test('stale restored draft can be compared and explicitly published against the displayed latest revision',async()=>{
 const f=setup();localStorage.setItem('goya-owner-draft',JSON.stringify({slug:'example',sha:'a'.repeat(40),title:'내가 수정한 제목',date:'2026-11-24',format:'html',body:'<p>소중한 작성 내용</p>',draft:false}));
 const baseFetch=globalThis.fetch,submissions=[];
 globalThis.fetch=async(url,options={})=>{
  if(url==='/api/posts?slug=example')return {ok:true,json:async()=>({slug:'example',sha:'b'.repeat(40),title:'현재 저장된 제목',date:'2026-11-24',format:'html',body:'<p>서버의 내용</p>',canvasHtml:'<p>서버의 내용</p>',draft:false})};
  if(url==='/api/posts'&&options.method==='POST'){
   const p=JSON.parse(options.body.get('post'));submissions.push(p);
   if(p.sha!=='b'.repeat(40))return {ok:false,status:409,json:async()=>({code:'POST_REVISION_CONFLICT',error:'version conflict'})};
   return {ok:true,json:async()=>({...p,sha:'c'.repeat(40),canvasHtml:p.body,url:'https://example.com/post'})};
  }
  return baseFetch(url,options);
 };
 const screen=render(<Writer Editor={RichEditor}/>);
 await waitFor(()=>assert.equal(screen.getByLabelText('제목').value,'내가 수정한 제목'));
 await waitFor(()=>assert.ok(screen.getByRole('textbox',{name:'내용'})));
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'수정 게시'})));
 await waitFor(()=>assert.ok(screen.getByRole('region',{name:'저장 버전 충돌 해결'})));
 assert.equal(screen.getByLabelText('제목').value,'내가 수정한 제목');
 assert.match(screen.getByLabelText('게시하려던 내 수정').value,/소중한 작성 내용/);
 assert.match(screen.getByLabelText('현재 사이트에 저장된 글').value,/서버의 내용/);
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'내 수정 내용으로 게시'})));
 await waitFor(()=>assert.equal(submissions.length,2));
 assert.equal(submissions[1].sha,'b'.repeat(40));assert.match(submissions[1].body,/소중한 작성 내용/);
 await waitFor(()=>assert.equal(screen.queryByRole('region',{name:'저장 버전 충돌 해결'}),null));
});
test('default Writing editor is a continuous text document with optional columns rather than a page canvas',async()=>{
 setup();const screen=render(<Writer/>);
 await waitFor(()=>assert.ok(screen.getByRole('textbox',{name:'내용'})));
 assert.equal(screen.container.querySelector('iframe'),null);
 assert.ok(screen.getByLabelText('열 추가'));
 const editor=screen.container.querySelector('.tiptap').editor;
 await act(async()=>editor.commands.setContent('<p>첫 문장</p><p>다음 문장</p>'));
 assert.equal(editor.state.doc.childCount,2);
 assert.equal(editor.state.doc.child(0).type.name,'paragraph');
});

test('former canvas draft migrates once, including the active paragraph, without overwriting later flow edits',()=>{
 const {recoverCanvasDraft}=requireDraftModule;
 const saved={slug:'example',sha:'revision',body:'<p>old</p>',format:'html'};
 localStorage.setItem('goya-project-canvas:writing-example',JSON.stringify({sha:'revision',canvas:{html:'<p>model before last input</p><p>tail</p>',css:'.keep{color:red}'},active:{indices:[2],html:'latest Korean input 한글'}}));
 const migrated=recoverCanvasDraft(saved,localStorage);
 assert.match(migrated.body,/latest Korean input 한글/);assert.match(migrated.body,/tail/);assert.equal(migrated.css,'.keep{color:red}');
 assert.equal(localStorage.getItem('goya-project-canvas:writing-example'),null);assert.ok(localStorage.getItem('goya-owner-legacy-canvas-backup'));
 const next={...migrated,body:'<p>new continuous edits</p>'};assert.equal(recoverCanvasDraft(next,localStorage).body,next.body);
});
