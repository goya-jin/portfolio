import 'server-only';
import { REPO } from './policy.mjs';
export async function github(token, path, method='GET', body) {
  const r=await fetch(`https://api.github.com/repos/${REPO}${path}`,{ method, cache:'no-store', headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}) });
  if (!r.ok) throw Error(r.status===401?'GitHub 연결이 만료됐습니다. 로그아웃 후 다시 로그인하세요.':r.status===409||r.status===422?'다른 변경과 겹쳤습니다. 최신 내용을 다시 불러오세요.':`GitHub 저장을 완료하지 못했습니다 (${r.status}).`);
  return r.json();
}
export function decodeFile(file) { return Buffer.from(file.content,'base64').toString('utf8'); }
export async function saveFile(token,{path,content,sha,message}) {
  return github(token,`/contents/${path}`,'PUT',{message,content:Buffer.from(content).toString('base64'),...(sha?{sha}:{}),branch:'main'});
}
