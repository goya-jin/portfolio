export const IMAGE_ROW_STYLE='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start;margin:1.2em 0;';
export function imageReferences(text){
 const value=String(text).trim();
 if(!/^\{image\d+\}(?:\s*\{image\d+\})?$/.test(value))return null;
 return [...value.matchAll(/\{(image\d+)\}/g)].map(m=>m[1]);
}
