'use client';
import {useEffect,useRef,useState} from 'react';
import ProjectCanvas from '../../components/project-canvas';
import SiteTypography from '../../components/site-typography';
import LegacyEditor from './project-editor';
export default function VisualProjectEditor(){
 const [list,setList]=useState([]),[path,setPath]=useState(''),[loaded,setLoaded]=useState(null),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[dirty,setDirty]=useState(false),[message,setMessage]=useState('프로젝트를 선택해 불러오세요.'),[url,setURL]=useState(''),[legacy,setLegacy]=useState(false),[canvas,setCanvas]=useState(null),[ready,setReady]=useState(false);
 const read=useRef(null),dirtyRef=useRef(dirty);dirtyRef.current=dirty;
 useEffect(()=>{fetch('/api/projects',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);setList(d.projects);setPath(d.projects.find(p=>p.path!=='index.html')?.path||'index.html')}).catch(e=>setMessage(e.message))},[]);
 useEffect(()=>{const before=e=>{if(dirtyRef.current||uploading){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before)},[uploading]);
 async function load(){if(dirty&&!window.confirm('저장하지 않은 수정이 있습니다. 다른 페이지를 불러올까요?'))return;setBusy(true);try{const r=await fetch('/api/projects?path='+encodeURIComponent(path),{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error);if(!d.canvas)throw Error('편집기를 새로고침해 주세요.');setLoaded(d);setCanvas(null);setReady(false);read.current=null;setDirty(false);setURL('');setMessage('본문을 클릭해 입력하세요. 사진과 열은 상단에서 넣을 수 있습니다.')}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 async function save(){if(!loaded||!read.current||uploading||busy)return;setBusy(true);setMessage('페이지를 저장하는 중…');try{const next=await read.current();const form=new FormData();form.append('project',JSON.stringify({path:loaded.path,sha:loaded.sha,canvas:next}));const r=await fetch('/api/projects',{method:'POST',body:form}),d=await r.json();if(!r.ok)throw Error(d.error);localStorage.removeItem('goya-project-canvas:'+loaded.path);setLoaded(d);setCanvas(null);setReady(false);read.current=null;setDirty(false);setURL(d.url);setMessage('저장했습니다. 공개 사이트에 보통 1–2분 뒤 반영됩니다.')}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 if(legacy)return <><button type="button" onClick={()=>setLegacy(false)}>페이지 편집으로 돌아가기</button><LegacyEditor/></>;
 return <div className="project-studio">
  <div className="studio-topbar"><label>프로젝트<select aria-label="프로젝트" disabled={busy||uploading} value={path} onChange={e=>setPath(e.target.value)}>{list.map(p=><option key={p.path} value={p.path}>{p.title}</option>)}</select></label><button type="button" disabled={!path||busy||uploading} onClick={load}>불러오기</button><span className="toolbar-spacer"/>{dirty&&<small>저장하지 않은 수정</small>}<button className="primary" type="button" disabled={!loaded||!ready||busy||uploading} onClick={save}>{busy?'저장 중…':uploading?'사진 업로드 중…':'저장·사이트 반영'}</button></div>
  <p role="status" className="studio-status">{message} {url&&<a href={url} target="_blank" rel="noopener noreferrer">공개 페이지 보기</a>}</p>
  {loaded&&<ProjectCanvas key={loaded.path+loaded.sha} path={loaded.path} sha={loaded.sha} document={loaded.canvas} disabled={busy} onBusyChange={setUploading} onReady={reader=>{read.current=reader;setReady(true)}} onChange={next=>{setCanvas(next);setDirty(true)}} onMessage={setMessage}/>}
  <div className="studio-footer"><SiteTypography onMessage={setMessage}/><button className="quiet-button" type="button" disabled={busy||uploading} onClick={()=>{if(!dirty||window.confirm('수정 내용을 보관한 뒤 기존 편집기로 이동할까요?'))setLegacy(true)}}>새 프로젝트·고급 설정</button></div>
 </div>
}
