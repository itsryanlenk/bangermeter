#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { spawnSync } = require("child_process");
const bmr = require("../lib");

const USAGE = `bangermeter-rank — ranking modes, score cards, weight sync, and account audit

  rank <posts.jsonl|.json> [--mode audit|checklist|engagement|stealability]
                           [--winners N] [--losers N] [--json]
  report <posts.jsonl|.json> --out report.html [--account @handle] [--pdf report.pdf]
  sync [--param-rs FILE --vm-params FILE] [--json]
  gate [--root DIR]

Default mode is audit: like rate inside matched view bands, posts ≥48h old.
C is a checklist, not a forecast. E is retrospective and unused under 2,000 views.
Exit codes: 0 ok · 1 drift / gate failure · 2 usage or I/O error.`;

// Flags that never take a value, so `rank --json FILE` reads FILE as the file.
const BOOLEAN = new Set(["json", "help"]);

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      const k = eq < 0 ? a.slice(2) : a.slice(2, eq);
      if (eq >= 0) out[k] = a.slice(eq + 1);
      else if (BOOLEAN.has(k)) out[k] = true;
      else if (k === "pdf") out[k] = argv[i + 1] && /\.pdf$/i.test(argv[i + 1]) ? argv[++i] : true;
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) out[k] = argv[++i];
      else out[k] = true;
    } else out._.push(a);
  }
  return out;
}

class Usage extends Error {}
function die(msg) { throw new Usage(msg); }

function count(a, k) {
  if (a[k] === undefined) return undefined;
  if (!/^\d+$/.test(String(a[k]))) die("--" + k + " must be a whole number ≥ 0 (got " + JSON.stringify(a[k]) + ")");
  return Number(a[k]);
}

function loadPosts(file) {
  if (!file) die("missing posts file\n\n" + USAGE);
  const src = fs.readFileSync(file, "utf8").trim();
  if (src.startsWith("[")) return JSON.parse(src);
  return src.split(/\r?\n/).filter(l => l.trim()).map((l, i) => {
    try { return JSON.parse(l); } catch (e) { die(file + ":" + (i + 1) + ": not JSON — " + e.message); }
  });
}

const pct = v => v == null ? "   —  " : (v * 100).toFixed(2).padStart(5) + "%";
const snip = t => { t = String(t || "").replace(/\s+/g, " "); return t.length > 60 ? t.slice(0, 59) + "…" : t; };

function printHeader(r) {
  console.log(r.headline);
  console.log("  " + r.subhead);
  console.log("  weights v" + r.weightsVersion + " · param.rs sync " + r.paramRsSync + (r.n != null ? " · " + r.n + " posts" : ""));
  if (r.dropped) {
    const d = Object.entries(r.dropped).filter(([, v]) => v).map(([k, v]) => v + " " + k).join(", ");
    if (d) console.log("  dropped: " + d);
  }
  console.log("");
}

function printRank(r) {
  printHeader(r);
  if (r.mode === "audit") {
    const line = x => "  " + String(x.rank).padStart(3) + "  " + (x.bandIndex === Infinity ? "   ∞" : x.bandIndex.toFixed(2)) + "×  " + pct(x.card.rates.like) +
      "  " + (x.card.band || "").padEnd(7) + "  " + (x.reportE ? "E " + x.card.E.score.toFixed(0).padStart(3) : "E  — ") + "  " + snip(x.card.text);
    console.log("WINNERS  (rank · vs band median · like rate · band · E · post)");
    r.winners.forEach(x => console.log(line(x)));
    console.log("\nMISSES");
    r.misses.forEach(x => console.log(line(x)));
    if (r.unranked.length) {
      console.log("\nNOT RANKED");
      r.unranked.forEach(u => console.log("  " + snip(u.card.text) + " — " + u.reason));
    }
  } else if (r.mode === "engagement") {
    r.ranked.forEach(x => console.log("  " + String(x.rank).padStart(3) + "  E " + x.card.E.score.toFixed(0).padStart(3) + "  " + snip(x.card.text)));
    if (r.lowSample.length) console.log("\n  " + r.lowSample.length + " post(s) under 2,000 views — not ranked on E");
  } else if (r.mode === "stealability") {
    console.log("FORMATS by median bookmarks");
    r.formats.forEach(f => console.log("  " + String(f.bookmarksP50).padStart(6) + "  n=" + String(f.n).padEnd(4) + " save/like " +
      (f.saveToLikeP50 == null ? "—" : f.saveToLikeP50.toFixed(3)) + "  " + f.format));
    console.log("\nPOSTS by bookmarks");
    r.posts.slice(0, 20).forEach(x => console.log("  " + String(x.card.bookmarks).padStart(6) + "  " + snip(x.card.text)));
  } else {
    r.items.forEach(c => console.log("  C " + c.C.score.toFixed(0).padStart(3) + "  " +
      (c.C.modifiers.map(m => m.id + "[" + m.provenance + "]").join(" ") || "no modifiers") + "  " + snip(c.text)));
  }
  console.log("\n" + r.hedges.map(h => "  · " + h).join("\n"));
}

