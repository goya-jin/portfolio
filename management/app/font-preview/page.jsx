'use client';
import {useEffect,useRef,useState} from 'react';
import sample from './sample.json';
const FAMILY='Portfolio Neue Preview';
const medium=['NeueHaasGroteskTextPro65Medium','NeueHaasGroteskTextPro-65Medium','NHaasGroteskTXPro-65Md','NeueHaasGroteskTextPro-65Md','Neue Haas Grotesk Text Pro 65 Medium','Neue Haas Grotesk Text Pro Medium'];
const faces=[{weight:'500',names:medium},{weight:'400',names:['NeueHaasGroteskTextPro55Roman','NeueHaasGroteskTextPro-55Roman','NHaasGroteskTXPro-55Rg','NeueHaasGroteskTextPro-55Roman','Neue Haas Grotesk Text Pro 55 Roman','Neue Haas Grotesk Text Pro Roman']},{weight:'700',names:['NeueHaasGroteskTextPro75Bold','NHaasGroteskTXPro-75Bd','NeueHaasGroteskTextPro-75Bold','Neue Haas Grotesk Text Pro 75 Bold','Neue Haas Grotesk Text Pro Bold']}];
function html(reference){return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+sample.styles.map(href=>'<link rel="stylesheet" href="'+href+'">').join('')+'<style>'+sample.css+(reference?'html{font-size:11px!important}body{font-size:11px!important;font-weight:500!important;line-height:12px!important}body *{font-family:inherit!important;font-size:inherit!important;line-height:inherit!important;font-weight:inherit!important}body b,body strong{font-weight:700!important}':'')+'</style><base href="https://goya-jin.github.io/portfolio/"></head><body>'+sample.body+'</body></html>'}
function blockLinks(doc){doc?.addEventListener('click',e=>{if(e.target.closest?.('a'))e.preventDefault()})}
export default function FontPreview(){
 const right=useRef(null),[active,setActive]=useState('neue'),[status,setStatus]=useState('checking'),[count,setCount]=useState(0);
 async function loadFont(){
  const doc=right.current?.contentDocument;if(!doc)return;blockLinks(doc);setStatus('checking');
  let mediumReady=false;
  for(const face of faces){try{const Font=right.current.contentWindow.FontFace,f=new Font(FAMILY,face.names.map(n=>'local("'+n+'")').join(','),{weight:face.weight,style:'normal'});await f.load();doc.fonts.add(f);if(face.weight==='500')mediumReady=true}catch{}}
  if(right.current?.contentDocument!==doc)return;
  if(mediumReady)doc.body.style.fontFamily='"'+FAMILY+'","Helvetica Neue",Helvetica,Arial,sans-serif';
  setStatus(mediumReady?'loaded':'missing');
 }
 useEffect(()=>{if(right.current?.contentDocument?.readyState==='complete')loadFont()},[count]);
 const ready=status==='loaded';
 return <main style={{maxWidth:'none',padding:'22px',font:'14px/1.5 Helvetica,Arial,sans-serif'}}>
  <h1 style={{fontSize:20}}>포트폴리오 폰트 비교</h1><p>Jeongin 사이트 기준: <strong>11px · 줄간격 12px · 굵기 500</strong></p>
  <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'16px 0'}}><button type="button" aria-pressed={active==='current'} onClick={()=>setActive('current')}>현재 Helvetica</button><button type="button" aria-pressed={active==='neue'} onClick={()=>setActive('neue')}>Neue Haas Grotesk</button><button type="button" onClick={()=>{setCount(n=>n+1);setStatus('checking')}}>폰트 다시 확인</button></div>
  {status==='missing'&&<p role="status" style={{padding:12,background:'#f5f5f5'}}>이 기기에서 Neue Haas Grotesk Text의 Medium을 찾지 못했습니다. <a href="https://fonts.adobe.com/fonts/neue-haas-grotesk" target="_blank" rel="noopener noreferrer">Adobe Fonts</a>에서 추가한 후, Creative Cloud 데스크톱 앱 → 글꼴 → 추가된 글꼴 → 설치(Install family)까지 진행하고 ‘폰트 다시 확인’을 누르세요.</p>}
  <div>
   <section style={{display:active==='current'?'block':'none'}}><h2 style={{fontSize:14,margin:'0 0 10px'}}>현재 포트폴리오 · Helvetica</h2><iframe title="현재 포트폴리오 서식" srcDoc={html(false)} onLoad={e=>blockLinks(e.currentTarget.contentDocument)} sandbox="allow-same-origin" style={{width:'100%',height:'75vh',border:'1px solid #ddd'}}/></section>
   <section style={{display:active==='neue'?'block':'none'}}><h2 style={{fontSize:14,margin:'0 0 10px'}}>Neue Haas Grotesk Text · 11px / 12px / 500 {status==='loaded'?'· 실제 폰트 확인됨':''}</h2><div style={{position:'relative',height:'75vh',border:'1px solid #ddd'}}><iframe key={count} title="참고 사이트 크기로 비교" ref={right} srcDoc={html(true)} sandbox="allow-same-origin" onLoad={loadFont} style={{width:'100%',height:'100%',border:0,visibility:ready?'visible':'hidden'}}/>{!ready&&<p style={{position:'absolute',inset:'24px',margin:0,color:'#666'}}>{status==='checking'?'이 기기에 활성화된 폰트를 확인하고 있습니다…':'실제 Neue Haas Grotesk Text 연결을 기다리고 있습니다.'}</p>}</div></section>
  </div><p style={{color:'#777',fontSize:12}}>이 비교는 미리보기 전용입니다. 설치된 폰트는 이 기기에서만 사용하며 폰트 파일을 서버에 올리지 않습니다.</p>
 </main>
}
