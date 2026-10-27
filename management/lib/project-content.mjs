const spaces={none:'0',small:'clamp(6px,1vw,12px)',medium:'clamp(12px,2vw,24px)',large:'clamp(24px,4vw,48px)',xl:'clamp(40px,6vw,80px)'};
export const spacingValue=value=>spaces[value]||spaces.medium;
export function validateBlocks(blocks){if(!Array.isArray(blocks)||blocks.length>100||new Set(blocks.map(b=>b.id)).size!==blocks.length||blocks.some(b=>!b||typeof b.id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(b.id)||!['text','divider','space'].includes(b.type)||typeof b.hidden!=='boolean'||!Object.hasOwn(spaces,b.before)||!Object.hasOwn(spaces,b.after)||!['left','center','right'].includes(b.align)||![50,75,100].includes(b.width)||typeof b.text!=='string'||b.text.length>20000))throw Error('글·구분선·여백 설정을 확인해 주세요.')}
export function readGroupContent($,parent){const area=$(parent).children('[data-project-group-content]').first(),raw=area.attr('data-project-blocks');return {blocks:raw?JSON.parse(raw):[],gap:$(parent).attr('data-project-gap')||'original'}}
export function writeGroupContent($,parent,config,allHidden){
 if(config.gap!==undefined&&config.gap!=='original'){
  if(!['small','medium','large'].includes(config.gap))throw Error('사진 간격을 확인해 주세요.');
  const node=$(parent),gap=spacingValue(config.gap);node.attr('data-project-gap',config.gap);if(node.hasClass('gallery'))node.css('--gallery-gap',gap).css('--mobile-gallery-gap',gap);
 }
 if(config.blocks===undefined)return;validateBlocks(config.blocks);
 const old=$(parent).children('[data-project-group-content]').first();
 if(!config.blocks.length){old.remove();return}
 const area=old.length?old:$('<div data-project-group-content="true" style="grid-column:1 / -1;width:100%;min-width:0"></div>');area.empty().attr('data-project-blocks',JSON.stringify(config.blocks));
 for(const b of config.blocks){let el;
  if(b.type==='text')el=$('<div></div>').text(b.text).css({'white-space':'pre-wrap','overflow-wrap':'anywhere','line-height':'1.6'});
  else if(b.type==='divider')el=$('<hr>').css({border:'0','border-top':'1px solid currentColor',height:'0',width:b.width+'%','max-width':'100%',opacity:'.5'});
  else el=$('<div aria-hidden="true"></div>').css('height',spacingValue(b.after==='none'?'medium':b.after));
  el.attr('data-project-block-id',b.id).css({'margin-top':spacingValue(b.before),'margin-bottom':b.type==='space'?'0':spacingValue(b.after),'text-align':b.align,'box-sizing':'border-box'});
  if(b.type==='divider')el.css({'margin-left':b.align==='left'?'0':'auto','margin-right':b.align==='right'?'0':'auto'});
  if(b.hidden)el.attr('hidden','').css('display','none');area.append(el);
 }
 if(allHidden)area.attr('hidden','').css('display','none');else area.removeAttr('hidden').css('display','');
 const caption=$(parent).children('[data-project-group-caption]').first();if(caption.length)caption.after(area);else{const last=$(parent).children('figure,img,video,iframe,audio').last();if(last.length)last.after(area);else $(parent).append(area)}
}
function readable($,el){const clone=$(el).clone();clone.find('br').replaceWith('\n');return clone.text().replace(/[^\S\n]+/g,' ').split('\n').map(s=>s.trim()).join('\n').replace(/\n{3,}/g,'\n\n').trim()}
export function paragraphNodes($){
 const candidates=$('main column-unit,main p,main h1,main h2,main h3,main figcaption').toArray().filter(el=>{
  const n=$(el);return n.text().trim()&&!n.closest('[data-project-group-caption],[data-project-group-content]').length&&!n.find('img,video,iframe,audio,figure,script,style,column-set,a').length&&!n.is('[data-project-group-caption],[data-project-group-content]');
 });const chosen=new Set(candidates);return candidates.filter(el=>{let n=el.parent;while(n){if(chosen.has(n))return false;n=n.parent}return true});
}
export function readParagraphs($){return paragraphNodes($).map((el,id)=>({id,text:readable($,el),spacing:$(el).attr('data-project-paragraph-spacing')||'original'}))}
export function writeParagraphs($,paragraphs){if(paragraphs===undefined)return;const nodes=paragraphNodes($),original=readParagraphs($);if(!Array.isArray(paragraphs)||paragraphs.length!==nodes.length||paragraphs.some((p,i)=>p.id!==i||typeof p.text!=='string'||p.text.length>30000||!['original',...Object.keys(spaces)].includes(p.spacing)))throw Error('문단 구조가 바뀌었습니다. 다시 불러와 주세요.');
 for(const [i,p] of paragraphs.entries()){const node=$(nodes[i]);if(p.text!==original[i].text){const content=$('<div></div>').text(p.text).html().replace(/\n/g,'<br>');const bold=node.children('b,strong');if(bold.length===1&&readable($,bold[0])===original[i].text)bold.html(content);else node.html(content)}
  if(p.spacing!==original[i].spacing&&p.spacing!=='original')node.attr('data-project-paragraph-spacing',p.spacing).css('margin-bottom',spacingValue(p.spacing));
 }
}
