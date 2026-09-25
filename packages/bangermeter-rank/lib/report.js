"use strict";
// Customer account-audit report (handoff §8 test 4): winners and at least one
// miss, the C-is-not-a-forecast hedge, the param.rs sync stamp, and the
// "what traveled" associations with their no-control caveat (test 10).
//
// Self-contained HTML with print CSS. `--pdf` in the CLI prints it through a
// local headless Chrome/Edge; nothing is uploaded anywhere.
//
// Research figures come only from receipts.fmt(), which throws on an unknown
// id — the Numbers Gate at build time. Sections holding research carry
// data-research so researchText() can hand exactly that prose to the gate.
const receipts = require("./receipts");
const copy = require("./copy");
const { K } = require("./rank");

const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pct = v => v == null ? "—" : (v * 100).toFixed(2) + "%";
const int = v => v == null ? "—" : Number(v).toLocaleString("en-US");
const R = id => receipts.fmt(id);

function snippet(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length > 140 ? t.slice(0, 139) + "…" : t;
}

function checklistCell(card) {
  if (!card.C.modifiers.length) return '<span class="muted">no modifiers fired</span>';
  return card.C.modifiers.map(m =>
    '<span class="chip ' + (m.provenance === "estimate" ? "est" : "pub") + '">' + esc(m.label) +
    ' <small>' + esc(m.provenance) + '</small></span>').join(" ");
}

function row(r) {
  const c = r.card;
  const link = c.url ? '<a href="' + esc(c.url) + '">' + esc(snippet(c.text)) + "</a>" : esc(snippet(c.text));
  const eCell = r.reportE ? c.E.score.toFixed(0) : '<span class="muted">not used under ' + int(K) + " views</span>";
  return '<tr data-id="' + esc(c.id) + '">' +
    "<td>" + r.rank + "</td>" +
    "<td>" + link + "</td>" +
    "<td>" + esc(c.band) + "</td>" +
    "<td>" + int(c.views) + "</td>" +
    "<td>" + pct(c.rates.like) + "</td>" +
    "<td>" + pct(r.bandLikeRateP50) + "</td>" +
    "<td><b>" + r.bandIndex.toFixed(2) + "×</b></td>" +
    "<td>" + eCell + "</td>" +
    "<td>" + checklistCell(c) + "</td></tr>";
}

function table(rows) {
  return '<table><thead><tr><th>#</th><th>Post</th><th>View band</th><th>Views</th><th>Like rate</th>' +
    "<th>Band median</th><th>vs band</th><th>E (retrospective)</th><th>C checklist (not a forecast)</th></tr></thead><tbody>" +
    rows.map(row).join("") + "</tbody></table>";
}

function traveled() {
  return '<section id="traveled" data-research>' +
    "<h2>What traveled elsewhere — associations only</h2>" +
    "<p class=\"caveat\">From a separate multi-account sample of " + R("viral.n") + " viral posts by " +
    R("viral.authors") + " authors (" + esc(R("viral.window")) + "). There is no non-viral control, so none of this " +
    "says what makes a post travel — only what was common among posts that already did. It is not about your account.</p>" +
    "<ol>" +
    "<li><b>Reach is not resonance.</b> Median like rate was " + R("viral.band.10k_plus.like_rate_p50") +
    " for posts past 10k views, against " + R("viral.band.2k_10k.like_rate_p50") + " at 2k–10k. That is why this report compares like rate only within a view band.</li>" +
    "<li><b>Video led on saves.</b> Median save-to-like was " + R("viral.media.video.save_to_like_p50") +
    " for video, against " + R("viral.media.photo.save_to_like_p50") + " for photos and " +
    R("viral.media.text.save_to_like_p50") + " for text. A high like rate did not mean high bookmarks.</li>" +
    "<li><b>Follower count looked like noise</b> inside the viral gate: likes against followers, Pearson " +
    R("viral.likes_followers.pearson") + ".</li>" +
    "<li><b>Questions were slightly ahead on like rate</b> (" + R("viral.question.like_rate_p50") + " against " +
    R("viral.statement.like_rate_p50") + " for statements), with the same bookmark rate.</li>" +
    "<li><b>C did not track outcomes</b> (Spearman " + R("viral.c_vs_like_rate.spearman") +
    "). It stays a checklist.</li>" +
    "</ol></section>";
}

