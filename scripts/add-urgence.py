#!/usr/bin/env python3
"""Add urgence banner + button to all site pages"""
import os, re

ROOT = 'C:/web'

URGENCE_CSS = """    .header-urgence{background:#b33;color:#fff;padding:8px 16px;border-radius:6px;font-weight:700;font-size:.72rem;text-decoration:none;letter-spacing:.02em;text-transform:uppercase;transition:all .3s;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;animation:urgence-glow 2s ease-in-out infinite}
    .header-urgence:hover{background:#d44;transform:translateY(-1px)}
    .header-urgence .pulse-dot{width:8px;height:8px;background:#ff6b6b;border-radius:50%;animation:pulse-dot 1.5s ease-in-out infinite}
    @keyframes urgence-glow{0%,100%{box-shadow:0 0 0 0 rgba(179,51,51,0)}50%{box-shadow:0 0 12px 2px rgba(179,51,51,.4)}}
    @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.7)}}
    .urgence-bar{background:linear-gradient(90deg,#8b1a1a,#b33,#8b1a1a);color:#fff;padding:0;position:relative;z-index:101;overflow:hidden}
    .urgence-bar::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent,transparent 200px,rgba(255,255,255,.03) 200px,rgba(255,255,255,.03) 400px)}
    .urgence-inner{max-width:1320px;margin:0 auto;padding:10px 28px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap}
    .urgence-pulse{width:10px;height:10px;background:#ff6b6b;border-radius:50%;animation:pulse-dot 1.5s ease-in-out infinite;flex-shrink:0}
    .urgence-text{font-size:.78rem;font-weight:500;letter-spacing:.02em}
    .urgence-text strong{font-weight:800}
    .urgence-cta{background:#fff;color:#b33;padding:6px 16px;border-radius:5px;font-size:.72rem;font-weight:800;text-decoration:none;letter-spacing:.04em;text-transform:uppercase;transition:all .3s;white-space:nowrap}
    .urgence-cta:hover{background:#ffe0e0;transform:scale(1.03)}
    @media(max-width:768px){.urgence-text{font-size:.7rem}.urgence-cta{font-size:.65rem;padding:5px 12px}}"""

FR_BANNER = '  <div class="urgence-bar"><div class="urgence-inner"><span class="urgence-pulse"></span><span class="urgence-text"><strong>Urgence toiture?</strong> R\u00e9paration 24h/24, 7j/7 \u2014 Infiltrations, d\u00e9g\u00e2ts de temp\u00eate, fuites</span><a href="tel:+15148354820" class="urgence-cta">Appeler maintenant \u2192</a></div></div>\n\n'

EN_BANNER = '  <div class="urgence-bar"><div class="urgence-inner"><span class="urgence-pulse"></span><span class="urgence-text"><strong>Roof emergency?</strong> 24/7 repairs \u2014 Leaks, storm damage, water infiltration</span><a href="tel:+15148354820" class="urgence-cta">Call now \u2192</a></div></div>\n\n'

skip_files = {'index.html', '404.html'}
skip_dirs = {'.git', 'node_modules', 'brochure-assets', 'seo-reports', 'scripts', 'data', 'functions', 'images', 'optime-vente', 'tiles', 'icons'}

counts = {'css': 0, 'banner': 0, 'btn': 0, 'mobile': 0}

for root_dir, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in skip_dirs]
    for fn in files:
        if not fn.endswith('.html'):
            continue
        path = os.path.join(root_dir, fn)
        rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
        if rel in skip_files:
            continue

        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        if 'urgence-bar' in content:
            continue
        if 'site-header' not in content:
            continue

        is_en = rel.startswith('en/')
        orig = content

        # 1. CSS
        if '.header-cta:hover' in content and '.header-urgence' not in content:
            content = content.replace(
                ".header-cta:hover{background:var(--gold-light);transform:translateY(-1px)}",
                ".header-cta:hover{background:var(--gold-light);transform:translateY(-1px)}\n" + URGENCE_CSS,
                1
            )
            counts['css'] += 1

        # 2. Banner before <header
        banner = EN_BANNER if is_en else FR_BANNER
        content = content.replace(
            '<header class="site-header"',
            banner + '<header class="site-header"',
            1
        )
        counts['banner'] += 1

        # 3. Urgence button in header-right
        if 'header-right' in content and 'header-urgence' not in content:
            if is_en:
                btn_html = '        <a href="tel:+15148354820" class="header-urgence"><span class="pulse-dot"></span>Emergency 24/7</a>\n'
            else:
                btn_html = '        <a href="tel:+15148354820" class="header-urgence"><span class="pulse-dot"></span>Urgence 24/7</a>\n'
            content = re.sub(
                r'(<div class="header-right">\s*\n)',
                r'\1' + btn_html,
                content,
                count=1
            )
            counts['btn'] += 1

        # 4. Mobile menu urgence
        if 'mobile-menu' in content:
            if is_en:
                mob = '    <a href="tel:+15148354820" style="background:#b33;color:#fff;font-weight:800;text-align:center;border-radius:8px;padding:14px;font-size:1rem;border:none;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px">\xf0\x9f\x9a\xa8 Roof Emergency 24/7 \u2014 Call</a>\n'
            else:
                mob = '    <a href="tel:+15148354820" style="background:#b33;color:#fff;font-weight:800;text-align:center;border-radius:8px;padding:14px;font-size:1rem;border:none;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px">\xf0\x9f\x9a\xa8 Urgence toiture 24/7 \u2014 Appeler</a>\n'
            # Insert after close button line
            content = re.sub(
                r'(class="close-btn"[^>]*>[^<]*</button>\s*\n)',
                r'\1' + mob,
                content,
                count=1
            )
            counts['mobile'] += 1

        if content != orig:
            with open(path, 'w', encoding='utf-8', newline='') as f:
                f.write(content)

print(f"Done! CSS: {counts['css']} | Banner: {counts['banner']} | Button: {counts['btn']} | Mobile: {counts['mobile']}")
