export const escapeHTML=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function installCanvasTypes(editor){
 const dc=editor.DomComponents;
 dc.addType('text',{extend:'text',view:{events:{click:'onActive',dblclick:'onActive',input:'onInput'}}});
 dc.addType('portfolio-content',{isComponent:el=>el.nodeType===1&&el.hasAttribute('data-canvas-root'),model:{defaults:{tagName:'article',draggable:false,removable:false,copyable:false,droppable:true,editable:false}}});
 dc.addType('portfolio-main',{isComponent:el=>el.tagName==='MAIN',model:{defaults:{tagName:'main',draggable:false,removable:false,copyable:false,droppable:true,editable:false}}});
 dc.addType('portfolio-columns',{isComponent:el=>el.tagName==='COLUMN-SET',model:{defaults:{tagName:'column-set',droppable:'column-unit',editable:false,name:'컬럼'}}});
 dc.addType('portfolio-copy-column',{extend:'text',isComponent:el=>el.tagName==='COLUMN-UNIT'&&!el.querySelector('img,video,iframe,column-set,.gallery')&&el.textContent.trim()?{type:'portfolio-copy-column'}:false,model:{defaults:{tagName:'column-unit',droppable:true,editable:true,name:'텍스트 컬럼'}}});
 dc.addType('portfolio-column',{isComponent:el=>el.tagName==='COLUMN-UNIT'&&Boolean(el.querySelector('img,video,iframe,column-set,.gallery')||!el.textContent.trim()),model:{defaults:{tagName:'column-unit',droppable:true,editable:false,name:'컬럼'}}});
 editor.on('component:add',component=>{
  if(['aside','footer','header'].includes(component.get('tagName'))||component.getAttributes().class?.includes('menu-toggle')||component.getAttributes()['data-canvas-chrome'])lockChrome(component);
 });
}
export function lockChrome(component){component.set({editable:false,draggable:false,droppable:false,selectable:false,hoverable:false,removable:false,copyable:false});component.components().forEach(lockChrome)}
export function mainComponent(editor){return editor.getWrapper()?.findType('portfolio-content')[0]||editor.getWrapper()?.findType('portfolio-main')[0]}
export function isInMain(component){let current=component;while(current){if(current.get('tagName')==='main')return true;current=current.parent()}return false}
export function selectedBlock(editor){let c=editor.getSelected(),root=mainComponent(editor),current=c,inside=false;while(current){if(current===root){inside=true;break}current=current.parent()}if(!inside)return root;if(c.get('tagName')==='img'&&c.parent()?.get('tagName')==='figure')c=c.parent();return c}
export async function flushCanvasText(editor){const view=editor.getEditing()?.getView();if(view?.disableEditing)await view.disableEditing()}
export function captureCanvasCaret(editor){
 const component=editor?.getEditing(),el=component?.getEl(),selection=el?.ownerDocument.getSelection();if(!el||!selection?.rangeCount)return null;
 const range=selection.getRangeAt(0);if(!el.contains(range.endContainer))return null;
 const before=range.cloneRange(),after=range.cloneRange();before.selectNodeContents(el);before.setEnd(range.endContainer,range.endOffset);after.selectNodeContents(el);after.setStart(range.endContainer,range.endOffset);
 const html=r=>{const div=el.ownerDocument.createElement('div');div.append(r.cloneContents());return div.innerHTML};
 return {component,source:el.innerHTML,before:html(before),after:html(after)};
}
export async function insertCanvasBlock(editor,html,remembered){
 const caret=remembered||captureCanvasCaret(editor),valid=caret?.component.parent()&&caret.component.getEl()?.innerHTML===caret.source;
 await flushCanvasText(editor);
 if(valid&&caret.component.get('tagName')!=='column-unit'){
  const c=caret.component,original=c.toHTML(),opening=original.slice(0,original.indexOf('>')+1),closing=original.slice(original.lastIndexOf('</'));
  const before=caret.before.replace(/<br\s*\/?>/gi,'').trim()?opening+caret.before+closing:'',after=caret.after.replace(/<br\s*\/?>/gi,'').trim()?opening+caret.after+closing:'<p data-gjs-type="text"><br></p>';
  const added=c.replaceWith(before+html+after);editor.select(added[before?1:0]);return added;
 }

 const current=selectedBlock(editor),main=mainComponent(editor);if(!main)throw Error('본문을 다시 불러와 주세요.');
 const container=current===main||current?.get('tagName')==='column-unit';
 const parent=container?current:current?.parent();
 const added=(parent||main).append(html,container?{}:{at:current.index()+1});
 editor.select(added[0]);return added;
}
export function columnHTML(count=2){return `<column-set data-visual-columns="${count}" style="display:flex;gap:12px;margin:0 0 var(--writing-paragraph-gap,1.2em)">${Array.from({length:count},()=>'<column-unit style="flex:1;min-width:0"><p data-gjs-type="text" style="min-height:1.4em"><br></p></column-unit>').join('')}</column-set>`}
export function photoHTML(items){
 const images=items.map(i=>`<figure style="margin:0;width:100%"><img src="${escapeHTML(i.src)}" alt="${escapeHTML(i.name)}" style="width:100%;height:auto"/></figure>`).join('');
 return items.length===2?`<div data-visual-photos="2" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0 0 var(--writing-paragraph-gap,1.2em)">${images}</div>`:images;
}
export function pairNextPhoto(editor){
 const c=selectedBlock(editor);if(!c||c.get('tagName')!=='figure')return false;
 const parent=c.parent(),next=parent.components().at(c.index()+1);if(!next||next.get('tagName')!=='figure')return false;
 const html=[c,next].map(n=>{n.addStyle({width:'100%',margin:'0'});return n.toHTML()}).join(''),index=c.index();
 next.remove();c.remove();const added=parent.append(`<div data-visual-photos="2" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0 0 var(--writing-paragraph-gap,1.2em)">${html}</div>`,{at:index});editor.select(added[0]);return true;
}
export function splitPhotoRow(editor){const c=selectedBlock(editor);let row=c;if(!row?.getAttributes()['data-visual-photos'])row=c?.parent();if(!row?.getAttributes()['data-visual-photos'])return false;const parent=row.parent(),index=row.index(),html=row.components().map(n=>n.toHTML()).join('');row.remove();editor.select(parent.append(html,{at:index})[0]);return true}
export function exportCanvas(editor){const main=mainComponent(editor);if(!main)throw Error('본문을 확인하지 못했습니다.');return {html:main.components().filter(c=>!c.getAttributes()['data-canvas-chrome']).map(c=>c.toHTML()).join(''),css:editor.getCss()||''}}

