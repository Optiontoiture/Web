#!/usr/bin/env node
/**
 * inject-maillage-villes.js — lots 17 et 19 du plan SEO (22 nov. 2026)
 *
 * Quatre passes, toutes idempotentes (un bloc déjà posé est remplacé, jamais doublé) :
 *   1. pages de ville (FR et EN) : bloc « Villes voisines » de 4 à 6 liens « Couvreur à X » ;
 *   2. pages /services/* (FR et EN) : liste des 18 variantes par ville ;
 *   3. sous-pages de ville : ancres des pastilles « près de » rendues descriptives
 *      (« Réparation de toiture à Longueuil » au lieu de « Longueuil ») ;
 *   4. pages réparation et remplacement des 7 villes de la vague 1 (FR et EN) : section
 *      « ce qu'il faut savoir » (signes, types de travaux, délais) et FAQ refaite, avec son
 *      balisage FAQPage. La réponse de prix déjà publiée sur la page est reprise telle quelle.
 *
 * Les faits propres aux villes viennent de data/maillage-villes.json, lui-même tiré de
 * data/city-seo-content.json et des pages publiées. Ce qui manque (vrais chantiers, avis,
 * nombres, permis) reste en commentaire HTML « A-COMPLETER », invisible à l'écran.
 *
 * Usage :
 *   node scripts/inject-maillage-villes.js --dry-run   # liste ce qui changerait
 *   node scripts/inject-maillage-villes.js             # écrit
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');
const villes = require(path.join(ROOT, 'data', 'city-seo-content.json')).cities;
const maillage = require(path.join(ROOT, 'data', 'maillage-villes.json'));

const nomDe = Object.fromEntries(villes.map(v => [v.slug, v.displayName]));
const slugs = villes.map(v => v.slug);

const SERVICES = {
  fr: {
    'installation-toiture': 'Installation de toiture',
    'reparation-toiture': 'Réparation de toiture',
    'remplacement-toiture': 'Remplacement de toiture',
    'ventilation-entretoit': "Ventilation d'entretoit",
    'toiture-commerciale': 'Toiture commerciale',
    'ferblanterie-gouttieres': 'Ferblanterie et gouttières',
  },
  en: {
    'roof-installation': 'Roof installation',
    'roof-repair': 'Roof repair',
    'roof-replacement': 'Roof replacement',
    'attic-ventilation': 'Attic ventilation',
    'commercial-roofing': 'Commercial roofing',
    'flashing-gutters': 'Flashing and gutters',
  },
};
const PREFIXE = { fr: '/couvreur-', en: '/en/roofer-' };
const DOSSIER = { fr: v => `couvreur-${v}`, en: v => path.join('en', `roofer-${v}`) };
const A = { fr: 'à', en: 'in' };

// ── Outils ──────────────────────────────────────────────────────────────────

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const texte = html => html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const lire = f => fs.readFileSync(path.join(ROOT, f), 'utf-8');

const stats = { ecrits: 0, inchanges: 0, avertissements: 0 };
function avertir(msg) { stats.avertissements++; console.error('  ATTENTION : ' + msg); }

function ecrire(fichier, avant, apres) {
  if (avant === apres) { stats.inchanges++; return; }
  stats.ecrits++;
  console.log(`  ${dryRun ? '[essai] ' : ''}modifié : ${fichier.replace(/\\/g, '/')}`);
  if (!dryRun) fs.writeFileSync(path.join(ROOT, fichier), apres, 'utf-8');
}

/** Pose ou remplace un bloc balisé <!-- seo:nom:debut --> … <!-- seo:nom:fin -->. */
function poserBloc(html, nom, bloc, ancre, fichier) {
  const debut = `<!-- seo:${nom}:debut -->`;
  const fin = `<!-- seo:${nom}:fin -->`;
  const complet = `${debut}\n${bloc}\n  ${fin}\n`;
  const i = html.indexOf(debut);
  if (i > -1) {
    const j = html.indexOf(fin, i);
    if (j < 0) { avertir(`marqueur ${fin} absent de ${fichier} : bloc laissé tel quel`); return html; }
    let k = j + fin.length;
    if (html[k] === '\n') k++;
    return html.slice(0, i) + complet + html.slice(k);
  }
  const a = html.indexOf(ancre);
  if (a < 0) { avertir(`ancre « ${ancre.trim()} » absente de ${fichier}`); return html; }
  return html.slice(0, a) + '  ' + complet + html.slice(a);
}

