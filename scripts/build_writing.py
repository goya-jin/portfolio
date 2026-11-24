"""Build the writing section without touching portfolio content."""
from pathlib import Path
from datetime import date
from html import escape as e, unescape
import hashlib
import os
import json
import re
import shutil
import markdown
import tinycss2

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/posts'
DEST = ROOT / 'writing'
TYPOGRAPHY = ROOT / 'content/writing-settings.json'

def typography():
    if not TYPOGRAPHY.exists():
        return None
    value = json.loads(TYPOGRAPHY.read_text(encoding='utf-8'))
    size, height, gap = value['fontSize'], value['lineHeight'], value['paragraphGap']
    if isinstance(size, bool) or not isinstance(size, int) or not 11 <= size <= 24 or not isinstance(height, (int, float)) or not 1.3 <= height <= 2.2 or not isinstance(gap, (int, float)) or not .5 <= gap <= 2.5:
        raise ValueError('Invalid site typography settings')
    return f'--writing-font-size:{size}px;--writing-line-height:{height};--writing-paragraph-gap:{gap}em'

def portfolio_typography(text, variables):
    if not variables:
        return text
    text = re.sub(r'<style id="site-typography">.*?</style>', '', text, flags=re.DOTALL)
    rules = ':root{' + variables + '}html{font-size:var(--writing-font-size)!important}body,.nav-tools>a,.nav-section li>a,.nav-note{line-height:var(--writing-line-height)}main .project-prose,main.info-page{line-height:var(--writing-line-height)}main p{margin-bottom:var(--writing-paragraph-gap)}@media(max-width:760px){html{font-size:min(var(--writing-font-size),16px)!important}}'
    return text.replace('</head>', '<style id="site-typography">' + rules + '</style></head>')


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

def scoped_group_css(css, scope):
    if not isinstance(css, str) or len(css) > 250000 or re.search(r'<|@import|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding', css, re.I):
        raise ValueError('Invalid group CSS')
    def rewrite(rules):
        output = []
        for rule in rules:
            if rule.type == 'qualified-rule':
                groups, group = [], []
                for token in rule.prelude:
                    if token.type == 'literal' and token.value == ',':
                        groups.append(tinycss2.serialize(group).strip()); group = []
                    else:
                        group.append(token)
                groups.append(tinycss2.serialize(group).strip())
                selectors = []
                for selector in groups:
                    selector = re.sub(r'^(?:(?:html|body|article|:root)(?:\s+|$))+', '', selector).strip()
                    selectors.append(scope + (' ' + selector if selector else ''))
                rule.prelude = tinycss2.parse_component_value_list(','.join(selectors))
                output.append(rule)
            elif rule.type == 'at-rule' and rule.content is not None and rule.lower_at_keyword in ('media', 'supports', 'container', 'layer'):
                nested = rewrite(tinycss2.parse_rule_list(rule.content, skip_comments=True, skip_whitespace=True))
                rule.content = tinycss2.parse_component_value_list(nested)
                output.append(rule)
        return tinycss2.serialize(output)
    return rewrite(tinycss2.parse_stylesheet(css, skip_comments=True, skip_whitespace=True))


def has_group_content(html):
    return bool(re.search(r'<(?:img|video|iframe|audio|table|hr)\b', html, re.I) or unescape(re.sub(r'<[^>]*>', '', html)).strip())


def split_body(title, date_value, first, second):
    return (f'<section class="reading-document"><header class="reading-post-heading"><h1>{e(title)}</h1><p><time datetime="{e(date_value)}">{e(date_value)}</time></p></header>'
            '<div class="writing-reading-columns">'
            '<section class="writing-reading-panel" role="region" tabindex="0" aria-label="그룹 1 본문"><article id="writing-group-1">' + first + '</article></section>'
            '<section class="writing-reading-panel" role="region" tabindex="0" aria-label="그룹 2 본문"><article id="writing-group-2">' + second + '</article></section>'
            '</div></section>')


