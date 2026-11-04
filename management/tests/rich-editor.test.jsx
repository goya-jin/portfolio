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
test.afterEach(()=>cleanup());
globalThis.React=React;
const {default:ProjectEditor}=await import('../app/(owner)/projects/project-editor.jsx');
const {default:ProfileEditor}=await import('../app/(owner)/profile/profile-editor.jsx');
const {readProject,applyProject}=await import('../lib/projects.mjs');
const {readProfile,applyProfile}=await import('../lib/profile.mjs');
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

test('Korean photo captions commit after composition and do not commit the final input twice',async()=>{
 const {PhotoCaption}=await import('../app/components/rich-editor.jsx');const commits=[];
 function CaptionHarness(){const [value,setValue]=React.useState('사진 ');return <PhotoCaption value={value} onCommit={next=>{commits.push(next);setValue(next)}}/>}
 const screen=render(<CaptionHarness/>),input=screen.getByRole('textbox',{name:'사진 설명'});
 fireEvent.compositionStart(input);for(const value of ['사진 ㅎ','사진 하','사진 한'])fireEvent.change(input,{target:{value}});
 assert.deepEqual(commits,[]);assert.equal(input.value,'사진 한');
 fireEvent.compositionEnd(input,{data:'한'});fireEvent.change(input,{target:{value:'사진 한'}});
 assert.deepEqual(commits,['사진 한']);assert.equal(input.value,'사진 한');
 fireEvent.compositionStart(input);fireEvent.change(input,{target:{value:'사진 한ㄱ'}});fireEvent.change(input,{target:{value:'사진 한글'}});fireEvent.compositionEnd(input,{data:'글'});
 assert.deepEqual(commits,['사진 한','사진 한글']);assert.equal(input.value,'사진 한글');cleanup();
});
test('external content never replaces an active IME composition; echoed changes do not reset the editor',async()=>{
 let changeValue;const initial='<p>처음</p>';
 function Harness(){const [value,setValue]=React.useState(initial);changeValue=setValue;return <RichEditor value={value} onChange={setValue}/>}
 const screen=render(<Harness/>);await waitFor(()=>assert.ok(screen.container.querySelector('.tiptap')));const editor=screen.container.querySelector('.tiptap').editor;
 let composing=true;Object.defineProperty(editor.view,'composing',{get:()=>composing,configurable:true});
 await act(async()=>changeValue('<p>외부에서 변경</p>'));assert.equal(editor.getText(),'처음');
 composing=false;await act(async()=>changeValue('<p>다른 글 불러오기</p>'));assert.equal(editor.getText(),'다른 글 불러오기');
 let resets=0;editor.on('transaction',({transaction})=>{if(transaction.getMeta('preventUpdate'))resets++});
 await act(async()=>editor.commands.insertContent('한글'));assert.equal(resets,0);assert.ok(editor.getText().includes('한글'));cleanup();
});
test('photo source links survive publishing and repeated editing without duplicating caption or source',()=>{
 const e=new Editor({extensions:editorExtensions(),content:'<p>본문</p>'});
 e.commands.insertContent({type:'writingImage',attrs:{src:'https://example.com/photo.jpg',caption:'Figure 1. Male Fly Connectome.',sourceName:'Google Research',sourceUrl:'https://research.google/blog/?a=1&b=2',width:50}});
 for(let i=0;i<3;i++){const saved=sanitizeRichHTML(e.getHTML()),doc=new DOMParser().parseFromString(saved,'text/html'),link=doc.querySelector('figcaption a');assert.equal(link.textContent,'Google Research');assert.equal(link.getAttribute('href'),'https://research.google/blog/?a=1&b=2');assert.equal(link.getAttribute('target'),'_blank');assert.equal(doc.querySelectorAll('[data-photo-source]').length,1);e.commands.setContent(editorHTML(saved,'html'));const photo=e.state.doc.content.content.find(n=>n.type.name==='writingImage');assert.equal(photo.attrs.caption,'Figure 1. Male Fly Connectome.');assert.equal(photo.attrs.sourceName,'Google Research');assert.equal(photo.attrs.sourceUrl,'https://research.google/blog/?a=1&b=2')}
 e.destroy();
});
test('photo source fields update the saved link and reject executable URLs',async()=>{
 const {photoSourceHref}=await import('../app/components/rich-editor.jsx');assert.equal(photoSourceHref('javascript:alert(1)'),'');assert.equal(photoSourceHref('data:text/html,test'),'');assert.equal(photoSourceHref('https://user:password@example.com'),'');
 let html='<figure data-writing-image="true"><img src="https://example.com/photo.jpg"><figcaption>기존 설명</figcaption></figure>';
 function Harness(){const [value,setValue]=React.useState(html);return <RichEditor value={value} onChange={v=>{html=v;setValue(v)}}/>}
 const screen=render(<Harness/>);await waitFor(()=>assert.ok(screen.container.querySelector('.tiptap')));
 fireEvent.change(screen.getByRole('textbox',{name:'출처 이름'}),{target:{value:'Google Research'}});fireEvent.change(screen.getByRole('textbox',{name:'출처 URL'}),{target:{value:'https://research.google/'}});
 await waitFor(()=>assert.ok(html.includes('href="https://research.google/"')));assert.ok(html.includes('기존 설명'));assert.equal(screen.getByRole('textbox',{name:'출처 이름'}).value,'Google Research');
 fireEvent.change(screen.getByRole('textbox',{name:'출처 URL'}),{target:{value:'javascript:alert(1)'}});await waitFor(()=>assert.ok(!html.includes('javascript:')));assert.ok(!html.includes('<a '));cleanup();
});
test('photo picker remembers the insertion point even if focus moves and the document changes before selection',async()=>{
 let html='<p>앞문장뒤문장</p><p>끝 문장</p>';
 globalThis.fetch=async()=>({ok:true,json:async()=>({items:[{src:'https://goya-jin.github.io/portfolio/assets/writing/uploads/at-cursor.jpg'}]})});
 function Harness(){const [value,setValue]=React.useState(html);return <RichEditor value={value} onChange={v=>{html=v;setValue(v)}}/>}
 const screen=render(<Harness/>);await waitFor(()=>assert.ok(screen.container.querySelector('.tiptap')));const editor=screen.container.querySelector('.tiptap').editor;
 await act(async()=>{editor.commands.setTextSelection(4);fireEvent.click(screen.getByRole('button',{name:'사진 넣기'}));editor.commands.setTextSelection(editor.state.doc.content.size-1);editor.commands.insertContentAt(1,'추가');fireEvent.change(screen.container.querySelector('input[type=file]'),{target:{files:[new File(['photo'],'photo.jpg',{type:'image/jpeg'})]}})});
 await waitFor(()=>assert.ok(html.includes('at-cursor.jpg')));
 for(const body of [html,editorHTML(sanitizeRichHTML(html),'html')]){assert.ok(body.indexOf('추가앞문장')<body.indexOf('<figure'));assert.ok(body.indexOf('<figure')<body.indexOf('뒤문장'));assert.ok(body.indexOf('뒤문장')<body.indexOf('끝 문장'))}
 cleanup();
});
test('speech bubbles wrap selected text, survive saving, and can be removed without losing text',()=>{
 const e=new Editor({extensions:editorExtensions(),content:'<p>앞</p><p>초파리도 <strong>기억</strong>을 가지고 있을까?</p><p>뒤</p>'});
 e.commands.setTextSelection(e.state.doc.child(0).nodeSize+1);assert.ok(e.commands.toggleWrap('writingBubble'));
 for(let i=0;i<3;i++){const saved=sanitizeRichHTML(e.getHTML()),doc=new DOMParser().parseFromString(saved,'text/html');assert.equal(doc.querySelectorAll('[data-writing-bubble]').length,1);assert.equal(doc.querySelector('[data-writing-bubble]').textContent,'초파리도 기억을 가지고 있을까?');assert.ok(doc.querySelector('[data-writing-bubble] strong'));assert.match(doc.querySelector('[data-writing-bubble]').getAttribute('style'),/background-color:#e8f3ff/);e.commands.setContent(editorHTML(saved,'html'))}
 let pos;e.state.doc.descendants((n,p)=>{if(n.type.name==='writingBubble')pos=p+2});e.commands.setTextSelection(pos);assert.ok(e.commands.toggleWrap('writingBubble'));assert.ok(!e.getHTML().includes('data-writing-bubble'));assert.equal(e.state.doc.childCount,3);assert.ok(e.getHTML().includes('<strong>기억</strong>'));e.destroy();
});
test('speech bubble toolbar inserts at the cursor and Enter on an empty last paragraph exits it',async()=>{
 let html='<p>말풍선 문장</p><p>다음 문장</p>';
 function Harness(){const [value,setValue]=React.useState(html);return <RichEditor value={value} onChange={v=>{html=v;setValue(v)}}/>}
 const screen=render(<Harness/>);await waitFor(()=>assert.ok(screen.container.querySelector('.tiptap')));const editor=screen.container.querySelector('.tiptap').editor;
 await act(async()=>{editor.commands.setTextSelection(2);fireEvent.click(screen.getByRole('button',{name:'말풍선'}))});assert.ok(html.includes('data-writing-bubble'));assert.equal(editor.state.doc.child(0).type.name,'writingBubble');
 await act(async()=>{editor.commands.setTextSelection(editor.state.doc.child(0).nodeSize-2);editor.commands.keyboardShortcut('Enter');editor.commands.keyboardShortcut('Enter')});assert.equal(editor.state.selection.$from.depth,1);assert.equal(editor.state.doc.child(0).type.name,'writingBubble');cleanup();
});
test('project text fields keep clicks in the editor and submit edited paragraphs, captions and added text',async()=>{
 globalThis.React=React;
 
 const source='<html><head><title>Test</title></head><body><main><column-set><column-unit>기존 문장</column-unit></column-set><div class="gallery" style="--cols:1"><figure><img src="assets/original.jpg"></figure></div></main></body></html>';
 let saved;
 globalThis.fetch=async(url,options={})=>{if(url==='/api/writing-settings')return {ok:true,json:async()=>({settings:{fontSize:13,lineHeight:1.6,paragraphGap:1.2},sha:null})};if(url.startsWith('/api/projects?'))return {ok:true,json:async()=>({path:'test.html',sha:'original',project:readProject(source)})};if(options.method==='POST'){const request=JSON.parse(options.body.get('project'));saved=applyProject(source,request.project);return {ok:true,json:async()=>({path:'test.html',sha:'saved',project:readProject(saved),url:'https://goya-jin.github.io/portfolio/test.html'})}}return {ok:true,json:async()=>({projects:[{path:'test.html',title:'Test',group:'Portfolio'}]})}};
 const screen=render(<ProjectEditor/>);await waitFor(()=>assert.ok(screen.getByRole('button',{name:'불러오기'}).disabled===false));fireEvent.click(screen.getByRole('button',{name:'불러오기'}));await waitFor(()=>assert.ok(screen.container.querySelector('.paragraph-editor')));
 fireEvent.click(screen.container.querySelector('.paragraph-editor summary'));await waitFor(()=>assert.ok(screen.container.querySelector('.paragraph-editor .tiptap')));
 assert.equal(Boolean(screen.queryByText('아직 저장하지 않은 수정이 있습니다.')),false,'opening a project must not mark unchanged content as edited');
 const prose=screen.container.querySelector('.paragraph-editor .tiptap'),select=prose.closest('.rich-editor').querySelector('select');let diverted=0;select.addEventListener('click',()=>diverted++);fireEvent.click(prose.querySelector('p'));assert.equal(diverted,0,'clicking prose must not activate a surrounding label’s toolbar control');
 for(const textbox of screen.container.querySelectorAll('.tiptap'))assert.equal(Boolean(textbox.closest('label')),false,'a visual editor must not be nested in a native label');
 await act(async()=>prose.editor.commands.insertContent('수정한 문장 '));
 const caption=screen.getByRole('textbox',{name:'사진 아래 설명'});await act(async()=>caption.editor.commands.insertContent('사진 설명 수정'));
 fireEvent.click(screen.getByRole('button',{name:'+ 글 추가'}));await waitFor(()=>assert.ok(screen.queryByRole('textbox',{name:'추가 글'})));const added=screen.getByRole('textbox',{name:'추가 글'});await act(async()=>added.editor.commands.insertContent('새로 쓴 내용'));
 fireEvent.click(screen.getByRole('button',{name:'저장·사이트 반영'}));await waitFor(()=>assert.ok(saved));assert.ok(saved.includes('수정한 문장'));assert.ok(saved.includes('사진 설명 수정'));assert.ok(saved.includes('새로 쓴 내용'));assert.ok(saved.includes('assets/original.jpg'));cleanup();
});
test('new project description and credits accept text and reach the save request',async()=>{
 globalThis.React=React;let submitted;
 globalThis.fetch=async(url,options={})=>{if(url==='/api/writing-settings')return {ok:true,json:async()=>({settings:{fontSize:13,lineHeight:1.6,paragraphGap:1.2}})};if(options.method==='POST'){submitted=JSON.parse(options.body.get('project'));return {ok:true,json:async()=>({html:'<p>preview</p>'})}}return {ok:true,json:async()=>({projects:[{path:'test.html',title:'Test',group:'Portfolio'}]})}};
 const screen=render(<ProjectEditor/>);await waitFor(()=>assert.equal(screen.getByRole('button',{name:'불러오기'}).disabled,false));fireEvent.click(screen.getByRole('button',{name:'새 프로젝트'}));await waitFor(()=>assert.ok(screen.queryByRole('textbox',{name:'설명'})));
 for(const name of ['설명','크레딧']){const textbox=screen.getByRole('textbox',{name});assert.equal(Boolean(textbox.closest('label')),false);await act(async()=>textbox.editor.commands.insertContent(name+' 작성'))}
 fireEvent.change(screen.getByLabelText('프로젝트 제목'),{target:{value:'새 프로젝트'}});fireEvent.change(screen.getByLabelText(/주소 이름/),{target:{value:'new-project'}});fireEvent.click(screen.getByRole('button',{name:'미리보기'}));await waitFor(()=>assert.ok(submitted));assert.equal(submitted.create,true);assert.ok(submitted.descriptionHtml.includes('설명 작성'));assert.ok(submitted.creditsHtml.includes('크레딧 작성'));cleanup();
});
test('Info prose fields remain editable and preserve changes through save',async()=>{
 globalThis.React=React;const source=readFileSync(new URL('./info.fixture.html',import.meta.url),'utf8');let saved;
 globalThis.fetch=async(url,options={})=>{if(url==='/api/writing-settings')return {ok:true,json:async()=>({settings:{fontSize:13,lineHeight:1.6,paragraphGap:1.2}})};if(options.method==='PUT'){const request=JSON.parse(options.body);saved=applyProfile(source,request.profile);return {ok:true,json:async()=>({sha:'saved',url:'https://goya-jin.github.io/portfolio/info.html'})}}return {ok:true,json:async()=>({sha:'original',profile:readProfile(source)})}};
 const screen=render(<ProfileEditor/>);await waitFor(()=>assert.ok(screen.queryByRole('textbox',{name:'소개글'})));
 for(const name of ['소개글','학력','회사 경력']){const textbox=screen.getByRole('textbox',{name});assert.equal(Boolean(textbox.closest('label')),false);await act(async()=>textbox.editor.commands.insertContent(name+' 수정 '))}
 fireEvent.click(screen.getByRole('button',{name:'저장·사이트 반영'}));await waitFor(()=>assert.ok(saved));for(const text of ['소개글 수정','학력 수정','회사 경력 수정'])assert.ok(saved.includes(text));assert.equal(readProfile(saved).credits.length,readProfile(source).credits.length);cleanup();
});
test('pasting YouTube iframe code inserts an actual video at the caret and survives publishing',async()=>{
 let html='<p>앞뒤</p>';
 function Harness(){const [value,setValue]=React.useState(html);return <RichEditor value={value} onChange={v=>{html=v;setValue(v)}}/>}
 const screen=render(<Harness/>);await waitFor(()=>assert.ok(screen.container.querySelector('.tiptap')));const box=screen.container.querySelector('.tiptap'),editor=box.editor;
 await act(async()=>{editor.commands.setTextSelection(2);fireEvent.paste(box,{clipboardData:{files:[],getData:type=>type==='text/plain'?'<iframe width="560" height="315" src="https://www.youtube.com/embed/9jt_q1jM89Y" allowfullscreen></iframe>':''}})});
 assert.ok(html.includes('<iframe'));assert.ok(!html.includes('&lt;iframe'));assert.ok(html.indexOf('앞')<html.indexOf('<iframe'));assert.ok(html.indexOf('<iframe')<html.indexOf('뒤'));assert.ok(sanitizeRichHTML(html).includes('https://www.youtube.com/embed/9jt_q1jM89Y'));cleanup();
});
