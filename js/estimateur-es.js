/*
 * Estimateur de toiture d'Espace Soumission (5 novembre 2026).
 *
 * Remplace le calculateur d'Optime (app.optiontoiture.com/calculateur) dans la
 * section « Soumission instantanée » des pages qui portent la recherche
 * d'adresse du héros (« Obtenez votre estimation instantanée »). Le cadre
 * `#optime-calc` reçoit la page publique de l'estimateur d'Espace Soumission,
 * avec l'adresse tapée, la langue de la page, le clic publicitaire et les utm,
 * par la même adresse que le formulaire (`esFormulaireUrl` de
 * formulaire-es.js). La hauteur du cadre et la conversion `form_conversion`
 * passent par l'écoute de formulaire-es.js.
 *
 * Tant que JETON est vide, rien ne change : le calculateur d'Optime reste.
 * Le jeton se copie dans Espace Soumission : Paramètres > Portail client >
 * Estimateur de toiture du site, une fois l'estimateur allumé.
 */
(function () {
  var JETON = 'option-toiture-inc-4ad4a27f.347d70ba-1564-488a-b6c3-f7791dd59a2e.uqaVnb3gXLp5jn8ZakWmbUhD';
  if (!JETON || typeof window.esFormulaireUrl !== 'function') return;

  function estimateurUrl(adresse) {
    var url = new URL(window.esFormulaireUrl());
    url.pathname = '/estimateur/' + encodeURIComponent(JETON);
    url.searchParams.set('search', String(adresse).slice(0, 240));
    return url.toString();
  }

  window.sendToCalc = function () {
    var champ = document.getElementById('heroAddress');
    var section = document.getElementById('calculateur');
    var cadre = document.getElementById('optime-calc');
    if (!champ || !section || !cadre) return;
    var adresse = champ.value.trim();
    if (!adresse) { champ.focus(); return; }
    section.style.display = 'block';
    cadre.setAttribute('data-es-estimateur', '1');
    cadre.style.minHeight = '560px';
    cadre.src = estimateurUrl(adresse);
    setTimeout(function () { section.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300);
  };
})();
