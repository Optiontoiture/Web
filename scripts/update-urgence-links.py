#!/usr/bin/env python3
"""Update urgence links from tel: to iframe modal with ?urgence=true"""
import os, re

ROOT = 'C:/web'
skip_dirs = {'.git', 'node_modules', 'brochure-assets', 'seo-reports', 'scripts', 'data', 'functions', 'images', 'optime-vente', 'tiles', 'icons'}

FORM_URL = 'https://app.optiontoiture.com/formulaire?urgence=true'

count = 0
for root_dir, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in skip_dirs]
    for fn in files:
        if not fn.endswith('.html'):
            continue
        path = os.path.join(root_dir, fn)
        rel = os.path.relpath(path, ROOT).replace(os.sep, '/')

        # Skip index.html (already done manually)
        if rel == 'index.html':
            continue

        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        if 'formModal' not in content:
            continue  # No modal to use

        orig = content

        # 1. Banner CTA: urgence-cta with tel: -> onclick modal
        # FR
        content = re.sub(
            r'<a href="tel:\+15148354820" class="urgence-cta">Appeler maintenant[^<]*</a>',
            '<a href="#" onclick="document.getElementById(\'formIframe\').src=\'' + FORM_URL + '\';document.getElementById(\'formModal\').style.display=\'flex\';return false;" class="urgence-cta">Demande urgente <span style="margin-left:4px">\u2192</span></a>',
            content
        )
        # EN
        content = re.sub(
            r'<a href="tel:\+15148354820" class="urgence-cta">Call now[^<]*</a>',
            '<a href="#" onclick="document.getElementById(\'formIframe\').src=\'' + FORM_URL + '&lang=en\';document.getElementById(\'formModal\').style.display=\'flex\';return false;" class="urgence-cta">Emergency request <span style="margin-left:4px">\u2192</span></a>',
            content
        )

        # 2. Header button: header-urgence with tel: -> onclick modal
        # FR
        content = re.sub(
            r'<a href="tel:\+15148354820" class="header-urgence"><span class="pulse-dot"></span>Urgence 24/7</a>',
            '<a href="#" onclick="document.getElementById(\'formIframe\').src=\'' + FORM_URL + '\';document.getElementById(\'formModal\').style.display=\'flex\';return false;" class="header-urgence"><span class="pulse-dot"></span>Urgence 24/7</a>',
            content
        )
        # EN
        content = re.sub(
            r'<a href="tel:\+15148354820" class="header-urgence"><span class="pulse-dot"></span>Emergency 24/7</a>',
            '<a href="#" onclick="document.getElementById(\'formIframe\').src=\'' + FORM_URL + '&lang=en\';document.getElementById(\'formModal\').style.display=\'flex\';return false;" class="header-urgence"><span class="pulse-dot"></span>Emergency 24/7</a>',
            content
        )

        # 3. Mobile menu: urgence tel: link -> onclick modal
        # FR
        content = re.sub(
            r'<a href="tel:\+15148354820"([^>]*)>\U0001f6a8 Urgence toiture 24/7[^<]*</a>',
            '<a href="#" onclick="document.getElementById(\'formIframe\').src=\'' + FORM_URL + '\';document.getElementById(\'formModal\').style.display=\'flex\';this.closest(\'.mobile-menu\').classList.remove(\'open\');return false;"\\1>\U0001f6a8 Urgence toiture 24/7</a>',
            content
        )
        # EN
        content = re.sub(
            r'<a href="tel:\+15148354820"([^>]*)>\U0001f6a8 Roof Emergency 24/7[^<]*</a>',
            '<a href="#" onclick="document.getElementById(\'formIframe\').src=\'' + FORM_URL + '&lang=en\';document.getElementById(\'formModal\').style.display=\'flex\';this.closest(\'.mobile-menu\').classList.remove(\'open\');return false;"\\1>\U0001f6a8 Roof Emergency 24/7</a>',
            content
        )

        # 4. Increase iframe height to 720px
        content = content.replace('height:680px', 'height:720px')

        if content != orig:
            with open(path, 'w', encoding='utf-8', newline='') as f:
                f.write(content)
            count += 1

print(f'Updated {count} pages')
