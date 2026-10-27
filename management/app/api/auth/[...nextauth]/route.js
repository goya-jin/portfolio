import { handlers, configured } from '../../../../auth';
const unavailable=()=>Response.json({error:'로그인 설정 준비 중입니다.'},{status:503});
export const GET=(...args)=>configured?handlers.GET(...args):unavailable();
export const POST=(...args)=>configured?handlers.POST(...args):unavailable();
