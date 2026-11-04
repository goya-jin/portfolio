/* Revalidate public pages when opened or restored from browser history. */
(() => {
  const script = document.currentScript;
  if (!script) return;
  const loadedVersion = script.dataset.siteVersion;
  const base = new URL('.', script.src);
  let checking = null;
  function updateLinks(version) {
    for (const link of document.querySelectorAll('a[href]')) {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || link.hasAttribute('download')) continue;
      let url;
      try { url = new URL(href, location.href); } catch { continue; }
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) continue;
      if (!url.pathname.endsWith('.html') && !url.pathname.endsWith('/')) continue;
      url.searchParams.set('v', version);
      link.href = url.href;
    }
  }
  async function check() {
    if (checking) return checking;
    checking = (async () => {
      try {
        const manifest = new URL('site-version.json', base);
        manifest.searchParams.set('_', String(Date.now()));
        const response = await fetch(manifest.href, {cache: 'no-store'});
        if (!response.ok) return;
        const {version} = await response.json();
        if (!/^[a-f0-9]{12}$/.test(version)) return;
        updateLinks(version);
        const current = new URL(location.href);
        if (version === loadedVersion || current.searchParams.get('v') === version) return;
        current.searchParams.set('v', version);
        location.replace(current.href);
      } catch { /* Keep the readable page available when offline. */ }
    })();
    try { await checking; } finally { checking = null; }
  }
  window.addEventListener('pageshow', check);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
  check();
})();
