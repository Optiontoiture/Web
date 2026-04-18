#!/usr/bin/env python3
"""Check internal broken links + sitemap consistency."""
import re, os
from pathlib import Path
from collections import defaultdict
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
DOMAIN = 'https://www.optiontoiture.com'

SKIP_DIRS = {'.git', 'node_modules', 'brochure-assets', 'seo-reports', 'scripts', 'data', 'functions', 'images', '.claude'}

# Collect all HTML pages and their canonicals
all_files = set()
for root, dirs, files in os.walk(ROOT):
    rel = os.path.relpath(root, ROOT).replace(os.sep, '/')
    if any(s in rel.split('/') for s in SKIP_DIRS):
        continue
    for fn in files:
        p = Path(root) / fn
        rp = str(p.relative_to(ROOT)).replace(os.sep, '/')
        all_files.add(rp)

# Build set of valid URL paths (based on file system)
def url_to_fs(url_path):
    """Resolve a URL path to possible filesystem paths."""
    if url_path.startswith('/'):
        url_path = url_path[1:]
    if not url_path:
        return ['index.html']
    # Strip trailing slash
    if url_path.endswith('/'):
        return [url_path + 'index.html']
    # Try as-is, with .html, as dir with /index.html
    return [url_path, url_path + '.html', url_path + '/index.html']

def url_exists(url_path):
    # Skip external, anchors, tel, mailto, javascript
    if not url_path or url_path.startswith(('http', '#', 'tel:', 'mailto:', 'javascript:')):
        return True
    # Strip anchor and query
    clean = url_path.split('#')[0].split('?')[0]
    if not clean or clean == '/':
        return 'index.html' in all_files
    for candidate in url_to_fs(clean):
        if candidate in all_files:
            return True
        # Also check if it's an image/asset
        if (ROOT / candidate).is_file():
            return True
    return False

# Find all <a href="..."> in each HTML page
broken = defaultdict(list)
total_links = 0
checked_links = 0

for rel_path in sorted(all_files):
    if not rel_path.endswith('.html'):
        continue
    content = (ROOT / rel_path).read_text(encoding='utf-8', errors='replace')
    # Internal links only (start with / and not ://)
    for match in re.finditer(r'href="(/[^"]*)"', content):
        url = match.group(1)
        total_links += 1
        # Skip external absolute URLs that happen to start with /
        if url.startswith('//'):
            continue
        checked_links += 1
        if not url_exists(url):
            broken[rel_path].append(url)

print(f'Total internal links checked: {checked_links}')
print(f'Pages with broken links: {len(broken)}')

# Sort and print
if broken:
    print('\n=== BROKEN INTERNAL LINKS ===')
    for page, urls in sorted(broken.items())[:20]:
        unique = list(set(urls))
        print(f'  {page}')
        for u in unique[:5]:
            count = urls.count(u)
            print(f'    x {u}' + (f' (x{count})' if count > 1 else ''))
    if len(broken) > 20:
        print(f'  ... and {len(broken)-20} more pages with broken links')
else:
    print('  [OK] No broken internal links')

# Sitemap check
sitemap_path = ROOT / 'sitemap.xml'
if sitemap_path.exists():
    sm = sitemap_path.read_text(encoding='utf-8')
    sitemap_urls = set(re.findall(r'<loc>([^<]+)</loc>', sm))
    print(f'\n=== SITEMAP ({len(sitemap_urls)} URLs) ===')
    missing_in_fs = []
    for url in sitemap_urls:
        path = url.replace(DOMAIN, '').lstrip('/')
        if not path:
            path = 'index.html'
        elif path.endswith('/'):
            path = path + 'index.html'
        elif not path.endswith('.html'):
            # Try multiple
            if path + '.html' not in all_files and path + '/index.html' not in all_files:
                missing_in_fs.append(url)
                continue
            else:
                continue
        if path not in all_files:
            missing_in_fs.append(url)
    if missing_in_fs:
        print(f'  [WARN] {len(missing_in_fs)} sitemap URLs not found on filesystem:')
        for u in missing_in_fs[:10]:
            print(f'    x {u}')
    else:
        print('  [OK] All sitemap URLs resolve to files')

    # Pages not in sitemap
    indexed_pages = set()
    for rel in all_files:
        if not rel.endswith('.html'):
            continue
        if rel == '404.html':
            continue
        # Normalize to sitemap URL format
        if rel == 'index.html':
            indexed_pages.add(DOMAIN + '/')
        elif rel.endswith('/index.html'):
            indexed_pages.add(DOMAIN + '/' + rel[:-len('index.html')])
        else:
            # Strip .html
            indexed_pages.add(DOMAIN + '/' + rel[:-len('.html')])
    not_in_sitemap = indexed_pages - sitemap_urls
    if not_in_sitemap:
        print(f'  [WARN] {len(not_in_sitemap)} pages NOT in sitemap:')
        for u in list(not_in_sitemap)[:10]:
            print(f'    x {u}')
else:
    print('  [WARN] No sitemap.xml found')
