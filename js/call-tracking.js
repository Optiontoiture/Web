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
  var STORAGE_KEY  = 'ot_ads_visitor';         // clé sessionStorage

  /* ── 1. Détection visiteur Google Ads dans l'URL ───────────────── */
  // Détecte gclid (clic direct sur annonce) ou paramètres UTM Google CPC
  function hasAdsParams() {
    try {
      var p = new URLSearchParams(window.location.search);
      return p.has('gclid') ||
             (p.get('utm_source') === 'google' && p.get('utm_medium') === 'cpc') ||
             p.get('utm_medium') === 'cpc';
    } catch (e) {
      var s = window.location.search;
      return s.indexOf('gclid=') !== -1 ||
             (s.indexOf('utm_source=google') !== -1 && s.indexOf('utm_medium=cpc') !== -1);
    }
  }

  /* ── 2. Lecture / écriture de l'état visiteur Google Ads ────────── */
  // On utilise sessionStorage : l'état ne dure QUE la session de navigation
  // en cours (survit au passage d'une page à l'autre, mais disparaît dès que
  // le visiteur ferme l'onglet). Ainsi un visiteur pub voit le numéro de
  // tracking pendant toute sa visite, mais s'il revient plus tard en direct
  // ou par Google naturel, il retrouve le numéro entreprise — les stats de
  // pub ne sont pas faussées.
  function getAdsState() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function setAdsState() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      // sessionStorage indisponible (mode privé strict, etc.) — pas bloquant
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

  // Nettoyage : efface l'ancienne clé localStorage 90 jours des versions
  // précédentes, pour ne pas laisser traîner un état pub périmé.
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}

  // Si paramètres Google Ads présents → mémoriser pour la session en cours
  if (hasAdsParams()) {
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
