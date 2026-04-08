#!/usr/bin/env node
/**
 * inject-seo-content.js
 * Injects unique FAQ + local paragraph sections into city hub pages.
 *
 * Usage:
 *   node scripts/inject-seo-content.js                  # Process all cities
 *   node scripts/inject-seo-content.js --city=longueuil # Process one city
 *   node scripts/inject-seo-content.js --dry-run        # Preview without writing
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(WEB_ROOT, 'data', 'city-seo-content.json');

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const cityArg = args.find(a => a.startsWith('--city='));
const targetCity = cityArg ? cityArg.split('=')[1] : null;

// ── CSS to inject ───────────────────────────────────────────────────────────
const SEO_CSS = `
    /* SEO — FAQ & Local Content */
    .faq-hub{padding:80px 0;background:var(--cream-light)}
    .faq-hub .faq-list{max-width:900px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
    .faq-hub .faq-item{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;transition:box-shadow .3s}
    .faq-hub .faq-item:hover{box-shadow:var(--shadow)}
    .faq-hub .faq-q{padding:20px 24px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-weight:600;font-size:.95rem;gap:16px}
    .faq-hub .faq-q:hover{background:var(--cream)}
    .faq-hub .faq-toggle{color:var(--gold);font-size:1.4rem;font-weight:300;transition:transform .3s;flex-shrink:0}
    .faq-hub .faq-item.open .faq-toggle{transform:rotate(45deg)}
    .faq-hub .faq-a{max-height:0;overflow:hidden;transition:max-height .4s ease,padding .4s ease}
    .faq-hub .faq-item.open .faq-a{max-height:400px;padding:0 24px 20px}
    .faq-hub .faq-a p{font-size:.92rem;color:var(--text-light);line-height:1.7}
    .local-content{padding:80px 0;background:var(--cream)}
    .local-text{max-width:800px;margin:0 auto;text-align:center}
    .local-text p{font-size:1.05rem;color:var(--text-light);line-height:1.85}
    @media(max-width:768px){.faq-hub{padding:48px 0}.faq-hub .faq-q{padding:16px 18px;font-size:.88rem}.local-content{padding:48px 0}}`;

// ── FAQ accordion JS ────────────────────────────────────────────────────────
const FAQ_JS = `<script>document.querySelectorAll('.faq-hub .faq-q').forEach(function(q){q.addEventListener('click',function(){var i=q.parentElement;document.querySelectorAll('.faq-hub .faq-item').forEach(function(x){if(x!==i)x.classList.remove('open')});i.classList.toggle('open')})});</script>`;

// ── HTML builders ───────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildFaqHtml(faqItems, lang) {
  const overline = lang === 'fr' ? 'FAQ' : 'FAQ';
  const heading = lang === 'fr'
    ? 'Questions fréquentes'
    : 'Frequently Asked Questions';

  const items = faqItems.map(f => {
    return `        <div class="faq-item">` +
      `<div class="faq-q">${escapeHtml(f.question)}<span class="faq-toggle">+</span></div>` +
      `<div class="faq-a"><p>${escapeHtml(f.answer)}</p></div>` +
      `</div>`;
  }).join('\n');

  return `  <section class="faq-hub" id="faq">
    <div class="container">
      <div class="section-header">
        <span class="overline">${overline}</span>
        <h2 class="section-heading">${heading}</h2>
      </div>
      <div class="faq-list">
${items}
      </div>
    </div>
  </section>`;
}

function buildLocalHtml(localParagraph) {
  return `  <section class="local-content">
    <div class="container">
      <div class="section-header">
        <h2 class="section-heading">${localParagraph.heading}</h2>
      </div>
      <div class="local-text">
        <p>${escapeHtml(localParagraph.text)}</p>
      </div>
    </div>
  </section>`;
}

function buildFaqSchema(faqItems) {
  const entities = faqItems.map(f => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer }
  }));
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entities
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

// ── Injection logic ─────────────────────────────────────────────────────────

function processPage(filePath, cityData, lang) {
  if (!fs.existsSync(filePath)) {
    console.error(`  SKIP (file not found): ${filePath}`);
    return false;
  }

  let html = fs.readFileSync(filePath, 'utf-8');
  const content = cityData[lang];
  const displayName = cityData.displayName;
  let changes = 0;

  // Guard: skip if already injected
  if (html.includes('class="faq-hub"')) {
    console.log(`  SKIP (already injected): ${filePath}`);
    return false;
  }

  // 1. Inject CSS before </style>
  const styleAnchor = '  </style>';
  if (html.includes(styleAnchor)) {
    html = html.replace(styleAnchor, SEO_CSS + '\n  </style>');
    changes++;
  } else {
    console.error(`  WARN: </style> anchor not found in ${filePath}`);
  }

  // 2. Inject FAQ Schema JSON-LD after existing JSON-LD
  const ldAnchor = `"areaServed":{"@type":"City","name":"${displayName}"}}</script>`;
  if (html.includes(ldAnchor)) {
    html = html.replace(ldAnchor, ldAnchor + '\n  ' + buildFaqSchema(content.faq));
    changes++;
  } else {
    console.error(`  WARN: JSON-LD anchor not found for "${displayName}" in ${filePath}`);
  }

  // 3. Inject FAQ section between services-hub and map-zone
  const mapAnchor = '  <section class="map-zone">';
  const faqHtml = buildFaqHtml(content.faq, lang);
  // Find the </section> immediately before map-zone
  const mapIdx = html.indexOf(mapAnchor);
  if (mapIdx > -1) {
    // Look backwards for the </section> that closes services-hub
    const beforeMap = html.substring(0, mapIdx);
    const lastSectionClose = beforeMap.lastIndexOf('</section>');
    if (lastSectionClose > -1) {
      const insertPoint = lastSectionClose + '</section>'.length;
      html = html.substring(0, insertPoint) + '\n' + faqHtml + '\n' + html.substring(insertPoint);
      changes++;
    }
  } else {
    console.error(`  WARN: map-zone anchor not found in ${filePath}`);
  }

  // 4. Inject local paragraph between map-zone and cta-section
  const ctaAnchor = '  <section class="cta-section">';
  const localHtml = buildLocalHtml(content.localParagraph);
  const ctaIdx = html.indexOf(ctaAnchor);
  if (ctaIdx > -1) {
    const beforeCta = html.substring(0, ctaIdx);
    const lastSectionClose2 = beforeCta.lastIndexOf('</section>');
    if (lastSectionClose2 > -1) {
      // The map-zone closing pattern is </div></section>
      const insertPoint2 = lastSectionClose2 + '</section>'.length;
      html = html.substring(0, insertPoint2) + '\n' + localHtml + '\n' + html.substring(insertPoint2);
      changes++;
    }
  } else {
    console.error(`  WARN: cta-section anchor not found in ${filePath}`);
  }

  // 5. Inject FAQ accordion JS before </body>
  if (!html.includes('.faq-hub .faq-q')) {
    html = html.replace('</body>', FAQ_JS + '\n</body>');
    changes++;
  }

  // Validate
  const faqCount = (html.match(/class="faq-hub"/g) || []).length;
  const localCount = (html.match(/class="local-content"/g) || []).length;
  const ldCount = (html.match(/application\/ld\+json/g) || []).length;

  if (faqCount !== 1 || localCount !== 1 || ldCount !== 2) {
    console.error(`  ERROR: Validation failed for ${filePath}`);
    console.error(`    faq-hub: ${faqCount} (expected 1), local-content: ${localCount} (expected 1), ld+json: ${ldCount} (expected 2)`);
    return false;
  }

  if (dryRun) {
    console.log(`  DRY-RUN OK: ${filePath} (${changes} injections)`);
    return true;
  }

  // Write backup + save
  fs.writeFileSync(filePath + '.bak', fs.readFileSync(filePath));
  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`  OK: ${filePath} (${changes} injections)`);
  return true;
}

// ── Main ────────────────────────────────────────────────────────────────────

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
let processed = 0;
let errors = 0;

for (const city of data.cities) {
  if (targetCity && city.slug !== targetCity) continue;

  console.log(`\n[${city.displayName}]`);

  const frPath = path.join(WEB_ROOT, `couvreur-${city.slug}`, 'index.html');
  const enPath = path.join(WEB_ROOT, 'en', `roofer-${city.slug}`, 'index.html');

  if (processPage(frPath, city, 'fr')) processed++; else errors++;
  if (processPage(enPath, city, 'en')) processed++; else errors++;
}

console.log(`\nDone. Processed: ${processed}, Errors/Skips: ${errors}`);
if (dryRun) console.log('(dry-run mode — no files were modified)');
