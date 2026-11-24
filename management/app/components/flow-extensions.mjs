import {Node,Extension,Mark} from '@tiptap/core';
export const WritingColumns=Node.create({name:'writingColumns',group:'block',content:'writingColumn+',defining:true,parseHTML(){return [{tag:'column-set'}]},renderHTML({HTMLAttributes}){return ['column-set',{...HTMLAttributes,style:HTMLAttributes.style||'display:flex;gap:12px'},0]}});
export const WritingColumn=Node.create({name:'writingColumn',content:'block+',defining:true,parseHTML(){return [{tag:'column-unit'}]},renderHTML({HTMLAttributes}){return ['column-unit',{...HTMLAttributes,style:HTMLAttributes.style||'flex:1;min-width:0'},0]}});
// Keep saved layout identifiers and formatting when opening an existing canvas post.
export const FlowAttributes=Extension.create({name:'flowAttributes',addGlobalAttributes(){return [{types:['paragraph','heading','blockquote','bulletList','orderedList','listItem','writingColumns','writingColumn','writingBubble','writingImage','table','tableRow','tableCell','tableHeader','bold','italic','underline','strike'],attributes:{id:{default:null},class:{default:null},style:{default:null}}}]}});
export const FlowTextStyle=Mark.create({name:'flowTextStyle',addAttributes(){return {style:{default:null},class:{default:null}}},parseHTML(){return [{tag:'span[style]'},{tag:'span[class]'}]},renderHTML({HTMLAttributes}){return ['span',HTMLAttributes,0]}});
export const flowExtensions=()=>[WritingColumns,WritingColumn,FlowAttributes,FlowTextStyle];
export function columnContent(count){return {type:'writingColumns',content:Array.from({length:count},()=>({type:'writingColumn',content:[{type:'paragraph'}]}))}}
export function scopeFlowCSS(css){
 if(!css||typeof CSSStyleSheet==='undefined')return '';
 try{
  const sheet=new CSSStyleSheet();sheet.replaceSync(css);
  const root='.writing-flow .tiptap';
  const rules=items=>Array.from(items).map(rule=>{
   if(rule.selectorText)return rule.selectorText.split(',').map(selector=>{
    const scoped=selector.trim().replace(/(^|\s)(?:html|body|:root)(?=\s|[.:#\[]|$)/g,(_,space)=>space+root);
    return scoped.startsWith(root)?scoped:root+' '+scoped;
   }).join(',')+'{'+rule.style.cssText+'}';
   if(rule.cssRules&&/^@(media|supports|layer)\b/.test(rule.cssText))return rule.cssText.slice(0,rule.cssText.indexOf('{'))+'{'+rules(rule.cssRules)+'}';
   return '';
  }).join('\n');
  return rules(sheet.cssRules);
 }catch{return ''}
}
