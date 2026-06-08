/**
 * Option Toiture — Call Tracking Google Ads
 * ==========================================
 * Détecte les visiteurs arrivant via une annonce Google (paramètre gclid)
 * et remplace le numéro entreprise par le numéro de tracking Google Ads.
 *
 * Numéro entreprise (défaut HTML) : 514-835-4820  →  tel:+15148354820
 * Numéro Google Ads (tracking)    : 450 700-6549  →  tel:+14507006549
 *
 * Les éléments à modifier doivent porter la classe "tracked-phone".
 * Le JSON-LD et les attributs non-href ne sont jamais modifiés.
 */

(function () {

  /* ── Configuration ─────────────────────────────────────────────── */
  var NUM_DEFAULT  = '514-835-4820';           // texte affiché par défaut
  var NUM_ADS      = '450 700-6549';      // texte affiché aux visiteurs Google Ads (espace insécable)
  var TEL_ADS      = 'tel:+14507006549';       // href pour les liens d'appel
  var STORAGE_KEY  = 'ot_ads_visitor';         // clé localStorage
  var DURATION_MS  = 90 * 24 * 60 * 60 * 1000; // 90 jours en ms

  /* ── 1. Détection du paramètre gclid dans l'URL ────────────────── */
  function hasGclid() {
    try {
      return new URLSearchParams(window.location.search).has('gclid');
    } catch (e) {
      return window.location.search.indexOf('gclid=') !== -1;
    }
  }

  /* ── 2. Lecture / écriture de l'état visiteur Google Ads ────────── */
  function getAdsState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      if (data && data.expiry && Date.now() < data.expiry) return true;
      localStorage.removeItem(STORAGE_KEY); // entrée expirée, on nettoie
      return false;
    } catch (e) {
      return false;
    }
  }

  function setAdsState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        isAds: true,
        expiry: Date.now() + DURATION_MS
      }));
    } catch (e) {
      // localStorage indisponible (mode privé strict, etc.) — pas bloquant
    }
  }

  /* ── 3. Remplacement des numéros visibles ──────────────────────── */
  function swapPhoneNumbers() {

    // 3a. Tous les éléments portant la classe "tracked-phone"
    var links = document.querySelectorAll('.tracked-phone');
    for (var i = 0; i < links.length; i++) {
      var el = links[i];

      // Remplacer le href sur les liens <a>
      if (el.tagName === 'A') {
        el.setAttribute('href', TEL_ADS);
      }

      // Remplacer le numéro dans le texte visible (seulement si le numéro y figure)
      if (el.textContent.indexOf(NUM_DEFAULT) !== -1) {
        el.textContent = el.textContent.replace(NUM_DEFAULT, NUM_ADS);
      }
    }

    // 3b. Numéros en texte brut dans le <body> (sections process, FAQ, etc.)
    // On utilise un TreeWalker pour parcourir les nœuds texte sans toucher
    // aux balises <script>, <style> et aux attributs non-affichés.
    var walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          // Ignorer le contenu des balises script/style/noscript
          var parent = node.parentNode;
          if (!parent) return NodeFilter.FILTER_REJECT;
          var tag = parent.nodeName.toUpperCase();
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
            return NodeFilter.FILTER_REJECT;
          }
          // N'accepter que les nœuds qui contiennent le numéro entreprise
          return node.nodeValue && node.nodeValue.indexOf(NUM_DEFAULT) !== -1
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      },
      false
    );

    var textNodes = [];
    var n;
    while ((n = walker.nextNode())) {
      textNodes.push(n);
    }

    // Modifier après la collecte (ne pas altérer le walker en cours de route)
    for (var j = 0; j < textNodes.length; j++) {
      textNodes[j].nodeValue = textNodes[j].nodeValue.replace(
        new RegExp(NUM_DEFAULT.replace(/-/g, '[\\s\\-]'), 'g'),
        NUM_ADS
      );
    }
  }

  /* ── 4. Initialisation ─────────────────────────────────────────── */

  // Si gclid présent dans l'URL → mémoriser pour 90 jours
  if (hasGclid()) {
    setAdsState();
  }

  // Si le visiteur est identifié comme venant d'une pub → remplacer les numéros
  if (getAdsState()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', swapPhoneNumbers);
    } else {
      // DOM déjà prêt (script chargé en fin de <body>)
      swapPhoneNumbers();
    }
  }

})();
