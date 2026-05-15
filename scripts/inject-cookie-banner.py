"""
Injects a cookie consent banner into all HTML files, just before </body>.
Skips files that already contain the banner.
"""
import os
import glob

BANNER = '''
  <!-- Cookie Banner -->
  <div id="cookie-banner" style="display:none;position:fixed;bottom:0;left:0;right:0;z-index:99998;background:rgba(20,18,16,.97);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-top:1px solid rgba(201,149,44,.25);padding:16px 28px;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
    <p id="cookie-text" style="font-family:'Outfit',sans-serif;font-size:.84rem;color:rgba(255,255,255,.75);margin:0;line-height:1.6;flex:1;min-width:220px">
      Nous utilisons des cookies pour améliorer votre expérience. En continuant, vous acceptez leur utilisation.&#160;<a href="/politique-de-confidentialite/" id="cookie-link" style="color:#c9952c;text-decoration:underline;white-space:nowrap">Politique de confidentialité</a>
    </p>
    <div style="display:flex;gap:10px;flex-shrink:0">
      <button onclick="setCookieChoice('refused')" id="cookie-refuse" style="font-family:'Outfit',sans-serif;font-size:.8rem;font-weight:500;padding:8px 18px;border:1px solid rgba(255,255,255,.22);border-radius:6px;background:transparent;color:rgba(255,255,255,.65);cursor:pointer">Refuser</button>
      <button onclick="setCookieChoice('accepted')" id="cookie-accept" style="font-family:'Outfit',sans-serif;font-size:.8rem;font-weight:600;padding:8px 22px;border:none;border-radius:6px;background:#c9952c;color:#fff;cursor:pointer">Accepter</button>
    </div>
  </div>
  <script>
  (function(){
    if(localStorage.getItem('cookieConsent'))return;
    var b=document.getElementById('cookie-banner');
    var isEn=(document.documentElement.lang||'').startsWith('en');
    if(isEn){
      document.getElementById('cookie-text').innerHTML='We use cookies to improve your experience. By continuing, you agree to their use.&#160;<a href="/en/privacy-policy/" style="color:#c9952c;text-decoration:underline;white-space:nowrap">Privacy Policy</a>';
      document.getElementById('cookie-refuse').textContent='Decline';
      document.getElementById('cookie-accept').textContent='Accept';
    }
    b.style.display='flex';
  })();
  function setCookieChoice(c){
    localStorage.setItem('cookieConsent',c);
    document.getElementById('cookie-banner').style.display='none';
  }
  </script>'''

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files = glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True)

updated = 0
skipped = 0

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'cookie-banner' in content:
        skipped += 1
        continue

    if '</body>' not in content:
        skipped += 1
        continue

    new_content = content.replace('</body>', BANNER + '\n</body>', 1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    updated += 1

print(f"Done — {updated} files updated, {skipped} skipped.")
