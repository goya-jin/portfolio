export const OWNER_LOGIN = 'goya-jin';
export const OWNER_ID = '330348134';
export const REPO = 'goya-jin/portfolio';
export function isOwner(profile) { return String(profile?.id) === OWNER_ID && String(profile?.login).toLowerCase() === OWNER_LOGIN; }
export function ownerSession(session) { return session?.user?.ownerId === OWNER_ID && session?.user?.login === OWNER_LOGIN; }
export function sameOrigin(request) { return request.headers.get('origin') === new URL(request.url).origin; }
export function validateCredit(c) { return c && ['role','title','year','category'].every(k => typeof c[k] === 'string' && c[k].trim().length > 0 && c[k].length < 1000) && /^\d{4}(?:[–-]\d{4})?$/.test(c.year); }
