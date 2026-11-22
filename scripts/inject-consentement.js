#!/usr/bin/env node
/*
 * Consentement aux témoins (lot 4 du plan du site, 22 novembre 2026).
 *
 * Sur chaque page HTML qui charge Google Tag Manager :
 *   1. pose, juste avant GTM, le mode consentement de Google : tout est
 *      « denied » par défaut, puis « granted » si le visiteur a déjà accepté
 *      (localStorage.cookieConsent === 'accepted'). Un visiteur qui a refusé
 *      ne fait partir aucune balise du conteneur (gtm.blocklist, lu par GTM à
 *      son chargement) : pas même les pings sans témoin du mode avancé;
 *   2. définit window.otConsentement(choix), appelé par « Accepter » et
 *      « Refuser » : il garde le choix, met le consentement à jour et pousse
 *      `consentement_accepte` ou `consentement_refuse` dans le dataLayer;
 *   3. branche setCookieChoice (bandeau des pages) sur otConsentement;
 *   4. remplace le texte du bandeau, qui présumait l'accord (« En continuant,
 *      vous acceptez »), par une question, en français et en anglais.
 *
 * Idempotent : une page déjà traitée n'est pas modifiée. Les fins de ligne
 * de chaque fichier sont gardées.
 *
 * Contrôle d'ordre (22 novembre 2026, après Optiontoiture/Web#24) : dans
 * chaque page, le bloc de consentement doit précéder le chargeur GTM, les
 * deux dans <head>, et aucun `ab_exposition` ne doit les devancer. Pour la
 * répartition de l'accueil (functions/index.js), le script `ab_exposition`
 * doit être ajouté à la FIN de <head> (`.append`), jamais en tête : sinon GTM
 * s'initialise sans consentement connu, lu comme accordé, et GA4 reçoit des
 * données avant tout choix. Un écart fait sortir le script en erreur.
 *
 *   node scripts/inject-consentement.js          (écrit)
 *   node scripts/inject-consentement.js --verif  (compte, n'écrit rien)
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');
const VERIF = process.argv.includes('--verif');
const EXCLUS = new Set(['node_modules', '.git', '.claude', '.wrangler']);

const MARQUE = 'window.otConsentement=function';
const ACCORD = "ad_storage:v,ad_user_data:v,ad_personalization:v,analytics_storage:v";
const CONSENTEMENT =
  '<!-- Consentement Google : refusé par défaut, avant Google Tag Manager (scripts/inject-consentement.js) -->' +
  "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}" +
  "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});" +
  "gtag('set','ads_data_redaction',true);" +
  "(function(){var c=null;try{c=localStorage.getItem('cookieConsent');}catch(e){}" +
  "if(c==='accepted')gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});" +
  "if(c==='refused')dataLayer.push({'gtm.blocklist':['google','customScripts','customPixels','nonGoogleScripts','nonGooglePixels','nonGoogleIframes']});})();" +
  MARQUE + "(c){try{localStorage.setItem('cookieConsent',c);}catch(e){}" +
  "var v=c==='accepted'?'granted':'denied';gtag('consent','update',{" + ACCORD + "});" +
  "dataLayer.push({event:v==='granted'?'consentement_accepte':'consentement_refuse'});};</script>";

// Un bloc de consentement déjà posé, quelle que soit sa version.
const BLOC = /<!-- Consentement Google : [^>]*-->\s*<script>window\.dataLayer=window\.dataLayer\|\|\[\];function gtag\(\)[\s\S]*?<\/script>/;

// Le chargeur de GTM, précédé ou non de son commentaire.
const GTM = /(<!-- Google Tag Manager -->\r?\n)?<script>\(function\(w,d,s,l,i\)\{/;

// setCookieChoice(c) des pages : garder le choix ET mettre le consentement à jour.
const ANCIEN_CHOIX_RE = /localStorage\.setItem\('cookieConsent',c\);(\r?\n\s*document\.getElementById\('cookie-banner'\))/;
const NOUVEAU_CHOIX = "if(window.otConsentement){otConsentement(c);}else{try{localStorage.setItem('cookieConsent',c);}catch(e){}}$1";

const TEXTES = [
  [
    'Nous utilisons des cookies pour améliorer votre expérience. En continuant, vous acceptez leur utilisation.',
    "Nous aimerions utiliser des témoins (cookies) pour mesurer la fréquentation du site et l'efficacité de nos publicités. Les acceptez-vous? Vous pourrez changer d'avis en tout temps.",
  ],
  [
    'We use cookies to improve your experience. By continuing, you agree to their use.',
    'We would like to use cookies to measure site traffic and the performance of our ads. Do you accept them? You can change your mind at any time.',
  ],
];

function pages(dossier, liste = []) {
  for (const nom of fs.readdirSync(dossier)) {
    if (EXCLUS.has(nom)) continue;
    const chemin = path.join(dossier, nom);
    const info = fs.statSync(chemin);
    if (info.isDirectory()) pages(chemin, liste);
    else if (nom.endsWith('.html')) liste.push(chemin);
  }
  return liste;
}

// Rend la raison d'un ordre fautif dans une page, ou null si l'ordre est bon :
// consentement, puis chargeur GTM, les deux avant </head>, et aucun
// `ab_exposition` avant le chargeur.
function ordreFautif(html) {
  const consentement = html.indexOf(MARQUE);
  const gtm = html.indexOf("'gtm.start'");
  const finHead = html.search(/<\/head>/i);
  const exposition = html.indexOf('ab_exposition');
  if (consentement < 0) return 'consentement absent';
  if (consentement > gtm) return 'consentement après le chargeur GTM';
  if (finHead >= 0 && gtm > finHead) return 'chargeur GTM hors de <head>';
  if (exposition >= 0 && exposition < gtm) return 'ab_exposition avant le chargeur GTM';
  return null;
}

// La répartition (functions/index.js) doit ajouter son script à la fin de
// <head> : `.append`, jamais `.prepend`.
function repartitionFautive() {
  const fichier = path.join(RACINE, 'functions', 'index.js');
  if (!fs.existsSync(fichier)) return null;
  const code = fs.readFileSync(fichier, 'utf8');
  const tete = code.match(/\.on\(\s*['"]head['"][\s\S]*?\.(prepend|append)\(/);
  if (!tete) return "functions/index.js : gestionnaire de <head> introuvable";
  if (tete[1] !== 'append') return "functions/index.js : le script ab_exposition doit être ajouté par .append (fin de <head>)";
  return null;
}

const bilan = { pages: 0, consentement: 0, misAJour: 0, deja: 0, choix: 0, textes: 0, sansGtm: [], ordre: [] };
for (const fichier of pages(RACINE)) {
  const avant = fs.readFileSync(fichier, 'utf8');
  if (!avant.includes("'gtm.start'")) continue;
  bilan.pages++;
  let s = avant;
  if (s.includes(MARQUE)) {
    const pose = s.match(BLOC);
    if (pose && pose[0] !== CONSENTEMENT) { s = s.replace(BLOC, () => CONSENTEMENT); bilan.misAJour++; }
    else bilan.deja++;
  } else if (GTM.test(s)) {
    s = s.replace(GTM, (m) => CONSENTEMENT + (m.startsWith('<!--') ? (m.includes('\r\n') ? '\r\n' : '\n') : '') + m);
    bilan.consentement++;
  } else {
    bilan.sansGtm.push(path.relative(RACINE, fichier));
  }
  if (ANCIEN_CHOIX_RE.test(s)) { s = s.replace(ANCIEN_CHOIX_RE, NOUVEAU_CHOIX); bilan.choix++; }
  for (const [ancien, nouveau] of TEXTES) {
    if (s.includes(ancien)) { s = s.split(ancien).join(nouveau); bilan.textes++; }
  }
  if (s !== avant && !VERIF) fs.writeFileSync(fichier, s, 'utf8');
  // L'ordre se juge sur la page telle qu'elle est (--verif) ou sera écrite.
  const raison = ordreFautif(VERIF ? avant : s);
  if (raison) bilan.ordre.push(path.relative(RACINE, fichier) + ' : ' + raison);
}
const repartition = repartitionFautive();
if (repartition) bilan.ordre.push(repartition);
console.log(JSON.stringify(bilan, null, 2));
if (bilan.sansGtm.length || bilan.ordre.length) process.exitCode = 1;
