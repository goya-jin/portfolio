export function appendAttachments(existing, selected) {
 const next=[...existing];
 for(const file of selected){
  if(!next.some(current=>current.name===file.name&&current.size===file.size&&current.lastModified===file.lastModified))next.push(file);
 }
 if(next.length>8||next.reduce((total,file)=>total+file.size,0)>3*1024*1024)throw Error('기존 파일을 포함해 전체 3MB, 최대 8개까지 첨부할 수 있습니다.');
 return next;
}
