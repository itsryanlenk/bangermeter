// Bangermeter — UI strings: English keys, Japanese table, static-page translator.
// Loaded before content.js, popup.js and welcome.js (same isolated world).
//
// English stays in the code as the key: t("Show the math"). A string with no
// Japanese entry renders in English, so a label X adds next week still shows
// up, just untranslated, and a reworded English line never shows stale
// Japanese. Values go in as {named} placeholders, never concatenated, because
// Japanese word order differs.
//
// The Japanese is sysCat's (@sysCat64), from sysCat64/bangermeter-ja at
// f989ddc, used under this repository's MIT license (their fork keeps it).
// JA holds Japanese a native speaker wrote or reviewed and is the only table
// t() reads. JA_DRAFT holds Japanese nobody has reviewed yet; it is never
// served and moves into JA after review. Code names stay as written inside
// Japanese: param.rs, file paths, ×0.75, head names.

var BANGERMETER_I18N = (function () {
  "use strict";

  var JA = {};

  var JA_DRAFT = {};

  // Text that stays English on purpose: the weights.js note/why prose, the
  // "About these scores" history and the Community Note citations. X rewrites
  // them most weeks. Only store-assets/i18n-coverage.js reads this list, to
  // keep them off its missing report. Seeded from sysCat's tier C.
  var KEEP_ENGLISH = [
    /^Weights: /, /kept in sync with/, /live production configuration/,
    /as current rather than historical/, /weighted sum modeled here/, /dwell-regret/,
    /switch that chose between them/, /not predicted reach/, /existed in the same code/,
    /when X deleted them/, /^Community Note effect sourced from/, /^diversity_multiplier\(/
  ];

  var lang = "en";

  function setLanguage(l) { lang = l === "ja" ? "ja" : "en"; }
  function getLanguage() { return lang; }

  // One pass with a function replacer: substituted text is never rescanned,
  // and "$&" or "$1" in a value stays literal.
  function fill(s, params) {
    if (!params) return s;
    return s.replace(/\{(\w+)\}/g, function (whole, name) {
      return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole;
    });
  }

  function t(english, params) {
    var s = english;
    if (lang === "ja" && Object.prototype.hasOwnProperty.call(JA, english)) s = JA[english];
    return fill(s, params);
  }

  function placeholdersOf(s) {
    var seen = {};
    (String(s).match(/\{(\w+)\}/g) || []).forEach(function (p) { seen[p.slice(1, -1)] = true; });
    return Object.keys(seen).sort();
  }

  function isJa(tag) { return typeof tag === "string" && /^ja(-|$)/i.test(tag); }

  // override: the popup setting. Auto follows X's <html lang>; the browser
  // language decides only when that attribute is missing or empty.
  function resolveLanguage(override, htmlLang, navLang) {
    if (override === "en" || override === "ja") return override;
    if (htmlLang) return isJa(htmlLang) ? "ja" : "en";
    return isJa(navLang) ? "ja" : "en";
  }

  var ATTRS = ["title", "aria-label", "placeholder"];

  function lookup(text) {
    var key = text.replace(/\s+/g, " ").trim();
    if (!key || !Object.prototype.hasOwnProperty.call(JA, key)) return null;
    return JA[key];
  }

  // Translates a static page in place: every text node and the title,
  // aria-label and placeholder attributes under root. Whitespace around a
  // text node survives, so inline markup keeps its spacing.
  function translateStatic(root) {
    if (lang !== "ja" || !root) return;
    var walker = root.ownerDocument.createTreeWalker(root, 1 | 4); // elements + text
    var node = walker.currentNode;
    while (node) {
      if (node.nodeType === 3) {
        var parent = node.parentNode && node.parentNode.nodeName;
        if (parent !== "SCRIPT" && parent !== "STYLE") {
          var ja = lookup(node.nodeValue);
          if (ja !== null) {
            var m = node.nodeValue.match(/^(\s*)[\s\S]*?(\s*)$/);
            node.nodeValue = m[1] + ja + m[2];
          }
        }
      } else if (node.nodeType === 1) {
        ATTRS.forEach(function (a) {
          if (!node.hasAttribute(a)) return;
          var ja = lookup(node.getAttribute(a));
          if (ja !== null) node.setAttribute(a, ja);
        });
      }
      node = walker.nextNode();
    }
  }

  return {
    t: t, setLanguage: setLanguage, getLanguage: getLanguage,
    resolveLanguage: resolveLanguage, translateStatic: translateStatic,
    placeholdersOf: placeholdersOf,
    JA: JA, JA_DRAFT: JA_DRAFT, KEEP_ENGLISH: KEEP_ENGLISH
  };
})();
