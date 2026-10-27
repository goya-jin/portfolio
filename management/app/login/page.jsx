import { auth, configured, signIn } from '../../auth';
import { ownerSession } from '../../lib/policy.mjs';
import { redirect } from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Login({searchParams}){
 const session=configured?await auth():null;if(ownerSession(session))redirect('/write');
 const params=await searchParams;
 return <main className="login"><a href="https://goya-jin.github.io/portfolio/writing/">~goya jin</a><h1>관리자 로그인</h1><p>goya-jin 본인만 사용할 수 있는 공간입니다.</p>{params.error&&<p role="alert">로그인을 완료하지 못했습니다. goya-jin 계정인지 확인해 주세요.</p>}{configured?<form action={async()=>{'use server';await signIn('github',{redirectTo:'/write'})}}><button>GitHub로 로그인</button></form>:<p className="notice">로그인 설정 준비 중입니다. 아직 관리자 화면에 접근할 수 없습니다.</p>}<p><a href="https://goya-jin.github.io/portfolio/writing/">사이트로 돌아가기</a></p></main>
}