export function activeTextDraft(editor){const editing=editor.getEditing();if(!editing)return null;const indices=[];let c=editing,main=mainComponent(editor);while(c&&c!==main){indices.unshift(c.index());c=c.parent()}return c===main?{indices,html:editing.getEl()?.innerHTML||''}:null}
export function restoreActiveText(editor,draft){if(!draft)return;let c=mainComponent(editor);for(const i of draft.indices||[])c=c?.components().at(i);if(c)c.components(draft.html)}

export function nearestColumns(component){let c=component;while(c){if(c.get('tagName')==='column-set')return c;c=c.parent()}return null}

export async function setCanvasColumns(editor,count){
 await flushCanvasText(editor);const current=selectedBlock(editor),row=nearestColumns(current);let selected;
 if(row){
  if(count===1){const html=row.components().map(c=>c.components().map(n=>n.toHTML()).join('')).join('');selected=row.replaceWith(html)[0]}
  else{while(row.components().length>count){const removed=row.components().at(count);row.components().at(count-1).append(removed.components().map(c=>c.toHTML()).join(''));removed.remove()}while(row.components().length<count)row.append('<column-unit style="flex:1;min-width:0"><p data-gjs-type="text" style="min-height:1.4em"><br></p></column-unit>');row.components().forEach(c=>c.addStyle({flex:'1'}));selected=row}
 }else if(count>1){
  if(current&&current!==mainComponent(editor)){const contents=current.toHTML(),html=columnHTML(count).replace('<p data-gjs-type="text" style="min-height:1.4em"><br></p>',contents);selected=current.replaceWith(html)[0]}
  else selected=(await insertCanvasBlock(editor,columnHTML(count)))[0];
 }
 if(selected)editor.select(selected);return selected;
}
