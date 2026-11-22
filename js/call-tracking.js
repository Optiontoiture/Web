/**
 * Option Toiture — Call Tracking Google Ads
 * ==========================================
 * Détecte les visiteurs arrivant via une annonce Google (paramètre gclid)
 * et remplace le numéro entreprise par le numéro de tracking Google Ads.
 *
 * Numéro entreprise (défaut HTML) : 514-835-4820 ou 514 835-4820  →  tel:+15148354820
 * Numéro Google Ads (tracking)    : 450 700-6549  →  tel:+14507006549
 *
 * Les éléments à modifier doivent porter la classe "tracked-phone".
 * Le JSON-LD et les attributs non-href ne sont jamais modifiés.
 */

(function () {

  /* ── Configuration ─────────────────────────────────────────────── */
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
  // Le numéro entreprise s'écrit « 514-835-4820 » sur les pages actuelles et
  // « 514 835-4820 » (espace, parfois insécable) sur les versions de l'accueil
  // en test (22 novembre 2026) : les deux formes sont reconnues.
  var NUM_MOTIF = /514[\s \-]835[\s \-]4820/g;

  function contientNumero(texte) {
    NUM_MOTIF.lastIndex = 0;
    return !!texte && NUM_MOTIF.test(texte);
  }

  // Remplace le numéro dans les nœuds texte sous `racine`, sans toucher aux
  // balises script/style/noscript ni aux éléments enfants (icônes, <span>).
  function remplacerTextes(racine) {
    var walker = document.createTreeWalker(
      racine,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          var parent = node.parentNode;
          if (!parent) return NodeFilter.FILTER_REJECT;
          var tag = parent.nodeName.toUpperCase();
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
            return NodeFilter.FILTER_REJECT;
          }
          return contientNumero(node.nodeValue)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      },
      false
    );

    // Modifier après la collecte (ne pas altérer le walker en cours de route)
    var textNodes = [];
    var n;
    while ((n = walker.nextNode())) {
      textNodes.push(n);
    }
    for (var j = 0; j < textNodes.length; j++) {
      NUM_MOTIF.lastIndex = 0;
      textNodes[j].nodeValue = textNodes[j].nodeValue.replace(NUM_MOTIF, NUM_ADS);
    }
  }

  function swapPhoneNumbers() {
    // 3a. Liens d'appel portant la classe "tracked-phone"
    var links = document.querySelectorAll('.tracked-phone');
    for (var i = 0; i < links.length; i++) {
      if (links[i].tagName === 'A') {
        links[i].setAttribute('href', TEL_ADS);
      }
    }

    // 3b. Numéros visibles dans tout le <body> (liens, sections, FAQ, etc.)
    remplacerTextes(document.body);
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
