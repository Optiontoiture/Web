"""
Inject call-tracking into all HTML pages of Option Toiture.

Two actions per file:
  1. Add class="tracked-phone" to every <a href="tel:+15148354820"> link
     (preserves existing classes like header-phone, btn-ghost, etc.)
  2. Inject <script src="/js/call-tracking.js" defer></script> before </body>

Idempotent: files already processed are skipped.
"""
import os
import re
import glob

ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET_TEL   = 'tel:+15148354820'
SCRIPT_TAG   = '<script src="/js/call-tracking.js" defer></script>'
GUARD_CLASS  = 'tracked-phone'   # marqueur pour le JS de swap

# Regex : capture les <a ... href="tel:+15148354820" ...>
# On gère href en double ou simple quote, href avant ou après d'autres attrs.
RE_PHONE_LINK = re.compile(
    r'(<a\s[^>]*?href=["\']' + re.escape(TARGET_TEL) + r'["\'][^>]*?>)',
    re.IGNORECASE | re.DOTALL
)

def add_tracked_class(match):
    """Ajoute 'tracked-phone' à l'attribut class du tag <a> capturé."""
    tag = match.group(1)

    # Déjà traité ?
    if GUARD_CLASS in tag:
        return tag

    # Le tag a déjà un attribut class= ?
    class_match = re.search(r'class=["\']([^"\']*)["\']', tag)
    if class_match:
        # Ajouter la classe à la liste existante
        old_class = class_match.group(1)
        new_class = (old_class + ' ' + GUARD_CLASS).strip()
        tag = tag[:class_match.start(1)] + new_class + tag[class_match.end(1):]
    else:
        # Insérer class="tracked-phone" juste avant le >
        tag = tag[:-1] + ' class="' + GUARD_CLASS + '">'

    return tag

files   = glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True)
# Exclure les worktrees .claude
files   = [f for f in files if r'\.claude' not in f and '/.claude/' not in f]

updated = 0
skipped = 0

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Ignorer si déjà entièrement traité
    if SCRIPT_TAG in content:
        skipped += 1
        continue

    if '</body>' not in content:
        skipped += 1
        continue

    # Étape 1 : ajouter tracked-phone sur les liens tel:
    new_content = RE_PHONE_LINK.sub(add_tracked_class, content)

    # Étape 2 : injecter le script avant </body>
    new_content = new_content.replace('</body>', SCRIPT_TAG + '\n</body>', 1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    updated += 1

print(f"Done — {updated} fichiers mis à jour, {skipped} ignorés.")
