import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {load} from 'cheerio';
import {editorHTML,sanitizeRichHTML,portfolioHTML} from '../lib/rich-posts.mjs';
import {parsePost,serializePost} from '../lib/posts.mjs';
import {readProject,applyProject} from '../lib/projects.mjs';
import {readProfile,applyProfile} from '../lib/profile.mjs';
import {validateWritingSettings} from '../lib/writing-settings.mjs';
test('all existing posts can be prepared without dropping images or supported embeds',()=>{
 const dir=new URL('../../content/posts/',import.meta.url);
 for(const name of readdirSync(dir).filter(n=>n.endsWith('.md'))){const p=parsePost(readFileSync(new URL(name,dir),'utf8')),html=editorHTML(p.body,p.format),saved=sanitizeRichHTML(html);const images=(p.body.match(/!\[[^\]]*\]\(/g)||[]).length;assert.ok(load(saved)('img').length>=images,name);for(const src of p.body.matchAll(/<iframe[^>]+src="([^"]+)/g))assert.ok(saved.includes(src[1].replaceAll('&','&amp;'))||saved.includes(src[1]),name);if(p.body.includes('twitter-tweet'))assert.ok(saved.includes('twitter-tweet'),name);assert.ok(load(saved)('video').length>=(p.body.match(/<video\b/g)||[]).length,name);assert.ok(!html.includes('<ol start="2026">'),name)}
});
test('rich body persists image position, caption, formatting and canonical site paths',()=>{
 const html='<p>앞 문장 <strong>굵게</strong></p><figure data-writing-image="true" style="width:75%"><img src="https://goya-jin.github.io/portfolio/assets/writing/uploads/a.jpg" alt="사진"><figcaption>설명</figcaption></figure><p>뒤 문장</p>';
 const saved=parsePost(serializePost({title:'사진 글',date:'2026-11-04',format:'html',body:html},[]));assert.equal(saved.format,'html');assert.ok(saved.body.indexOf('앞 문장')<saved.body.indexOf('<figure'));assert.ok(saved.body.indexOf('<figure')<saved.body.indexOf('뒤 문장'));assert.match(saved.body,/\.\.\/\.\.\/assets\/writing\/uploads\/a.jpg/);assert.match(saved.body,/<strong>굵게<\/strong>/);assert.match(saved.body,/<figcaption>설명/);assert.match(saved.body,/width:75%/);assert.ok(editorHTML(saved.body,'html').includes('https://goya-jin.github.io/portfolio/assets/writing/uploads/a.jpg'));
});
test('pasted executable markup and unsupported iframe hosts do not survive saving',()=>{
 const html=sanitizeRichHTML('<script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(1)"><iframe src="https://evil.example/"></iframe><p onclick="bad()">safe</p><a href="javascript:bad()">link</a><figure><img data-upload-id="pending" src="blob:temporary"></figure>');assert.ok(html.includes('safe'));assert.ok(!/script|onerror|onclick|javascript:|evil.example|blob:/.test(html));
});
test('portfolio rich paragraphs can be saved repeatedly without duplicating gallery images',()=>{
 const source='<html><head><title>Test</title></head><body><main><column-set><column-unit>설명</column-unit></column-set><div class="gallery" style="--cols:1"><figure><img src="assets/original.jpg"></figure></div></main></body></html>';
 const p=readProject(source);p.paragraphs[0].text='설명 사진';p.paragraphs[0].html='<p><strong>설명</strong></p><figure data-writing-image="true"><img src="https://goya-jin.github.io/portfolio/assets/writing/uploads/inline.jpg"></figure>';
 const once=applyProject(source,p),next=readProject(once),twice=applyProject(once,next);assert.equal(next.media.length,1);assert.ok(twice.includes('assets/writing/uploads/inline.jpg'));assert.equal((twice.match(/inline.jpg/g)||[]).length,1);assert.match(twice,/<strong>설명/);assert.ok(!portfolioHTML(p.paragraphs[0].html).includes('../../assets'));
});
test('profile rich text keeps previous credits and formatted paragraphs',()=>{
 const source=readFileSync(new URL('./info.fixture.html',import.meta.url),'utf8'),p=readProfile(source);p.bio='소개\n다음';p.bioHtml='<p><strong>소개</strong></p><p>다음</p>';const saved=applyProfile(source,p);assert.ok(saved.includes('<strong>소개</strong>'));assert.equal(readProfile(saved).credits.length,p.credits.length);
});
test('site-wide typography accepts numeric bounds and rejects injected settings',()=>{
 assert.deepEqual(validateWritingSettings({fontSize:16,lineHeight:1.8,paragraphGap:1.2}),{fontSize:16,lineHeight:1.8,paragraphGap:1.2});for(const v of [{fontSize:'16px'},{fontSize:90},{lineHeight:0},{paragraphGap:'bad'}])assert.throws(()=>validateWritingSettings({fontSize:13,lineHeight:1.6,paragraphGap:1.2,...v}));
});
