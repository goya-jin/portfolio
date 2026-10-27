export const LIMIT=3*1024*1024;
export const ext=name=>name.split('.').pop().toLowerCase();
export const image=name=>['jpg','jpeg','png','webp','gif','avif'].includes(ext(name));
const allowed=new Set(['jpg','jpeg','png','webp','gif','avif','pdf','txt','md','zip','docx','xlsx','pptx']);
export function validatePost(p,files){if(!p||typeof p.title!=='string'||!p.title.trim()||p.title.length>200||typeof p.body!=='string'||p.body.length>100000||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||new Date(p.date).toISOString().slice(0,10)!==p.date)throw Error('제목·날짜·내용을 확인해 주세요.');if(files.length>8||files.reduce((n,f)=>n+f.size,0)>LIMIT||files.some(f=>!allowed.has(ext(f.name))||!f.size))throw Error('지원하는 파일을 전체 3MB, 최대 8개 이내로 첨부해 주세요.');}
export function parsePost(text){const pos=text.indexOf('\n---\n');if(pos<0)throw Error('편집할 수 없는 글 형식입니다.');return {...JSON.parse(text.slice(0,pos)),body:text.slice(pos+5)}}
export function serializePost(p,uploads){let body=p.body;for(const f of uploads){const label=f.name.replace(/[\\\[\]<>\r\n]/g,' '),tag=`${image(f.name)?'!':''}[${label}](../../assets/writing/${p.slug}/${f.id}.${ext(f.name)})`;if(body.includes(f.marker))body=body.split(f.marker).join(tag);else body+='\n\n'+tag}return JSON.stringify({title:p.title.trim(),date:p.date,draft:false})+'\n---\n'+body.trim()+'\n'}