/** Pose ou remplace une règle CSS balisée dans la première feuille <style>. */
function poserCss(html, nom, css, fichier) {
  const debut = `/* seo:${nom} */`;
  const fin = `/* /seo:${nom} */`;
  const complet = `    ${debut}${css}${fin}\n`;
  const i = html.indexOf(debut);
  if (i > -1) {
    const j = html.indexOf(fin, i) + fin.length;
    const s = html.lastIndexOf('\n', i) + 1;
    const e = html[j] === '\n' ? j + 1 : j;
    return html.slice(0, s) + complet + html.slice(e);
  }
  const a = html.indexOf('</style>');
  if (a < 0) { avertir(`</style> absent de ${fichier}`); return html; }
  const s = html.lastIndexOf('\n', a) + 1;
  return html.slice(0, s) + complet + html.slice(s);
}

// ── 1. Villes voisines sur les pages de ville ───────────────────────────────

const CSS_VOISINES = '.villes-voisines{padding:80px 0;background:var(--cream-light)}.vv-liste{list-style:none;display:flex;flex-wrap:wrap;gap:12px;justify-content:center;max-width:900px;margin:0 auto;padding:0}.vv-liste a{display:inline-flex;align-items:center;background:var(--white);border:1px solid var(--border);border-radius:50px;padding:12px 24px;font-size:.92rem;font-weight:500;color:var(--text);text-decoration:none;transition:border-color .3s,color .3s}.vv-liste a:hover,.vv-liste a:focus-visible{border-color:var(--gold);color:var(--gold-dark)}@media(max-width:768px){.villes-voisines{padding:48px 0}.villes-voisines .section-header{margin-bottom:32px}.vv-liste a{padding:10px 18px;font-size:.88rem}}';

function blocVoisines(slug, lang) {
  const nom = nomDe[slug];
  const t = lang === 'fr'
    ? { over: 'Villes voisines', h2: `Couvreur près de <em>${esc(nom)}</em>`, sous: `Notre équipe intervient aussi dans les villes voisines de ${esc(nom)}.`, lien: 'Couvreur à' }
    : { over: 'Nearby cities', h2: `Roofer near <em>${esc(nom)}</em>`, sous: `Our team also serves the towns around ${esc(nom)}.`, lien: 'Roofer in' };
  const liens = maillage.voisins[slug].map(v =>
    `        <li><a href="${PREFIXE[lang]}${v}/">${t.lien} ${esc(nomDe[v])}</a></li>`).join('\n');
  return `  <section class="villes-voisines" aria-labelledby="villes-voisines-titre"><div class="container">
    <div class="section-header">
      <span class="overline">${t.over}</span>
      <h2 class="section-heading" id="villes-voisines-titre">${t.h2}</h2>
      <p class="section-subtitle">${t.sous}</p>
    </div>
    <ul class="vv-liste">
${liens}
    </ul>
  </div></section>`;
}

function passeVoisines() {
  console.log('\n1. Villes voisines (pages de ville)');
  for (const slug of slugs) {
    const voisins = maillage.voisins[slug];
    if (!voisins || voisins.length < 4 || voisins.length > 6) { avertir(`${slug} : il faut 4 à 6 voisins`); continue; }
    const inconnus = voisins.filter(v => !nomDe[v]);
    if (inconnus.length) { avertir(`${slug} : voisin inconnu ${inconnus.join(', ')}`); continue; }
    for (const lang of ['fr', 'en']) {
      const f = path.join(DOSSIER[lang](slug), 'index.html');
      const avant = lire(f);
      let html = poserCss(avant, 'villes-voisines', CSS_VOISINES, f);
      html = poserBloc(html, 'villes-voisines', blocVoisines(slug, lang), '<section class="cta-section">', f);
      ecrire(f, avant, html);
    }
  }
}

// ── 2. Liste des villes sur les pages de service ────────────────────────────

function blocServiceVilles(service, lang) {
  const nomService = SERVICES[lang][service];
  const tri = [...slugs].sort((a, b) => nomDe[a].localeCompare(nomDe[b], 'fr'));
  const t = lang === 'fr'
    ? { over: 'Partout sur la Rive-Sud', h2: `${esc(nomService)} <em>par ville</em>` }
    : { over: 'Across the South Shore', h2: `${esc(nomService)} <em>by city</em>` };
  const liens = tri.map(v =>
    `        <a href="${PREFIXE[lang]}${v}/${service}" class="other-svc-link">${esc(nomService)} ${A[lang]} ${esc(nomDe[v])}</a>`).join('\n');
  return `  <section class="other-svc villes-service" aria-labelledby="villes-service-titre">
    <div class="container">
      <div class="section-header">
        <span class="overline">${t.over}</span>
        <h2 id="villes-service-titre">${t.h2}</h2>
      </div>
      <div class="other-svc-grid">
${liens}
      </div>
    </div>
  </section>`;
}

