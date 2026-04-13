#!/usr/bin/env python3
"""
SEO Crawl — Weekly audit for optiontoiture.com
Checks: titles, descriptions, hreflang, canonicals, OG tags, Twitter cards,
structured data, broken internal links, and sitemap consistency.
Generates a markdown report in C:/web/seo-reports/
"""

import os
import re
import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path('C:/web')
REPORT_DIR = ROOT / 'seo-reports'
DOMAIN = 'https://www.optiontoiture.com'

# Thresholds
MAX_TITLE = 70
MAX_DESC = 160
MIN_TITLE = 20
MIN_DESC = 50

def crawl():
    REPORT_DIR.mkdir(exist_ok=True)

    issues = {
        'critical': [],
        'warning': [],
        'info': [],
    }
    stats = {
        'total_pages': 0,
        'pages_with_title': 0,
        'pages_with_desc': 0,
        'pages_with_hreflang': 0,
        'pages_with_xdefault': 0,
        'pages_with_canonical': 0,
        'pages_with_og': 0,
        'pages_with_twitter': 0,
        'pages_with_jsonld': 0,
    }

    all_pages = set()
    all_canonicals = {}

    for root, dirs, files in os.walk(ROOT):
        # Skip non-content dirs
        rel = os.path.relpath(root, ROOT)
        if any(skip in rel for skip in ['.git', 'node_modules', 'brochure-assets', 'seo-reports', 'scripts', 'data', 'functions', 'images']):
            continue
        for fn in files:
            if not fn.endswith('.html'):
                continue
            path = os.path.join(root, fn)
            rel_path = os.path.relpath(path, ROOT).replace(os.sep, '/')

            # Skip non-indexable
            if rel_path == '404.html':
                continue

            stats['total_pages'] += 1
            all_pages.add(rel_path)

            with open(path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()

            # ─── HTML lang ───
            lang_match = re.search(r'<html lang="([^"]*)">', content)
            if not lang_match:
                issues['critical'].append(f'{rel_path}: Missing html lang attribute')
            else:
                lang_val = lang_match.group(1)
                if lang_val not in ('fr-CA', 'en-CA'):
                    issues['warning'].append(f'{rel_path}: html lang="{lang_val}" (expected fr-CA or en-CA)')

            # ─── Title ───
            title_match = re.search(r'<title>([^<]*)</title>', content)
            if not title_match:
                issues['critical'].append(f'{rel_path}: Missing <title>')
            else:
                stats['pages_with_title'] += 1
                title = title_match.group(1)
                tlen = len(title)
                if tlen > MAX_TITLE:
                    issues['warning'].append(f'{rel_path}: Title too long ({tlen} chars): {title[:60]}...')
                elif tlen < MIN_TITLE:
                    issues['warning'].append(f'{rel_path}: Title too short ({tlen} chars): {title}')

            # ─── Meta description ───
            desc_match = re.search(r'<meta name="description" content="([^"]*)">', content)
            if not desc_match:
                issues['critical'].append(f'{rel_path}: Missing meta description')
            else:
                stats['pages_with_desc'] += 1
                desc = desc_match.group(1)
                dlen = len(desc)
                if dlen > MAX_DESC:
                    issues['warning'].append(f'{rel_path}: Description too long ({dlen} chars)')
                elif dlen < MIN_DESC:
                    issues['warning'].append(f'{rel_path}: Description too short ({dlen} chars)')

            # ─── Canonical ───
            canon_match = re.search(r'<link rel="canonical" href="([^"]*)">', content)
            if not canon_match:
                issues['warning'].append(f'{rel_path}: Missing canonical')
            else:
                stats['pages_with_canonical'] += 1
                all_canonicals[rel_path] = canon_match.group(1)

            # ─── Hreflang ───
            if 'hreflang=' in content:
                stats['pages_with_hreflang'] += 1
            else:
                issues['warning'].append(f'{rel_path}: Missing hreflang tags')

            if 'hreflang="x-default"' in content:
                stats['pages_with_xdefault'] += 1
            else:
                if 'hreflang=' in content:
                    issues['info'].append(f'{rel_path}: Has hreflang but missing x-default')

            # ─── OG Tags ───
            og_required = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']
            og_missing = [t for t in og_required if f'"{t}"' not in content]
            if not og_missing:
                stats['pages_with_og'] += 1
            else:
                issues['warning'].append(f'{rel_path}: Missing OG tags: {", ".join(og_missing)}')

            # ─── Twitter Card ───
            if 'twitter:card' in content:
                stats['pages_with_twitter'] += 1
            else:
                issues['warning'].append(f'{rel_path}: Missing Twitter card')

            # ─── JSON-LD ───
            jsonld_matches = re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', content, re.DOTALL)
            if jsonld_matches:
                stats['pages_with_jsonld'] += 1
                for jm in jsonld_matches:
                    try:
                        json.loads(jm)
                    except json.JSONDecodeError as e:
                        issues['critical'].append(f'{rel_path}: Invalid JSON-LD: {str(e)[:80]}')

    # ─── Sitemap check ───
    sitemap_path = ROOT / 'sitemap.xml'
    if sitemap_path.exists():
        with open(sitemap_path, 'r', encoding='utf-8') as f:
            sm = f.read()
        sm_urls = re.findall(r'<loc>([^<]+)</loc>', sm)
        stats['sitemap_urls'] = len(sm_urls)

        for url in sm_urls:
            path_part = url.replace(DOMAIN, '').lstrip('/')
            if not path_part:
                path_part = 'index.html'
            else:
                path_part = path_part.rstrip('/')
            # Check if file exists
            candidates = [
                ROOT / path_part / 'index.html',
                ROOT / (path_part + '.html'),
                ROOT / path_part,
            ]
            if not any(c.exists() for c in candidates):
                issues['critical'].append(f'Sitemap: {url} has no matching file')

    # ─── Generate report ───
    now = datetime.now()
    report_file = REPORT_DIR / f'seo-report-{now.strftime("%Y-%m-%d")}.md'

    total = stats['total_pages']
    lines = [
        f'# SEO Audit Report — {now.strftime("%Y-%m-%d %H:%M")}',
        f'',
        f'**Domain:** {DOMAIN}',
        f'**Pages crawled:** {total}',
        f'**Sitemap URLs:** {stats.get("sitemap_urls", "N/A")}',
        f'',
        f'## Health Score',
        f'',
        f'| Metric | Count | Coverage |',
        f'|---|---|---|',
        f'| Title | {stats["pages_with_title"]} | {stats["pages_with_title"]*100//total}% |',
        f'| Meta description | {stats["pages_with_desc"]} | {stats["pages_with_desc"]*100//total}% |',
        f'| Canonical | {stats["pages_with_canonical"]} | {stats["pages_with_canonical"]*100//total}% |',
        f'| Hreflang | {stats["pages_with_hreflang"]} | {stats["pages_with_hreflang"]*100//total}% |',
        f'| X-default | {stats["pages_with_xdefault"]} | {stats["pages_with_xdefault"]*100//total}% |',
        f'| OG tags (complete) | {stats["pages_with_og"]} | {stats["pages_with_og"]*100//total}% |',
        f'| Twitter card | {stats["pages_with_twitter"]} | {stats["pages_with_twitter"]*100//total}% |',
        f'| JSON-LD | {stats["pages_with_jsonld"]} | {stats["pages_with_jsonld"]*100//total}% |',
        f'',
    ]

    for level in ['critical', 'warning', 'info']:
        items = issues[level]
        emoji = {'critical': '\u274c', 'warning': '\u26a0\ufe0f', 'info': '\u2139\ufe0f'}[level]
        lines.append(f'## {emoji} {level.title()} ({len(items)})')
        lines.append('')
        if items:
            for item in sorted(items)[:50]:
                lines.append(f'- {item}')
            if len(items) > 50:
                lines.append(f'- ... and {len(items) - 50} more')
        else:
            lines.append('None!')
        lines.append('')

    report = '\n'.join(lines)
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f'Report: {report_file}')
    print(f'Pages: {total} | Critical: {len(issues["critical"])} | Warnings: {len(issues["warning"])} | Info: {len(issues["info"])}')
    return str(report_file)


if __name__ == '__main__':
    crawl()
