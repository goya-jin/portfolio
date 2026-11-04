import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://goya-jin-management.vercel.app',pretendToBeVisual:true});
for(const key of ['window','document','Node','Element','HTMLElement','Text','DocumentFragment','DOMParser','MutationObserver','Event','MouseEvent','KeyboardEvent','getComputedStyle'])Object.defineProperty(globalThis,key,{value:key==='getComputedStyle'?dom.window.getComputedStyle.bind(dom.window):dom.window[key],configurable:true,writable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const rect=()=>({top:0,left:0,right:0,bottom:0,width:0,height:0});dom.window.Range.prototype.getBoundingClientRect=rect;dom.window.Range.prototype.getClientRects=()=>[];dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
const React=await import('react');const {render,fireEvent,waitFor,act,cleanup}=await import('@testing-library/react');
const {Editor}=await import('@tiptap/core');const {default:RichEditor,editorExtensions,moveBlock}=await import('../app/components/rich-editor.jsx');const {editorHTML,sanitizeRichHTML}=await import('../lib/rich-posts.mjs');const {parsePost}=await import('../lib/posts.mjs');
test('every published post survives the actual Tiptap schema with images and embeds intact',()=>{
 const dir=new URL('../../content/posts/',import.meta.url);
 for(const name of readdirSync(dir).filter(n=>n.endsWith('.md'))){const p=parsePost(readFileSync(new URL(name,dir),'utf8')),html=editorHTML(p.body,p.format),e=new Editor({extensions:editorExtensions(),content:html}),saved=sanitizeRichHTML(e.getHTML());const before=new DOMParser().parseFromString(sanitizeRichHTML(html),'text/html'),after=new DOMParser().parseFromString(saved,'text/html');for(const tag of ['img','iframe','video','source','blockquote.twitter-tweet'])assert.equal(after.querySelectorAll(tag).length,before.querySelectorAll(tag).length,name+' '+tag);assert.equal(after.body.textContent.replace(/\s+/g,''),before.body.textContent.replace(/\s+/g,''),name);e.destroy()}
});
test('image insertion splits a paragraph at the cursor; moving it does not delete text',()=>{
 const e=new Editor({extensions:editorExtensions(),content:'<p>앞문장뒤문장</p>'});e.commands.insertContentAt(4,{type:'writingImage',attrs:{src:'https://example.com/photo.jpg',alt:'사진'}});const html=e.getHTML();assert.ok(html.indexOf('앞문장')<html.indexOf('<figure'));assert.ok(html.indexOf('<figure')<html.indexOf('뒤문장'));let pos;e.state.doc.descendants((n,p)=>{if(n.type.name==='writingImage')pos=p});moveBlock(e,pos,1);assert.ok(e.getHTML().indexOf('뒤문장')<e.getHTML().indexOf('<figure'));e.destroy();
});
test('successive photo choices are inserted at their cursor positions and persist without blob URLs',async()=>{
 let html='<p>앞 문장</p><p>뒤 문장</p>';const messages=[];let calls=0;
 globalThis.fetch=async(url)=>{assert.equal(url,'/api/writing-media');calls++;return {ok:true,json:async()=>({items:[{src:'https://goya-jin.github.io/portfolio/assets/writing/uploads/'+calls+'.jpg'}]})}};
 function Harness(){const [value,setValue]=React.useState(html);return <RichEditor value={value} onChange={v=>{html=v;setValue(v)}} onMessage={m=>messages.push(m)}/>}
 const screen=render(<Harness/>);await waitFor(()=>assert.ok(screen.container.querySelector('.tiptap')));const editor=screen.container.querySelector('.tiptap').editor;
 await act(async()=>{editor.commands.setTextSelection(editor.state.doc.child(0).nodeSize+1);fireEvent.change(screen.container.querySelector('input[type=file]'),{target:{files:[new File(['photo1'],'first.jpg',{type:'image/jpeg'})]}})});
 await waitFor(()=>assert.ok(html.includes('/1.jpg')));await act(async()=>{editor.commands.setTextSelection(editor.state.doc.content.size-1);fireEvent.change(screen.container.querySelector('input[type=file]'),{target:{files:[new File(['photo2'],'second.jpg',{type:'image/jpeg'})]}})});
 await waitFor(()=>assert.ok(html.includes('/2.jpg')));assert.equal(calls,2);assert.equal((html.match(/<figure/g)||[]).length,2);assert.ok(html.indexOf('앞 문장')<html.indexOf('/1.jpg'));assert.ok(html.indexOf('/1.jpg')<html.indexOf('뒤 문장'));assert.ok(!html.includes('blob:'));assert.ok(!html.includes('data-upload-id'));cleanup();
});
