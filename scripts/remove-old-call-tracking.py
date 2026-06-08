"""
Supprime l'ancien script de call tracking inline (numéro 450 489-9220)
de tous les fichiers HTML de C:\Web.

L'ancien script ressemble à :
  <script>
  (function() {
    var ADS_NUMBER  = '+14504899220';
    ...
    setTimeout(swapNumbers, 1500);
  })();
  </script>

On identifie le bloc par la présence de 'ADS_NUMBER' et on supprime
le <script>...</script> complet qui le contient.
"""
import os
import re
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Regex : capture tout bloc <script>(function(){...ADS_DISPLAY...})();</script>
# Couvre toutes les variantes (avec ou sans ADS_NUMBER, 1 ou 2 fonctions)
RE_OLD_BLOCK = re.compile(
    r'\s*<script>\s*\(function\s*\(\)\s*\{[\s\S]*?ADS_DISPLAY[\s\S]*?\}\)\s*\(\)\s*;\s*</script>',
    re.DOTALL
)

files   = glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True)
files   = [f for f in files if r'\.claude' not in f and '/.claude/' not in f]

updated = 0
skipped = 0

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'ADS_DISPLAY' not in content:
        skipped += 1
        continue

    new_content = RE_OLD_BLOCK.sub('', content)

    if new_content == content:
        # regex n'a pas matché — vérifier manuellement
        print(f"ATTENTION regex n'a pas matché : {path}")
        skipped += 1
        continue

    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    updated += 1

print(f"Done — {updated} fichiers nettoyés, {skipped} ignorés.")
