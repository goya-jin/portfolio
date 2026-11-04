import {marked} from 'marked';
import sanitizeHtml from 'sanitize-html';
import {load} from 'cheerio';
const SITE='https://goya-jin.github.io/portfolio/',RAW='https://raw.githubusercontent.com/goya-jin/portfolio/main/';
export function sanitizeRichHTML(html){
 const $=load(String(html),null,false);
 $('[data-writing-embed="tweet"],[data-writing-embed="media"]').each((_,el)=>$(el).replaceWith($(el).attr('data-source')||''));
 $('[data-upload-id]').each((_,el)=>($(el).closest('figure').length?$(el).closest('figure'):$(el)).remove());
 const clean=sanitizeHtml($.html(),{
  allowedTags:['p','br','h1','h2','h3','h4','strong','b','em','i','u','s','del','blockquote','ul','ol','li','pre','code','hr','img','figure','figcaption','a','div','span','table','thead','tbody','tr','th','td','iframe','video','audio','source'],
  allowedAttributes:{video:['src','poster','controls','playsinline','preload','style'],audio:['src','controls','preload'],source:['src','type'],a:['href','title','target','rel'],img:['src','alt','title','width','height'],figure:['data-writing-image','style'],blockquote:['class'],ol:['start'],iframe:['src','title','width','height','allowfullscreen','loading','referrerpolicy','allow'],p:['style'],h1:['style'],h2:['style'],h3:['style'],h4:['style'],th:['colspan','rowspan'],td:['colspan','rowspan']},
  allowedClasses:{blockquote:['twitter-tweet']},allowedStyles:{'*':{'text-align':[/^(left|center|right)$/],width:[/^(50|75|100)%$/],'max-height':[/^\d{1,3}vh$/]}},
  allowedSchemes:['https','http','mailto'],allowedSchemesByTag:{img:['https'],video:['https'],audio:['https'],source:['https']},allowProtocolRelative:false,
  allowedIframeHostnames:['www.youtube.com','www.youtube-nocookie.com','player.vimeo.com','superspl.at'],
  transformTags:{a:sanitizeHtml.simpleTransform('a',{rel:'noopener noreferrer'}),iframe:sanitizeHtml.simpleTransform('iframe',{loading:'lazy',referrerpolicy:'strict-origin-when-cross-origin',allowfullscreen:''})},
  exclusiveFilter:frame=>['img','iframe'].includes(frame.tag)&&!frame.attribs.src,
 });
 const result=load(clean,null,false);
 result('img,a,video,audio,source').each((_,el)=>{const attr=el.tagName==='a'?'href':'src',value=result(el).attr(attr)||'';for(const base of [SITE,RAW])if(value.startsWith(base+'assets/writing/'))result(el).attr(attr,'../../'+value.slice(base.length));});
 return result.html();
}
export function editorHTML(body,format='markdown'){
 let html=body;
 if(format!=='html')html=marked.parse(String(body).replace(/^(\d{4})\.(?=[ \t]*\d{1,2}\.[ \t]*\d{1,2}(?:\D|$))/gm,'$1\\.').replace(/^<([^<>\n]*\?)>$/gm,(_,text)=>'&lt;'+text.replaceAll('&','&amp;')+'&gt;'),{breaks:true,gfm:true});
 const $=load(sanitizeRichHTML(html),null,false);
 $('img,video,audio,source').each((_,el)=>{const src=$(el).attr('src')||'';if(src.startsWith('../../assets/'))$(el).attr('src',SITE+src.slice(6));else if(src.startsWith('assets/'))$(el).attr('src',SITE+src)});
 $('video,audio').each((_,el)=>{const source=$.html(el),wrapper=$('<div data-writing-embed="media"></div>');wrapper.attr('data-source',source);$(el).replaceWith(wrapper)});
 $('blockquote.twitter-tweet').each((_,el)=>{const source=$.html(el),wrapper=$('<div data-writing-embed="tweet"></div>');wrapper.attr('data-source',source);$(el).replaceWith(wrapper)});
 return $.html();
}
export function portfolioHTML(html){const $=load(sanitizeRichHTML(html),null,false);$('img,a,video,audio,source').each((_,el)=>{const attr=el.tagName==='a'?'href':'src',src=$(el).attr(attr)||'';if(src.startsWith('../../assets/'))$(el).attr(attr,src.slice(6))});return $.html()}