function findBrowser() {
  const c = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"
  ];
  return c.find(p => p && fs.existsSync(p)) || null;
}

async function main() {
  const a = args(process.argv.slice(2));
  const cmd = a._[0];
  if (!cmd || a.help || cmd === "help") { console.log(USAGE); return 0; }

  if (cmd === "rank") {
    const opts = { mode: a.mode || "audit", winners: count(a, "winners"), losers: count(a, "losers") };
    let r;
    try { r = bmr.rank(loadPosts(a._[1]), opts); } catch (e) { die(e.message); }
    if (a.json) console.log(JSON.stringify(r, null, 2)); else printRank(r);
    return 0;
  }

  if (cmd === "report") {
    if (typeof a.out !== "string") die("report needs --out FILE.html");
    const r = bmr.rank(loadPosts(a._[1]), { mode: "audit", winners: count(a, "winners"), losers: count(a, "losers") });
    const html = bmr.report.html(r, { account: a.account, generatedAt: Date.now() });
    const bad = bmr.report.gate(html);
    if (bad.length) { console.error("report failed its own gates:\n" + JSON.stringify(bad, null, 1)); return 1; }
    fs.writeFileSync(a.out, html);
    console.log("wrote " + a.out + "  (" + r.winners.length + " winners, " + r.misses.length + " misses)");
    if (a.pdf) {
      const browser = findBrowser();
      if (!browser) die("no Chrome/Edge found for --pdf; set CHROME_PATH or print " + a.out + " from a browser");
      const pdf = path.resolve(typeof a.pdf === "string" ? a.pdf : a.out.replace(/\.html?$/, "") + ".pdf");
      const res = spawnSync(browser, ["--headless", "--disable-gpu", "--no-pdf-header-footer",
        "--print-to-pdf=" + pdf, pathToFileURL(path.resolve(a.out)).href], { stdio: "ignore", timeout: 60000 });
      if (res.status !== 0 || !fs.existsSync(pdf)) die("PDF render failed (exit " + res.status + ")");
      console.log("wrote " + pdf);
    }
    return 0;
  }

  if (cmd === "sync") {
    let files;
    if (a["param-rs"] || a["vm-params"]) {
      if (!a["param-rs"] || !a["vm-params"]) die("pass both --param-rs and --vm-params, or neither to fetch live");
      files = { paramRs: fs.readFileSync(a["param-rs"], "utf8"), vmParams: fs.readFileSync(a["vm-params"], "utf8") };
    } else {
      try { files = await bmr.sync.fetchLive(); } catch (e) { die("sync: " + e.message); }
    }
    const r = bmr.sync.check(files);
    if (a.json) { const { live, ...rest } = r; console.log(JSON.stringify(rest, null, 2)); }
    else if (r.ok) {
      console.log("sync ok: " + r.headsChecked + "/" + r.headsChecked + " heads + rescorers match live (upstream stamp " + r.lastSync +
        (r.stampMatchesPin ? ")" : "; weights.js pins " + r.pinnedSync + " — values unchanged, bump paramRsLastSync when convenient)"));
    } else {
      console.error("WEIGHT DRIFT — " + r.problems.length + " problem(s), upstream stamp " + r.lastSync + ":");
      r.problems.forEach(p => console.error("  " + (p.critical ? "CRITICAL " : "") + p.message));
    }
    return r.ok ? 0 : 1;
  }

  if (cmd === "gate") {
    const root = path.resolve(a.root || path.join(__dirname, "..", "..", ".."));
    const r = bmr.gates.scan(root);
    r.copy.forEach(v => console.error("COPY  " + v.file + ":" + v.line + "  \"" + v.match + "\" — " + v.why));
    r.headCount.forEach(v => console.error("HEADS " + v.file + ":" + v.line + "  \"" + v.match + "\" — " + v.why));
    r.numbers.forEach(v => console.error("NUMBER " + v.file + ":" + v.line + "  " + v.token + " — not in receipts"));
    r.missing.forEach(f => console.error("MISSING " + f));
    const bad = r.copy.length + r.headCount.length + r.numbers.length + r.missing.length;
    if (!bad) console.log("gates ok: copy + head count + numbers");
    return bad ? 1 : 0;
  }

  die("unknown command '" + cmd + "'\n\n" + USAGE);
}

main().then(code => process.exit(code), e => {
  console.error(e instanceof Usage || !process.env.DEBUG ? e.message : e.stack);
  process.exit(2);
});
