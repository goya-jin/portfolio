import {load} from 'cheerio';
export const PUBLIC_BASE='https://goya-jin.github.io/portfolio/';
export const validProjectPath=p=>typeof p==='string'&&/^[a-z0-9][a-z0-9_-]*\.html$/.test(p)&&!['info.html','admin.html','404.html'].includes(p);
export function projectList(html){const $=load(html);return [{path:'index.html',title:'홈 페이지',group:'홈'},...$('nav[aria-label="Projects"] a').toArray().map(a=>({path:$(a).attr('href')?.split('?')[0],title:$(a).text().trim(),group:$(a).closest('section').find('h2').first().text().trim()})).filter(p=>validProjectPath(p.path))].filter((p,i,ps)=>ps.findIndex(q=>q.path===p.path)===i)}
export function safeMediaURL(value,kind){
 if(typeof value!=='string'||value.length>2500||/[\u0000-\u0020<>"']/.test(value))return false;
 if(/^assets\/[A-Za-z0-9_./%()-]+$/.test(value)&&!value.includes('..'))return kind!=='embed';
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return false;if(kind==='embed')return ['www.youtube.com','www.youtube-nocookie.com','player.vimeo.com'].includes(u.hostname)&&/^\/(embed\/|video\/)/.test(u.pathname);return true}catch{return false}
}
function inspect(html){
 const $=load(html);if(!$('main').length)throw Error('페이지의 본문 영역을 확인하지 못했습니다.');
 const texts=[];function walk(node){for(const n of node.children||[]){if(n.type==='text'&&n.data.trim())texts.push(n);else if(n.type!=='text'&&!['script','style','iframe','video','audio','button','noscript'].includes(n.name)&&!$(n).is('a[href="index.html"],a[href="#"],[data-project-group-caption]'))walk(n)}}$('main').each((_,el)=>walk(el));
 const groups=[],items=[];$('main img, main video, main iframe, main audio').each((_,el)=>{
  const node=$(el),figure=node.closest('figure'),wrapper=figure.length?figure[0]:el,parent=wrapper.parent;if(!parent)return;
  let group=groups.indexOf(parent);if(group<0){group=groups.length;groups.push(parent)}
  const kind=el.name==='img'?'image':el.name==='iframe'?'embed':el.name;
  const src=node.attr('src')||node.attr('data-project-src')||node.find('source').first().attr('src')||node.find('source').first().attr('data-project-src')||'';
  if(items.some(m=>m.wrapper===wrapper))return;
  items.push({el,wrapper,group,kind,src,hidden:$(wrapper).attr('data-project-hidden')==='true',alt:node.attr('alt')||node.attr('title')||'',poster:node.attr('poster')||''});
 });return {$,texts,groups,items};
}
export function readProject(html){const {$,texts,items,groups}=inspect(html);return {title:$('title').text().replace(/ — HYUNJIN KIM$/,''),groupCount:groups.length,groups:groups.map((el,id)=>({id,caption:$(el).children('[data-project-group-caption]').first().text(),columns:Number(/--cols:\s*(\d+)/.exec($(el).attr('style')||'')?.[1]||1),editableColumns:$(el).hasClass('gallery')})),texts:texts.map((n,id)=>({id,value:n.data})),media:items.map(({group,kind,src,alt,poster,hidden},id)=>({id,group,kind,src,alt,poster,hidden}))}}
function validateData(p){if(!p||typeof p.title!=='string'||!p.title.trim()||p.title.length>200||!Array.isArray(p.texts)||p.texts.length>2000||!Array.isArray(p.media)||p.media.length>500)throw Error('프로젝트 입력 내용을 확인해 주세요.')}
export function applyProject(html,p){
 validateData(p);const {$,texts,groups,items}=inspect(html);
 if(p.texts.length!==texts.length||p.texts.some((t,i)=>t.id!==i||typeof t.value!=='string'||t.value.length>30000))throw Error('본문 구조가 변경됐습니다. 다시 불러와 주세요.');
 p.texts.forEach((t,i)=>{if(texts[i].data!==t.value)texts[i].data=t.value});$('title').text(p.title.trim()+' — HYUNJIN KIM');
 p={...p,media:p.media.map(m=>({...m,hidden:m.hidden??items[m.id]?.hidden??false}))};
 for(const [id,item] of items.entries())if(!p.media.some(m=>m.id===id)){const entry={id,group:item.group,kind:item.kind,src:item.src,alt:item.alt,hidden:true};const index=p.media.findIndex(m=>Number.isInteger(m.id)&&m.id>id);if(index<0)p.media.push(entry);else p.media.splice(index,0,entry)}
 const settings=p.groups||[...readProject(html).groups,{id:groups.length,columns:1}];
 if(!Array.isArray(settings)||settings.length>groups.length+40||new Set(settings.map(g=>g.id)).size!==settings.length||settings.some(g=>!Number.isInteger(g.id)||g.id<0||g.id>=groups.length+40||!Number.isInteger(g.columns)||g.columns<1||g.columns>6||(g.caption!==undefined&&(typeof g.caption!=='string'||g.caption.length>20000))))throw Error('이미지 그룹 설정을 확인해 주세요.');
 const ids=new Set(),kept=new Set();
 for(const m of p.media){
  if(!m||!['image','video','audio','embed'].includes(m.kind)||!Number.isInteger(m.group)||m.group<0||m.group>=groups.length+40||(m.group>=groups.length&&!settings.some(g=>g.id===m.group))||typeof m.hidden!=='boolean'||typeof m.alt!=='string'||m.alt.length>500||!safeMediaURL(m.src,m.kind))throw Error('이미지·영상 주소를 확인해 주세요. 영상은 YouTube/Vimeo 삽입 주소 또는 HTTPS 파일 주소를 사용하세요.');
  if(Number.isInteger(m.id)){const old=items[m.id];if(!old||ids.has(m.id)||old.kind!==m.kind||old.group!==m.group)throw Error('미디어 배치 정보를 확인해 주세요.');ids.add(m.id);kept.add(m.id)}
  else if(typeof m.id!=='string'||!m.id.startsWith('new-')||ids.has(m.id))throw Error('추가된 미디어를 확인해 주세요.');else ids.add(m.id);
 }
 for(const g of [...groups.map((_,i)=>i),...settings.filter(s=>s.id>=groups.length).map(s=>s.id)]){
  const ms=p.media.filter(m=>m.group===g),old=items.filter(m=>m.group===g);let parent=groups[g],anchors=[];
  if(old.length){for(const m of old){const a=$('<span></span>');$(m.wrapper).before(a);anchors.push(a);$(m.wrapper).remove()}}
  else if(ms.length){parent=$('<div class="gallery" style="--cols:1;--gallery-gap:1rem"></div>')[0];$('main').last().append(parent)}
  const columns=settings.find(s=>s.id===g)?.columns;if(parent&&$(parent).hasClass('gallery')&&columns&&Number(/--cols:\s*(\d+)/.exec($(parent).attr('style')||'')?.[1]||1)!==columns){let style=$(parent).attr('style')||'';style=/--cols:\s*\d+/.test(style)?style.replace(/--cols:\s*\d+/,`--cols:${columns}`):style+`;--cols:${columns}`;$(parent).attr('style',style)}
  for(const [position,m] of ms.entries()){let wrapper;if(Number.isInteger(m.id)){
    const old=items[m.id],node=$(old.el);wrapper=old.wrapper;
    if(old.src!==m.src){node.removeAttr('width height srcset sizes');node.attr('src',m.src).removeAttr('data-project-src');node.find('source').remove();if(m.kind==='video'||m.kind==='audio')node.removeAttr('poster')}
    if(old.alt!==m.alt){if(m.kind==='image')node.attr('alt',m.alt);else node.attr('title',m.alt)}
   }else{const el=m.kind==='image'?$('<img loading="lazy" decoding="async">').attr({src:m.src,alt:m.alt}):m.kind==='embed'?$('<iframe class="embed" loading="lazy" allowfullscreen></iframe>').attr({src:m.src,title:m.alt||'Project film'}):$(`<${m.kind} controls preload="metadata"></${m.kind}>`).attr({src:m.src,title:m.alt});wrapper=$('<figure></figure>').append(el)[0]}
   const box=$(wrapper);
   if(m.hidden){if(box.attr('data-project-hidden')!=='true'){box.attr('data-project-style',box.attr('style')??'');box.attr('data-project-had-style',box.attr('style')===undefined?'false':'true')}box.attr({'data-project-hidden':'true',hidden:'',style:(box.attr('data-project-style')||'')+';display:none!important'});
    box.find('video,audio,iframe,source').add(box.is('video,audio,iframe,source')?box:[]).each((_,el)=>{const n=$(el);if(n.attr('src'))n.attr('data-project-src',n.attr('src')).removeAttr('src');if(n.attr('autoplay')!==undefined)n.attr('data-project-autoplay','true').removeAttr('autoplay')});
   }else if(box.attr('data-project-hidden')==='true'){
    if(box.attr('data-project-had-style')==='true')box.attr('style',box.attr('data-project-style')||'');else box.removeAttr('style');box.removeAttr('hidden data-project-hidden data-project-style data-project-had-style');
    box.find('[data-project-src],[data-project-autoplay]').add(box.is('[data-project-src],[data-project-autoplay]')?box:[]).each((_,el)=>{const n=$(el);if(n.attr('data-project-src'))n.attr('src',n.attr('data-project-src')).removeAttr('data-project-src');if(n.attr('data-project-autoplay')==='true')n.attr('autoplay','').removeAttr('data-project-autoplay')});
   }
   if(anchors.length)anchors[Math.min(position,anchors.length-1)].before(wrapper);else if(parent)$(parent).append(wrapper);
  }for(const anchor of anchors)anchor.remove();
  const config=settings.find(s=>s.id===g);if(parent&&config&&config.caption!==undefined){
   let caption=$(parent).children('[data-project-group-caption]').first();
   if(config.caption.trim()){
    if(!caption.length)caption=$('<p data-project-group-caption="true" style="white-space:pre-wrap;grid-column:1 / -1;margin:1rem 0"></p>');
    caption.text(config.caption);const last=ms.at(-1);if(last){const lastNode=Number.isInteger(last.id)?$(items[last.id].wrapper):$(parent).children('figure').last();lastNode.after(caption)}else $(parent).append(caption);
    const allHidden=ms.length>0&&ms.every(m=>m.hidden);if(allHidden)caption.attr('hidden','').css('display','none');else caption.removeAttr('hidden').css('display','');
   }else caption.remove();
  }

 }
 return $.html();
}
export function previewProject(html){const $=load(html);$('script,base').remove();$('head').prepend(`<base href="${PUBLIC_BASE}">`);return $.html()}
export function newProject(template,p){
 if(!p||!validProjectPath(p.path)||p.path==='index.html'||typeof p.title!=='string'||!p.title.trim()||p.title.length>200||!['role','year','description','credits','group'].every(k=>typeof p[k]==='string'&&p[k].length<=30000))throw Error('새 프로젝트의 제목·주소·내용을 확인해 주세요.');
 const $=load(template),main=$('main').empty();const text=(tag,s)=>$(tag).text(s);
 const top=$('<column-set gutter="1rem"></column-set>');top.append($('<column-unit slot="0" span="8"></column-unit>').append(text('<b></b>',p.title)),$('<column-unit slot="1" span="4"></column-unit>').append('<a href="index.html">Home ↑</a>'));main.append(top,'<br>');
 const intro=$('<column-set gutter="1rem"></column-set>'),facts=$('<column-unit slot="0" span="4"></column-unit>');facts.append('<b>Role </b>',text('<span></span>',p.role),'<br><b>Year </b>',text('<span></span>',p.year));intro.append(facts,text('<column-unit slot="1" span="8" style="white-space:pre-wrap"></column-unit>',p.description));main.append(intro,'<br>',text('<p style="white-space:pre-wrap"></p>',p.credits));
 $('title').text(p.title+' — HYUNJIN KIM');$('nav[aria-label="Projects"] a').removeAttr('aria-current');return $.html();
}
export function addProjectLink(html,p){const $=load(html);if($(`nav[aria-label="Projects"] a`).toArray().some(a=>$(a).attr('href')===p.path))return html;const sections=$('nav[aria-label="Projects"] section');const section=sections.toArray().find(s=>$(s).find('h2').first().text().trim()===p.group);if(!section)throw Error('추가할 메뉴 카테고리를 확인해 주세요.');$(section).find('ul').first().append($('<li></li>').append($('<a></a>').attr('href',p.path).text(p.title)));return $.html()}
