import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const code=readFileSync(new URL('../freshness.js',import.meta.url),'utf8');
const old='111111111111',latest='222222222222';
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function page({version=old,href='https://example.com/portfolio/writing/post/index.html?v='+old+'#section',links=[],offline=false}={}){
 const replaced=[],requests=[],events={},documentEvents={};let published=latest;
 const anchors=links.map(href=>({href,getAttribute(){return this.href},hasAttribute(){return false}}));
 const location={href,replace(url){replaced.push(url);this.href=url}};
 const document={currentScript:{src:'https://example.com/portfolio/freshness.js?v='+version,dataset:{siteVersion:version}},visibilityState:'visible',querySelectorAll(){return anchors},addEventListener(name,fn){documentEvents[name]=fn}};
 runInNewContext(code,{document,location,URL,Date,window:{addEventListener(name,fn){events[name]=fn}},fetch:async(url,options)=>{requests.push({url,cache:options.cache});if(offline)throw Error('offline');return {ok:true,json:async()=>({version:published})}}});
 return {replaced,requests,events,documentEvents,anchors,setVersion(value){published=value}};
}
test('an old bookmarked URL automatically moves to the published version and keeps its anchor',async()=>{
 const p=page();await settle();assert.equal(p.replaced.length,1);const url=new URL(p.replaced[0]);assert.equal(url.searchParams.get('v'),latest);assert.equal(url.hash,'#section');assert.equal(p.requests[0].cache,'no-store');assert.ok(new URL(p.requests[0].url).searchParams.has('_'));
});
test('current pages stay in place and refresh only local HTML navigation links',async()=>{
 const p=page({version:latest,links:['../index.html?v='+old,'/portfolio/','https://external.example/a.html','#section','../photo.jpg','mailto:test@example.com']});await settle();assert.equal(p.replaced.length,0);assert.equal(new URL(p.anchors[0].href).searchParams.get('v'),latest);assert.equal(new URL(p.anchors[1].href).searchParams.get('v'),latest);assert.deepEqual(p.anchors.slice(2).map(a=>a.href),['https://external.example/a.html','#section','../photo.jpg','mailto:test@example.com']);
});
test('restoring an old tab rechecks the deployment and temporary CDN lag cannot cause a reload loop',async()=>{
 const p=page({version:latest});await settle();p.setVersion('333333333333');p.events.pageshow();await settle();assert.equal(p.replaced.length,1);
 const lag=page({href:'https://example.com/portfolio/index.html?v='+latest});await settle();assert.equal(lag.replaced.length,0);
});
test('offline pages and invalid manifests remain readable',async()=>{
 const p=page({offline:true});await settle();assert.equal(p.replaced.length,0);
 const invalid=page({version:latest});await settle();invalid.setVersion('invalid/redirect');invalid.documentEvents.visibilitychange();await settle();assert.equal(invalid.replaced.length,0);
});
