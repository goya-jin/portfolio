import 'server-only';
import { headers } from 'next/headers';
import { getToken } from 'next-auth/jwt';
import { auth, configured, sessionCookie } from '../auth';
import { ownerSession, sameOrigin, OWNER_ID, OWNER_LOGIN } from './policy.mjs';
export async function requireOwner(request, mutation = false) {
  if (!configured) return { error: Response.json({ error: '관리자 로그인 설정이 필요합니다.' }, {status:503}) };
  const session = await auth();
  if (!ownerSession(session)) return { error: Response.json({ error: '관리자 로그인이 필요합니다.' }, {status:401}) };
  if (mutation && !sameOrigin(request)) return { error: Response.json({ error: '허용되지 않은 요청입니다.' }, {status:403}) };
  const token = await getToken({ req: { headers: await headers() }, secret: process.env.AUTH_SECRET, cookieName: sessionCookie, salt: sessionCookie, secureCookie: process.env.NODE_ENV === 'production' });
  if (token?.ownerId !== OWNER_ID || token?.login !== OWNER_LOGIN || typeof token.githubToken !== 'string') return { error: Response.json({ error: '다시 로그인해 주세요.' }, {status:401}) };
  return { token: token.githubToken };
}