def page(title, body, depth=0, current='', custom_css='', splitView=False):
    if not isinstance(custom_css, str) or len(custom_css) > 250000 or re.search(r'<|@import|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding', custom_css, re.I):
        raise ValueError('Invalid post CSS')
    post_style = '<style id="writing-custom-style">' + custom_css + '</style>' if custom_css else ''
    prefix = '../' * depth
    variables = typography()
    html_style = f' style="{variables}"' if variables else ''
    social_script = '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>' if 'twitter-tweet' in body and 'platform.twitter.com/widgets.js' not in body else ''
    css_version = hashlib.sha256((DEST / "writing.css").read_bytes()).hexdigest()[:12]
    nav = ' · '.join(f'<a href="{href}"' + (' aria-current="page"' if label == current else '') + f'>{label}</a>' for label, href in [('About', prefix+'../info.html'), ('Posts', prefix+'index.html'), ('Portfolio', prefix+'../index.html')])
    body_class = ' class="split-post"' if splitView else ''
    return f'''<!doctype html>
<html lang="ko"{html_style}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)} — Goya Jin</title><meta name="description" content="Goya Jin의 글과 기록.">
<link rel="stylesheet" href="{prefix}writing.css?v={css_version}">{post_style}</head>
<body{body_class}><header><p><a href="{prefix}index.html">~goya jin</a></p><nav aria-label="주요 메뉴">{nav}</nav></header>
<main id="content">{body}</main><footer><hr><p>Goya Jin · <a href="mailto:09190kk@gmail.com">Email</a></p></footer>{social_script}</body></html>'''

def row(p):
    return f'<li><time datetime="{p["date"]}">{p["date"]}</time> — <a href="{p["slug"]}/index.html">{e(p["title"])}</a></li>'

def render_body(body, format="markdown"):
    if format == "html":
        return body
    # A date such as "2026. 09.03" is prose, not a numbered list.
    body = re.sub(r'^(\d{4})\.(?=[ \t]*\d{1,2}\.[ \t]*\d{1,2}(?:\D|$))',
                  r'\1\\.', body, flags=re.MULTILINE)
    return markdown.markdown(body, extensions=['extra', 'sane_lists', 'nl2br'])


def page_freshness(text, version, path):
    text = re.sub(r'<script\b[^>]*\bid="site-freshness"[^>]*>.*?</script>', '', text, flags=re.DOTALL)
    source = os.path.relpath(ROOT/'freshness.js', path.parent).replace(os.sep, '/')
    script = f'<script id="site-freshness" defer src="{source}?v={version}" data-site-version="{version}"></script>'
    return text.replace('</head>', script + '</head>')


