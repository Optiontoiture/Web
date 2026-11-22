/*
 * Comportements communs des versions A, B et C de l'accueil en test
 * (`_ab/*.html`, 22 novembre 2026). L'accueil actuel (A0) garde ses scripts
 * à lui.
 *
 *   - menu du téléphone et de la tablette (#menuMobile) : dialogue modal,
 *     focus gardé dedans, Échap ferme et rend le focus au bouton Menu;
 *   - menus déroulants de l'ordinateur ([data-deroulant]) : bouton
 *     aria-expanded, Échap ou clic ailleurs ferme;
 *   - modale du formulaire (#formModal, #formIframe) : ouverte par tout
 *     élément [data-formulaire], même adresse que l'accueil actuel
 *     (esFormulaireUrl de formulaire-es.js), Échap ferme;
 *   - estimateur : Entrée dans #heroAddress envoie l'adresse, suggestions
 *     d'adresses Google chargées au premier focus (comme l'accueil actuel);
 *   - bandeau des témoins : même choix et même clé que l'accueil actuel
 *     (localStorage cookieConsent).
 */
(function () {
  var FOCUSABLES = 'a[href], button:not([disabled]), input:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

  function garderFocus(conteneur, e) {
    if (e.key !== 'Tab') return;
    var elements = Array.prototype.filter.call(conteneur.querySelectorAll(FOCUSABLES), function (el) {
      return el.getClientRects().length > 0;
    });
    if (!elements.length) return;
    var premier = elements[0];
    var dernier = elements[elements.length - 1];
    if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
    else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
  }

  /* ── Menu du téléphone et de la tablette ─────────────────────────── */
  var menu = document.getElementById('menuMobile');
  var boutonMenu = document.querySelector('[data-menu-ouvrir]');
  function fermerMenu(rendreFocus) {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    document.documentElement.classList.remove('menu-ouvert');
    if (boutonMenu) boutonMenu.setAttribute('aria-expanded', 'false');
    if (rendreFocus && boutonMenu) boutonMenu.focus();
  }
  function ouvrirMenu() {
    if (!menu) return;
    menu.hidden = false;
    document.documentElement.classList.add('menu-ouvert');
    if (boutonMenu) boutonMenu.setAttribute('aria-expanded', 'true');
    var fermer = menu.querySelector('[data-menu-fermer]');
    if (fermer) fermer.focus();
  }
  if (menu && boutonMenu) {
    boutonMenu.addEventListener('click', ouvrirMenu);
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { fermerMenu(true); return; }
      garderFocus(menu, e);
    });
    menu.addEventListener('click', function (e) {
      if (e.target === menu || (e.target.closest && e.target.closest('[data-menu-fermer]'))) { fermerMenu(true); return; }
      if (e.target.closest && e.target.closest('a')) fermerMenu(false);
    });
    // Un passage à l'ordinateur referme le menu du téléphone.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1024) fermerMenu(false);
    });
  }

  /* ── Menus déroulants de l'ordinateur ────────────────────────────── */
  var deroulants = document.querySelectorAll('[data-deroulant]');
  function fermerDeroulants(sauf) {
    Array.prototype.forEach.call(deroulants, function (d) {
      if (d === sauf) return;
      var b = d.querySelector('button');
      var panneau = d.querySelector('[data-panneau]');
      if (b) b.setAttribute('aria-expanded', 'false');
      if (panneau) panneau.hidden = true;
    });
  }
  Array.prototype.forEach.call(deroulants, function (d) {
    var b = d.querySelector('button');
    var panneau = d.querySelector('[data-panneau]');
    if (!b || !panneau) return;
    b.addEventListener('click', function () {
      var ouvert = b.getAttribute('aria-expanded') === 'true';
      fermerDeroulants(d);
      b.setAttribute('aria-expanded', ouvert ? 'false' : 'true');
      panneau.hidden = ouvert;
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panneau.hidden) { fermerDeroulants(); b.focus(); }
    });
    d.addEventListener('focusout', function (e) {
      if (e.relatedTarget && !d.contains(e.relatedTarget)) fermerDeroulants();
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('[data-deroulant]')) fermerDeroulants();
  });

  /* ── Modale du formulaire ────────────────────────────────────────── */
  var modale = document.getElementById('formModal');
  var cadre = document.getElementById('formIframe');
  var retourFocus = null;
  function fermerModale() {
    if (!modale || modale.style.display === 'none') return;
    modale.style.display = 'none';
    document.documentElement.classList.remove('modale-ouverte');
    if (retourFocus && retourFocus.focus) retourFocus.focus();
  }
  function ouvrirModale(source) {
    if (!modale || !cadre || typeof window.esFormulaireUrl !== 'function') return false;
    retourFocus = source || document.activeElement;
    cadre.src = window.esFormulaireUrl();
    modale.style.display = 'flex';
    document.documentElement.classList.add('modale-ouverte');
    var fermer = modale.querySelector('[data-modale-fermer]');
    if (fermer) fermer.focus();
    return true;
  }
  document.addEventListener('click', function (e) {
    var declencheur = e.target.closest ? e.target.closest('[data-formulaire]') : null;
    if (!declencheur) return;
    fermerMenu(false);
    // Sans formulaire chargé, le lien garde sa cible (#soumission).
    if (ouvrirModale(declencheur)) e.preventDefault();
  });
  if (modale) {
    modale.addEventListener('click', function (e) {
      if (e.target === modale || (e.target.closest && e.target.closest('[data-modale-fermer]'))) fermerModale();
    });
    modale.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { fermerModale(); return; }
      garderFocus(modale, e);
    });
  }

  /* ── Estimateur : Entrée et suggestions d'adresses ───────────────── */
  var adresse = document.getElementById('heroAddress');
  if (adresse) {
    adresse.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && typeof window.sendToCalc === 'function') { e.preventDefault(); window.sendToCalc(); }
    });
    var mapsCharge = false;
    window.initFloatAutocomplete = function () {
      if (!window.google || !google.maps || !google.maps.places) return;
      var ac = new google.maps.places.Autocomplete(adresse, {
        types: ['address'],
        componentRestrictions: { country: 'ca' },
        fields: ['formatted_address']
      });
      ac.addListener('place_changed', function () {
        var lieu = ac.getPlace();
        if (lieu && lieu.formatted_address) {
          adresse.value = lieu.formatted_address;
          if (typeof window.sendToCalc === 'function') window.sendToCalc();
        }
      });
    };
    adresse.addEventListener('focus', function () {
      if (mapsCharge) return;
      mapsCharge = true;
      var s = document.createElement('script');
      s.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCmWYFOj2tO_eEN0TgNZDavJoKqV2fsNrU&libraries=places&callback=initFloatAutocomplete';
      s.async = true;
      document.head.appendChild(s);
    }, { once: true });
  }

  /* ── Bandeau des témoins (même choix que l'accueil actuel) ───────── */
  // Le choix passe par otConsentement (posé dans <head> par
  // scripts/inject-consentement.js), qui met aussi à jour le mode
  // consentement de Google.
  function enregistrerChoix(c) {
    if (typeof window.otConsentement === 'function') { window.otConsentement(c); return; }
    try { window.localStorage.setItem('cookieConsent', c); } catch (erreur) {}
  }
  var bandeau = document.getElementById('cookie-banner');
  if (bandeau) {
    var choix = null;
    try { choix = window.localStorage.getItem('cookieConsent'); } catch (erreur) {}
    if (!choix) bandeau.hidden = false;
    bandeau.addEventListener('click', function (e) {
      var bouton = e.target.closest ? e.target.closest('[data-temoins]') : null;
      if (!bouton) return;
      enregistrerChoix(bouton.getAttribute('data-temoins'));
      bandeau.hidden = true;
    });
  }
  // A0 expose setCookieChoice; on le garde pour un script qui l'appellerait.
  window.setCookieChoice = function (c) {
    enregistrerChoix(c);
    if (bandeau) bandeau.hidden = true;
  };
})();
