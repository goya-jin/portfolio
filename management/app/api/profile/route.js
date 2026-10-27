import {requireOwner} from '../../../lib/owner';
import {github,decodeFile,saveFile} from '../../../lib/github';
import {readProfile,applyProfile} from '../../../lib/profile.mjs';
export async function GET(request){
 const access=await requireOwner(request);if(access.error)return access.error;
 try{const f=await github(access.token,'/contents/info.html?ref=main');return Response.json({sha:f.sha,profile:readProfile(decodeFile(f))},{headers:{'Cache-Control':'no-store'}})}catch(e){return Response.json({error:e.message},{status:502})}
}
export async function PUT(request){
 const access=await requireOwner(request,true);if(access.error)return access.error;
 try{const raw=await request.text();if(raw.length>150000)return Response.json({error:'입력 내용이 너무 깁니다.'},{status:413});const data=JSON.parse(raw);const f=await github(access.token,'/contents/info.html?ref=main');if(data.sha!==f.sha)return Response.json({error:'다른 곳에서 변경된 내용이 있습니다. 최신 내용을 다시 불러와 주세요.'},{status:409});const html=applyProfile(decodeFile(f),data.profile);const saved=await saveFile(access.token,{path:'info.html',sha:f.sha,content:html,message:'Update profile through owner management'});return Response.json({sha:saved.content.sha,url:`https://goya-jin.github.io/portfolio/info.html?v=${saved.commit.sha.slice(0,12)}`})}catch(e){return Response.json({error:e.message},{status:400})}
}
