#!/usr/bin/env node
/**
 * inject-trust.js
 * Injects trust badges bar into all 36 city hub pages.
 * Placed between hero and calculator sections.
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// ── CSS ─────────────────────────────────────────────────────────────────────
const TRUST_CSS = `
    /* Trust Badges */
    .trust-bar{padding:32px 0;background:var(--white);border-bottom:1px solid var(--border)}
    .trust-bar-inner{display:flex;align-items:center;justify-content:center;gap:40px;flex-wrap:wrap}
    .trust-badge{display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--text)}
    .trust-badge img{height:44px;width:auto;object-fit:contain;filter:grayscale(20%);transition:filter .3s}
    .trust-badge:hover img{filter:grayscale(0)}
    .trust-badge-text{display:flex;flex-direction:column;line-height:1.3}
    .trust-badge-label{font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)}
    .trust-badge-value{font-size:.95rem;font-weight:700;color:var(--dark)}
    .trust-divider{width:1px;height:36px;background:var(--border)}
    @media(max-width:768px){.trust-bar{padding:24px 0}.trust-bar-inner{gap:24px}.trust-divider{display:none}.trust-badge img{height:36px}.trust-badge-value{font-size:.85rem}}
    @media(max-width:480px){.trust-bar-inner{gap:16px 28px;justify-content:center}}`;

// ── HTML FR ─────────────────────────────────────────────────────────────────
const TRUST_HTML_FR = `  <section class="trust-bar">
    <div class="container">
      <div class="trust-bar-inner">
        <div class="trust-badge">
          <img src="/images/logos/gaf-master-elite.webp" alt="GAF Master Elite" loading="lazy">
          <div class="trust-badge-text">
            <span class="trust-badge-label">Certifié</span>
            <span class="trust-badge-value">GAF Master Elite</span>
          </div>
        </div>
        <div class="trust-divider"></div>
        <div class="trust-badge">
          <img src="/images/logos/rona-plus.webp" alt="RONA+" loading="lazy">
          <div class="trust-badge-text">
            <span class="trust-badge-label">Installateur officiel</span>
            <span class="trust-badge-value">RONA+</span>
          </div>
        </div>
        <div class="trust-divider"></div>
        <div class="trust-badge">
          <div class="trust-badge-text">
            <span class="trust-badge-label">Licence RBQ</span>
            <span class="trust-badge-value">5665-8412-01</span>
          </div>
        </div>
        <div class="trust-divider"></div>
        <div class="trust-badge">
          <div class="trust-badge-text">
            <span class="trust-badge-label">Garantie matériaux</span>
            <span class="trust-badge-value">50 ans</span>
          </div>
        </div>
        <div class="trust-divider"></div>
        <div class="trust-badge">
          <div class="trust-badge-text">
            <span class="trust-badge-label">Garantie main-d'œuvre</span>
            <span class="trust-badge-value">25 ans</span>
          </div>
        </div>
      </div>
    </div>
  </section>`;

// ── HTML EN ─────────────────────────────────────────────────────────────────
const TRUST_HTML_EN = `  <section class="trust-bar">
    <div class="container">
      <div class="trust-bar-inner">
        <div class="trust-badge">
          <img src="/images/logos/gaf-master-elite.webp" alt="GAF Master Elite" loading="lazy">
          <div class="trust-badge-text">
            <span class="trust-badge-label">Certified</span>
            <span class="trust-badge-value">GAF Master Elite</span>
          </div>
        </div>
        <div class="trust-divider"></div>
        <div class="trust-badge">
          <img src="/images/logos/rona-plus.webp" alt="RONA+" loading="lazy">
          <div class="trust-badge-text">
            <span class="trust-badge-label">Official Installer</span>
            <span class="trust-badge-value">RONA+</span>
          </div>
        </div>
        <div class="trust-divider"></div>
        <div class="trust-badge">
          <div class="trust-badge-text">
            <span class="trust-badge-label">RBQ License</span>
            <span class="trust-badge-value">5665-8412-01</span>
          </div>
        </div>
        <div class="trust-divider"></div>
        <div class="trust-badge">
          <div class="trust-badge-text">
            <span class="trust-badge-label">Material Warranty</span>
            <span class="trust-badge-value">50 years</span>
          </div>
        </div>
        <div class="trust-divider"></div>
        <div class="trust-badge">
          <div class="trust-badge-text">
            <span class="trust-badge-label">Workmanship Warranty</span>
            <span class="trust-badge-value">25 years</span>
          </div>
        </div>
      </div>
    </div>
  </section>`;

// ── Injection ───────────────────────────────────────────────────────────────

function processFile(filePath, lang) {
  if (!fs.existsSync(filePath)) { console.error(`  SKIP (not found): ${filePath}`); return false; }

  let html = fs.readFileSync(filePath, 'utf-8');

  if (html.includes('class="trust-bar"')) {
    console.log(`  SKIP (already has trust): ${filePath}`);
    return false;
  }

  const trustHtml = lang === 'fr' ? TRUST_HTML_FR : TRUST_HTML_EN;

  // Inject CSS
  const styleAnchor = '  </style>';
  if (html.includes(styleAnchor) && !html.includes('.trust-bar')) {
    html = html.replace(styleAnchor, TRUST_CSS + '\n' + styleAnchor);
  }

  // Inject HTML between hero </section> and calc-optime
  const calcAnchor = '  <section class="calc-optime"';
  const calcIdx = html.indexOf(calcAnchor);
  if (calcIdx > -1) {
    const before = html.substring(0, calcIdx);
    const lastClose = before.lastIndexOf('</section>');
    if (lastClose > -1) {
      const insertAt = lastClose + '</section>'.length;
      html = html.substring(0, insertAt) + '\n' + trustHtml + '\n' + html.substring(insertAt);
    }
  } else {
    console.error(`  WARN: calc-optime not found in ${filePath}`);
    return false;
  }

  if ((html.match(/class="trust-bar"/g) || []).length !== 1) {
    console.error(`  ERROR: validation failed for ${filePath}`);
    return false;
  }

  if (dryRun) { console.log(`  DRY-RUN OK: ${filePath}`); return true; }

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
