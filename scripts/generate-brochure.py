#!/usr/bin/env python3
"""
Generate Option Toiture service brochure PDFs (FR + EN)
Matching the website's luxury gold/cream design system.
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image

# ─── Colors (from website CSS vars) ───
CREAM = HexColor('#f3ede3')
CREAM_LIGHT = HexColor('#faf7f1')
GOLD = HexColor('#c9952c')
GOLD_LIGHT = HexColor('#e4b94a')
GOLD_DARK = HexColor('#a67a1a')
DARK = HexColor('#141210')
DARK_MID = HexColor('#1e1c18')
TEXT = HexColor('#2a2722')
TEXT_LIGHT = HexColor('#7a756b')
TEXT_MUTED = HexColor('#a8a198')
WHITE = HexColor('#ffffff')
BORDER = HexColor('#ddd7cb')

# ─── Fonts ───
# Use built-in fonts that match the spirit
FONT_SERIF = 'Times-Roman'
FONT_SERIF_BOLD = 'Times-Bold'
FONT_SERIF_ITALIC = 'Times-Italic'
FONT_SANS = 'Helvetica'
FONT_SANS_BOLD = 'Helvetica-Bold'
FONT_SANS_LIGHT = 'Helvetica'

ASSETS = 'C:/web/brochure-assets'
W, H = letter  # 612 x 792 points


def draw_bg(c, color=CREAM):
    """Fill page background"""
    c.setFillColor(color)
    c.rect(0, 0, W, H, fill=1, stroke=0)


def draw_gold_line(c, x, y, width, thickness=1.5):
    """Draw a thin gold accent line"""
    c.setStrokeColor(GOLD)
    c.setLineWidth(thickness)
    c.line(x, y, x + width, y)


def draw_overline(c, text, x, y, size=7):
    """Draw an uppercase gold overline label"""
    c.setFillColor(GOLD)
    c.setFont(FONT_SANS_BOLD, size)
    c.drawString(x, y, text.upper())


def draw_image_cover(c, img_path, x, y, w, h):
    """Draw image scaled to cover (crop to fill)"""
    try:
        img = Image.open(img_path)
        iw, ih = img.size
        # Calculate scale to cover
        scale = max(w / iw, h / ih)
        sw, sh = iw * scale, ih * scale
        # Center offset
        ox = (w - sw) / 2
        oy = (h - sh) / 2
        c.saveState()
        c.clipPath(c.beginPath().addRect(x, y, w, h), stroke=0)
        c.drawImage(ImageReader(img), x + ox, y + oy, sw, sh, mask='auto')
        c.restoreState()
    except Exception as e:
        # Fallback: gold rectangle
        c.setFillColor(GOLD_DARK)
        c.rect(x, y, w, h, fill=1, stroke=0)


def draw_rounded_rect(c, x, y, w, h, radius=10, fill_color=WHITE, stroke_color=None):
    """Draw a rounded rectangle"""
    c.setFillColor(fill_color)
    if stroke_color:
        c.setStrokeColor(stroke_color)
        c.roundRect(x, y, w, h, radius, fill=1, stroke=1)
    else:
        c.roundRect(x, y, w, h, radius, fill=1, stroke=0)


# ═══════════════════════════════════════════════════════════════
# PAGE 1: COVER
# ═══════════════════════════════════════════════════════════════
def page_cover(c, lang='fr'):
    # Dark background
    draw_bg(c, DARK)

    # Top hero image (full width, top half)
    hero_h = H * 0.45
    draw_image_cover(c, f'{ASSETS}/chantier2.png', 0, H - hero_h, W, hero_h)

    # Dark gradient overlay on image bottom
    for i in range(80):
        alpha = i / 80
        c.setFillColor(Color(0.078, 0.071, 0.063, alpha))
        c.rect(0, H - hero_h + i * 2, W, 2, fill=1, stroke=0)

    # Logo (centered, over gradient)
    try:
        logo = Image.open(f'{ASSETS}/logo.png')
        logo_w = 120
        logo_h = logo_w * logo.size[1] / logo.size[0]
        c.drawImage(ImageReader(logo), (W - logo_w) / 2, H - hero_h + 30, logo_w, logo_h, mask='auto')
    except:
        pass

    # Content area (bottom half)
    cy = H - hero_h - 30

    # Overline
    if lang == 'fr':
        draw_overline(c, 'Couvreur certifie GAF Master Elite', 60, cy, 8)
    else:
        draw_overline(c, 'GAF Master Elite Certified Roofer', 60, cy, 8)

    # Title
    cy -= 40
    c.setFillColor(WHITE)
    c.setFont(FONT_SERIF_BOLD, 36)
    if lang == 'fr':
        c.drawString(60, cy, 'Option Toiture')
        cy -= 35
        c.setFont(FONT_SERIF, 24)
        c.setFillColor(GOLD_LIGHT)
        c.drawString(60, cy, 'Nos services de toiture')
    else:
        c.drawString(60, cy, 'Option Toiture')
        cy -= 35
        c.setFont(FONT_SERIF, 24)
        c.setFillColor(GOLD_LIGHT)
        c.drawString(60, cy, 'Our Roofing Services')

    # Subtitle
    cy -= 30
    c.setFont(FONT_SANS, 10.5)
    c.setFillColor(Color(1, 1, 1, 0.6))
    if lang == 'fr':
        lines = [
            'Installation, reparation et remplacement de toitures',
            'residentielles et commerciales en Monteregie.',
            'Plus de 1 000 projets completes depuis 2012.',
        ]
    else:
        lines = [
            'Residential and commercial roof installation,',
            'repair and replacement in Monteregie.',
            'Over 1,000 projects completed since 2012.',
        ]
    for line in lines:
        c.drawString(60, cy, line)
        cy -= 16

    # Gold line separator
    cy -= 10
    draw_gold_line(c, 60, cy, 100, 2)

    # Contact info
    cy -= 30
    c.setFillColor(WHITE)
    c.setFont(FONT_SANS_BOLD, 10)
    c.drawString(60, cy, '514-835-4820')
    cy -= 18
    c.setFont(FONT_SANS, 9)
    c.setFillColor(Color(1, 1, 1, 0.5))
    c.drawString(60, cy, 'www.optiontoiture.com')
    cy -= 15
    c.drawString(60, cy, '3320 route 112, Marieville, QC  J3M 1P1')

    # Certification logos bar at very bottom
    cy = 40
    c.setFillColor(Color(1, 1, 1, 0.06))
    c.rect(0, 0, W, 80, fill=1, stroke=0)
    logos_data = ['gaf', 'rona', 'apchq']
    logo_x = 60
    for lname in logos_data:
        try:
            limg = Image.open(f'{ASSETS}/{lname}.png')
            lh = 35
            lw = lh * limg.size[0] / limg.size[1]
            c.drawImage(ImageReader(limg), logo_x, cy - 10, lw, lh, mask='auto')
            logo_x += lw + 30
        except:
            logo_x += 80


# ═══════════════════════════════════════════════════════════════
# PAGE 2-3: SERVICES
# ═══════════════════════════════════════════════════════════════
def page_services(c, lang='fr', page_num=1):
    draw_bg(c, CREAM)

    services_fr = [
        {
            'title': 'Installation de toiture',
            'desc': 'Installation complete de bardeaux d\'asphalte GAF avec garantie jusqu\'a 50 ans. Systeme multicouche haute performance pour une protection maximale.',
            'img': 'service_install',
            'features': ['Bardeaux GAF Timberline HDZ', 'Garantie Golden Pledge', 'Systeme de ventilation integre'],
        },
        {
            'title': 'Remplacement de toiture',
            'desc': 'Retrait complet de l\'ancienne toiture et installation neuve. Inspection de la structure, reparation du pontage si necessaire.',
            'img': 'service_replace',
            'features': ['Inspection structurale', 'Recyclage des materiaux', 'Nettoyage complet du chantier'],
        },
        {
            'title': 'Reparation de toiture',
            'desc': 'Intervention rapide pour fuites, infiltrations et dommages de tempete. Service d\'urgence disponible 7 jours sur 7.',
            'img': 'service_repair',
            'features': ['Urgence 7j/7', 'Diagnostic precis', 'Reparation durable'],
        },
    ]

    services_fr2 = [
        {
            'title': 'Toiture commerciale',
            'desc': 'Solutions adaptees aux batiments commerciaux et multilogements. Membrane elastomere et bardeaux commerciaux.',
            'img': 'service_commercial',
            'features': ['Membrane elastomere', 'Toiture plate', 'Entretien preventif'],
        },
        {
            'title': 'Ferblanterie et gouttieres',
            'desc': 'Installation de solins, larmiers, descentes pluviales et gouttieres en aluminium. Finition impeccable.',
            'img': 'service_flashing',
            'features': ['Solins sur mesure', 'Gouttieres aluminium', 'Protection contre l\'eau'],
        },
        {
            'title': 'Ventilation d\'entretoit',
            'desc': 'Systeme de ventilation optimal pour prevenir les barrieres de glace et prolonger la duree de vie de votre toiture.',
            'img': 'service_ventilation',
            'features': ['Prevention barrieres de glace', 'Economies d\'energie', 'Maximum Airflow'],
        },
    ]

    services_en = [
        {
            'title': 'Roof Installation',
            'desc': 'Complete GAF asphalt shingle installation with up to 50-year warranty. High-performance multi-layer system for maximum protection.',
            'img': 'service_install',
            'features': ['GAF Timberline HDZ shingles', 'Golden Pledge warranty', 'Integrated ventilation system'],
        },
        {
            'title': 'Roof Replacement',
            'desc': 'Full tear-off and new installation. Structural inspection, deck repair if needed, and complete cleanup.',
            'img': 'service_replace',
            'features': ['Structural inspection', 'Material recycling', 'Full site cleanup'],
        },
        {
            'title': 'Roof Repair',
            'desc': 'Fast response for leaks, water damage and storm damage. Emergency service available 7 days a week.',
            'img': 'service_repair',
            'features': ['24/7 emergency', 'Precise diagnosis', 'Lasting repairs'],
        },
    ]

    services_en2 = [
        {
            'title': 'Commercial Roofing',
            'desc': 'Solutions for commercial buildings and multi-unit residences. Elastomeric membrane and commercial shingles.',
            'img': 'service_commercial',
            'features': ['Elastomeric membrane', 'Flat roofing', 'Preventive maintenance'],
        },
        {
            'title': 'Flashing & Gutters',
            'desc': 'Installation of flashings, drip edges, downspouts and aluminum gutters. Impeccable finish.',
            'img': 'service_flashing',
            'features': ['Custom flashings', 'Aluminum gutters', 'Water protection'],
        },
        {
            'title': 'Attic Ventilation',
            'desc': 'Optimal ventilation system to prevent ice dams and extend the life of your roof.',
            'img': 'service_ventilation',
            'features': ['Ice dam prevention', 'Energy savings', 'Maximum airflow'],
        },
    ]

    if lang == 'fr':
        services = services_fr if page_num == 1 else services_fr2
        header = 'NOS SERVICES' if page_num == 1 else 'NOS SERVICES (SUITE)'
    else:
        services = services_en if page_num == 1 else services_en2
        header = 'OUR SERVICES' if page_num == 1 else 'OUR SERVICES (CONT.)'

    # Header
    y = H - 50
    draw_overline(c, header, 50, y, 8)
    y -= 5
    draw_gold_line(c, 50, y, W - 100, 1)

    # 3 service cards per page
    card_h = 195
    y -= 25
    for svc in services:
        card_y = y - card_h

        # Card background
        draw_rounded_rect(c, 40, card_y, W - 80, card_h, 8, WHITE, BORDER)

        # Image on left
        img_w = 160
        img_h = card_h - 20
        try:
            img = Image.open(f'{ASSETS}/{svc["img"]}.png')
            c.saveState()
            # Clip rounded left corners
            p = c.beginPath()
            p.roundRect(50, card_y + 10, img_w, img_h, 6)
            c.clipPath(p, stroke=0)
            # Cover fit
            iw, ih = img.size
            scale = max(img_w / iw, img_h / ih)
            sw, sh = iw * scale, ih * scale
            ox = (img_w - sw) / 2
            oy = (img_h - sh) / 2
            c.drawImage(ImageReader(img), 50 + ox, card_y + 10 + oy, sw, sh, mask='auto')
            c.restoreState()
        except:
            c.setFillColor(GOLD)
            c.rect(50, card_y + 10, img_w, img_h, fill=1, stroke=0)

        # Text on right
        tx = 50 + img_w + 20
        tw = W - 80 - img_w - 30

        ty = card_y + card_h - 30
        c.setFillColor(DARK)
        c.setFont(FONT_SERIF_BOLD, 15)
        c.drawString(tx, ty, svc['title'])

        ty -= 5
        draw_gold_line(c, tx, ty, 40, 1.5)

        ty -= 14
        c.setFont(FONT_SANS, 8.5)
        c.setFillColor(TEXT_LIGHT)
        # Word wrap description
        words = svc['desc'].split()
        line = ''
        for word in words:
            test = line + ' ' + word if line else word
            if c.stringWidth(test, FONT_SANS, 8.5) > tw:
                c.drawString(tx, ty, line)
                ty -= 12
                line = word
            else:
                line = test
        if line:
            c.drawString(tx, ty, line)

        # Features
        ty -= 18
        for feat in svc['features']:
            c.setFillColor(GOLD)
            c.setFont(FONT_SANS_BOLD, 8)
            c.drawString(tx, ty, '\u2713')
            c.setFillColor(TEXT)
            c.setFont(FONT_SANS, 8.5)
            c.drawString(tx + 12, ty, feat)
            ty -= 13

        y = card_y - 15

    # Footer
    c.setFillColor(TEXT_MUTED)
    c.setFont(FONT_SANS, 7)
    c.drawCentredString(W / 2, 25, 'www.optiontoiture.com  |  514-835-4820  |  3320 route 112, Marieville, QC')


# ═══════════════════════════════════════════════════════════════
# PAGE 4: GUARANTEES + WHY US
# ═══════════════════════════════════════════════════════════════
def page_guarantees(c, lang='fr'):
    draw_bg(c, CREAM)

    y = H - 50
    if lang == 'fr':
        draw_overline(c, 'POURQUOI OPTION TOITURE', 50, y, 8)
    else:
        draw_overline(c, 'WHY OPTION TOITURE', 50, y, 8)
    y -= 5
    draw_gold_line(c, 50, y, W - 100, 1)

    # Stats bar
    y -= 50
    stats_fr = [('1 000+', 'Projets'), ('12+', 'Annees'), ('50 ans', 'Garantie'), ('100%', 'Valeur a neuf')]
    stats_en = [('1,000+', 'Projects'), ('12+', 'Years'), ('50 yr', 'Warranty'), ('100%', 'Replacement')]
    stats = stats_fr if lang == 'fr' else stats_en
    stat_w = (W - 100) / len(stats)
    for i, (val, label) in enumerate(stats):
        sx = 50 + i * stat_w + stat_w / 2
        c.setFillColor(GOLD)
        c.setFont(FONT_SERIF_BOLD, 28)
        c.drawCentredString(sx, y, val)
        c.setFillColor(TEXT_LIGHT)
        c.setFont(FONT_SANS, 9)
        c.drawCentredString(sx, y - 18, label)

    y -= 55
    draw_gold_line(c, 50, y, W - 100, 0.5)

    # Guarantees section
    y -= 30
    if lang == 'fr':
        draw_overline(c, 'GARANTIES GAF', 50, y, 7)
    else:
        draw_overline(c, 'GAF WARRANTIES', 50, y, 7)

    guarantees_fr = [
        ('Golden Pledge', 'La meilleure garantie de l\'industrie. Couvre les materiaux ET la main-d\'oeuvre pendant 25 ans, non proratisee. Valeur a neuf 100%.'),
        ('Silver Pledge', 'Protection complete sur les materiaux et la main-d\'oeuvre. Couverture etendue pour une tranquillite d\'esprit totale.'),
        ('System Plus', 'Garantie systeme integre. Couvre tous les composants de votre toiture comme un systeme unifie.'),
    ]
    guarantees_en = [
        ('Golden Pledge', 'The best warranty in the industry. Covers materials AND labor for 25 years, non-prorated. 100% replacement value.'),
        ('Silver Pledge', 'Complete protection on materials and workmanship. Extended coverage for total peace of mind.'),
        ('System Plus', 'Integrated system warranty. Covers all roofing components as a unified system.'),
    ]
    guarantees = guarantees_fr if lang == 'fr' else guarantees_en

    y -= 20
    for title, desc in guarantees:
        draw_rounded_rect(c, 50, y - 55, W - 100, 60, 6, WHITE, BORDER)
        c.setFillColor(DARK)
        c.setFont(FONT_SERIF_BOLD, 13)
        c.drawString(70, y - 12, title)
        c.setFillColor(GOLD)
        c.setFont(FONT_SANS, 14)
        c.drawString(56, y - 11, '\u2605')  # Star
        c.setFillColor(TEXT_LIGHT)
        c.setFont(FONT_SANS, 8)
        # Word wrap
        words = desc.split()
        line = ''
        lx = 70
        ly = y - 28
        max_w = W - 160
        for word in words:
            test = line + ' ' + word if line else word
            if c.stringWidth(test, FONT_SANS, 8) > max_w:
                c.drawString(lx, ly, line)
                ly -= 11
                line = word
            else:
                line = test
        if line:
            c.drawString(lx, ly, line)
        y -= 70

    # Advantages
    y -= 15
    if lang == 'fr':
        draw_overline(c, 'NOS AVANTAGES', 50, y, 7)
        advantages = [
            'Installateur officiel RONA+ sur la Rive-Sud',
            'Certification GAF Master Elite (top 3% en Amerique du Nord)',
            'Membre APCHQ — Association des professionnels de la construction',
            'Equipe locale experimentee — tous nos employes sont formes',
            'Soumission gratuite et detaillee en 24 heures',
            'Nettoyage complet du chantier garanti',
        ]
    else:
        draw_overline(c, 'OUR ADVANTAGES', 50, y, 7)
        advantages = [
            'Official RONA+ installer on the South Shore',
            'GAF Master Elite certification (top 3% in North America)',
            'APCHQ member — Construction professionals association',
            'Experienced local team — all employees are trained',
            'Free detailed estimate within 24 hours',
            'Complete job site cleanup guaranteed',
        ]

    y -= 18
    for adv in advantages:
        c.setFillColor(GOLD)
        c.setFont(FONT_SANS_BOLD, 9)
        c.drawString(60, y, '\u2713')
        c.setFillColor(TEXT)
        c.setFont(FONT_SANS, 9)
        c.drawString(75, y, adv)
        y -= 17

    # Footer
    c.setFillColor(TEXT_MUTED)
    c.setFont(FONT_SANS, 7)
    c.drawCentredString(W / 2, 25, 'www.optiontoiture.com  |  514-835-4820  |  3320 route 112, Marieville, QC')


# ═══════════════════════════════════════════════════════════════
# PAGE 5: PORTFOLIO / PHOTOS
# ═══════════════════════════════════════════════════════════════
def page_portfolio(c, lang='fr'):
    draw_bg(c, CREAM)

    y = H - 50
    if lang == 'fr':
        draw_overline(c, 'NOS REALISATIONS', 50, y, 8)
    else:
        draw_overline(c, 'OUR PROJECTS', 50, y, 8)
    y -= 5
    draw_gold_line(c, 50, y, W - 100, 1)

    # Grid of photos
    photos = [
        ('chantier1', 'Residence haut de gamme' if lang == 'fr' else 'Premium residence'),
        ('chantier2', 'Installation avec camion RONA' if lang == 'fr' else 'RONA truck installation'),
        ('equipe', 'Notre equipe en action' if lang == 'fr' else 'Our team in action'),
    ]

    # Large top photo
    y -= 20
    top_h = 220
    try:
        img = Image.open(f'{ASSETS}/{photos[0][0]}.png')
        c.saveState()
        p = c.beginPath()
        p.roundRect(50, y - top_h, W - 100, top_h, 8)
        c.clipPath(p, stroke=0)
        iw, ih = img.size
        pw = W - 100
        scale = max(pw / iw, top_h / ih)
        sw, sh = iw * scale, ih * scale
        ox = (pw - sw) / 2
        oy = (top_h - sh) / 2
        c.drawImage(ImageReader(img), 50 + ox, y - top_h + oy, sw, sh, mask='auto')
        c.restoreState()
    except:
        pass
    c.setFillColor(WHITE)
    c.setFont(FONT_SANS_BOLD, 9)
    c.drawString(60, y - top_h + 10, photos[0][1])
    y -= top_h + 12

    # Two photos side by side
    half_w = (W - 110) / 2
    bot_h = 160
    for i, (pname, plabel) in enumerate(photos[1:]):
        px = 50 + i * (half_w + 10)
        try:
            img = Image.open(f'{ASSETS}/{pname}.png')
            c.saveState()
            p = c.beginPath()
            p.roundRect(px, y - bot_h, half_w, bot_h, 8)
            c.clipPath(p, stroke=0)
            iw, ih = img.size
            scale = max(half_w / iw, bot_h / ih)
            sw, sh = iw * scale, ih * scale
            ox = (half_w - sw) / 2
            oy = (bot_h - sh) / 2
            c.drawImage(ImageReader(img), px + ox, y - bot_h + oy, sw, sh, mask='auto')
            c.restoreState()
        except:
            pass
        c.setFillColor(WHITE)
        c.setFont(FONT_SANS_BOLD, 8)
        c.drawString(px + 10, y - bot_h + 10, plabel)

    y -= bot_h + 20

    # Testimonial
    draw_rounded_rect(c, 50, y - 80, W - 100, 85, 8, DARK_MID)
    c.setFillColor(GOLD)
    c.setFont(FONT_SERIF_ITALIC, 32)
    c.drawString(65, y - 20, '\u201C')
    c.setFillColor(WHITE)
    c.setFont(FONT_SERIF_ITALIC, 11)
    if lang == 'fr':
        c.drawString(85, y - 25, 'Excellent travail, equipe professionnelle et respectueuse.')
        c.drawString(85, y - 40, 'La toiture est magnifique. Je recommande fortement!')
        c.setFillColor(GOLD_LIGHT)
        c.setFont(FONT_SANS, 8)
        c.drawString(85, y - 58, '- Client de Boucherville  |  ')
        c.setFillColor(GOLD)
        c.drawString(228, y - 58, '\u2605 \u2605 \u2605 \u2605 \u2605')
    else:
        c.drawString(85, y - 25, 'Excellent work, professional and respectful team.')
        c.drawString(85, y - 40, 'The roof looks amazing. Highly recommended!')
        c.setFillColor(GOLD_LIGHT)
        c.setFont(FONT_SANS, 8)
        c.drawString(85, y - 58, '- Client from Boucherville  |  ')
        c.setFillColor(GOLD)
        c.drawString(238, y - 58, '\u2605 \u2605 \u2605 \u2605 \u2605')

    # Footer
    c.setFillColor(TEXT_MUTED)
    c.setFont(FONT_SANS, 7)
    c.drawCentredString(W / 2, 25, 'www.optiontoiture.com  |  514-835-4820  |  3320 route 112, Marieville, QC')


# ═══════════════════════════════════════════════════════════════
# PAGE 6: CTA / CONTACT
# ═══════════════════════════════════════════════════════════════
def page_contact(c, lang='fr'):
    draw_bg(c, DARK)

    y = H - 80
    # Logo centered
    try:
        logo = Image.open(f'{ASSETS}/logo.png')
        logo_w = 100
        logo_h = logo_w * logo.size[1] / logo.size[0]
        c.drawImage(ImageReader(logo), (W - logo_w) / 2, y - logo_h, logo_w, logo_h, mask='auto')
        y -= logo_h + 30
    except:
        y -= 30

    draw_overline(c, 'SOUMISSION GRATUITE' if lang == 'fr' else 'FREE ESTIMATE', (W - c.stringWidth('SOUMISSION GRATUITE', FONT_SANS_BOLD, 8)) / 2, y, 8)

    y -= 40
    c.setFillColor(WHITE)
    c.setFont(FONT_SERIF_BOLD, 30)
    if lang == 'fr':
        c.drawCentredString(W / 2, y, 'Pret pour votre')
        y -= 36
        c.setFillColor(GOLD_LIGHT)
        c.drawCentredString(W / 2, y, 'nouveau toit?')
    else:
        c.drawCentredString(W / 2, y, 'Ready for your')
        y -= 36
        c.setFillColor(GOLD_LIGHT)
        c.drawCentredString(W / 2, y, 'new roof?')

    y -= 35
    c.setFillColor(Color(1, 1, 1, 0.5))
    c.setFont(FONT_SANS, 10)
    if lang == 'fr':
        c.drawCentredString(W / 2, y, 'Contactez-nous pour une soumission gratuite')
        y -= 16
        c.drawCentredString(W / 2, y, 'et detaillee en moins de 24 heures.')
    else:
        c.drawCentredString(W / 2, y, 'Contact us for a free and detailed estimate')
        y -= 16
        c.drawCentredString(W / 2, y, 'within 24 hours.')

    # Contact card
    y -= 50
    card_w = 340
    card_h = 180
    card_x = (W - card_w) / 2
    draw_rounded_rect(c, card_x, y - card_h, card_w, card_h, 10, HexColor('#1e1c18'))

    cy = y - 25
    # Phone
    c.setFillColor(GOLD)
    c.setFont(FONT_SANS_BOLD, 10)
    c.drawString(card_x + 30, cy, 'Tel.')
    c.setFillColor(WHITE)
    c.setFont(FONT_SANS_BOLD, 14)
    c.drawString(card_x + 70, cy - 2, '514-835-4820')
    cy -= 30

    draw_gold_line(c, card_x + 30, cy, card_w - 60, 0.5)
    cy -= 20

    # Toll-free
    c.setFillColor(GOLD)
    c.setFont(FONT_SANS_BOLD, 10)
    c.drawString(card_x + 30, cy, 'Sans frais' if lang == 'fr' else 'Toll-free')
    c.setFillColor(WHITE)
    c.setFont(FONT_SANS, 12)
    c.drawString(card_x + 130, cy, '1-844-454-1454')
    cy -= 25

    # Web
    c.setFillColor(GOLD)
    c.setFont(FONT_SANS_BOLD, 10)
    c.drawString(card_x + 30, cy, 'Web')
    c.setFillColor(WHITE)
    c.setFont(FONT_SANS, 11)
    c.drawString(card_x + 130, cy, 'www.optiontoiture.com')
    cy -= 25

    # Address
    c.setFillColor(GOLD)
    c.setFont(FONT_SANS_BOLD, 10)
    c.drawString(card_x + 30, cy, 'Adresse' if lang == 'fr' else 'Address')
    c.setFillColor(Color(1, 1, 1, 0.7))
    c.setFont(FONT_SANS, 9)
    c.drawString(card_x + 130, cy, '3320 route 112')
    cy -= 14
    c.drawString(card_x + 130, cy, 'Marieville, QC  J3M 1P1')

    # Service area
    y = y - card_h - 30
    c.setFillColor(GOLD)
    c.setFont(FONT_SANS_BOLD, 7)
    c.drawCentredString(W / 2, y, 'ZONES DESSERVIES' if lang == 'fr' else 'SERVICE AREAS')
    y -= 16
    c.setFillColor(Color(1, 1, 1, 0.4))
    c.setFont(FONT_SANS, 8)
    cities = 'Longueuil  |  Brossard  |  Boucherville  |  Saint-Lambert  |  La Prairie  |  Candiac'
    c.drawCentredString(W / 2, y, cities)
    y -= 13
    cities2 = 'Saint-Jean-sur-Richelieu  |  Chambly  |  Marieville  |  Granby  |  Bromont  |  et plus'
    c.drawCentredString(W / 2, y, cities2)

    # Certifications
    y -= 30
    c.setFillColor(Color(1, 1, 1, 0.06))
    c.rect(0, 0, W, 50, fill=1, stroke=0)
    logos_data = ['gaf', 'rona', 'apchq']
    logo_x = (W - 280) / 2
    for lname in logos_data:
        try:
            limg = Image.open(f'{ASSETS}/{lname}.png')
            lh = 28
            lw = lh * limg.size[0] / limg.size[1]
            c.drawImage(ImageReader(limg), logo_x, 12, lw, lh, mask='auto')
            logo_x += lw + 40
        except:
            logo_x += 80

    # "Propulse par Optime" footer
    c.setFillColor(Color(1, 1, 1, 0.15))
    c.setFont(FONT_SANS, 5.5)
    c.drawCentredString(W / 2, 4, 'Propulse par Optime' if lang == 'fr' else 'Powered by Optime')


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════
def generate(lang='fr'):
    filename = f'C:/web/brochure-option-toiture-{"fr" if lang == "fr" else "en"}.pdf'
    c = canvas.Canvas(filename, pagesize=letter)
    c.setTitle('Brochure Option Toiture' if lang == 'fr' else 'Option Toiture Brochure')
    c.setAuthor('Option Toiture Inc.')
    c.setSubject('Services de toiture' if lang == 'fr' else 'Roofing Services')

    page_cover(c, lang)
    c.showPage()

    page_services(c, lang, page_num=1)
    c.showPage()

    page_services(c, lang, page_num=2)
    c.showPage()

    page_guarantees(c, lang)
    c.showPage()

    page_portfolio(c, lang)
    c.showPage()

    page_contact(c, lang)
    c.showPage()

    c.save()
    print(f'Generated: {filename}')


if __name__ == '__main__':
    generate('fr')
    generate('en')
