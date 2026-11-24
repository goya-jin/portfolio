const tag=c=>c?.get('tagName');
const classes=c=>(c?.getAttributes().class||'').split(/\s+/);
export function photoSpacingTarget(selected){
 if(!selected)return null;
 const media=['img','figure','video','iframe'].includes(tag(selected))||selected.find?.('img,video,iframe').length;
 if(!media)return null;
 let c=selected,figure=null;
 while(c&&tag(c)!=='main'&&!c.getAttributes()['data-canvas-root']){
  if(tag(c)==='figure')figure=c;
  if(tag(c)==='column-set'||classes(c).includes('gallery')||c.getAttributes()['data-visual-photos'])return c;
  c=c.parent();
 }
 return figure||(['img','video','iframe'].includes(tag(selected))?selected:null);
}
export function spacingValue(target,property){
 const el=target?.getEl(),computed=el?.ownerDocument.defaultView?.getComputedStyle(el);
 if(computed){const n=parseFloat(computed.getPropertyValue(property));if(Number.isFinite(n))return n;}
 const style=target?.getStyle()||{};
 if(style[property]!==undefined)return parseFloat(style[property])||0;
 if(property.startsWith('margin-')){
  const parts=String(style.margin||'0').split(/\s+/);return parseFloat(parts[property==='margin-top'?0:(parts.length>2?2:0)])||0;
 }
 return parseFloat(style.gap)||0;
}
export function setPhotoSpacing(target,property,value){
 if(!target||!['margin-top','margin-bottom','row-gap','column-gap'].includes(property)||value===''||!Number.isFinite(Number(value)))return false;
 const n=Math.round(Math.max(0,Math.min(240,Number(value)))*10)/10,px=n+'px';
 const styles={[property]:px};
 // Existing column widths use this variable, including a shared !important default.
 if(property==='column-gap'&&tag(target)==='column-set')styles['--column-gap']=px+' !important';
 target.addStyle(styles);return true;
}
