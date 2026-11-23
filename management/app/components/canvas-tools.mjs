export const escapeHTML=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function installCanvasTypes(editor){
 const dc=editor.DomComponents;
 dc.addType('portfolio-main',{isComponent:el=>el.tagName==='MAIN',model:{defaults:{tagName:'main',draggable:false,removable:false,copyable:false,droppable:true,editable:false}}});
 dc.addType('portfolio-columns',{isComponent:el=>el.tagName==='COLUMN-SET',model:{defaults:{tagName:'column-set',droppable:'column-unit',editable:false,name:'컬럼'}}});
 dc.addType('portfolio-copy-column',{extend:'text',isComponent:el=>el.tagName==='COLUMN-UNIT'&&!el.querySelector('img,video,iframe,column-set,.gallery')&&el.textContent.trim()?{type:'portfolio-copy-column'}:false,model:{defaults:{tagName:'column-unit',droppable:true,editable:true,name:'텍스트 컬럼'}}});
 dc.addType('portfolio-column',{isComponent:el=>el.tagName==='COLUMN-UNIT'&&Boolean(el.querySelector('img,video,iframe,column-set,.gallery')||!el.textContent.trim()),model:{defaults:{tagName:'column-unit',droppable:true,editable:false,name:'컬럼'}}});
 editor.on('component:add',component=>{
  if(['aside','footer','header'].includes(component.get('tagName'))||component.getAttributes().class?.includes('menu-toggle'))lockChrome(component);
 });
}
export function lockChrome(component){component.set({editable:false,draggable:false,droppable:false,selectable:false,hoverable:false,removable:false,copyable:false});component.components().forEach(lockChrome)}
export function mainComponent(editor){return editor.getWrapper()?.findType('portfolio-main')[0]}
export function isInMain(component){let current=component;while(current){if(current.get('tagName')==='main')return true;current=current.parent()}return false}
export function selectedBlock(editor){let c=editor.getSelected();if(!isInMain(c))return mainComponent(editor);if(c.get('tagName')==='img'&&c.parent()?.get('tagName')==='figure')c=c.parent();return c}
export async function flushCanvasText(editor){const view=editor.getEditing()?.getView();if(view?.disableEditing)await view.disableEditing()}
export async function insertCanvasBlock(editor,html){
 await flushCanvasText(editor);
 const current=selectedBlock(editor),main=mainComponent(editor);if(!main)throw Error('본문을 다시 불러와 주세요.');
 const container=current===main||current?.get('tagName')==='column-unit';
 const parent=container?current:current?.parent();
 const added=(parent||main).append(html,container?{}:{at:current.index()+1});
 editor.select(added[0]);return added;
}
export function columnHTML(count=2){return `<column-set data-visual-columns="${count}" style="display:flex;gap:12px;margin:1em 0">${Array.from({length:count},()=>'<column-unit style="flex:1;min-width:0"><p data-gjs-type="text" style="min-height:1.4em"><br></p></column-unit>').join('')}</column-set>`}
export function photoHTML(items){
 const images=items.map(i=>`<figure style="margin:0;width:100%"><img src="${escapeHTML(i.src)}" alt="${escapeHTML(i.name)}" style="width:100%;height:auto"/></figure>`).join('');
 return items.length===2?`<div data-visual-photos="2" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:1em 0">${images}</div>`:images;
}
export function pairNextPhoto(editor){
 const c=selectedBlock(editor);if(!c||c.get('tagName')!=='figure')return false;
 const parent=c.parent(),next=parent.components().at(c.index()+1);if(!next||next.get('tagName')!=='figure')return false;
 const html=[c,next].map(n=>{n.addStyle({width:'100%',margin:'0'});return n.toHTML()}).join(''),index=c.index();
 next.remove();c.remove();const added=parent.append(`<div data-visual-photos="2" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:1em 0">${html}</div>`,{at:index});editor.select(added[0]);return true;
}
export function splitPhotoRow(editor){const c=selectedBlock(editor);let row=c;if(!row?.getAttributes()['data-visual-photos'])row=c?.parent();if(!row?.getAttributes()['data-visual-photos'])return false;const parent=row.parent(),index=row.index(),html=row.components().map(n=>n.toHTML()).join('');row.remove();editor.select(parent.append(html,{at:index})[0]);return true}
export function exportCanvas(editor){const main=mainComponent(editor);if(!main)throw Error('본문을 확인하지 못했습니다.');return {html:main.components().map(c=>c.toHTML()).join(''),css:editor.getCss()||''}}

export function activeTextDraft(editor){const editing=editor.getEditing();if(!editing)return null;const indices=[];let c=editing,main=mainComponent(editor);while(c&&c!==main){indices.unshift(c.index());c=c.parent()}return c===main?{indices,html:editing.getEl()?.innerHTML||''}:null}
export function restoreActiveText(editor,draft){if(!draft)return;let c=mainComponent(editor);for(const i of draft.indices||[])c=c?.components().at(i);if(c)c.components(draft.html)}

export function nearestColumns(component){let c=component;while(c){if(c.get('tagName')==='column-set')return c;c=c.parent()}return null}