function passeServices() {
  console.log('\n2. Variantes par ville (pages /services/*)');
  for (const lang of ['fr', 'en']) {
    for (const service of Object.keys(SERVICES[lang])) {
      const f = path.join(lang === 'fr' ? 'services' : path.join('en', 'services'), `${service}.html`);
      for (const v of slugs) {
        if (!fs.existsSync(path.join(ROOT, DOSSIER[lang](v), `${service}.html`))) avertir(`page cible absente : ${DOSSIER[lang](v)}/${service}.html`);
      }
      const avant = lire(f);
      const html = poserBloc(avant, 'villes-service', blocServiceVilles(service, lang), '<section class="cta-section">', f);
      ecrire(f, avant, html);
    }
  }
}

// ── 3. Ancres descriptives des pastilles « près de » ────────────────────────

function passePastilles() {
  console.log('\n3. Ancres des pastilles « près de » (sous-pages de ville)');
  const re = /(<a href="(\/en\/roofer-|\/couvreur-)([a-z-]+)\/([a-z-]+)" class="nearby-pill">)[^<]*?( <span class="arrow">)/g;
  for (const lang of ['fr', 'en']) {
    for (const slug of slugs) {
      for (const service of Object.keys(SERVICES[lang])) {
        const f = path.join(DOSSIER[lang](slug), `${service}.html`);
        const avant = lire(f);
        const html = avant.replace(re, (m, ouverture, prefixe, ville, svc, fleche) => {
          const l = prefixe === '/couvreur-' ? 'fr' : 'en';
          if (!nomDe[ville] || !SERVICES[l][svc]) { avertir(`pastille inconnue ${prefixe}${ville}/${svc} dans ${f}`); return m; }
          return `${ouverture}${esc(SERVICES[l][svc])} ${A[l]} ${esc(nomDe[ville])}${fleche}`;
        });
        ecrire(f, avant, html);
      }
    }
  }
}

// ── 4. Réparation et remplacement, vague 1 ──────────────────────────────────

const CSS_GUIDE = '.guide-ville{padding:100px 0;background:var(--cream-light)}.guide-ville .gv-intro{max-width:820px;margin:0 auto 48px;text-align:center;font-size:1.05rem;color:var(--text-light);line-height:1.85}.gv-grille{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.gv-carte{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:28px}.gv-carte h3{font-family:\'Cormorant Garamond\',serif;font-size:1.45rem;font-weight:700;color:var(--dark);line-height:1.25;margin-bottom:14px}.gv-carte ul{list-style:none;padding:0}.gv-carte li{position:relative;padding:6px 0 6px 24px;font-size:.92rem;color:var(--text-light);line-height:1.6}.gv-carte li::before{content:"✓";position:absolute;left:0;top:6px;color:var(--gold);font-weight:700}@media(max-width:1024px){.gv-grille{grid-template-columns:1fr 1fr}}@media(max-width:768px){.guide-ville{padding:56px 0}.guide-ville .gv-intro{margin-bottom:32px;font-size:.98rem;text-align:left}.gv-grille{grid-template-columns:1fr}.gv-carte{padding:22px}}';

const PAGES_V1 = {
  fr: { reparation: 'reparation-toiture', remplacement: 'remplacement-toiture' },
  en: { reparation: 'roof-repair', remplacement: 'roof-replacement' },
};

