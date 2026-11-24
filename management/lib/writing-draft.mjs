// One-time recovery of the former canvas draft into the continuous editor.
export function recoverCanvasDraft(saved,storage){
 const key='goya-project-canvas:writing-'+(saved.slug||'new'),raw=storage.getItem(key);
 if(!raw)return saved;
 let draft;try{draft=JSON.parse(raw)}catch{return saved}
 if(draft.sha!==(saved.sha||'new')||typeof draft.canvas?.html!=='string')return saved;
 let body=draft.canvas.html;
 if(draft.active?.indices?.length===1&&typeof draft.active.html==='string'&&typeof DOMParser!=='undefined'){
  const doc=new DOMParser().parseFromString('<div id="recovered-root">'+body+'</div>','text/html');
  const target=doc.getElementById('recovered-root')?.children[draft.active.indices[0]-2];
  // The old Writing canvas had two fixed title/date components before the body.
  if(target&&/^(P|H[1-6]|BLOCKQUOTE|COLUMN-UNIT)$/.test(target.tagName)){
   target.innerHTML=draft.active.html;body=doc.getElementById('recovered-root').innerHTML;
  }
 }
 const next={...saved,body,css:draft.canvas.css||saved.css||'',canvas:true,format:'html'};
 // If storage is full, retain both originals and let the caller show recovery failure.
 storage.setItem('goya-owner-legacy-canvas-backup',JSON.stringify({saved,canvas:draft}));
 storage.setItem('goya-owner-draft',JSON.stringify(next));
 storage.removeItem(key);
 return next;
}
