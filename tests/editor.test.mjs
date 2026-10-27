import assert from 'node:assert/strict';
import { GitHubClient, postDocument, parseDocument, checkFiles, fileBase64, newSlug, validatePost } from '../admin/core.mjs';
globalThis.location = { href: 'https://goya-jin.github.io/portfolio/admin/index.html' };
const sample = new File(['한국어 파일'], '사진.png', {type: 'image/png'});
const attachment = { id: 'abc123', marker: '[이미지 1]', name: '사진.png', file: sample };
const data = { title: '제목 한글', date: '2026-10-27', body: '앞\n\n[이미지 1]\n\n뒤', attachments: [attachment], slug: 'new-post' };
const document = postDocument(data);
assert.match(document, /!\[사진.png\]\(\.\.\/\.\.\/assets\/writing\/new-post\/abc123.png\)/);
assert.equal(parseDocument(document).title, '제목 한글');
assert.equal(JSON.parse(document.split('\n---\n')[0]).draft, false);
assert.match(postDocument({...data, body: '본문'}), /본문\n\n!\[/);
assert.equal(Buffer.from(await fileBase64(sample),'base64').toString(), '한국어 파일');
assert.throws(()=>checkFiles([new File(['x'],'unsafe.html')]), /지원하지/);
assert.throws(()=>checkFiles(Array(9).fill(sample)), /최대 8/);
assert.throws(()=>checkFiles([{name:'huge.pdf',size:11*1024*1024}]), /최대 10MB/);
assert.throws(()=>validatePost('', '2026-10-27'), /제목/);
assert.throws(()=>validatePost('x','2026-02-30'), /날짜/);
assert.match(newSlug('2026-10-27'), /^2026-10-27-[a-z0-9]{12}$/);
function transport({conflict=false, existing=null, login='goya-jin'}={}) {
  let headReads=0; const calls=[];
  const fn=async(url,opts)=>{
    calls.push({url,opts}); let result;
    const path=new URL(url).pathname;
    if(path==='/user') result={login};
    else if(path.endsWith('/portfolio')) result={permissions:{push:true}};
    else if(path.endsWith('/git/ref/heads/main')) result={object:{sha:conflict && headReads++ ? 'raced' : 'base'}};
    else if(path.endsWith('/git/commits/base')) result={tree:{sha:'base-tree'}};
    else if(path.endsWith('/git/trees/base-tree')) result={tree: existing ? [existing] : [],truncated:false};
    else if(path.endsWith('/git/blobs')) result={sha:'blob-'+calls.length};
    else if(path.endsWith('/git/trees')) {const body=JSON.parse(opts.body);assert.equal(body.base_tree,'base-tree');result={sha:'new-tree'};}
    else if(path.endsWith('/git/commits')) {const body=JSON.parse(opts.body);assert.deepEqual(body.parents,['base']);result={sha:'new-commit'};}
    else if(path.endsWith('/git/refs/heads/main')) {assert.equal(JSON.parse(opts.body).force,false);result={};}
    else throw Error(path);
    return {ok:true,json:async()=>result};
  }; return {fn,calls};
}
const good=transport(); const client=new GitHubClient('test-key',good.fn);await client.connect();const result=await client.publish(data);
assert.equal(result.path,'content/posts/new-post.md');assert.ok(result.sha.startsWith('blob-'));assert.match(result.url,/writing\/new-post\/index.html/);
assert.equal(good.calls.filter(c=>c.opts.method==='PATCH').length,1);
const race=transport({conflict:true});await assert.rejects(()=>new GitHubClient('k',race.fn).publish(data),/저장소가 변경/);assert.equal(race.calls.filter(c=>c.opts.method==='PATCH').length,0);
const edit=transport({existing:{path:'content/posts/new-post.md',sha:'changed'}});await assert.rejects(()=>new GitHubClient('k',edit.fn).publish({...data,editPath:'content/posts/new-post.md',originalSha:'old'}),/다른 곳에서 수정/);
await assert.rejects(()=>new GitHubClient('k',transport({login:'someone-else'}).fn).connect(),/goya-jin 계정/);
client.disconnect();await assert.rejects(()=>client.connect(),/연결해/);
console.log('PASS: Korean text, attachments, size/type limits, metadata, owner gate, atomic publication, concurrent-edit protection, disconnect.');