const TEXTES = {
  fr: {
    reparation: nom => ({
      over: `Réparation à ${nom}`,
      h2: `Ce qu'il faut savoir avant de <em>faire réparer</em>`,
      cartes: [
        ['Signes d\'un bris', ['Bardeaux manquants, soulevés ou arrachés par le vent', 'Taches d\'eau au plafond ou peinture qui pèle', 'Moisissure dans l\'entretoit', 'Gouttes lors de fortes pluies', 'Mousse sur les bardeaux ou solins rouillés']],
        ['Types de réparation', ['Bardeaux arrachés remplacés', 'Infiltrations d\'eau : source trouvée, réparation ciblée', 'Solins autour des cheminées, fenêtres de toit, murs et puits de lumière', 'Dégâts causés par les barrages de glace', 'Nettoyage de gouttières', 'Inspection préventive']],
        ['Délais', ['Urgence 24/7, toute l\'année : 514-835-4820', 'Visite sous 24 à 48 heures', 'Soumission en 24 heures', 'La plupart des réparations courantes se règlent en 1 à 3 heures']],
      ],
      faq: [
        [`Comment savoir si ma toiture à ${nom} a besoin d'une réparation ?`, 'Les signes courants : bardeaux manquants ou soulevés, taches d\'eau au plafond, peinture qui pèle, moisissure dans l\'entretoit, gouttes lors de fortes pluies, mousse ou solins rouillés. Au moindre doute, l\'inspection est gratuite.'],
        [`Faites-vous des réparations d'urgence à ${nom} ?`, 'Oui, 24/7, toute l\'année : appelez le 514-835-4820. Hors urgence, la visite se fait sous 24 à 48 heures et la soumission suit en 24 heures.'],
        ['Faut-il réparer ou remplacer ma toiture ?', 'Si votre toiture a moins de 15 ans et que les dommages sont localisés, une réparation suffit souvent. Au-delà de 20 ans, ou si les problèmes sont généralisés, un remplacement complet est plus rentable à long terme.'],
        ['Les réparations sont-elles garanties ?', 'Oui, toutes nos réparations sont garanties : les matériaux sont couverts par la garantie du fabricant et notre main-d\'œuvre est garantie. Le financement Flexiti à 0 % sur 18 mois est offert.'],
        ['Réparez-vous aussi les toits plats ?', 'Oui, les toits plats comme les toits en pente.'],
      ],
    }),
    remplacement: (nom, delai) => ({
      over: `Remplacement à ${nom}`,
      h2: `Ce qu'il faut savoir avant de <em>refaire sa toiture</em>`,
      cartes: [
        ['Signes qu\'il faut remplacer', ['Bardeaux qui gondolent ou fissurés', 'Granules dans les gouttières', 'Fuites qui reviennent', 'Mousse sur les bardeaux', 'Toiture de plus de 20 ans : au Québec, un toit en bardeaux d\'asphalte dure de 15 à 25 ans']],
        ['Ce que comprend le remplacement', ['Retrait complet de l\'ancien revêtement', 'Inspection du pontage, sections endommagées remplacées', 'Membrane Ice & Water Shield aux endroits critiques', 'Sous-couche synthétique sur tout le toit', 'Bardeaux GAF Timberline HDZ et ventilation optimisée', 'Nettoyage magnétique et disposition des débris']],
        ['Délais', ['Visite sous 24 à 48 heures', 'Soumission en 24 heures', delai || 'Travaux en 1 à 3 jours pour la plupart des toitures résidentielles', 'Meilleure période : de mai à octobre ; urgences toute l\'année']],
      ],
      faq: [
        [`Quand faut-il remplacer sa toiture à ${nom} ?`, 'Bardeaux qui gondolent ou fissurés, granules dans les gouttières, mousse, fuites qui reviennent, ou une toiture de plus de 20 ans : au Québec, un toit en bardeaux d\'asphalte dure de 15 à 25 ans. L\'inspection gratuite vous donne un portrait clair.'],
        [`Combien de temps durent les travaux à ${nom} ?`, delai || 'De 1 à 3 jours pour la plupart des toitures résidentielles, selon la superficie et la météo.'],
        ['Que faites-vous de l\'ancienne toiture ?', 'Nous retirons toujours l\'ancien revêtement plutôt que de poser par-dessus, ce qui permet d\'inspecter le pontage. Le chantier se termine par un nettoyage magnétique, et la disposition des débris est incluse dans le prix.'],
        ['Quelle garantie offrez-vous ?', 'La garantie GAF va jusqu\'à 50 ans sur les matériaux. La main-d\'œuvre est garantie 25 ans avec Golden Pledge, 10 ans avec Silver Pledge. Le financement Flexiti à 0 % sur 18 mois est offert.'],
        ['Quelle est la meilleure période pour refaire sa toiture ?', 'De mai à octobre. Les urgences, elles, sont traitées toute l\'année.'],
      ],
    }),
  },
  en: {
    reparation: nom => ({
      over: `Repair in ${nom}`,
      h2: `What to know <em>before a repair</em>`,
      cartes: [
        ['Signs of damage', ['Missing, lifted or blown-off shingles', 'Water stains on the ceiling or peeling paint', 'Mould in the attic', 'Drips during heavy rain', 'Moss on the shingles or rusted flashing']],
        ['Types of repair', ['Blown-off shingles replaced', 'Leaks: source found, targeted repair', 'Flashing around chimneys, skylights, walls and roof windows', 'Ice dam damage', 'Gutter cleaning', 'Preventive inspection']],
        ['Timelines', ['24/7 emergency service, all year: 514-835-4820', 'Visit within 24 to 48 hours', 'Estimate within 24 hours', 'Most common repairs are done within a few hours']],
      ],
      faq: [
        [`How do I know if my roof in ${nom} needs a repair?`, 'Common signs: missing or lifted shingles, water stains on the ceiling, peeling paint, mould in the attic, drips during heavy rain, moss or rusted flashing. If in doubt, the inspection is free.'],
        [`Do you handle emergencies in ${nom}?`, 'Yes, 24/7, all year: call 514-835-4820. For non-emergencies, we visit within 24 to 48 hours and the estimate follows within 24 hours.'],
        ['Should I repair or replace my roof?', 'If your roof is less than 15 years old and the damage is localized, a repair is often enough. Past 20 years, or if the problems are widespread, a full replacement pays off better in the long run.'],
        ['Are repairs covered by a warranty?', 'Yes, we give a written warranty on all our repairs: materials are covered by the manufacturer\'s warranty and our workmanship is guaranteed. Flexiti financing at 0% over 18 months is available.'],
        ['Do you repair flat roofs too?', 'Yes, both flat and sloped roofs.'],
      ],
    }),
    remplacement: (nom, delai) => ({
      over: `Replacement in ${nom}`,
      h2: `What to know <em>before replacing your roof</em>`,
      cartes: [
        ['Signs it is time to replace', ['Curling or cracked shingles', 'Granules in the gutters', 'Recurring leaks', 'Moss on the shingles', 'A roof over 20 years old: in Quebec, an asphalt shingle roof lasts 15 to 25 years']],
        ['What the replacement includes', ['Complete tear-off of the old roofing', 'Roof deck inspection, damaged sections replaced', 'Ice & Water Shield membrane at critical areas', 'Synthetic underlayment over the whole roof', 'GAF Timberline HDZ shingles and optimized ventilation', 'Magnetic clean-up and debris disposal']],
        ['Timelines', ['Visit within 24 to 48 hours', 'Estimate within 24 hours', delai || 'Work done in 1 to 3 days for most residential roofs', 'Best season: May to October; emergencies all year']],
      ],
      faq: [
        [`When should I replace my roof in ${nom}?`, 'Curling or cracked shingles, granules in the gutters, moss, recurring leaks, or a roof over 20 years old: in Quebec, an asphalt shingle roof lasts 15 to 25 years. Our free inspection gives you a clear picture.'],
        [`How long does a replacement take in ${nom}?`, delai || '1 to 3 days for most residential roofs, depending on the size and the weather.'],
        ['What happens with the old roof?', 'We always tear off the old roofing instead of installing over it, so the roof deck can be inspected. The job ends with a magnetic clean-up, and debris disposal is included in the price.'],
        ['What warranty do you offer?', 'The GAF warranty goes up to 50 years on materials. Workmanship is guaranteed 25 years with Golden Pledge, 10 years with Silver Pledge. Flexiti financing at 0% over 18 months is available.'],
        ['When is the best time to replace a roof?', 'May to October. Emergencies are handled all year.'],
      ],
    }),
  },
};

