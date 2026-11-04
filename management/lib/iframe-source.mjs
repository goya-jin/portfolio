// Accept a single provider iframe as data; never execute pasted HTML.
export function iframeSource(text) {
  const match = /^<iframe\b[^<>]*\bsrc\s*=\s*(['"])(https:\/\/[^'"<>]+)\1[^<>]*>\s*<\/iframe\s*>$/i.exec(String(text || '').trim());
  if (!match) return null;
  try {
    const url = new URL(match[2].replaceAll('&amp;', '&'));
    if (url.username || url.password) return null;
    if (['www.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname) && /^\/embed\/[\w-]{11}$/.test(url.pathname)) return url.href;
    if (url.hostname === 'player.vimeo.com' && /^\/video\/\d+$/.test(url.pathname)) return url.href;
  } catch {}
  return null;
}
