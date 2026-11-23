'use client';
import React,{useEffect,useRef,useState} from 'react';
import 'grapesjs/dist/css/grapes.min.css';
import {compressImage} from './media-utils.mjs';
import {imageReferences} from '../../lib/image-layout.mjs';
import {installCanvasTypes,nearestColumns,flushCanvasText,activeTextDraft,restoreActiveText,mainComponent,isInMain,selectedBlock,insertCanvasBlock,columnHTML,photoHTML,pairNextPhoto,splitPhotoRow,exportCanvas,escapeHTML} from './canvas-tools.mjs';
const BASE='https://goya-jin.github.io/portfolio/',RAW='https://raw.githubusercontent.com/goya-jin/portfolio/main/';
export default function ProjectCanvas({document:source,path,sha,disabled=false,onChange,onReady,onMessage,onBusyChange,demo=false,initialItems=[]}){
 const host=useRef(null),editor=useRef(null),shelf=useRef(null),file=useRef(null),catalog=useRef([]),callbacks=useRef({onChange,onReady,onMessage,onBusyChange});callbacks.current={onChange,onReady,onMessage,onBusyChange};
 const [ready,setReady]=useState(false),[items,setItems]=useState([]),[chosen,setChosen]=useState([]),[uploading,setUploading]=useState(false),[selection,setSelection]=useState(null),[device,setDevice]=useState('desktop'),[search,setSearch]=useState(''),[all,setAll]=useState(false),[error,setError]=useState('');catalog.current=items;
 const notify=message=>callbacks.current.onMessage?.(message);
 useEffect(()=>{let alive=true;if(demo){setItems(initialItems);return()=>{alive=false}}fetch('/api/writing-media',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(alive)setItems(d.items||[])}).catch(e=>alive&&setError(e.message));return()=>{alive=false}},[]);
 useEffect(()=>{
  let alive=true,instance,timer,dirty=false,initializing=true;
  (async()=>{
   const {default:grapesjs}=await import('grapesjs');if(!alive)return;
   instance=grapesjs.init({container:host.current,height:'72vh',width:'auto',storageManager:false,noticeOnUnload:false,fromElement:false,allowScripts:false,avoidInlineStyle:false,panels:{defaults:[]},assetManager:{custom:true},styleManager:{sectors:[]},richTextEditor:{actions:[]},canvas:{styles:source.styles||[]},deviceManager:{devices:[{id:'desktop',name:'Desktop',width:''},{id:'mobile',name:'Mobile',width:'390px',widthMedia:'760px'}]},plugins:[installCanvasTypes]});
   editor.current=instance;
   instance.setStyle(source.customCSS||'');instance.setComponents(source.body);
   const changed=()=>{if(initializing||!alive)return;dirty=true;clearTimeout(timer);timer=setTimeout(()=>{
    const canvas=exportCanvas(instance);callbacks.current.onChange?.(canvas);
    try{localStorage.setItem('goya-project-canvas:'+path,JSON.stringify({sha,canvas,project:instance.getProjectData(),active:activeTextDraft(instance)}))}catch{notify('초안 보관 공간이 부족합니다. 저장·사이트 반영을 눌러 주세요.')}
   },180)};
   instance.on('update',changed);
   const storeDraft=()=>{if(dirty)try{localStorage.setItem('goya-project-canvas:'+path,JSON.stringify({sha,canvas:exportCanvas(instance),project:instance.getProjectData(),active:activeTextDraft(instance)}))}catch{}};window.addEventListener('beforeunload',storeDraft);instance.on('destroy',()=>window.removeEventListener('beforeunload',storeDraft));
   instance.on('component:selected',c=>{if(isInMain(c))setSelection(c);else setSelection(null)});
   instance.on('component:deselected',()=>setSelection(null));
   instance.on('asset:custom',()=>shelf.current?.scrollIntoView({behavior:'smooth',block:'center'}));
   instance.on('rte:enable',view=>{
    // A reference becomes a real image immediately when Enter is pressed.
    const el=view.el;const key=e=>{if(e.key!=='Enter'||e.isComposing)return;const refs=imageReferences(el.textContent);if(!refs)return;const photos=refs.map(ref=>catalog.current.find(i=>i.ref===ref));if(photos.some(i=>!i)){e.preventDefault();notify('첨부함에 표시된 이미지 번호를 사용해 주세요.');return}e.preventDefault();flushCanvasText(instance).then(()=>{const added=view.model.replaceWith(photoHTML(photos));instance.select(Array.isArray(added)?added[0]:added)})};
    el.addEventListener('keydown',key);instance.once('rte:disable',()=>el.removeEventListener('keydown',key));
   });
   instance.on('canvas:frame:load',()=>{
    const doc=instance.Canvas.getDocument();if(!doc)return;
    let style=doc.getElementById('portfolio-document-styles');if(!style){style=doc.createElement('style');style.id='portfolio-document-styles';doc.head.append(style)}
    style.textContent=(source.css||'')+'\nbody{margin:0;background:#fff}main img{cursor:pointer}p:empty{min-height:1.4em}';
    let base=doc.querySelector('base');if(!base){base=doc.createElement('base');base.href=BASE;doc.head.prepend(base)}
    doc.addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault()});
    doc.addEventListener('paste',e=>{const photos=Array.from(e.clipboardData?.files||[]).filter(f=>f.type.startsWith('image/'));if(photos.length){e.preventDefault();upload(photos,true)}});
    doc.addEventListener('drop',e=>{const photos=Array.from(e.dataTransfer?.files||[]).filter(f=>f.type.startsWith('image/'));if(photos.length){e.preventDefault();e.stopPropagation();upload(photos,true)}},true);
    doc.querySelectorAll('img[src]').forEach(img=>{const src=img.getAttribute('src');if(src?.startsWith('assets/'))img.src=RAW+src;else if(src?.startsWith(BASE+'assets/'))img.src=RAW+src.slice(BASE.length)});
   });
   instance.on('component:mount',component=>{if(component.get('tagName')==='img'){const src=component.getAttributes().src||'',el=component.getEl();if(el){if(src.startsWith('assets/'))el.src=RAW+src;else if(src.startsWith(BASE+'assets/'))el.src=RAW+src.slice(BASE.length)}}});
   instance.on('load',()=>{
    if(!alive)return;
    let recovered=false;try{const draft=JSON.parse(localStorage.getItem('goya-project-canvas:'+path)||'null');if(draft?.sha===sha&&draft.project&&window.confirm('저장하지 않은 이 페이지의 초안을 복원할까요?')){instance.loadProjectData(draft.project);restoreActiveText(instance,draft.active);recovered=true}}catch{}
    initializing=false;setReady(true);callbacks.current.onReady?.(async()=>{await flushCanvasText(instance);const canvas=exportCanvas(instance);clearTimeout(timer);return canvas});
    if(recovered)changed();
   });
   instance.on('destroy',()=>clearTimeout(timer));
   // GrapesJS can finish its first load synchronously with cached styles.
   if(instance.getModel().get('ready')){initializing=false;setReady(true);callbacks.current.onReady?.(async()=>{await flushCanvasText(instance);return exportCanvas(instance)})}
  })().catch(e=>notify('편집기를 열지 못했습니다. '+e.message));
  return()=>{alive=false;clearTimeout(timer);instance?.destroy();editor.current=null};
 },[source,path,sha]);
 const insert=async html=>{try{await insertCanvasBlock(editor.current,html);notify('선택한 요소 아래에 넣었습니다. 끌어서 위치를 바꿀 수 있습니다.')}catch(e){notify(e.message)}};
 async function upload(files,immediate=false){
  if(uploading||!files.length)return;if(files.length>8||files.some(f=>!/^image\/(jpeg|png|gif|webp|avif)$/.test(f.type))){notify('사진은 한 번에 8개까지 선택해 주세요.');return}
  setUploading(true);callbacks.current.onBusyChange?.(true);notify('사진을 사이트에 업로드하는 중…');
  try{const compressed=await Promise.all(files.map(compressImage));if(compressed.reduce((n,f)=>n+f.size,0)>3*1024*1024)throw Error('사진은 한 번에 합계 3MB까지입니다.');
   const form=new FormData();compressed.forEach(f=>form.append('files',f));let d;if(demo){d={items:await Promise.all(compressed.map(async(f,i)=>({name:f.name,ref:'image'+(catalog.current.length+i+1),src:await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(f)})})))};}else{const r=await fetch('/api/writing-media',{method:'POST',body:form});d=await r.json();if(!r.ok)throw Error(d.error);}
   setItems(current=>[...current,...d.items.filter(i=>!current.some(n=>n.src===i.src))]);setError('');
   if(immediate){await insertCanvasBlock(editor.current,photoHTML(d.items));setChosen([]);notify('사진을 넣었습니다.')}else{setChosen(d.items.slice(0,2).map(i=>i.ref));notify('첨부했습니다. 본문 위치를 선택하고 사진을 넣으세요.')}
  }catch(e){notify(e.message)}finally{setUploading(false);callbacks.current.onBusyChange?.(false)}
 }
 const action=(command,value)=>{const e=editor.current,rte=e?.RichTextEditor.globalRte;if(!rte?.enabled){notify('본문 글을 두 번 클릭해 편집하고, 서식을 바꿀 부분을 선택하세요.');return}rte.exec(command,value)};
 function align(value){const e=editor.current,c=selectedBlock(e);if(c&&c!==mainComponent(e))c.addStyle({'text-align':value})}
 function indent(delta){const c=selectedBlock(editor.current);if(c&&c!==mainComponent(editor.current)){const old=parseInt(c.getStyle()['padding-left'])||0;c.addStyle({'padding-left':Math.max(0,old+delta)+'px'})}}
 function link(){const url=window.prompt('연결할 주소 · 비우면 링크 해제');if(url===null)return;if(!url.trim())action('unlink');else if(/^(https?:\/\/|mailto:)/i.test(url))action('createLink',url.trim());else notify('https:// 또는 mailto:로 시작하는 주소를 넣어 주세요.')}
 function video(){const url=window.prompt('YouTube 또는 Vimeo 주소');if(!url)return;let src='';try{const u=new URL(url),id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||/^\/(?:embed|shorts)\/([^/]+)/.exec(u.pathname)?.[1];if(['youtu.be','youtube.com','www.youtube.com'].includes(u.hostname)&&/^[\w-]{11}$/.test(id||''))src='https://www.youtube.com/embed/'+id;else if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(u.hostname)&&/\d+/.test(u.pathname))src='https://player.vimeo.com/video/'+u.pathname.match(/\d+/)[0]}catch{}if(!src)return notify('YouTube 또는 Vimeo 영상 주소를 확인해 주세요.');insert(`<iframe src="${src}" title="영상" allowfullscreen loading="lazy" style="width:100%;aspect-ratio:16/9;border:0"></iframe>`)}
 const image=selection?.get('tagName')==='img'?selection:selection?.get('tagName')==='figure'?selection.find('img')[0]:null;
 const columns=nearestColumns(selection);
 const locked=disabled||!ready||uploading,matching=items.filter(i=>(i.name+' '+i.ref).toLowerCase().includes(search.toLowerCase())),photos=all||search?matching:matching.slice(-12);
 return <div className="visual-editor">
  <div className="canvas-toolbar" aria-label="페이지 편집 도구" role="toolbar">
   <button type="button" disabled={locked} onMouseDown={e=>e.preventDefault()} onClick={()=>file.current?.click()}>사진</button><button type="button" disabled={locked} onClick={()=>insert('<p data-gjs-type="text" style="min-height:1.4em"><br></p>')}>글</button>
   <button type="button" disabled={locked} onClick={()=>insert(columnHTML(2))}>2열</button><button type="button" disabled={locked} onClick={()=>insert(columnHTML(3))}>3열</button><button type="button" disabled={locked} onClick={video}>영상</button><button type="button" disabled={locked} onClick={()=>insert('<hr>')}>구분선</button><button type="button" disabled={locked} onClick={()=>insert('<table style="border-collapse:collapse;width:100%"><tbody>'+Array.from({length:2},()=>'<tr>'+Array.from({length:2},()=>'<td style="border:1px solid #bbb;padding:10px"><p data-gjs-type="text"><br></p></td>').join('')+'</tr>').join('')+'</tbody></table>')}>표</button>
   <span className="toolbar-spacer"/><button type="button" aria-pressed={device==='desktop'} onClick={()=>{setDevice('desktop');editor.current?.Devices.select('desktop')}}>PC</button><button type="button" aria-pressed={device==='mobile'} onClick={()=>{setDevice('mobile');editor.current?.Devices.select('mobile')}}>모바일</button>
  </div>
  <div className="canvas-toolbar text-tools" aria-label="텍스트 서식" role="toolbar" onMouseDown={e=>{e.stopPropagation();if(e.target.tagName==='BUTTON')e.preventDefault()}}>
   <select aria-label="문단 서식" disabled={locked} defaultValue="" onChange={e=>{action('formatBlock',e.target.value);e.target.value=''}}><option value="" disabled>본문·제목</option><option value="p">본문</option><option value="h1">큰 제목</option><option value="h2">제목</option><option value="h3">작은 제목</option></select>
   {[['굵게','B','bold'],['기울임','I','italic'],['밑줄','U','underline'],['취소선','S','strikeThrough']].map(([title,label,command])=><button key={title} type="button" title={title} aria-label={title} className={'text-'+command} disabled={locked} onClick={()=>action(command)}>{label}</button>)}
   <select aria-label="글자 크기" defaultValue="" disabled={locked} onChange={e=>{const c=selectedBlock(editor.current);if(c&&c!==mainComponent(editor.current))c.addStyle({'font-size':e.target.value+'px'});e.target.value=''}}><option value="" disabled>크기</option>{[11,12,14,16,18,20,24,32].map(n=><option key={n} value={n}>{n}px</option>)}</select><input type="color" aria-label="글자 색상" defaultValue="#262626" disabled={locked} onChange={e=>action('foreColor',e.target.value)}/>
   <button type="button" disabled={locked} onClick={link}>링크</button><select aria-label="정렬" defaultValue="left" disabled={locked} onChange={e=>align(e.target.value)}><option value="left">왼쪽 정렬</option><option value="center">가운데 정렬</option><option value="right">오른쪽 정렬</option><option value="justify">양쪽 정렬</option></select>
   <button type="button" disabled={locked} onClick={()=>action('insertUnorderedList')}>목록</button><button type="button" disabled={locked} onClick={()=>action('insertOrderedList')}>번호 목록</button><button type="button" disabled={locked} onClick={()=>indent(20)}>들여쓰기</button><button type="button" disabled={locked} onClick={()=>indent(-20)}>내어쓰기</button>
   <details className="toolbar-more"><summary>더보기</summary><div><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>action('formatBlock','blockquote')}>인용문</button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>action('removeFormat')}>서식 지우기</button><select aria-label="줄 간격" defaultValue="" onChange={e=>{const c=selectedBlock(editor.current);if(c&&c!==mainComponent(editor.current))c.addStyle({'line-height':e.target.value});e.target.value=''}}><option value="" disabled>줄 간격</option>{[1.3,1.4,1.6,1.8,2].map(n=><option key={n}>{n}</option>)}</select></div></details>
   <span className="toolbar-spacer"/><button type="button" disabled={locked} onClick={()=>editor.current?.UndoManager.undo()}>되돌리기</button><button type="button" disabled={locked} onClick={()=>editor.current?.UndoManager.redo()}>다시 실행</button>
  </div>
  {image&&<div className="selection-tools"><span>선택한 사진</span><select aria-label="선택한 사진 너비" value={image.parent()?.getStyle().width||'100%'} onChange={e=>image.parent()?.addStyle({width:e.target.value})}>{['100%','75%','50%','25%'].map(v=><option key={v}>{v}</option>)}</select><button type="button" onClick={()=>{if(!pairNextPhoto(editor.current))notify('바로 다음에도 사진이 있어야 나란히 묶을 수 있습니다.')}}>다음 사진과 나란히</button><button type="button" onClick={()=>splitPhotoRow(editor.current)}>세로로 분리</button><button type="button" onClick={()=>{const parent=image.parent(),figure=parent?.get('tagName')==='figure'?parent:null;if(!figure)return;let caption=figure.find('figcaption')[0];if(!caption)caption=figure.append({tagName:'figcaption',type:'text',content:'<br>'})[0];editor.current.select(caption);caption.trigger('active')}}>캡션 편집</button></div>}
  {columns&&<div className="selection-tools"><span>선택한 컬럼</span><select aria-label="컬럼 비율" defaultValue="equal" onChange={e=>{const units=columns.components();units.forEach((c,i)=>c.addStyle({flex:e.target.value==='left'?(i===0?'2':'1'):e.target.value==='right'?(i===units.length-1?'2':'1'):'1'}))}}><option value="equal">같은 너비</option><option value="left">왼쪽 넓게</option><option value="right">오른쪽 넓게</option></select><select aria-label="컬럼 사이 간격" defaultValue="12" onChange={e=>columns.addStyle({gap:e.target.value+'px'})}><option value="12">간격 좁게</option><option value="24">간격 보통</option><option value="36">간격 넓게</option></select><button type="button" onClick={()=>columns.append('<column-unit style="flex:1;min-width:0"><p data-gjs-type="text" style="min-height:1.4em"><br></p></column-unit>')}>열 추가</button><button type="button" onClick={()=>{if(columns.components().length>1&&window.confirm('마지막 열과 그 안의 내용을 삭제할까요?'))columns.components().at(-1).remove()}}>마지막 열 삭제</button></div>}
  <div ref={host} inert={disabled?true:undefined} className={'canvas-host'+(disabled?' is-saving':'')} aria-label="공개 페이지와 같은 화면에서 편집"/>
  <p className="canvas-hint">글은 두 번 클릭해 수정하세요. 요소를 선택해 사진·글·컬럼을 넣고, 끌어서 순서를 바꿀 수 있습니다.</p>
  <section className="canvas-attachments" ref={shelf} aria-label="첨부 사진">
   <div className="shelf-heading"><h3>첨부 사진 <small>{items.length}</small></h3><button type="button" disabled={locked} onClick={()=>file.current?.click()}>사진 업로드</button></div>
   <input hidden type="file" ref={file} aria-label="사진 업로드" multiple accept="image/jpeg,image/png,image/gif,image/webp,image/avif" onChange={e=>{const files=Array.from(e.target.files||[]);e.target.value='';upload(files,true)}}/>
   {items.length>12&&<input type="search" aria-label="사진 검색" placeholder="파일 이름 또는 image 번호" value={search} onChange={e=>setSearch(e.target.value)}/>}
   <div className="attachment-strip">{photos.map(i=><button type="button" className="attachment-photo" key={i.ref} aria-label={'첨부 '+i.ref} aria-pressed={chosen.includes(i.ref)} disabled={locked} onClick={()=>setChosen(current=>current.includes(i.ref)?current.filter(v=>v!==i.ref):[...current.slice(-1),i.ref])}><img loading="lazy" src={i.src.startsWith(BASE+'assets/')?RAW+i.src.slice(BASE.length):i.src} alt={i.name}/><span>{'{'+i.ref+'}'}</span></button>)}</div>
   {items.length>12&&!all&&!search&&<button type="button" onClick={()=>setAll(true)}>전체 사진 보기</button>}
   <div className="attachment-actions"><button type="button" disabled={locked||!chosen.length} onClick={()=>{insert(photoHTML(chosen.map(ref=>items.find(i=>i.ref===ref)).filter(Boolean)));setChosen([])}}>{chosen.length===2?'두 장 나란히 넣기':'선택한 위치에 넣기'}</button>{chosen.length>0&&<button type="button" onClick={()=>setChosen([])}>선택 해제</button>}</div>
   <p className="muted">한 장을 선택해 다시 넣거나, 두 장을 선택해 나란히 넣을 수 있습니다. 글에 {'{image1}'} 또는 {'{image1} {image2}'}를 쓰고 Enter를 눌러도 됩니다. 사진은 본문에서 빼도 첨부함에 남습니다.</p>{error&&<p role="alert">{error}</p>}
  </section>
 </div>
}
