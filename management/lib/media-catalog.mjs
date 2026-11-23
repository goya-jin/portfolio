const BASE='https://goya-jin.github.io/portfolio/';
export function mediaCatalog(tree,existing=[]){
 const paths=new Set(tree.filter(f=>f.type==='blob'&&/^assets\/.+\.(png|jpe?g|webp|gif|avif)$/i.test(f.path)).map(f=>BASE+f.path));
 const items=[],seen=new Set(),refs=new Set();let next=1;
 for(const item of existing){if(!item||!/^image[1-9]\d*$/.test(item.ref)||typeof item.name!=='string'||!paths.has(item.src)||seen.has(item.src)||refs.has(item.ref))continue;items.push({ref:item.ref,src:item.src,name:item.name});seen.add(item.src);refs.add(item.ref);next=Math.max(next,Number(item.ref.slice(5))+1)}
 for(const src of [...paths].sort()){if(!seen.has(src)){items.push({ref:'image'+next++,src,name:src.split('/').pop()});seen.add(src)}}
 return items;
}
export function appendMedia(items,uploaded){let next=Math.max(0,...items.map(i=>Number(i.ref.slice(5))))+1;return [...items,...uploaded.map(i=>({...i,ref:'image'+next++}))]}