const A_COMPLETER = {
  fr: nom => `A-COMPLETER (propriétaire) : un vrai chantier à ${nom} (quartier, problème trouvé, travaux, photo avant et après) et un avis client de ${nom} publiable. Ne rien inventer ici.`,
  en: nom => `A-COMPLETER (owner): one real job in ${nom} (area, problem found, work done, before and after photo) and a publishable customer review from ${nom}. Do not invent anything here.`,
};

function blocGuide(t, contexte, nom, lang) {
  const cartes = t.cartes.map(([titre, items]) =>
    `        <div class="gv-carte"><h3>${esc(titre)}</h3><ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('\n');
  return `  <section class="guide-ville" aria-labelledby="guide-ville-titre"><div class="container">
    <div class="section-header"><span class="overline">${esc(t.over)}</span><h2 class="section-heading" id="guide-ville-titre">${t.h2}</h2></div>
    <p class="gv-intro">${esc(contexte)}</p>
    <div class="gv-grille">
${cartes}
    </div>
  </div></section>`;
}

const RE_FAQ = /(<section class="faq"><div class="container">[\s\S]*?<div class="faq-list"[^>]*>)([\s\S]*?)(\r?\n    <\/div>\r?\n  <\/div><\/section>)/;
const RE_ITEM = /<div class="faq-item"><div class="faq-q">([\s\S]*?)<span class="plus">\+<\/span><\/div><div class="faq-a"><p>([\s\S]*?)<\/p><\/div><\/div>/g;
const RE_PRIX = /co[uû]t|prix|cost|price|ça coûte/i;

function passeVague1() {
  console.log('\n4. Réparation et remplacement, vague 1');
  for (const [slug, data] of Object.entries(maillage.vague1)) {
    const nom = nomDe[slug];
    for (const lang of ['fr', 'en']) {
      const d = data[lang];
      for (const type of ['reparation', 'remplacement']) {
        const f = path.join(DOSSIER[lang](slug), `${PAGES_V1[lang][type]}.html`);
        const avant = lire(f);
        const t = type === 'reparation' ? TEXTES[lang].reparation(nom) : TEXTES[lang].remplacement(nom, d.delaiRemplacement);

        // FAQ : la question de prix déjà publiée est reprise telle quelle, en tête.
        const m = avant.match(RE_FAQ);
        if (!m) { avertir(`FAQ introuvable dans ${f}`); continue; }
        const existants = [...m[2].matchAll(RE_ITEM)].map(x => ({ q: x[1], a: x[2] }));
        const prix = existants.find(x => RE_PRIX.test(x.q));
        if (!prix) avertir(`question de prix introuvable dans ${f}`);
        const propre = type === 'reparation' ? d.faqReparation : d.faqRemplacement;
        let generales = t.faq;
        if (/combien de temps|how long/i.test(propre.q)) generales = generales.filter(([q]) => !/combien de temps|how long/i.test(q));
        const faq = [
          ...(prix ? [{ q: prix.q, a: prix.a, brut: true }] : []),
          ...generales.map(([q, a]) => ({ q, a })),
          { q: propre.q, a: propre.a },
        ];
        const items = faq.map(x => {
          const q = x.brut ? x.q : esc(x.q);
          const a = x.brut ? x.a : esc(x.a);
          return `        <div class="faq-item"><div class="faq-q">${q}<span class="plus">+</span></div><div class="faq-a"><p>${a}</p></div></div>`;
        }).join('\n');
        const ouverture = m[1].replace(/<div class="faq-list"[^>]*>$/, '<div class="faq-list" data-seo="lot19">');
        // Fonction de remplacement : un « $ » des réponses ($8,000…) ne doit pas être lu comme $1, $2.
        let html = avant.replace(RE_FAQ, () => `${ouverture}\n${items}${m[3]}`);

        // Balisage FAQPage, posé ou remplacé.
        const schema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(x => ({ '@type': 'Question', name: texte(x.q), acceptedAnswer: { '@type': 'Answer', text: texte(x.a) } })) };
        const balise = `<script type="application/ld+json" id="seo-faq-lot19">${JSON.stringify(schema)}</script>`;
        if (/<script type="application\/ld\+json" id="seo-faq-lot19">[\s\S]*?<\/script>/.test(html)) {
          html = html.replace(/<script type="application\/ld\+json" id="seo-faq-lot19">[\s\S]*?<\/script>/, () => balise);
        } else if (html.includes('</head>')) {
          html = html.replace('</head>', () => `  ${balise}\n</head>`);
        } else avertir(`</head> absent de ${f}`);

        // Section « ce qu'il faut savoir » entre l'expertise et les réalisations.
        html = poserCss(html, 'guide-ville', CSS_GUIDE, f);
        html = poserBloc(html, 'guide-ville', blocGuide(t, d.contexte, nom, lang), '<section class="real-section">', f);
        ecrire(f, avant, html);
      }
    }
  }
}

passeVoisines();
passeServices();
passePastilles();
passeVague1();
console.log(`\n${dryRun ? 'Essai à blanc' : 'Terminé'} : ${stats.ecrits} fichier(s) ${dryRun ? 'à modifier' : 'modifié(s)'}, ${stats.inchanges} inchangé(s), ${stats.avertissements} avertissement(s).`);
if (stats.avertissements) process.exitCode = 1;
