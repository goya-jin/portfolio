export const PREVIEW_FAMILY='Portfolio Neue Preview';
const standard=[
 {weight:'500',names:['NHaasGroteskTXPro-65Md','Neue Haas Grotesk Text Pro 65 Medium','Neue Haas Grotesk Text Pro Medium','NeueHaasGroteskTextPro65Medium']},
 {weight:'400',names:['NHaasGroteskTXPro-55Rg','Neue Haas Grotesk Text Pro 55 Roman','Neue Haas Grotesk Text Pro Roman']},
 {weight:'700',names:['NHaasGroteskTXPro-75Bd','Neue Haas Grotesk Text Pro 75 Bold','Neue Haas Grotesk Text Pro Bold']},
];
export function matchingTextFonts(fonts){return fonts.filter(f=>{
 const name=[f.family,f.fullName,f.postscriptName].join(' ').replace(/[^a-z0-9]/gi,'').toLowerCase();
 return /neuehaasgrotesktext|nhaasgrotesktxpro/.test(name)&&!/mono/.test(name);
})}
export function fontDefinitions(fonts=[]){
 const relevant=matchingTextFonts(fonts);
 return standard.map(face=>{
  const found=relevant.filter(f=>{
   const name=[f.style,f.fullName,f.postscriptName].join(' ');
   if(/italic|oblique|MdIt|RgIt|BdIt/i.test(name))return false;
   return face.weight==='500'?/65|medium/i.test(name):face.weight==='700'?/75|bold/i.test(name):/55|roman|regular/i.test(name);
  }).flatMap(f=>[f.postscriptName,f.fullName]).filter(Boolean);
  return {...face,names:[...new Set([...found,...face.names])]};
 });
}
const quote=value=>'"'+value.replaceAll('\\','\\\\').replaceAll('"','\\"').replace(/[\r\n]/g,' ')+'"';
export async function loadLocalNeue(ownerWindow,targetDocument,metadata=[]){
 const loadedWeights=[],failures=[];
 if(!ownerWindow?.FontFace||!targetDocument?.fonts)return {mediumLoaded:false,loadedWeights,failures,reason:'unsupported'};
 // Resolve local font names in the top-level browsing context, not the sandboxed frame.
 for(const face of fontDefinitions(metadata)){
  try{
   const font=new ownerWindow.FontFace(PREVIEW_FAMILY,face.names.map(n=>'local('+quote(n)+')').join(','),{weight:face.weight,style:'normal'});
   await font.load();ownerWindow.document.fonts.add(font);targetDocument.fonts.add(font);loadedWeights.push(face.weight);
  }catch(e){failures.push({weight:face.weight,reason:e?.name||'FontLoadError'})}
 }
 return {mediumLoaded:loadedWeights.includes('500'),loadedWeights,failures};
}