def build():
    posts = load_posts()  # Validate all input before replacing generated output.
    DEST.mkdir(exist_ok=True)
    for old in DEST.iterdir():
        if old.is_dir():
            shutil.rmtree(old)
    years = sorted({p['date'][:4] for p in posts}, reverse=True)
    listing = '<h1>Writing</h1><p>글과 기록.</p>'
    for year in years:
        listing += f'<section aria-labelledby="year-{year}"><h2 id="year-{year}">{year}</h2><ul>' + ''.join(row(p) for p in posts if p['date'].startswith(year)) + '</ul></section>'
    if not posts:
        listing += '<p>아직 공개된 글이 없습니다.</p>'
    (DEST/'index.html').write_text(page('Writing', listing, current='Posts'), encoding='utf-8')
    # Preserve old bookmarks while keeping a single post listing.
    redirect = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=index.html"><title>글 목록으로 이동 — Goya Jin</title></head><body><p><a href="index.html">글 목록으로 이동</a></p></body></html>'
    (DEST/'archive.html').write_text(redirect, encoding='utf-8')
    for i, post in enumerate(posts):
        html = render_body(post['body'], post.get('format', 'markdown'))
        splitView = post.get('splitView') is True
        custom_css = post.get('css', '')
        if splitView:
            secondary = post.get('secondGroup') or {}
            second_html = render_body(secondary.get('body', ''), secondary.get('format', 'html'))
            first_on = post.get('firstGroupEnabled') is not False and has_group_content(html)
            second_on = secondary.get('enabled') is not False and has_group_content(second_html)
            if first_on and second_on:
                content = split_body(post['title'], post['date'], html, second_html)
                custom_css = scoped_group_css(custom_css, '#writing-group-1') + scoped_group_css(secondary.get('css', ''), '#writing-group-2')
            else:
                group_id = 'writing-group-1' if first_on else 'writing-group-2'
                selected_html = html if first_on else second_html if second_on else ''
                selected_css = custom_css if first_on else secondary.get('css', '') if second_on else ''
                content = f'<article id="{group_id}"><h1>{e(post["title"])}</h1><p><time datetime="{post["date"]}">{post["date"]}</time></p>{selected_html}</article>'
                custom_css = scoped_group_css(selected_css, '#' + group_id)
                splitView = False
        else:
            content = f'<article><h1>{e(post["title"])}</h1><p><time datetime="{post["date"]}">{post["date"]}</time></p>{html}</article>'
        body = content + '<hr><nav aria-label="글 이동"><p><a href="../index.html">← 글 목록</a></p>'
        for label, neighbor in [('이전 글', i+1), ('다음 글', i-1)]:
            if 0 <= neighbor < len(posts):
                p = posts[neighbor]
                body += f'<p>{label}: <a href="../{p["slug"]}/index.html">{e(p["title"])}</a></p>'
        body += '</nav>'
        folder = DEST/post['slug']
        folder.mkdir()
        (folder/'index.html').write_text(page(post['title'], body, depth=1, custom_css=custom_css, splitView=splitView), encoding='utf-8')
    # Version every local HTML navigation URL, not only the stylesheet.
    # Otherwise a new page can navigate back into a browser-cached old menu.
    inputs = [Path(__file__), DEST/'writing.css', *sorted(SOURCE.glob('*.md'))]
    if TYPOGRAPHY.exists():
        inputs.append(TYPOGRAPHY)
    if (ROOT/'freshness.js').exists():
        inputs.append(ROOT/'freshness.js')
    version = hashlib.sha256(b''.join(p.read_bytes() for p in inputs) + os.environ.get('GITHUB_SHA', '').encode()).hexdigest()[:12]
    (ROOT/'site-version.json').write_text(json.dumps({'version': version}), encoding='utf-8')
    for path in [*DEST.rglob('*.html'), *(ROOT/'admin').glob('*.html')]:
        text = path.read_text(encoding='utf-8')
        text = re.sub(r'href="([^":?]+\.html)(?:\?v=[a-z0-9]+)?"', lambda m: f'href="{m[1]}?v={version}"', text)
        text = text.replace('0;url=index.html"', f'0;url=index.html?v={version}"')
        if path.is_relative_to(DEST):
            text = page_freshness(text, version, path)
        path.write_text(text, encoding='utf-8')
    portfolio_css_version = hashlib.sha256((ROOT/'styles.css').read_bytes()).hexdigest()[:12] if (ROOT/'styles.css').exists() else None
    for path in ROOT.glob('*.html'):
        text = path.read_text(encoding='utf-8')
        text = portfolio_typography(text, typography())
        if portfolio_css_version:
            text = re.sub(r'href="styles\.css(?:\?v=[^"]*)?"', f'href="styles.css?v={portfolio_css_version}"', text)
        text = page_freshness(text, version, path)
        text = re.sub(r'href="writing/index\.html(?:\?v=[a-z0-9]+)?"', f'href="writing/index.html?v={version}"', text)
        path.write_text(text, encoding='utf-8')
    print(f'Built {len(posts)} posts grouped by year.')

if __name__ == '__main__':
    build()


