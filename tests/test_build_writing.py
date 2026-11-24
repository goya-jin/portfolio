import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('writing', Path(__file__).parents[1] / 'scripts/build_writing.py')
writing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(writing)

class WritingBuildTests(unittest.TestCase):
    def test_global_typography_and_existing_formats(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'content/posts').mkdir(parents=True)
            (root/'writing').mkdir()
            (root/'freshness.js').write_text('/* freshness check */')
            (root/'writing/writing.css').write_text('article{line-height:var(--writing-line-height,1.6)}')
            (root/'index.html').write_text('<html><head></head><body>KEEP PORTFOLIO CONTENT</body></html>')
            settings = {'fontSize':16,'lineHeight':1.8,'paragraphGap':1.2}
            (root/'content/writing-settings.json').write_text(json.dumps(settings))
            for slug,format,body in [('legacy','markdown','2026. 09.03\n첫 문장\n다음 문장'),('rich','html','<p>앞</p><figure><img src="../../assets/photo.jpg"></figure><p>뒤</p><blockquote class="twitter-tweet"><p>tweet</p></blockquote>')]:
                meta = {'title':slug,'date':'2026-11-04','draft':False,'format':format}
                if slug == 'rich':
                    meta.update(canvas=True, css='.canvas-proof{display:flex;gap:24px}')
                (root/f'content/posts/{slug}.md').write_text(json.dumps(meta)+'\n---\n'+body)
            old = writing.ROOT, writing.SOURCE, writing.DEST, writing.TYPOGRAPHY
            writing.ROOT, writing.SOURCE, writing.DEST, writing.TYPOGRAPHY = root, root/'content/posts', root/'writing', root/'content/writing-settings.json'
            try:
                writing.build()
                for slug in ['rich','legacy']:
                    self.assertIn('--writing-font-size:16px', (root/f'writing/{slug}/index.html').read_text())
                version = json.loads((root/'site-version.json').read_text())['version']
                for path,prefix in [('index.html',''),('writing/index.html','../'),('writing/rich/index.html','../../')]:
                    html = (root/path).read_text()
                    self.assertIn(f'src="{prefix}freshness.js?v={version}"', html)
                    self.assertIn(f'data-site-version="{version}"', html)
                self.assertIn('KEEP PORTFOLIO CONTENT', (root/'index.html').read_text())
                self.assertIn('site-typography', (root/'index.html').read_text())
                self.assertNotIn('<ol start="2026">', (root/'writing/legacy/index.html').read_text())
                rich = (root/'writing/rich/index.html').read_text()
                self.assertLess(rich.index('<p>앞'), rich.index('<figure'))
                self.assertLess(rich.index('<figure'), rich.index('<p>뒤'))
                self.assertIn('https://platform.twitter.com/widgets.js', rich)
                self.assertIn('<style id="writing-custom-style">.canvas-proof{display:flex;gap:24px}</style>', rich)
                writing.build()
                self.assertEqual((root/'index.html').read_text().count('id="site-typography"'), 1)
                self.assertEqual((root/'index.html').read_text().count('id="site-freshness"'), 1)
            finally:
                writing.ROOT, writing.SOURCE, writing.DEST, writing.TYPOGRAPHY = old

    def test_hidden_and_deleted_posts_leave_no_page_or_navigation_links(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'content/posts').mkdir(parents=True)
            (root/'writing').mkdir()
            (root/'writing/writing.css').write_text('article{}')
            (root/'freshness.js').write_text('/* test */')
            for slug in ['first', 'middle', 'last']:
                meta = {'title':slug, 'date':'2026-11-24', 'draft':False, 'format':'html'}
                (root/f'content/posts/{slug}.md').write_text(json.dumps(meta)+'\n---\n<p>Keep body</p>')
            old = writing.ROOT, writing.SOURCE, writing.DEST, writing.TYPOGRAPHY
            writing.ROOT, writing.SOURCE, writing.DEST, writing.TYPOGRAPHY = root, root/'content/posts', root/'writing', root/'content/writing-settings.json'
            try:
                writing.build()
                target = root/'content/posts/middle.md'
                source = target.read_text()
                target.write_text(source.replace('"draft": false', '"draft": true'))
                writing.build()
                self.assertFalse((root/'writing/middle').exists())
                for page in (root/'writing').rglob('*.html'):
                    self.assertNotIn('middle/index.html', page.read_text())
                target.write_text(source)
                writing.build()
                self.assertTrue((root/'writing/middle/index.html').exists())
                self.assertIn('middle/index.html', (root/'writing/index.html').read_text())
                target.unlink()
                writing.build()
                self.assertFalse((root/'writing/middle').exists())
                self.assertTrue((root/'writing/first/index.html').exists())
                for page in (root/'writing').rglob('*.html'):
                    self.assertNotIn('middle/index.html', page.read_text())
            finally:
                writing.ROOT, writing.SOURCE, writing.DEST, writing.TYPOGRAPHY = old

