// Bangermeter — background service worker.
//
// Exists for exactly one reason: a fresh install should say what to do next.
// Until this file, installing completed in silence — no page, no prompt — and
// the popup opened on a settings panel whose first tooltip names a Rust
// constant. A user who had not already read the README had nothing to go on.
// That was the substance of the first real piece of outside feedback.
//
// Deliberately minimal: one listener, no alarms, no tab tracking, no network.
// chrome.tabs.create needs no "tabs" permission — that permission gates
// READING a tab's url/title, not opening one — so the manifest still asks for
// storage and nothing else.

chrome.runtime.onInstalled.addListener(function (details) {
  // "install" only. Chrome fires this same event with reason "update" on every
  // store push and "chrome_update" on browser updates; opening a tab for those
  // would mean the extension steals focus from whatever the user was doing,
  // repeatedly, forever.
  if (details.reason !== "install") return;

  chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
});
