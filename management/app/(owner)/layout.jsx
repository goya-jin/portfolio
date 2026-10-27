import { auth, configured, signOut } from '../../auth';
import { ownerSession } from '../../lib/policy.mjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
export const dynamic='force-dynamic';
export default async function OwnerLayout({children}){
 if(!configured)redirect('/login');const session=await auth();if(!ownerSession(session))redirect('/login');
 return <><header><strong>~goya jin · 관리자</strong><nav><Link href="/write">글쓰기</Link><Link href="/profile">프로필 편집</Link><a href="https://goya-jin.github.io/portfolio/writing/" target="_blank" rel="noopener noreferrer">사이트 보기 ↗</a><form action={async()=>{'use server';await signOut({redirectTo:'/login'})}}><button>로그아웃</button></form></nav></header>{children}</>
}
