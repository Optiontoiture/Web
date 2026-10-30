/*
 * Formulaire « Recevoir mon portail » d'Espace Soumission (30 octobre 2026).
 *
 * Remplace le formulaire d'Optime (app.optiontoiture.com/formulaire). Le cadre
 * reçoit la langue de la page, le clic publicitaire (gclid / gbraid, lu aussi
 * dans le témoin de Google quand le visiteur a changé de page) et les utm,
 * pour que la carte du lead porte sa campagne. Chaque envoi pousse
 * l'évènement `form_conversion` dans le dataLayer de Google Tag Manager.
 * Le formulaire se règle dans Espace Soumission : Paramètres > Portail client
 * > Formulaire du site.
 */
(function () {
  var ORIGIN = 'https://mon.espacesoumission.com';
  var FORM = ORIGIN + '/formulaire/option-toiture-inc-4ad4a27f.2ad2fc0f-05a1-40d5-b92b-8c7f3386fdbb.EM3uUIBz3Kmw7fqAUu3DIUzT';
  var AD_PARAMS = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  function cookieClick(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]).split('.').slice(2).join('.') : '';
  }

  window.esFormulaireUrl = function () {
    var url = new URL(FORM);
    var host = new URLSearchParams(window.location.search);
    AD_PARAMS.forEach(function (name) {
      var value = host.get(name);
      if (value) url.searchParams.set(name, value);
    });
    if (!url.searchParams.get('gclid') && cookieClick('_gcl_aw')) url.searchParams.set('gclid', cookieClick('_gcl_aw'));
    if (!url.searchParams.get('gbraid') && cookieClick('_gcl_gb')) url.searchParams.set('gbraid', cookieClick('_gcl_gb'));
    if (document.referrer) url.searchParams.set('ref', document.referrer);
    url.searchParams.set('page', window.location.origin + window.location.pathname);
    var lang = (document.documentElement.lang || '').slice(0, 2);
    if (lang === 'en' || lang === 'fr') url.searchParams.set('lang', lang);
    return url.toString();
  };

  // Les cadres intégrés dans la page (sans modale) se chargent au chargement.
  document.addEventListener('DOMContentLoaded', function () {
    var frames = document.querySelectorAll('iframe[data-es-formulaire]');
    for (var i = 0; i < frames.length; i++) frames[i].src = window.esFormulaireUrl();
  });

  window.addEventListener('message', function (event) {
    if (event.origin !== ORIGIN || !event.data) return;
    if (event.data.type === 'espace-soumission:lead-submitted') {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'form_conversion' });
    }
    if (event.data.type === 'espace-soumission:height' && event.data.height > 0) {
      var frames = document.getElementsByTagName('iframe');
      for (var i = 0; i < frames.length; i++) {
        if (frames[i].contentWindow === event.source) frames[i].style.height = Math.ceil(event.data.height) + 'px';
      }
    }
  });
})();
