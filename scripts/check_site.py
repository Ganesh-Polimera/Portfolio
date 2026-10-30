"""Check static relative links and local module imports without network access."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re

ROOT = Path(__file__).resolve().parents[1]
errors = []

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.ids = set()
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            if attrs['id'] in self.ids:
                errors.append(f'Duplicate id: {attrs["id"]}')
            self.ids.add(attrs['id'])
        for attr in ('href', 'src'):
            if attr in attrs:
                self.refs.append(attrs[attr])

pages = {}
for path in ROOT.rglob('*.html'):
    if any(part in ('dist', 'node_modules', '.git') for part in path.relative_to(ROOT).parts):
        continue
    parser = Page()
    parser.feed(path.read_text())
    pages[path] = parser
for path, parser in pages.items():
    for ref in parser.refs:
        parts = urlsplit(ref)
        if parts.scheme or parts.netloc:
            continue
        target = (path.parent / unquote(parts.path)).resolve() if parts.path else path
        if target.is_dir():
            target /= 'index.html'
        if not target.exists():
            errors.append(f'{path.relative_to(ROOT)}: missing {ref}')
        elif parts.fragment and target in pages and unquote(parts.fragment) not in pages[target].ids:
            errors.append(f'{path.relative_to(ROOT)}: missing anchor {ref}')
for path in ROOT.rglob('*.mjs'):
    if any(part in ('dist','node_modules','.git') for part in path.relative_to(ROOT).parts):
        continue
    for ref in re.findall(r'from\s+[\'"]([^\'"]+)[\'"]', path.read_text()):
        if ref.startswith('.') and not (path.parent / ref).resolve().is_file():
            errors.append(f'{path.relative_to(ROOT)}: missing import {ref}')
if errors:
    raise SystemExit('\n'.join(errors))
print(f'Checked {len(pages)} HTML pages and local module imports: no broken internal references.')
