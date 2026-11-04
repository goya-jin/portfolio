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
                writing.build()
                self.assertEqual((root/'index.html').read_text().count('id="site-typography"'), 1)
                self.assertEqual((root/'index.html').read_text().count('id="site-freshness"'), 1)
            finally:
                writing.ROOT, writing.SOURCE, writing.DEST, writing.TYPOGRAPHY = old

if __name__ == '__main__':
    unittest.main()

