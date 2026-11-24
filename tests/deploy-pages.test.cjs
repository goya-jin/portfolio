const test = require('node:test');
const assert = require('node:assert/strict');
const deploy = require('../scripts/deploy-pages.cjs');
function fixture(states) {
 const calls=[],outputs={};
 return {calls,outputs,github:{request:async(route,args)=>{calls.push({route,args});if(route.startsWith('POST'))return {data:{id:'deployment',page_url:'https://example.com'}};const state=states.shift();if(state instanceof Error)throw state;return {data:{status:state}}}},context:{repo:{owner:'owner',repo:'repo'},sha:'head'},core:{getIDToken:async()=> 'secret',setSecret:()=>{},info:()=>{},warning:()=>{},setOutput:(k,v)=>outputs[k]=v},artifactId:'12345',delay:async()=>{},attempts:3};
}
test('deploys the exact uploaded ID without listing artifacts, waits for success',async()=>{const f=fixture(['queued','succeed']);await deploy(f);assert.equal(f.calls[0].args.artifact_id,12345);assert.equal(f.calls[0].args.oidc_token,'secret');assert.equal(f.outputs.page_url,'https://example.com');assert.equal(f.outputs.status,'succeed');assert.equal(f.calls.length,3)});
test('retries transient status errors without creating a second deployment',async()=>{const f=fixture([Object.assign(Error('temporary'),{status:503}),'succeed']);await deploy(f);assert.equal(f.calls.filter(c=>c.route.startsWith('POST')).length,1)});
test('reports terminal deployment failure and never reports success',async()=>{const f=fixture(['deployment_content_failed']);await assert.rejects(deploy(f),/deployment_content_failed/);assert.equal(f.outputs.status,undefined)});
test('rejects missing upload ID and bounds waiting',async()=>{const f=fixture([]);f.artifactId='';await assert.rejects(deploy(f),/artifact ID/);assert.equal(f.calls.length,0);const g=fixture(['queued','queued','queued']);await assert.rejects(deploy(g),/did not finish/)});
