#!/usr/bin/env python3
"""Remove the urgence-bar banner from all pages, keep the header button"""
import os, re

ROOT = 'C:/web'
skip_dirs = {'.git', 'node_modules', 'brochure-assets', 'seo-reports', 'scripts', 'data', 'functions', 'images', 'optime-vente', 'tiles', 'icons'}

count = 0
for root_dir, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in skip_dirs]
    for fn in files:
        if not fn.endswith('.html'):
            continue
        path = os.path.join(root_dir, fn)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        if 'urgence-bar' not in content:
            continue
        orig = content
        # Remove the banner HTML (div.urgence-bar and its contents)
        content = re.sub(
            r'\s*(?:<!-- URGENCE BANNER -->|<!-- EMERGENCY BANNER -->)\s*'
            r'<div class="urgence-bar">.*?</div>\s*</div>\s*',
            '\n\n',
            content,
            flags=re.DOTALL
        )
        # Remove the CSS for urgence-bar (keep header-urgence CSS)
        content = re.sub(
            r'\s*/\* URGENCE BAR \*/.*?@media\(max-width:768px\)\{\.urgence-text\{[^}]+\}\.urgence-cta\{[^}]+\}\}',
            '',
            content,
            flags=re.DOTALL
        )
        # Remove individual urgence-bar CSS lines
        for css_class in ['urgence-bar', 'urgence-inner', 'urgence-pulse', 'urgence-text', 'urgence-cta']:
            content = re.sub(r'\n\s*\.' + css_class + r'(?:::before)?\{[^}]+\}', '', content)
            content = re.sub(r'\n\s*\.' + css_class + r' strong\{[^}]+\}', '', content)
        content = re.sub(r'\n\s*@media\(max-width:768px\)\{\.urgence-text\{[^}]+\}\.urgence-cta\{[^}]+\}\}', '', content)
        if content != orig:
            with open(path, 'w', encoding='utf-8', newline='') as f:
                f.write(content)
            count += 1

print(f'Removed banner from {count} pages')
