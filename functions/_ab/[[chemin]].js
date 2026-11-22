/*
 * Les versions en test de l'accueil (`/_ab/*`) ne se visitent pas
 * directement : functions/index.js les lit par env.ASSETS et les sert à `/`.
 * Une visite directe repart vers l'accueil, sans indexation (22 novembre 2026).
 */
export function onRequest(context) {
  return new Response(null, {
    status: 302,
    headers: { Location: new URL('/', context.request.url).toString(), 'X-Robots-Tag': 'noindex', 'Cache-Control': 'no-store' },
  });
}
