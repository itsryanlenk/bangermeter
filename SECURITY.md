# Security Policy

## Supported versions

Only the latest release is supported. Bangermeter has no server component — it is a
content script that runs entirely in your browser on x.com / twitter.com, plus a
service worker whose only job is to open a local quick-start page on first install.

| Version | Supported |
|---------|-----------|
| 0.10.x  | ✅        |
| < 0.5   | ❌        |

## Scope

Things that would qualify as a vulnerability here:

- Script injection / XSS through tweet content, aria-labels, or any page-controlled
  string reaching the injected UI (all dynamic text is set via `textContent` by design;
  the only `innerHTML` sinks are hardcoded static SVG icon strings)
- Any network request (the extension makes none — no fetch, no beacons, no remote fonts)
- Permission escalation beyond the declared `storage` permission and
  x.com / twitter.com content-script matches (the service worker adds no permission:
  `chrome.tabs.create` gates on nothing, and it opens only an extension-local URL)
- Leakage of browsing data out of the page context

## Reporting a vulnerability

Please use **GitHub's private vulnerability reporting**: go to the repository's
**Security** tab → **Report a vulnerability**. Do not open a public issue for
security reports.

You can expect an acknowledgement within a few days. Fixes ship as a new release;
reporters get credit in the release notes unless they prefer otherwise.
