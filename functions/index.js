/*
 * Répartition de l'accueil entre quatre versions (lot 8 du test de l'accueil,
 * 22 novembre 2026). LIVRÉE ÉTEINTE : tant que `actif` vaut false, `/` reste
 * exactement l'accueil actuel (A0), sauf l'aperçu `?ab=`.
 *
 * - Aperçu `/?ab=a0|a|b|c` : la version demandée, `X-Robots-Tag: noindex`,
 *   aucun témoin, `Cache-Control: private, no-cache`.
 * - Test actif : témoin `ot_ab` (90 jours) qui garde la version; sinon tirage
 *   selon les parts. Réponse `Cache-Control: private, no-cache`,
 *   `Vary: Cookie`, `X-OT-Version`; évènement `ab_exposition` injecté à la fin
 *   de <head>, APRÈS le consentement par défaut et le chargeur de Google Tag
 *   Manager (voir servir()). Google voit les versions en rotation comme les
 *   visiteurs (D9) : jamais de traitement à part pour les robots.
 * - Toute erreur sert A0.
 * - Jamais de règle `_headers` ou `_redirects` sur `/_ab/*` : les versions se
 *   lisent par env.ASSETS, et functions/_ab/[[chemin]].js écarte les visites
 *   directes.
 *
 * Couper le test : `actif: false` sur main (voir la fiche du plan).
 */
export const CONFIG = {
  id: 'accueil1',
  actif: false,
  temoin: 'ot_ab',
  dureeJours: 90,
  versions: {
    a0: { part: 25, chemin: null },
    a: { part: 25, chemin: '/_ab/a-chantier' },
    b: { part: 25, chemin: '/_ab/b-salon' },
    c: { part: 25, chemin: '/_ab/c-voisin' },
  },
};

// Tirage pur : `tirage` dans [0, 1). Rend le code de version.
export function choisirVersion(versions, tirage) {
  const codes = Object.keys(versions).filter((c) => versions[c].part > 0);
  const total = codes.reduce((s, c) => s + versions[c].part, 0);
  if (!total) return 'a0';
  let seuil = tirage * total;
  for (const c of codes) {
    seuil -= versions[c].part;
    if (seuil < 0) return c;
  }
  return codes[codes.length - 1];
}

export function lireTemoin(entete, nom) {
  const m = (entete || '').match(new RegExp('(?:^|;\\s*)' + nom + '=([a-z0-9]+)'));
  return m ? m[1] : null;
}

function tirer() {
  const t = new Uint32Array(1);
  crypto.getRandomValues(t);
  return t[0] / 4294967296;
}

async function servir(context, config, code, apercu) {
  const { request, env } = context;
  const chemin = config.versions[code].chemin || '/';
  const url = new URL(chemin, request.url);
  let reponse = await env.ASSETS.fetch(new Request(url.toString(), { method: request.method }));
  if (!reponse.ok && code !== 'a0') {
    code = 'a0';
    reponse = await env.ASSETS.fetch(new Request(new URL('/', request.url).toString(), { method: request.method }));
  }
  // Un aperçu porte ab_test 'apercu' sur tous ses évènements : la recette ne
  // se compte jamais dans les résultats du test.
  const test = apercu ? 'apercu' : config.id;
  const donnees = JSON.stringify({ event: 'ab_exposition', ab_test: test, ab_version: code });
  const script = `<script>window.OT_AB=${JSON.stringify({ test, version: code })};window.dataLayer=window.dataLayer||[];window.dataLayer.push(${donnees});</script>`;
  // À la fin de <head>, jamais en tête : le premier message de la couche de
  // données doit être le consentement par défaut (« denied »), posé juste
  // avant le chargeur GTM. Un `ab_exposition` placé avant lui faisait
  // s'initialiser GTM sans consentement connu, lu comme accordé : GA4
  // recevait page vue et exposition avant tout choix (aperçu GTM, 22 nov. 2026).
  // GTM traite les messages dans l'ordre, qu'il se charge avant ou après ce
  // script : l'exposition arrive toujours après le consentement.
  const transformee = new HTMLRewriter()
    .on('head', { element(el) { el.append(script, { html: true }); } })
    .transform(reponse);
  const finale = new Response(transformee.body, transformee);
  finale.headers.delete('ETag');
  finale.headers.set('Cache-Control', 'private, no-cache');
  finale.headers.set('Vary', 'Cookie');
  finale.headers.set('X-OT-Version', code);
  if (apercu) {
    finale.headers.set('X-Robots-Tag', 'noindex');
  } else if (lireTemoin(request.headers.get('Cookie'), config.temoin) !== code) {
    finale.headers.append('Set-Cookie', `${config.temoin}=${code}; Max-Age=${config.dureeJours * 86400}; Path=/; Secure; SameSite=Lax`);
  }
  return finale;
}

export async function onRequest(context) {
  const { request, next, env } = context;
  if (request.method !== 'GET' && request.method !== 'HEAD') return next();
  const config = CONFIG;
  const demande = new URL(request.url).searchParams.get('ab');
  const apercu = demande && Object.prototype.hasOwnProperty.call(config.versions, demande) ? demande : null;
  if (!apercu && !config.actif) return next();
  try {
    if (apercu) return await servir(context, config, apercu, true);
    const garde = lireTemoin(request.headers.get('Cookie'), config.temoin);
    const code = garde && config.versions[garde] && config.versions[garde].part > 0
      ? garde
      : choisirVersion(config.versions, tirer());
    return await servir(context, config, code, false);
  } catch (erreur) {
    return env.ASSETS.fetch(request);
  }
}
