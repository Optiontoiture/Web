/*
 * Mesures de l'accueil d'Option Toiture (22 novembre 2026, lot 3 du test de
 * l'accueil).
 *
 * Pousse dans le dataLayer de Google Tag Manager les gestes qui disent si
 * l'accueil fait son travail, quelle que soit la version affichée (A0, A, B
 * ou C) :
 *   - clic_telephone    : un lien tel: touché (lien_texte, lien_zone);
 *   - clic_navigation   : un lien vers une autre page du site (lien_url, lien_zone);
 *   - formulaire_ouvert : la modale du formulaire (#formModal) s'ouvre;
 *   - defilement        : 25, 50, 75 et 90 % de la page atteints (pourcentage);
 * et, depuis estimateur-es.js, `estimateur_utilise` quand une adresse est
 * envoyée à l'estimateur.
 *
 * Chaque évènement porte `ab_test` et `ab_version` quand la répartition de
 * l'accueil (functions/index.js) a choisi une version : lus dans
 * window.OT_AB, injecté par la répartition (ab_test vaut 'apercu' sous
 * `?ab=`). Sans test en cours, ils valent '' et l'évènement part quand même.
 *
 * La configuration GTM et GA4 (variable, déclencheur, balise, dimensions) se
 * fait dans les consoles, avec le propriétaire : rien ici n'en dépend.
 */
(function () {
  if (window.otMesure) return;

  function version() {
    // Seule la répartition dit quelle version la page montre : un témoin
    // `ot_ab` resté d'un test arrêté ne doit rien étiqueter.
    var ab = window.OT_AB;
    if (ab && ab.version) return { ab_test: ab.test || '', ab_version: ab.version };
    return { ab_test: '', ab_version: '' };
  }

  // Pousse un évènement avec la version vue; ne lève jamais d'erreur.
  window.otMesure = function (evenement, parametres) {
    try {
      var donnees = { event: evenement };
      var v = version();
      donnees.ab_test = v.ab_test;
      donnees.ab_version = v.ab_version;
      if (parametres) {
        for (var cle in parametres) {
          if (Object.prototype.hasOwnProperty.call(parametres, cle)) donnees[cle] = parametres[cle];
        }
      }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(donnees);
    } catch (erreur) {}
  };

  // Zone de la page d'où part un clic : en-tête, menu, pied, ou section.
  function zone(el) {
    var parent = el.closest('header, nav, footer, [role="dialog"], section, figure, aside');
    if (!parent) return 'page';
    if (parent.id) return parent.id;
    if (parent.tagName === 'HEADER') return 'entete';
    if (parent.tagName === 'FOOTER') return 'pied';
    if (parent.tagName === 'NAV') return parent.getAttribute('aria-label') || 'nav';
    return (parent.className && String(parent.className).split(' ')[0]) || parent.tagName.toLowerCase();
  }

  document.addEventListener('click', function (e) {
    var lien = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!lien) return;
    var href = lien.getAttribute('href') || '';
    var texte = (lien.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (href.indexOf('tel:') === 0) {
      window.otMesure('clic_telephone', { lien_texte: texte, lien_zone: zone(lien) });
      return;
    }
    if (href.charAt(0) === '#' || href.indexOf('javascript:') === 0) return;
    var url;
    try { url = new URL(href, window.location.href); } catch (erreur) { return; }
    if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
    window.otMesure('clic_navigation', { lien_url: url.pathname, lien_texte: texte, lien_zone: zone(lien) });
  }, true);

  // La modale du formulaire s'ouvre en passant de display:none à visible,
  // quel que soit le bouton (accueil actuel ou versions du test).
  function surveillerModale() {
    var modale = document.getElementById('formModal');
    if (!modale || !window.MutationObserver) return;
    var ouverte = false;
    new MutationObserver(function () {
      var visible = modale.style.display !== 'none' && !modale.hidden;
      if (visible && !ouverte) window.otMesure('formulaire_ouvert');
      ouverte = visible;
    }).observe(modale, { attributes: true, attributeFilter: ['style', 'hidden'] });
  }

  var paliers = [25, 50, 75, 90];
  var atteints = {};
  var attente = false;
  function mesurerDefilement() {
    if (attente) return;
    attente = true;
    window.requestAnimationFrame(function () {
      attente = false;
      var hauteur = document.documentElement.scrollHeight - window.innerHeight;
      if (hauteur <= 0) return;
      var pct = (window.scrollY / hauteur) * 100;
      for (var i = 0; i < paliers.length; i++) {
        if (pct >= paliers[i] && !atteints[paliers[i]]) {
          atteints[paliers[i]] = true;
          window.otMesure('defilement', { pourcentage: paliers[i] });
        }
      }
    });
  }
  window.addEventListener('scroll', mesurerDefilement, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', surveillerModale);
  } else {
    surveillerModale();
  }
})();
