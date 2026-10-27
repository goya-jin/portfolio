import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { isOwner, OWNER_ID, OWNER_LOGIN } from './lib/policy.mjs';
export const configured = Boolean(process.env.AUTH_SECRET && process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
export const sessionCookie = process.env.NODE_ENV === 'production' ? '__Secure-goya.session-token' : 'goya.session-token';
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [GitHub({ clientId: process.env.AUTH_GITHUB_ID || '', clientSecret: process.env.AUTH_GITHUB_SECRET || '', authorization: { params: { scope: 'read:user public_repo' } } })],
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  cookies: { sessionToken: { name: sessionCookie, options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' } } },
  callbacks: {
    signIn({ account, profile }) { return account?.provider === 'github' && isOwner(profile); },
    jwt({ token, account, profile }) {
      if (account && isOwner(profile)) { token.ownerId = OWNER_ID; token.login = OWNER_LOGIN; token.githubToken = account.access_token; }
      return token;
    },
    session({ session, token }) {
      session.user.ownerId = token.ownerId; session.user.login = token.login;
      // Provider credentials stay encrypted in the HttpOnly session cookie.
      return session;
    }
  },
  pages: { signIn: '/login', error: '/login' }
});
