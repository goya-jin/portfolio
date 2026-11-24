import test from 'node:test';import assert from 'node:assert/strict';
import {validatePost,serializePost,parsePost} from '../lib/posts.mjs';
import {groupContent,withGroupContent,prepareEditorPost} from '../lib/writing-groups.mjs';
const image=(text,url)=>`<p>${text}</p><figure data-writing-image="true" style="width:37.5%"><img src="https://goya-jin.github.io/portfolio/assets/writing/uploads/${url}.png"><figcaption>${text} caption <span data-photo-source="true">출처: <a href="https://example.com/${url}">Source ${url}</a></span></figcaption></figure>`;
test('independent groups retain styles, photos and sources even when split view is off',()=>{
 const post={title:'Two languages',date:'2026-11-24',format:'html',canvas:true,body:image('한국어','ko'),css:'#same{color:red}',splitView:true,secondGroup:{body:image('English','en'),css:'#same{color:blue}',format:'html'}};
 validatePost(post,[]);const saved=parsePost(serializePost(post,[]));assert.equal(saved.splitView,true);assert.match(saved.body,/한국어/);assert.doesNotMatch(saved.body,/>English</);assert.match(saved.secondGroup.body,/English/);assert.match(saved.secondGroup.body,/\.\.\/\.\.\/assets\/writing\/uploads\/en.png/);assert.match(saved.secondGroup.body,/https:\/\/example.com\/en/);assert.match(saved.secondGroup.body,/37.5%/);assert.equal(saved.secondGroup.css,'#same{color:blue}');
 assert.equal(parsePost(serializePost({...saved,splitView:false},[])).secondGroup.body,saved.secondGroup.body);
});
test('active second group snapshots do not replace first group content or revision',()=>{
 const p={body:'<p>KO</p>',css:'.ko{}',sha:'revision',splitView:true,secondGroup:{body:'<p>old EN</p>',css:'.en{}'}};
 const next=withGroupContent(p,'second',{body:'<p>new EN</p>',css:'.new{}'});assert.equal(next.body,p.body);assert.equal(next.css,p.css);assert.equal(next.sha,p.sha);assert.equal(groupContent(next,'second').body,'<p>new EN</p>');
 assert.equal(prepareEditorPost({...next,secondGroup:{body:'relative',canvasHtml:'absolute'}}).secondGroup.body,'absolute');
});
test('second group uses the same validation and sanitization as the first',()=>{
 const p={title:'x',date:'2026-11-24',body:'<p>ko</p>',format:'html',splitView:true};assert.throws(()=>validatePost({...p,secondGroup:{body:'x'.repeat(100001)}},[]),/그룹 2/);assert.throws(()=>validatePost({...p,splitView:'yes'},[]),/두 그룹/);
 const parsed=parsePost(serializePost({...p,secondGroup:{body:'<p>safe</p><script>bad()</script><iframe src="https://evil.example"></iframe>'}},[]));assert.match(parsed.secondGroup.body,/safe/);assert.doesNotMatch(parsed.secondGroup.body,/<script|evil.example/);
 assert.throws(()=>serializePost({...p,secondGroup:{body:'<p>en</p>',css:'@import url(https://evil.example)'}},[]));
});
