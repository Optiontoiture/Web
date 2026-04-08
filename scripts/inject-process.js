#!/usr/bin/env node
/**
 * inject-process.js
 * Injects "Our Process" section into all 36 city hub pages.
 * Placed between services-hub and faq-hub sections.
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// ── CSS ─────────────────────────────────────────────────────────────────────
const PROCESS_CSS = `
    /* Process Section */
    .process-section{padding:80px 0;background:var(--dark);overflow:hidden}
    .process-section .section-heading{color:var(--white)}
    .process-section .section-subtitle{color:rgba(255,255,255,.55)}
    .process-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:0;max-width:1100px;margin:0 auto;position:relative}
    .process-steps::before{content:'';position:absolute;top:44px;left:10%;right:10%;height:2px;background:linear-gradient(90deg,transparent,var(--gold),var(--gold),var(--gold),transparent)}
    .process-step{text-align:center;padding:0 12px;position:relative}
    .process-num{width:88px;height:88px;border-radius:50%;background:var(--dark-mid);border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:2rem;position:relative;z-index:2;transition:transform .3s,background .3s}
    .process-step:hover .process-num{transform:scale(1.1);background:var(--gold)}
    .process-step:hover .process-num span{filter:brightness(0)}
    .process-step h3{font-family:'Cormorant Garamond',serif;font-size:1.15rem;font-weight:700;color:var(--white);margin-bottom:8px}
    .process-step p{font-size:.82rem;color:var(--text-muted);line-height:1.6}
    .process-guarantee{margin-top:48px;text-align:center;padding:28px 32px;background:rgba(201,149,44,.08);border:1px solid rgba(201,149,44,.2);border-radius:var(--radius-lg);max-width:800px;margin-left:auto;margin-right:auto;display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap}
    .process-guarantee .guarantee-icon{font-size:2rem}
    .process-guarantee p{color:rgba(255,255,255,.8);font-size:.95rem;margin:0}
    .process-guarantee strong{color:var(--gold)}
    @media(max-width:768px){.process-section{padding:48px 0}.process-steps{grid-template-columns:1fr;gap:32px;max-width:320px}.process-steps::before{display:none}.process-num{width:72px;height:72px;font-size:1.6rem}.process-guarantee{flex-direction:column;text-align:center;padding:20px}}`;

// ── HTML FR ─────────────────────────────────────────────────────────────────
const PROCESS_HTML_FR = `  <section class="process-section">
    <div class="container">
      <div class="section-header">
        <span class="overline">Notre processus</span>
        <h2 class="section-heading">5 étapes simples vers votre <em>nouvelle toiture</em></h2>
        <p class="section-subtitle">Un processus clair et transparent, du premier appel à la garantie finale.</p>
      </div>
      <div class="process-steps">
        <div class="process-step">
          <div class="process-num"><span>📞</span></div>
          <h3>1. Contactez-nous</h3>
          <p>Appelez ou remplissez le formulaire. Réponse en moins de 24 h.</p>
        </div>
        <div class="process-step">
          <div class="process-num"><span>🏠</span></div>
          <h3>2. Inspection gratuite</h3>
          <p>Un expert se déplace chez vous pour évaluer votre toiture. Sans frais, sans engagement.</p>
        </div>
        <div class="process-step">
          <div class="process-num"><span>📋</span></div>
          <h3>3. Soumission détaillée</h3>
          <p>Vous recevez un prix clair et complet, sans surprise. Financement disponible.</p>
        </div>
        <div class="process-step">
          <div class="process-num"><span>🔨</span></div>
          <h3>4. Installation</h3>
          <p>Notre équipe certifiée réalise les travaux selon les normes GAF. Chantier propre garanti.</p>
        </div>
        <div class="process-step">
          <div class="process-num"><span>🛡️</span></div>
          <h3>5. Garantie complète</h3>
          <p>Garantie Golden Pledge : 50 ans matériaux, 25 ans main-d'œuvre. Suivi après travaux inclus.</p>
        </div>
      </div>
      <div class="process-guarantee">
        <span class="guarantee-icon">✅</span>
        <p><strong>Payez seulement quand le travail est complété</strong> à votre entière satisfaction.</p>
      </div>
    </div>
  </section>`;

// ── HTML EN ─────────────────────────────────────────────────────────────────
const PROCESS_HTML_EN = `  <section class="process-section">
    <div class="container">
      <div class="section-header">
        <span class="overline">Our Process</span>
        <h2 class="section-heading">5 simple steps to your <em>new roof</em></h2>
        <p class="section-subtitle">A clear, transparent process from the first call to your final warranty.</p>
      </div>
      <div class="process-steps">
        <div class="process-step">
          <div class="process-num"><span>📞</span></div>
          <h3>1. Contact Us</h3>
          <p>Call or fill out the form. Response within 24 hours.</p>
        </div>
        <div class="process-step">
          <div class="process-num"><span>🏠</span></div>
          <h3>2. Free Inspection</h3>
          <p>An expert visits your home to evaluate your roof. No charge, no obligation.</p>
        </div>
        <div class="process-step">
          <div class="process-num"><span>📋</span></div>
          <h3>3. Detailed Estimate</h3>
          <p>You receive a clear, complete price with no surprises. Financing available.</p>
        </div>
        <div class="process-step">
          <div class="process-num"><span>🔨</span></div>
          <h3>4. Installation</h3>
          <p>Our certified team completes the work to GAF standards. Clean job site guaranteed.</p>
        </div>
        <div class="process-step">
          <div class="process-num"><span>🛡️</span></div>
          <h3>5. Full Warranty</h3>
          <p>Golden Pledge warranty: 50 years on materials, 25 years on workmanship. Post-work follow-up included.</p>
        </div>
      </div>
      <div class="process-guarantee">
        <span class="guarantee-icon">✅</span>
        <p><strong>Pay only when the job is completed</strong> to your full satisfaction.</p>
      </div>
    </div>
  </section>`;

// ── Injection ───────────────────────────────────────────────────────────────

function processFile(filePath, lang) {
  if (!fs.existsSync(filePath)) {
    console.error(`  SKIP (not found): ${filePath}`);
    return false;
  }

  let html = fs.readFileSync(filePath, 'utf-8');

  if (html.includes('class="process-section"')) {
    console.log(`  SKIP (already has process): ${filePath}`);
    return false;
  }

  const processHtml = lang === 'fr' ? PROCESS_HTML_FR : PROCESS_HTML_EN;

  // Inject CSS before </style>
  const styleAnchor = '  </style>';
  if (html.includes(styleAnchor) && !html.includes('.process-section')) {
    html = html.replace(styleAnchor, PROCESS_CSS + '\n' + styleAnchor);
  }

  // Inject HTML between services-hub and faq-hub
  const faqAnchor = '  <section class="faq-hub"';
  const faqIdx = html.indexOf(faqAnchor);
  if (faqIdx > -1) {
    const before = html.substring(0, faqIdx);
    const lastClose = before.lastIndexOf('</section>');
    if (lastClose > -1) {
      const insertAt = lastClose + '</section>'.length;
      html = html.substring(0, insertAt) + '\n' + processHtml + '\n' + html.substring(insertAt);
    }
  } else {
    console.error(`  WARN: faq-hub anchor not found in ${filePath}`);
    return false;
  }

  // Validate
  if ((html.match(/class="process-section"/g) || []).length !== 1) {
    console.error(`  ERROR: validation failed for ${filePath}`);
    return false;
  }

  if (dryRun) {
    console.log(`  DRY-RUN OK: ${filePath}`);
    return true;
  }

  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`  OK: ${filePath}`);
  return true;
}

// ── Main ────────────────────────────────────────────────────────────────────

const cities = fs.readdirSync(WEB_ROOT)
  .filter(d => d.startsWith('couvreur-') && fs.statSync(path.join(WEB_ROOT, d)).isDirectory())
  .map(d => d.replace('couvreur-', ''));

let ok = 0, skip = 0;

for (const city of cities) {
  console.log(`\n[${city}]`);
  if (processFile(path.join(WEB_ROOT, `couvreur-${city}`, 'index.html'), 'fr')) ok++; else skip++;
  if (processFile(path.join(WEB_ROOT, 'en', `roofer-${city}`, 'index.html'), 'en')) ok++; else skip++;
}

console.log(`\nDone. Processed: ${ok}, Skipped: ${skip}`);
if (dryRun) console.log('(dry-run — no files modified)');