function honesty() {
  return '<section id="honesty" data-research><h2>How to read this</h2><ul>' +
    copy.HONESTY.map(h => "<li>" + esc(h) + "</li>").join("") + "</ul></section>";
}

const CSS = `
:root{--ink:#16181c;--muted:#5b6470;--line:#d9dde3;--bg:#fff;--win:#0a7a3d;--miss:#b3261e;--chip:#eef1f5}
@media (prefers-color-scheme:dark){:root{--ink:#e7e9ea;--muted:#9aa3ad;--line:#2f3336;--bg:#0f1114;--chip:#1d2126}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:28px 0 8px}
.sub{color:var(--muted);margin:0 0 12px}.meta{color:var(--muted);font-size:12px}
.caveat{border-left:3px solid var(--line);padding-left:10px;color:var(--muted)}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
th{font-weight:600;font-size:12px;color:var(--muted)}
.win h2{color:var(--win)}.miss h2{color:var(--miss)}
.chip{display:inline-block;background:var(--chip);border-radius:10px;padding:1px 8px;margin:1px 0;font-size:12px}
.chip small{color:var(--muted)}.muted{color:var(--muted)}
a{color:inherit}
.scroll{overflow-x:auto}
@page{size:A4 landscape;margin:12mm}
@media print{:root{--bg:#fff;--ink:#000}a{text-decoration:none}section{break-inside:avoid}}
`;

function html(result, opts) {
  if (!result || result.mode !== "audit") throw new Error("report.html expects an audit-mode result");
  opts = opts || {};
  const when = new Date(opts.generatedAt || Date.now()).toISOString();
  const account = opts.account ? esc(opts.account) : "this account";
  const drop = result.dropped || {};
  const dropped = Object.entries(drop).filter(([, v]) => v).map(([k, v]) => v + " " + k).join(", ");

  const unranked = result.unranked.length
    ? '<section><h2>Not ranked</h2><ul>' + result.unranked.map(u =>
        '<li data-id="' + esc(u.card.id) + '">' + esc(snippet(u.card.text)) + " — " + esc(u.reason) + "</li>").join("") + "</ul></section>"
    : "";

  return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">" +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>Account audit</title><style>" + CSS + "</style></head><body><main>" +
    "<h1>" + esc(result.headline) + " — " + account + "</h1>" +
    '<p class="sub">' + esc(result.subhead) + "</p>" +
    '<p class="sub"><b>' + esc(copy.MODES.checklist.headline) + ":</b> " + esc(copy.MODES.checklist.subhead) + "</p>" +
    '<p class="meta">Mode: ' + esc(result.label) + " · weights v" + esc(result.weightsVersion) +
    " · X param.rs last sync " + esc(result.paramRsSync) + " · generated " + esc(when) +
    " · " + result.n + " posts at least " + result.maturityHours + "h old" + (dropped ? " (dropped: " + esc(dropped) + ")" : "") + "</p>" +
    '<section class="win"><h2>Winners</h2><div class="scroll">' + table(result.winners) + "</div></section>" +
    '<section class="miss"><h2>Misses</h2><div class="scroll">' + table(result.misses) + "</div></section>" +
    unranked +
    '<section><h2>View bands on this account</h2><table><thead><tr><th>Band</th><th>Posts</th><th>Median like rate</th></tr></thead><tbody>' +
    result.bands.map(b => "<tr><td>" + esc(b.band) + "</td><td>" + b.n + "</td><td>" + pct(b.likeRateP50) + "</td></tr>").join("") +
    "</tbody></table></section>" +
    traveled() + honesty() +
    "</main></body></html>";
}

function researchText(doc) {
  const parts = [];
  for (const m of String(doc).matchAll(/<section[^>]*data-research[^>]*>([\s\S]*?)<\/section>/g)) {
    parts.push(m[1].replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/[ \t]+/g, " "));
  }
  return parts.join("\n");
}

module.exports = { html, researchText };
