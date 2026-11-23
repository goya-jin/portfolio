import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {load} from 'cheerio';
import {readCanvas,applyCanvas} from '../lib/visual-project.mjs';
import {mediaCatalog,appendMedia} from '../lib/media-catalog.mjs';
import {imageReferences} from '../lib/image-layout.mjs';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://goya-jin-management.vercel.app',pretendToBeVisual:true});
for(const key of ['window','document','Node','Element','HTMLElement','DOMParser','MutationObserver','getComputedStyle'])Object.defineProperty(globalThis,key,{value:key==='getComputedStyle'?dom.window.getComputedStyle.bind(dom.window):dom.window[key],configurable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
const {default:grapesjs}=await import('grapesjs');
const {installCanvasTypes,mainComponent,insertCanvasBlock,columnHTML,photoHTML,pairNextPhoto,splitPhotoRow,exportCanvas}=await import('../app/components/canvas-tools.mjs');
function editor(html){const e=grapesjs.init({headless:true,storageManager:false,avoidInlineStyle:false,plugins:[installCanvasTypes]});e.setComponents(html);return e}
const original=readFileSync(new URL('../../16-freeze-frames.html',import.meta.url),'utf8');
test('actual page survives GrapesJS with text, captions, GIFs, hidden state and links intact',()=>{
 const canvas=readCanvas(original),e=editor(canvas.body);const output=applyCanvas(original,exportCanvas(e)),a=load(original),b=load(output);
 assert.ok(b('#project-canvas-style').text().includes('.freeze-frame-list'));a('style,script').remove();b('main style,main script').remove();
 assert.equal(b('main').text().replace(/\s+/g,''),a('main').text().replace(/\s+/g,''));
 for(const tag of ['img','video','iframe'])assert.deepEqual(b('main '+tag).toArray().map(n=>b(n).attr('src')),a('main '+tag).toArray().map(n=>a(n).attr('src')));
 assert.equal(b('[data-project-hidden]').length,a('[data-project-hidden]').length);assert.equal(b('aside').html(),a('aside').html());assert.equal(b('footer').html(),a('footer').html());assert.ok(b('a[href="https://natural-camera.com/"]').length);e.destroy();
});
test('insert paired images at selected text, add columns, split and pair without losing surrounding content',async()=>{
 const e=editor('<main><p>앞 문장</p><p>뒤 문장</p></main>'),main=mainComponent(e);e.select(main.components().at(0));
 await insertCanvasBlock(e,photoHTML([{src:'https://example.com/a.jpg',name:'A'},{src:'https://example.com/b.jpg',name:'B'}]));
 let html=exportCanvas(e).html;assert.ok(html.indexOf('앞 문장')<html.indexOf('a.jpg'));assert.ok(html.indexOf('b.jpg')<html.indexOf('뒤 문장'));assert.equal(main.components().at(1).getAttributes()['data-visual-photos'],'2');
 assert.equal(splitPhotoRow(e),true);e.select(main.components().at(1));assert.equal(pairNextPhoto(e),true);
 e.select(main.components().at(2));await insertCanvasBlock(e,columnHTML(3));assert.equal(main.findType('portfolio-column').length+main.findType('portfolio-copy-column').length,3);
 const saved=applyCanvas('<html><head></head><body><main></main></body></html>',exportCanvas(e));assert.equal(load(saved)('column-unit').length,3);e.destroy();
});
test('formatting, start spacing, alignment and column ratios round-trip through the save path',()=>{
 const e=editor('<main><column-set style="gap:24px"><column-unit style="flex:1"><p style="text-align:right;padding-left:20px;font-size:18px"><strong>굵게</strong><em>기울임</em><s>취소</s><u>밑줄</u></p></column-unit><column-unit style="flex:2"><p>오른쪽</p></column-unit></column-set></main>');
 const saved=applyCanvas('<html><head></head><body><main></main></body></html>',exportCanvas(e)),$=load(saved);for(const tag of ['strong','em','s','u'])assert.equal($(tag).length,1);assert.match(saved,/padding-left/);assert.match(saved,/text-align/);assert.match(saved,/font-size/);assert.equal($('column-unit').length,2);assert.ok($('#project-canvas-style').text().includes('flex'));e.destroy();
});
test('unsafe scripts, handlers, embed hosts and CSS cannot be published',()=>{
 const saved=applyCanvas('<html><head></head><body><main>original</main></body></html>',{html:'<script>alert(1)</script><img src="https://example.com/a.jpg" onerror="alert(1)"><iframe src="https://evil.example/"></iframe><p>safe</p>',css:''});
 assert.ok(!saved.includes('<script'));assert.ok(!saved.includes('onerror'));assert.ok(!saved.includes('evil.example'));assert.ok(saved.includes('safe'));assert.throws(()=>applyCanvas(original,{html:'<p>text</p>',css:'</style><script>alert(1)</script>'}));assert.throws(()=>applyCanvas(original,{html:'<p>text</p>',css:'@import "https://evil.example/";'}));
});
test('media references stay stable after subsequent uploads and fresh listing',()=>{
 const tree=['b.jpg','c.jpg'].map(name=>({type:'blob',path:'assets/writing/uploads/'+name}));const first=mediaCatalog(tree),added=appendMedia(first,[{src:'https://goya-jin.github.io/portfolio/assets/writing/uploads/a.jpg',name:'new.jpg'}]);
 const current=mediaCatalog([...tree,{type:'blob',path:'assets/writing/uploads/a.jpg'}],added);assert.deepEqual(current,added);assert.equal(current.at(-1).ref,'image3');assert.deepEqual(imageReferences('{image1} {image3}'),['image1','image3']);assert.equal(imageReferences('일반 문장 {image1}'),null);
});

for(const name of readdirSync(new URL('../../',import.meta.url)).filter(n=>n.endsWith('.html')))test('existing page round trip: '+name,()=>{
 const original=readFileSync(new URL('../../'+name,import.meta.url),'utf8'),canvas=readCanvas(original),e=editor(canvas.body),output=applyCanvas(original,exportCanvas(e)),a=load(original),b=load(output);
 a('script,style').remove();b('script,style').remove();
 assert.equal(b('main').text().replace(/\s+/g,''),a('main').text().replace(/\s+/g,''));
 for(const tag of ['img','iframe','video','source','audio'])assert.deepEqual(b('main '+tag).toArray().map(n=>b(n).attr('src')),a('main '+tag).toArray().map(n=>a(n).attr('src')),tag);
 assert.equal(b('main [hidden]').length,a('main [hidden]').length);e.destroy();
});

test('Writing saves preserve columns and custom CSS while legacy posts still load',async()=>{
 const {serializePost,parsePost}=await import('../lib/posts.mjs');const {writingCanvasHTML}=await import('../lib/rich-posts.mjs');
 const p={title:'새 글',date:'2026-11-24',draft:true,format:'html',canvas:true,css:'.layout{display:flex;gap:24px}',body:'<column-set class="layout"><column-unit><p><s>취소선</s></p></column-unit><column-unit><img src="https://goya-jin.github.io/portfolio/assets/writing/uploads/a.jpg"></column-unit></column-set>'};
 const stored=parsePost(serializePost(p,[]));assert.equal(stored.css,p.css);assert.equal(stored.draft,true);assert.ok(stored.body.includes('column-unit'));assert.ok(stored.body.includes('../../assets/writing/uploads/a.jpg'));assert.ok(writingCanvasHTML(stored.body,'html').includes('https://goya-jin.github.io/portfolio/assets/writing/uploads/a.jpg'));assert.ok(writingCanvasHTML('**이전 글**','markdown').includes('<strong>이전 글</strong>'));
 assert.throws(()=>serializePost({...p,css:'</style><script>'},[]));
});
test('Writing title and date stay visible but are not duplicated in the saved body',async()=>{
 const e=editor('<main><article data-canvas-root="true"><header data-canvas-chrome="true"><h1>글 제목</h1><p>2026-11-24</p></header><p>실제 본문</p></article></main>');
 assert.equal(exportCanvas(e).html,'<p>실제 본문</p>');await insertCanvasBlock(e,columnHTML(2));assert.ok(exportCanvas(e).html.includes('column-set'));e.destroy();
});

test('column count changes never discard text and can return to a continuous body',async()=>{
 const {setCanvasColumns}=await import('../app/components/canvas-tools.mjs');const e=editor('<main><p>계속 입력하는 글</p></main>');e.select(mainComponent(e).components().at(0));await setCanvasColumns(e,3);assert.ok(exportCanvas(e).html.includes('계속 입력하는 글'));
 const row=mainComponent(e).components().at(0);row.components().at(2).components('<p>세 번째 열의 글</p>');await setCanvasColumns(e,2);assert.ok(exportCanvas(e).html.includes('세 번째 열의 글'));await setCanvasColumns(e,1);assert.ok(!exportCanvas(e).html.includes('column-set'));assert.ok(exportCanvas(e).html.includes('세 번째 열의 글'));e.destroy();
});

test('an inserted photo splits text at the actual caret and preserves text on both sides',async()=>{
 const e=editor('<main><p>앞문장뒤문장</p></main>'),c=mainComponent(e).components().at(0),el=document.createElement('p');el.textContent='앞문장뒤문장';document.body.append(el);c.getEl=()=>el;e.getEditing=()=>c;e.select(c);
 const range=document.createRange();range.setStart(el.firstChild,3);range.collapse(true);window.getSelection().removeAllRanges();window.getSelection().addRange(range);
 const {captureCanvasCaret}=await import('../app/components/canvas-tools.mjs');const caret=captureCanvasCaret(e);e.getEditing=()=>undefined;
 await insertCanvasBlock(e,photoHTML([{src:'https://example.com/photo.jpg',name:'사진'}]),caret);const html=exportCanvas(e).html;assert.ok(html.indexOf('앞문장')<html.indexOf('photo.jpg'));assert.ok(html.indexOf('photo.jpg')<html.indexOf('뒤문장'));el.remove();e.destroy();
});

test('saved layout CSS survives closing the editor and reopening the published page',()=>{
 const e=editor('<main><p style="text-align:center;font-size:20px">다시 여는 글</p></main>'),saved=applyCanvas('<html><head></head><body><main></main></body></html>',exportCanvas(e)),source=readCanvas(saved),again=grapesjs.init({headless:true,storageManager:false,avoidInlineStyle:false,plugins:[installCanvasTypes]});
 again.setStyle(source.customCSS);again.setComponents(source.body);const second=applyCanvas(saved,exportCanvas(again));assert.ok(second.includes('font-size:20px'));assert.ok(second.includes('text-align:center'));assert.ok(second.includes('다시 여는 글'));e.destroy();again.destroy();
});
