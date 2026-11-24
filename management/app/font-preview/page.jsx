'use client';
import {useEffect,useRef,useState} from 'react';
import {PREVIEW_FAMILY,loadLocalNeue,matchingTextFonts} from '../../lib/local-font-preview.mjs';
import sample from './sample.json';
function html(target){return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+sample.styles.map(href=>'<link rel="stylesheet" href="'+href+'">').join('')+'<style>'+sample.css+(target?'html{font-size:11px!important}body{font-size:11px!important;font-weight:500!important;line-height:12px!important}body *{font-family:inherit!important;font-size:inherit!important;line-height:inherit!important;font-weight:inherit!important}body b,body strong{font-weight:700!important}':'body{font-family:Helvetica,Arial,sans-serif!important}')+'</style><base href="https://goya-jin.github.io/portfolio/"></head><body>'+sample.body+'</body></html>'}
function blockLinks(doc){doc?.addEventListener('click',e=>{if(e.target.closest?.('a'))e.preventDefault()})}
export default function FontPreview(){
 const right=useRef(null),knownFonts=useRef([]),request=useRef(0);
 const [active,setActive]=useState('neue'),[status,setStatus]=useState('checking'),[count,setCount]=useState(0),[detected,setDetected]=useState([]);
 async function loadFont(metadata=knownFonts.current){
  const doc=right.current?.contentDocument;if(!doc)return;const attempt=++request.current;blockLinks(doc);setStatus('checking');
  const result=await loadLocalNeue(window,doc,metadata);
  if(right.current?.contentDocument!==doc||request.current!==attempt)return;
  if(result.mediumLoaded){doc.body.style.fontFamily='"'+PREVIEW_FAMILY+'","Helvetica Neue",Helvetica,Arial,sans-serif';setStatus('loaded')}
  else setStatus(metadata.length?'blocked':result.reason==='unsupported'?'unsupported':'unavailable');
 }
 async function findFonts(){
  if(typeof window.queryLocalFonts!=='function'){setStatus('unsupported');return}
  setStatus('checking');
  try{
   // Only font names are used locally. Font bytes are never read or uploaded.
   const fonts=matchingTextFonts(await window.queryLocalFonts());knownFonts.current=fonts;
   setDetected(fonts.map(f=>({name:f.fullName,style:f.style})));
   if(!fonts.length){setStatus('not-listed');return}
   await loadFont(fonts);
  }catch(e){setStatus(e?.name==='NotAllowedError'?'permission-denied':'access-error')}
 }
 useEffect(()=>{if(right.current?.contentDocument?.readyState==='complete')loadFont()},[count]);
 const ready=status==='loaded';
 const messages={
  unavailable:'브라우저가 로컬 폰트를 자동으로 연결하지 못했습니다. 설치 여부가 확인된 것은 아닙니다. ‘브라우저에서 폰트 찾기’로 실제 이름을 확인해 주세요.',
  unsupported:'현재 브라우저에서는 설치된 폰트 목록을 직접 확인할 수 없습니다. 이 맥북의 Chrome 또는 Edge에서 이 페이지를 열어 주세요.',
  'not-listed':'브라우저가 제공한 목록에는 Neue Haas Grotesk Text가 보이지 않습니다. 이 결과만으로 설치 실패를 단정할 수는 없습니다.',
  blocked:'아래 목록에서 폰트 이름은 확인했지만 Medium 스타일을 화면에 불러오지 못했습니다.',
  'permission-denied':'브라우저의 글꼴 접근이 허용되지 않아 목록을 확인하지 못했습니다. 주소창의 사이트 설정에서 글꼴 접근을 허용한 뒤 다시 찾아 주세요.',
  'access-error':'브라우저의 글꼴 목록 확인 중 오류가 발생했습니다. Chrome에서 다시 시도해 주세요.',
 };
 return <main style={{maxWidth:'none',padding:'22px',font:'14px/1.5 Helvetica,Arial,sans-serif'}}>
  <h1 style={{fontSize:20}}>포트폴리오 폰트 비교</h1><p>미리보기 설정: <strong>11px · 줄간격 12px · 굵기 500</strong></p>
  <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'16px 0'}}><button type="button" aria-pressed={active==='current'} onClick={()=>setActive('current')}>기존 Helvetica</button><button type="button" aria-pressed={active==='neue'} onClick={()=>setActive('neue')}>Neue Haas Grotesk</button><button type="button" onClick={()=>{setCount(n=>n+1);setStatus('checking')}}>폰트 다시 확인</button>{!ready&&<button type="button" onClick={findFonts}>브라우저에서 폰트 찾기</button>}</div>
  {messages[status]&&<p role="status" style={{padding:12,background:'#f5f5f5'}}>{messages[status]}</p>}
  {!ready&&<p style={{color:'#666',fontSize:12}}>‘브라우저에서 폰트 찾기’는 브라우저의 글꼴 접근 확인창을 띄울 수 있습니다. 폰트 이름만 이 기기에서 확인하며 파일을 업로드하지 않습니다.</p>}
  {detected.length>0&&<details><summary>브라우저에서 확인한 폰트</summary><ul>{detected.map((f,i)=><li key={i}>{f.name} · {f.style}</li>)}</ul></details>}
  <section style={{display:active==='current'?'block':'none'}}><h2 style={{fontSize:14,margin:'0 0 10px'}}>현재 포트폴리오 · Helvetica</h2><iframe title="현재 포트폴리오 서식" srcDoc={html(false)} onLoad={e=>blockLinks(e.currentTarget.contentDocument)} sandbox="allow-same-origin" style={{width:'100%',height:'75vh',border:'1px solid #ddd'}}/></section>
  <section style={{display:active==='neue'?'block':'none'}}><h2 style={{fontSize:14,margin:'0 0 10px'}}>Neue Haas Grotesk Text · 11px / 12px / 500 {ready?'· 실제 폰트 확인됨':''}</h2><div style={{position:'relative',height:'75vh',border:'1px solid #ddd'}}><iframe key={count} title="Neue Haas Grotesk 미리보기" ref={right} srcDoc={html(true)} sandbox="allow-same-origin" onLoad={()=>loadFont()} style={{width:'100%',height:'100%',border:0,visibility:ready?'visible':'hidden'}}/>{!ready&&<p style={{position:'absolute',inset:'24px',margin:0,color:'#666'}}>{status==='checking'?'브라우저에서 실제 폰트를 확인하고 있습니다…':'실제 Neue Haas Grotesk Text 연결을 기다리고 있습니다.'}</p>}</div></section>
  <p style={{color:'#777',fontSize:12}}>이 비교는 미리보기 전용입니다. 설치된 폰트는 이 기기에서만 사용하며 폰트 파일을 서버에 올리지 않습니다.</p>
 </main>
}
