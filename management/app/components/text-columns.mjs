import {flushCanvasText,mainComponent,selectedBlock,nearestColumns} from './canvas-tools.mjs';
const tag=c=>c?.get('tagName');
const attr=(c,k)=>c?.getAttributes()[k];
const empty='<p><br></p>';
export const TEXT_COLUMNS_CSS='main column-set[data-text-columns]{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:var(--column-gap,12px);row-gap:12px;align-items:start;margin-bottom:var(--writing-paragraph-gap,1.2em)}main column-set[data-text-columns][data-text-ratio="left"]{grid-template-columns:minmax(0,2fr) minmax(0,1fr)}main column-set[data-text-columns][data-text-ratio="right"]{grid-template-columns:minmax(0,1fr) minmax(0,2fr)}main column-set[data-text-columns]>column-unit[data-text-cell]{display:block;min-width:0;width:auto;max-width:100%;min-height:1.5em}main [data-text-cell]>:first-child{margin-top:0}main [data-text-cell]>:last-child{margin-bottom:0}@media(max-width:760px){main column-set[data-text-columns],main column-set[data-text-columns][data-text-ratio]{grid-template-columns:minmax(0,1fr)}}';
export function textCell(component){let c=component;while(c){if(attr(c,'data-text-cell'))return c;c=c.parent()}return null;}
export function textColumns(component){let c=component;while(c){if(attr(c,'data-text-columns'))return c;c=c.parent()}return null;}
function descendants(component,predicate){return component.components().some(c=>predicate(c)||descendants(c,predicate));}
function hasMedia(component){return ['img','figure','video','iframe','audio','table'].includes(tag(component))||descendants(component,c=>['img','figure','video','iframe','audio','table'].includes(tag(c)));}
export function installTextColumns(editor){
 const dc=editor.DomComponents;
 dc.addType('simple-text-cell',{extend:'text',isComponent:el=>el.nodeType===1&&el.hasAttribute('data-text-cell'),model:{defaults:{tagName:'column-unit',editable:true,draggable:false,droppable:false,removable:false,copyable:false,toolbar:[],name:'본문'}},view:{events:{click:'onActive',dblclick:'onActive',input:'onInput'}}});
 dc.addType('simple-text-columns',{isComponent:el=>el.nodeType===1&&el.hasAttribute('data-text-columns'),model:{defaults:{tagName:'column-set',droppable:false,editable:false,name:'텍스트 2열'}}});
 const protect=c=>{const cell=textCell(c);if(cell&&cell!==c)c.set({selectable:false,hoverable:false,editable:false,draggable:false,droppable:false,removable:false,copyable:false,toolbar:[]});};
 editor.on('component:add',protect);editor.on('component:mount',protect);
}
export function textColumnsHTML(left=empty,right=empty){return '<column-set data-text-columns="true" mobile-stack="true"><column-unit data-text-cell="left">'+left+'</column-unit><column-unit data-text-cell="right">'+right+'</column-unit></column-set>';}
function cellHTML(cell){
 // Flatten layout wrappers, retaining their text and inline formatting in reading order.
 const flatten=c=>tag(c)==='column-set'||tag(c)==='column-unit'?c.components().map(flatten).join(''):c.toHTML();
 const html=cell.components().map(flatten).join('')||cell.get('content')||'';
 return html.trim()?(/<(?:p|h[1-6]|ul|ol|div|blockquote|pre)\b/i.test(html)?html:'<p>'+html+'</p>'):empty;
}
function focusCell(editor,row,index=0){const cell=row.components().at(index)||row.components().at(0);editor.select(cell);cell?.trigger('active');return cell;}
export async function makeTextColumns(editor,preferred){
 const editing=editor.getEditing(),remembered=editing||(preferred?.parent()?preferred:selectedBlock(editor)),inside=textCell(remembered),existing=textColumns(remembered);
 await flushCanvasText(editor);
 if(existing){focusCell(editor,existing,inside?.index()||0);return existing;}
 let row=nearestColumns(remembered),outer=row;
 while(outer?.parent()&&nearestColumns(outer.parent())&&!hasMedia(nearestColumns(outer.parent())))outer=nearestColumns(outer.parent());
 if(outer&&!hasMedia(outer))row=outer;
 let created;
 if(row&&!hasMedia(row)){
  const cells=row.components().map(cellHTML);created=row.replaceWith(textColumnsHTML(cells[0]||empty,cells.slice(1).join('')||empty))[0];
 }else{
  const root=mainComponent(editor);if(!root)throw Error('본문을 다시 불러와 주세요.');
  let anchor=remembered;
  if(row)anchor=row;
  if(anchor&&anchor!==root&&!hasMedia(anchor)&&['p','div','h1','h2','h3','blockquote'].includes(tag(anchor)))created=anchor.replaceWith(textColumnsHTML(anchor.toHTML()))[0];
  else{
   while(anchor?.parent()&&anchor.parent()!==root)anchor=anchor.parent();
   created=root.append(textColumnsHTML(),anchor&&anchor!==root?{at:anchor.index()+1}:{})[0];
  }
 }
 focusCell(editor,created);return created;
}
export async function mergeTextColumns(editor,preferred){
 const row=textColumns(editor.getEditing()||(preferred?.parent()?preferred:selectedBlock(editor)));if(!row)return null;
 await flushCanvasText(editor);const html=row.components().map(cellHTML).join(''),added=row.replaceWith(html);editor.select(added[0]);added[0]?.trigger('active');return added;
}
export function setTextRatio(row,ratio){if(!row||!['equal','left','right'].includes(ratio))return;row.addAttributes({'data-text-ratio':ratio});}
