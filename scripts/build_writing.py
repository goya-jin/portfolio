"""Build the writing section without touching portfolio content."""
from pathlib import Path
from datetime import date
from html import escape as e
import hashlib
import json
import re
import shutil
import markdown

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/posts'
DEST = ROOT / 'writing'

def load_posts():
    posts = []
    for path in SOURCE.glob('*.md'):
        text = path.read_text(encoding='utf-8')
        metadata, body = text.split('\n---\n', 1)
        meta = json.loads(metadata)
        slug = path.stem
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug):
            raise ValueError(f'Invalid filename: {path.name}')
        date.fromisoformat(meta['date'])
        if not meta['title'].strip():
            raise ValueError(f'Missing title: {path.name}')
        if meta.get('draft', False):
            continue
        posts.append(dict(meta, slug=slug, body=body))
    return sorted(posts, key=lambda p: (p['date'], p['slug']), reverse=True)

def page(title, body, depth=0, current=''):
    prefix = '../' * depth
    css_version = hashlib.sha256((DEST / "writing.css").read_bytes()).hexdigest()[:12]
    nav = ' · '.join(f'<a href="{href}"' + (' aria-current="page"' if label == current else '') + f'>{label}</a>' for label, href in [('Portfolio', prefix+'../index.html'), ('Posts', prefix+'index.html'), ('Archive', prefix+'archive.html'), ('About', prefix+'../info.html')])
    return f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)} — Goya Jin</title><meta name="description" content="Goya Jin의 글과 기록.">
<link rel="stylesheet" href="{prefix}writing.css?v={css_version}"></head>
<body><header><p><a href="{prefix}index.html">~goya jin</a></p><nav aria-label="주요 메뉴">{nav}</nav></header>
<main id="content">{body}</main><footer><hr><p>Goya Jin · <a href="mailto:09190kk@gmail.com">Email</a></p></footer></body></html>'''

def row(p):
    return f'<li><time datetime="{p["date"]}">{p["date"]}</time> — <a href="{p["slug"]}/index.html">{e(p["title"])}</a></li>'

def build():
    posts = load_posts()  # Validate all input before replacing generated output.
    DEST.mkdir(exist_ok=True)
    for old in DEST.iterdir():
        if old.is_dir():
            shutil.rmtree(old)
    listing = '<ul>\n' + '\n'.join(row(p) for p in posts) + '\n</ul>' if posts else '<p>아직 공개된 글이 없습니다.</p>'
    (DEST/'index.html').write_text(page('Writing', '<h1>Writing</h1><p>글과 기록.</p>'+listing, current='Posts'), encoding='utf-8')
    years = sorted({p['date'][:4] for p in posts}, reverse=True)
    archive = '<h1>Archive</h1><p>연도별 글 모음.</p>'
    archive += '<p>' + ' · '.join(f'<a href="#{y}">{y}</a>' for y in years) + '</p>'
    for year in years:
        archive += f'<section aria-labelledby="{year}"><h2 id="{year}">{year}</h2><ul>' + ''.join(row(p) for p in posts if p['date'].startswith(year)) + '</ul></section>'
    if not posts:
        archive += '<p>아직 공개된 글이 없습니다.</p>'
    (DEST/'archive.html').write_text(page('Archive', archive, current='Archive'), encoding='utf-8')
    for i, post in enumerate(posts):
        html = markdown.markdown(post['body'], extensions=['extra', 'sane_lists'])
        body = f'<article><h1>{e(post["title"])}</h1><p><time datetime="{post["date"]}">{post["date"]}</time></p>{html}</article><hr><nav aria-label="글 이동"><p><a href="../index.html">← 글 목록</a></p>'
        for label, neighbor in [('이전 글', i+1), ('다음 글', i-1)]:
            if 0 <= neighbor < len(posts):
                p = posts[neighbor]
                body += f'<p>{label}: <a href="../{p["slug"]}/index.html">{e(p["title"])}</a></p>'
        body += '</nav>'
        folder = DEST/post['slug']
        folder.mkdir()
        (folder/'index.html').write_text(page(post['title'], body, depth=1), encoding='utf-8')
    print(f'Built {len(posts)} posts and archive.')

if __name__ == '__main__':
    build()
