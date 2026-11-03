// Bangermeter — welcome page script. MV3 forbids inline scripts on extension
// pages, so the welcome page's only behavior lives here: showing it in the
// user's language. It opens at install, before any visit to X, so Auto falls
// back to the browser's UI language (see resolvePageLanguage in i18n.js).
BANGERMETER_I18N.resolvePageLanguage(function () {});
