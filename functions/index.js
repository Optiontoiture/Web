/*
 * Répartition de l'accueil entre quatre versions (lot 8 du test de l'accueil,
 * 22 novembre 2026). LIVRÉE ÉTEINTE : tant que `actif` vaut false, `/` reste
 * exactement l'accueil actuel (A0), sauf l'aperçu `?ab=`.
 *
 * - Aperçu `/?ab=a0|a|b|c` : la version demandée, `X-Robots-Tag: noindex`,
 *   aucun témoin, `Cache-Control: private, no-cache`.
 * - Test actif : témoin `ot_ab` (90 jours) qui garde la version; sinon tirage
 *   selon les parts. Réponse `Cache-Control: private, no-cache`,
 *   `Vary: Cookie`, `X-OT-Version`; évènement `ab_exposition` injecté en tête
 *   de <head>, avant Google Tag Manager. Google voit les versions en rotation
 *   comme les visiteurs (D9) : jamais de traitement à part pour les robots.
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
  const donnees = JSON.stringify({ event: 'ab_exposition', ab_test: config.id, ab_version: code, ab_apercu: apercu });
  const script = `<script>window.OT_AB=${JSON.stringify({ test: config.id, version: code })};window.dataLayer=window.dataLayer||[];window.dataLayer.push(${donnees});</script>`;
  const transformee = new HTMLRewriter()
    .on('head', { element(el) { el.prepend(script, { html: true }); } })
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
