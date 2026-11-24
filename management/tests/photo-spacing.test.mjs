import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readCanvas,applyCanvas} from '../lib/visual-project.mjs';
const dom=new JSDOM('<html><body></body></html>');
for(const key of ['window','document','Node','Element','HTMLElement','DOMParser','MutationObserver'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
const {default:grapesjs}=await import('grapesjs');
const {installCanvasTypes,exportCanvas}=await import('../app/components/canvas-tools.mjs');
const {photoSpacingTarget,setPhotoSpacing,spacingValue}=await import('../app/components/photo-spacing.mjs');
function find(e,tag){const result=[];function visit(c){if(c.get('tagName')===tag||c.getAttributes().class===tag.slice(1))result.push(c);c.components().forEach(visit)}visit(e.getWrapper());return result;}
function editor(html){const e=grapesjs.init({headless:true,storageManager:false,avoidInlineStyle:false,plugins:[installCanvasTypes]});e.setComponents(html);return e;}
test('photo selection targets its entire gallery or column row, standalone photos remain independent',()=>{
 const e=editor('<main><div class="gallery"><figure><img src="https://example.com/a.jpg"><figcaption>Credit</figcaption></figure><figure><img src="https://example.com/b.jpg"></figure></div><column-set><column-unit><figure><img src="https://example.com/c.jpg"></figure></column-unit></column-set><figure><img src="https://example.com/d.jpg"></figure></main>');
 const imgs=find(e,'img'),gallery=find(e,'.gallery')[0],row=find(e,'column-set')[0];
 assert.equal(photoSpacingTarget(imgs[0]),gallery);assert.equal(photoSpacingTarget(imgs[1]),gallery);assert.equal(photoSpacingTarget(imgs[2]),row);assert.equal(photoSpacingTarget(imgs[3]),imgs[3].parent());assert.equal(photoSpacingTarget(find(e,'figcaption')[0]),null);e.destroy();
});
test('spacing survives sanitized save/reopen with captions, source, image URLs and unrelated page content intact',()=>{
 const original='<html><head></head><body><aside>Menu</aside><main><div class="gallery"><figure><img src="https://example.com/a.jpg"><figcaption>Photo <a href="https://example.com/source">Source</a></figcaption></figure><figure><img src="https://example.com/b.jpg"></figure></div><p>Keep text</p></main></body></html>';
 const e=editor(readCanvas(original).body),target=photoSpacingTarget(find(e,'img')[0]);
 for(const [property,value] of [['margin-top',24],['margin-bottom',60],['column-gap',18],['row-gap',36]])setPhotoSpacing(target,property,value);
 const saved=applyCanvas(original,exportCanvas(e)),reopened=editor(readCanvas(saved).body);reopened.setStyle(readCanvas(saved).customCSS);reopened.setComponents(readCanvas(saved).body);
 const next=photoSpacingTarget(find(reopened,'img')[0]);
 const savedAgain=applyCanvas(saved,exportCanvas(reopened)),published=new JSDOM(savedAgain),style=published.window.getComputedStyle(published.window.document.querySelector('.gallery'));
 for(const [property,value] of [['margin-top',24],['margin-bottom',60],['column-gap',18],['row-gap',36]])assert.equal(parseFloat(style.getPropertyValue(property)),value);
 assert.match(saved,/Keep text/);assert.match(saved,/Photo/);assert.match(saved,/https:\/\/example.com\/source/);assert.match(saved,/https:\/\/example.com\/a.jpg/);assert.match(saved,/<aside>Menu<\/aside>/);e.destroy();reopened.destroy();
});
test('column gutter updates its width calculation variable and undo, invalid values and zero work',()=>{
 const e=editor('<main><column-set><column-unit><img src="https://example.com/a.jpg"></column-unit></column-set></main>'),target=photoSpacingTarget(find(e,'img')[0]);
 setPhotoSpacing(target,'column-gap',24);assert.equal(target.getStyle()['--column-gap'],'24px !important');assert.equal(target.getStyle()['column-gap'],'24px');
 setPhotoSpacing(target,'margin-bottom',48);e.UndoManager.undo();assert.equal(target.getStyle()['margin-bottom'],undefined);setPhotoSpacing(target,'margin-bottom',0);assert.equal(target.getStyle()['margin-bottom'],'0px');
 assert.equal(setPhotoSpacing(target,'margin-bottom',''),false);assert.equal(setPhotoSpacing(target,'margin-bottom',NaN),false);assert.equal(target.getStyle()['margin-bottom'],'0px');e.destroy();
});
