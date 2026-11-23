import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://goya-jin-management.vercel.app',pretendToBeVisual:true});
for(const key of ['window','document','Node','Element','HTMLElement','Text','DocumentFragment','DOMParser','MutationObserver','Event','MouseEvent','KeyboardEvent','getComputedStyle','localStorage'])Object.defineProperty(globalThis,key,{value:key==='getComputedStyle'?dom.window.getComputedStyle.bind(dom.window):dom.window[key],configurable:true,writable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
dom.window.Range.prototype.getBoundingClientRect=()=>({top:0,left:0,right:0,bottom:0,width:0,height:0});dom.window.Range.prototype.getClientRects=()=>[];dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
const React=await import('react');globalThis.React=React;
const {render,fireEvent,waitFor,cleanup}=await import('@testing-library/react');
const {default:RichEditor}=await import('../app/components/rich-editor.jsx');
const {default:Writer}=await import('../app/(owner)/write/writer.jsx');
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
 fireEvent.click(screen.getByRole('button',{name:'숨김 상태로 저장'}));
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

test('publishing flushes the shared visual editor and saves its latest body and layout CSS',async()=>{
 const f=setup();let latest='<column-set><column-unit><p>마지막 입력</p></column-unit><column-unit><p>두 번째 열</p></column-unit></column-set>';
 function VisualStub({onReady,editorKey}){React.useEffect(()=>{onReady(async()=>({body:latest,css:'.two{display:flex}',canvas:true}))},[editorKey]);return <p>시각 편집기</p>}
 const screen=render(<Writer Editor={VisualStub}/>);await open(screen);fireEvent.click(screen.getByRole('button',{name:'수정 게시'}));
 await waitFor(()=>assert.ok(f.requests.find(r=>r.method==='POST')));const submitted=JSON.parse(f.requests.find(r=>r.method==='POST').body.get('post'));assert.equal(submitted.body,latest);assert.equal(submitted.css,'.two{display:flex}');assert.equal(submitted.canvas,true);
});
