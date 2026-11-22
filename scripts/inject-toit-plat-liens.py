#!/usr/bin/env python3
"""Pose les liens « Toit plat » et « Urgence toiture » dans les menus et pieds de page.

Idempotent : relancer le script ne double aucun lien.

- Menu déroulant « Services », menu mobile et liste « Découvrez aussi » : un lien
  « Toit plat » (FR) ou « Flat Roofing » (EN) juste après « Toiture commerciale ».
- Pied de page, colonne Services : « Toit plat », « Urgence toiture 24/7 » et
  « Fil chauffant » après « Toiture commerciale ».
- Pages commerciales de Brossard, Candiac, Chambly et Saint-Jean-sur-Richelieu :
  une pastille vers la page toit plat de la ville.

L'accueil (index.html, en/index.html) et les versions de test (_ab/) ne sont pas
touchés : ils suivent leur propre lot.

Usage : python scripts/inject-toit-plat-liens.py [--dry-run]
"""
import os, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DRY = '--dry-run' in sys.argv

SKIP_DIRS = {'.git', '.claude', 'node_modules', 'brochure-assets', 'seo-reports', 'scripts', 'data',
             'functions', 'images', '_ab', '_maquettes'}
SKIP_FILES = {'index.html', 'en/index.html'}

LANG = {
    'fr': {
        'commercial': ('/services/toiture-commerciale', 'Toiture commerciale'),
        'toit_plat': ('/services/toit-plat-elastomere', 'Toit plat'),
        'pied': [('/services/toit-plat-elastomere', 'Toit plat'),
                 ('/urgence-toiture/', 'Urgence toiture 24/7'),
                 ('/urgence-toiture/#fil-chauffant', 'Fil chauffant')],
    },
    'en': {
        'commercial': ('/en/services/commercial-roofing', 'Commercial Roofing'),
        'toit_plat': ('/en/services/flat-roofing', 'Flat Roofing'),
        'pied': [('/en/services/flat-roofing', 'Flat Roofing'),
                 ('/en/roof-emergency/', '24/7 Roof Emergency'),
                 ('/en/roof-emergency/#heating-cable', 'Heating Cable')],
    },
}

VILLES = {'brossard': 'Brossard', 'candiac': 'Candiac', 'chambly': 'Chambly',
          'saint-jean-sur-richelieu': 'Saint-Jean-sur-Richelieu'}


def lien_commercial(lang):
    href, texte = LANG[lang]['commercial']
    # Le lien seul, avec une classe et un onclick facultatifs (menu mobile, « Découvrez aussi »).
    return re.compile(r'(?P<indent>\r?\n[ \t]*)?<a href="' + re.escape(href) + r'"(?P<attrs>[^>]*)>' + re.escape(texte) + '</a>')


def suivant(html, pos):
    return html[pos:pos + 400].lstrip()


def poser(html, lang, pied):
    """Ajoute après chaque lien commercial les liens voulus, dans ou hors du pied de page."""
    motif = lien_commercial(lang)
    sortie, dernier = [], 0
    for m in motif.finditer(html):
        dans_pied = html.rfind('<footer', 0, m.start()) > html.rfind('</footer>', 0, m.start())
        if dans_pied != pied:
            continue
        attrs = m.group('attrs')
        liens = LANG[lang]['pied'] if pied else [LANG[lang]['toit_plat']]
        if suivant(html, m.end()).startswith(f'<a href="{liens[0][0]}"'):
            continue  # déjà posé
        if 'other-svc-link' in attrs and (f'href="{liens[0][0]}" class="other-svc-link"' in html
                                          or f'<link rel="canonical" href="https://www.optiontoiture.com{liens[0][0]}">' in html):
            continue  # liste « Découvrez aussi » déjà pourvue, ou page toit plat elle-même
        sep = m.group('indent') or ''
        ajout = ''.join(f'{sep}<a href="{h}"{attrs}>{t}</a>' for h, t in liens)
        sortie.append(html[dernier:m.end()] + ajout)
        dernier = m.end()
    sortie.append(html[dernier:])
    return ''.join(sortie)


def pastille_ville(html, rel):
    """Pastille vers la page toit plat de la ville, en tête des « près de » de la page commerciale."""
    m = re.match(r'(couvreur-|en/roofer-)([a-z-]+)/(toiture-commerciale|commercial-roofing)\.html$', rel)
    if not m or m.group(2) not in VILLES:
        return html
    slug, ville = m.group(2), VILLES[m.group(2)]
    if m.group(1) == 'couvreur-':
        href, texte = f'/couvreur-{slug}/toit-plat', f'Toit plat à {ville}'
    else:
        href, texte = f'/en/roofer-{slug}/flat-roofing', f'Flat roofing in {ville}'
    if f'href="{href}"' in html:
        return html
    fin = '\r\n' if '\r\n' in html else '\n'
    pill = f'{fin}        <a href="{href}" class="nearby-pill nearby-pill-toit-plat">{texte} <span class="arrow">→</span></a>'
    return html.replace('<div class="nearby-pills">', '<div class="nearby-pills">' + pill, 1)


def main():
    changes = 0
    for dossier, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in files:
            if not fn.endswith('.html'):
                continue
            p = Path(dossier) / fn
            rel = p.relative_to(ROOT).as_posix()
            if rel in SKIP_FILES:
                continue
            avant = p.read_bytes().decode('utf-8')
            html = avant
            for lang in ('fr', 'en'):
                html = poser(html, lang, pied=False)
                html = poser(html, lang, pied=True)
            html = pastille_ville(html, rel)
            if html != avant:
                changes += 1
                if not DRY:
                    p.write_bytes(html.encode('utf-8'))
                print(('(essai) ' if DRY else '') + rel)
    print(f'{changes} page(s) modifiée(s)')


if __name__ == '__main__':
    main()
