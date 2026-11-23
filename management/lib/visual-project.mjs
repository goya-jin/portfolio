import {load} from 'cheerio';
import sanitizeHtml from 'sanitize-html';
const BASE='https://goya-jin.github.io/portfolio/';
export function readCanvas(html){
 const $=load(html);$('script,dialog,noscript').remove();
 // Use the published document's styles rather than inventing another preview theme.
 const styles=$('head link[rel="stylesheet"]').toArray().map(el=>new URL($(el).attr('href'),BASE).href);
 const css=$('head style').not('#project-canvas-style').toArray().map(el=>$(el).html()).join('\n');
 const body=$('body').clone();body.children().not('main,aside,footer,button.menu-toggle,header').remove();
 return {body:body.html(),styles,css,customCSS:$('#project-canvas-style').html()||''};
}
export function cleanCanvasHTML(html){
 if(typeof html!=='string'||html.length>1500000)throw Error('페이지 내용이 너무 큽니다.');
 return sanitizeHtml(html,{
  allowedTags:['div','span','p','br','strong','b','i','em','u','s','strike','del','font','a','h1','h2','h3','h4','h5','h6','blockquote','ul','ol','li','pre','code','hr','figure','figcaption','img','picture','source','video','audio','iframe','table','thead','tbody','tr','td','th','column-set','column-unit','bodycopy'],
  allowedAttributes:{'*':['id','class','style','data-*','aria-*','hidden','role','title','slot','span'],font:['color','face','size'],a:['href','target','rel'],img:['src','alt','width','height','loading','decoding','srcset','sizes'],video:['src','poster','controls','playsinline','preload','autoplay','loop','muted'],audio:['src','controls','preload'],source:['src','srcset','type'],iframe:['src','width','height','allow','allowfullscreen','loading','referrerpolicy'],ol:['start'],td:['colspan','rowspan'],th:['colspan','rowspan'],'column-set':['gutter','mobile-stack']},
  allowedSchemes:['https','http','mailto'],allowProtocolRelative:false,
  allowedIframeHostnames:['www.youtube.com','www.youtube-nocookie.com','player.vimeo.com','www.instagram.com','www.youtube.com','superspl.at'],
  parseStyleAttributes:false,
  transformTags:{a:sanitizeHtml.simpleTransform('a',{rel:'noopener noreferrer'})},
 });
}
export function applyCanvas(html,canvas){
 if(!canvas)throw Error('페이지 내용을 확인해 주세요.');validateCanvasCSS(canvas.css);
 const $=load(html),content=load(cleanCanvasHTML(canvas.html),null,false);
 content('img,a,video,audio,source').each((_,el)=>{const n=content(el),key=el.name==='a'?'href':'src',value=n.attr(key)||'';if(value.startsWith(BASE))n.attr(key,value.slice(BASE.length));});
 content('[data-project-hidden="true"]').attr('hidden','').each((_,el)=>content(el).attr('style',(content(el).attr('style')||'')+';display:none!important'));
 content('[data-gjs-type],[data-gjs-highlightable]').removeAttr('data-gjs-type data-gjs-highlightable');
 const scripts=$('main script[src]').toArray().map(el=>$(el).attr('src')).filter(src=>/^https:\/\/(www\.instagram\.com\/embed\.js|platform\.twitter\.com\/widgets\.js)$/.test(src));
 $('main').html(content.html());
 for(const src of new Set(scripts))$('main').append($('<script async></script>').attr('src',src));
 $('#project-canvas-style').remove();if(canvas.css.trim())$('head').append($('<style id="project-canvas-style"></style>').text(canvas.css));
 return $.html();
}

export function validateCanvasCSS(css){if(typeof css!=='string'||css.length>250000||/[<]|@import|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding/i.test(css))throw Error('페이지 서식을 확인해 주세요.');return css}
