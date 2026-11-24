import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fontDefinitions,matchingTextFonts,loadLocalNeue} from '../lib/local-font-preview.mjs';
test('browser-reported full and PostScript names are used before guessed aliases',()=>{
 const fonts=[{family:'Neue Haas Grotesk Text Pro',style:'65 Medium',fullName:'Neue Haas Text Medium on this Mac',postscriptName:'CloudTextMedium65'}, {family:'Neue Haas Grotesk Display Pro',style:'65 Medium',fullName:'Display',postscriptName:'Display65'}, {family:'Neue Haas Grotesk Text Pro',style:'66 Medium Italic',fullName:'Italic',postscriptName:'Italic66'}];
 assert.equal(matchingTextFonts(fonts).length,2);const medium=fontDefinitions(fonts).find(f=>f.weight==='500');assert.deepEqual(medium.names.slice(0,2),['CloudTextMedium65','Neue Haas Text Medium on this Mac']);assert.ok(!medium.names.includes('Display65'));assert.ok(!medium.names.includes('Italic66'));
});
test('local fonts resolve in the parent document and the actual loaded face is shared with the preview',async()=>{
 const parentAdded=[],frameAdded=[],requests=[];
 class TopLevelFontFace{constructor(family,src,options){this.family=family;this.src=src;this.weight=options.weight;requests.push(this)}async load(){if(this.weight==='500')return this;throw Object.assign(Error('not available'),{name:'NotFoundError'})}}
 const result=await loadLocalNeue({FontFace:TopLevelFontFace,document:{fonts:{add:f=>parentAdded.push(f)}}},{fonts:{add:f=>frameAdded.push(f)}});
 assert.equal(result.mediumLoaded,true);assert.deepEqual(result.loadedWeights,['500']);assert.equal(parentAdded.length,1);assert.equal(frameAdded[0],parentAdded[0]);assert.equal(requests[0].weight,'500');
});
test('bold alone never passes as the requested Medium and unsupported APIs are distinct',async()=>{
 class OnlyBold{constructor(family,src,options){this.weight=options.weight}async load(){if(this.weight==='700')return this;throw Error('no Medium')}}
 const result=await loadLocalNeue({FontFace:OnlyBold,document:{fonts:{add(){}}}},{fonts:{add(){}}});assert.equal(result.mediumLoaded,false);assert.deepEqual(result.loadedWeights,['700']);assert.equal((await loadLocalNeue({},{})).reason,'unsupported');
});
test('the comparison omits personal reference names, forced reinstall instructions and font byte extraction',()=>{
 const page=readFileSync(new URL('../app/font-preview/page.jsx',import.meta.url),'utf8'),sample=readFileSync(new URL('../app/font-preview/sample.json',import.meta.url),'utf8'),helper=readFileSync(new URL('../lib/local-font-preview.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(page+sample,/jeongin|정인 사이트/i);assert.doesNotMatch(page,/Install family/);assert.doesNotMatch(page+helper,/\.blob\s*\(/);assert.match(page,/queryLocalFonts/);assert.match(page,/미리보기 설정/);
});
