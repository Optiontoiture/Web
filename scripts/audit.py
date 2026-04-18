#!/usr/bin/env python3
"""Quick SEO + link audit for the worktree."""
import re, os
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
DOMAIN = 'https://www.optiontoiture.com'
MAX_TITLE, MAX_DESC = 70, 160
MIN_TITLE, MIN_DESC = 20, 50

SKIP = {'.git', 'node_modules', 'brochure-assets', 'seo-reports', 'scripts', 'data', 'functions', 'images', '.claude'}

issues = {'critical': [], 'warning': []}
stats = defaultdict(int)
all_canonicals = {}
all_pages = set()

for root, dirs, files in os.walk(ROOT):
    rel = os.path.relpath(root, ROOT).replace(os.sep, '/')
    if any(s in rel.split('/') for s in SKIP):
        continue
    for fn in files:
        if not fn.endswith('.html'):
            continue
        if fn == '404.html':
            continue
        path = Path(root) / fn
        rel_path = str(path.relative_to(ROOT)).replace(os.sep, '/')
        stats['total_pages'] += 1
        all_pages.add(rel_path)
        content = path.read_text(encoding='utf-8', errors='replace')

        m = re.search(r'<html lang="([^"]*)">', content)
        if not m:
            issues['critical'].append(f'{rel_path}: missing html lang')
        elif m.group(1) not in ('fr-CA', 'en-CA'):
            issues['warning'].append(f'{rel_path}: lang={m.group(1)}')

        m = re.search(r'<title>([^<]*)</title>', content)
        if not m or not m.group(1).strip():
            issues['critical'].append(f'{rel_path}: missing title')
        else:
            t = m.group(1).strip()
            stats['pages_with_title'] += 1
            if len(t) > MAX_TITLE:
                issues['warning'].append(f'{rel_path}: title too long ({len(t)})')
            if len(t) < MIN_TITLE:
                issues['warning'].append(f'{rel_path}: title too short ({len(t)})')

        m = re.search(r'<meta name="description" content="([^"]*)"', content)
        if not m or not m.group(1).strip():
            issues['critical'].append(f'{rel_path}: missing description')
        else:
            d = m.group(1).strip()
            stats['pages_with_desc'] += 1
            if len(d) > MAX_DESC:
                issues['warning'].append(f'{rel_path}: desc too long ({len(d)})')
            if len(d) < MIN_DESC:
                issues['warning'].append(f'{rel_path}: desc too short ({len(d)})')

        m = re.search(r'<link rel="canonical" href="([^"]*)"', content)
        if not m:
            issues['critical'].append(f'{rel_path}: missing canonical')
        else:
            stats['pages_with_canonical'] += 1
            can = m.group(1)
            if can in all_canonicals and all_canonicals[can] != rel_path:
                issues['critical'].append(f'{rel_path}: duplicate canonical (also {all_canonicals[can]})')
            all_canonicals[can] = rel_path

        if 'hreflang=' in content:
            stats['pages_with_hreflang'] += 1
            if 'hreflang="x-default"' in content:
                stats['pages_with_xdefault'] += 1
            else:
                issues['warning'].append(f'{rel_path}: hreflang but no x-default')

        if 'property="og:title"' in content:
            stats['pages_with_og'] += 1
        if 'name="twitter:card"' in content:
            stats['pages_with_twitter'] += 1
        if 'application/ld+json' in content:
            stats['pages_with_jsonld'] += 1

        if '<meta name="viewport"' not in content:
            issues['critical'].append(f'{rel_path}: missing viewport')

# Check for syntax issues in modified files (kenburns injection + animations)
print(f'=== STATS (n={stats["total_pages"]}) ===')
for k, v in sorted(stats.items()):
    pct = (v / stats['total_pages'] * 100) if stats['total_pages'] else 0
    print(f'  {k:25s} {v:4d} ({pct:.0f}%)')

print(f'\n=== CRITICAL ({len(issues["critical"])}) ===')
for i in issues['critical'][:30]:
    print(f'  - {i}')
if len(issues['critical']) > 30:
    print(f'  ... and {len(issues["critical"])-30} more')

print(f'\n=== WARNINGS ({len(issues["warning"])}) ===')
for i in issues['warning'][:30]:
    print(f'  - {i}')
if len(issues['warning']) > 30:
    print(f'  ... and {len(issues["warning"])-30} more')