class BilingualBuildTests(unittest.TestCase):
    def test_splitView_publication_scopes_styles_preserves_sources_and_can_be_disabled(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'content/posts').mkdir(parents=True)
            (root/'writing').mkdir()
            (root/'writing/writing.css').write_text('/* public */')
            (root/'freshness.js').write_text('/* freshness */')
            meta = {'title':'Both languages','date':'2026-11-24','draft':False,'format':'html','canvas':True,'css':'#same{color:red}@media(max-width:760px){p{font-size:12px}}','splitView':True,'secondGroup':{'body':'<p id="same">EN ONLY</p><figure><img src="../../assets/en.jpg"><figcaption><a href="https://example.com/source">English source</a></figcaption></figure>','format':'html','css':'#same{color:blue}'}}
            ko = '<p id="same">KO ONLY</p><figure><img src="../../assets/ko.jpg"><figcaption>Korean caption</figcaption></figure>'
            source = root/'content/posts/both.md'
            source.write_text(json.dumps(meta)+'\n---\n'+ko)
            (root/'content/posts/single.md').write_text(json.dumps({'title':'Single','date':'2026-11-23','format':'html'})+'\n---\n<p>single body</p>')
            old = writing.ROOT, writing.SOURCE, writing.DEST, writing.TYPOGRAPHY
            writing.ROOT, writing.SOURCE, writing.DEST, writing.TYPOGRAPHY = root, root/'content/posts', root/'writing', root/'content/writing-settings.json'
            try:
                writing.build()
                html = (root/'writing/both/index.html').read_text()
                self.assertIn('class="split-post"', html)
                self.assertIn('aria-label="그룹 1 본문"', html)
                self.assertIn('aria-label="그룹 2 본문"', html)
                self.assertLess(html.index('KO ONLY'), html.index('EN ONLY'))
                self.assertIn('../../assets/ko.jpg', html)
                self.assertIn('../../assets/en.jpg', html)
                self.assertIn('English source', html)
                self.assertIn('#writing-group-1 #same', html)
                self.assertIn('#writing-group-2 #same', html)
                self.assertIn('#writing-group-1 p', html)
                self.assertNotIn('class="split-post"', (root/'writing/single/index.html').read_text())
                meta['firstGroupEnabled'] = False
                source.write_text(json.dumps(meta)+'\n---\n'+ko)
                writing.build()
                one = (root/'writing/both/index.html').read_text()
                self.assertIn('EN ONLY', one)
                self.assertNotIn('KO ONLY', one)
                self.assertNotIn('class="split-post"', one)
                meta['firstGroupEnabled'] = True
                meta['secondGroup']['enabled'] = False
                source.write_text(json.dumps(meta)+'\n---\n'+ko)
                writing.build()
                one = (root/'writing/both/index.html').read_text()
                self.assertIn('KO ONLY', one)
                self.assertNotIn('EN ONLY', one)
                meta['secondGroup']['enabled'] = True
                meta['secondGroup']['body'] = '<p><br></p>'
                source.write_text(json.dumps(meta)+'\n---\n'+ko)
                writing.build()
                self.assertNotIn('class="split-post"', (root/'writing/both/index.html').read_text())
                meta['splitView'] = False
                source.write_text(json.dumps(meta)+'\n---\n'+ko)
                writing.build()
                html = (root/'writing/both/index.html').read_text()
                self.assertIn('KO ONLY', html)
                self.assertNotIn('EN ONLY', html)
                self.assertNotIn('writing-reading-columns', html)
            finally:
                writing.ROOT, writing.SOURCE, writing.DEST, writing.TYPOGRAPHY = old

    def test_nested_css_scoping_handles_commas_inside_selectors_and_rejects_imports(self):
        css = ':is(p,h2),body{color:red}@supports(display:grid){article p{display:grid}}'
        scoped = writing.scoped_group_css(css, '#writing-group-2')
        self.assertIn('#writing-group-2 :is(p,h2)', scoped)
        self.assertIn('#writing-group-2{color:red}', scoped)
        self.assertIn('#writing-group-2 p', scoped)
        with self.assertRaises(ValueError):
            writing.scoped_group_css('@import url(https://example.com)', '#writing-group-2')

if __name__ == '__main__':
    unittest.main()


