// Fails the release build if anything claims to be a version it isn't.
//
//   node store-assets/check-versions.js
//
// manifest.json is the single source of truth. This checks the places that
// legitimately restate it (weights.js, the userscript build) and — the part
// that keeps biting — any prose making a CURRENCY claim: "current release
// v0.9.1", "current, as of v0.9.0". Those rot silently every time the version
// moves, and they have now done so twice.
//
// HISTORICAL mentions are fine and deliberately not flagged: "v0.9.0 replaced
// the weight layer" stays true forever. The rule is about tense, not about
// whether a version number appears.
const fs = require("fs"), path = require("path");

const root = path.join(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");

const problems = [];

// 0. Byte-order marks. PowerShell 5.1's `Set-Content -Encoding UTF8` writes a
// BOM, so any scripted edit to a shipped file can silently plant one — and a
// BOM in manifest.json makes Chrome reject the upload as invalid JSON. This
// already happened once, to two releases, before anything noticed.
const SHIPPED = ["extension/manifest.json", "extension/weights.js", "extension/scoring.js",
  "extension/content.js", "extension/popup.js", "extension/popup.html", "extension/styles.css",
  "extension/background.js", "extension/welcome.html"];
for (const f of SHIPPED) {
  const b = fs.readFileSync(path.join(root, f));
  if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) {
    problems.push(`${f} starts with a UTF-8 BOM — Chrome rejects a BOM'd manifest, and ` +
      `PowerShell's Set-Content -Encoding UTF8 is how it gets there. Rewrite with ` +
      `[System.IO.File]::WriteAllText($p, $text, (New-Object System.Text.UTF8Encoding($false)))`);
  }
}

const manifest = JSON.parse(read("extension/manifest.json").replace(/^﻿/, "")).version;

// 1. Places that restate the manifest version verbatim.
const weightsVersion = (read("extension/weights.js").match(/version:\s*"([^"]+)"/) || [])[1];
if (weightsVersion !== manifest) {
  problems.push(`extension/weights.js declares ${weightsVersion}, manifest says ${manifest}`);
}

// 2. The generated userscript must have been rebuilt against this manifest.
const user = read("extension/bangermeter.user.js");
const builtAt = (user.match(/at extension v(\d+\.\d+\.\d+)/) || [])[1];
if (builtAt !== manifest) {
  problems.push(`extension/bangermeter.user.js was built at v${builtAt}, manifest says ${manifest}` +
    ` — rerun store-assets/make-userscript.ps1`);
}

// 3. Prose currency claims.
const CURRENCY = /(current\s+(?:release|version)|current,\s*as\s+of|latest\s+release)\D{0,20}v?(\d+\.\d+\.\d+)/gi;
for (const file of ["README.md", "RESEARCH.md", "SECURITY.md", "store-assets/store-description.txt"]) {
  let text;
  try { text = read(file); } catch { continue; }
  text.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(CURRENCY)) {
      if (m[2] !== manifest) {
        problems.push(`${file}:${i + 1} claims current version ${m[2]}, manifest says ${manifest}\n` +
          `    ${line.trim()}\n` +
          `    (prefer deleting the claim — the manifest and the git tag already state it)`);
      }
    }
  });
}

// 4. Test counts quoted in prose. 96 `check(` calls produce 120 assertions at
// runtime because some run inside loops, so nobody can eyeball the real number
// — which is how README shipped "112" against a 120-assertion suite. Run the
// suite and compare.
try {
  const { execFileSync } = require("child_process");
  const real = parseInt(execFileSync(process.execPath,
    [path.join(root, "extension", "run-tests.js"), "--count"], { encoding: "utf8" }).trim(), 10);
  if (!Number.isFinite(real)) throw new Error("runner did not return a count");

  const CLAIM = /(\d{2,4})\s*(?:assertions|self-tests|automated tests)|(\d{2,4})\s*\/\s*\1\s*self-tests/gi;
  for (const file of ["README.md", "RESEARCH.md", "store-assets/store-description.txt"]) {
    let text;
    try { text = read(file); } catch { continue; }
    text.split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(CLAIM)) {
        const n = parseInt(m[1] || m[2], 10);
        // "up from 33" style historical comparisons are legitimate; only flag a
        // number presented as the CURRENT count.
        if (n !== real && !/up from|was |previously/i.test(line)) {
          problems.push(`${file}:${i + 1} quotes ${n} tests, the suite has ${real}\n    ${line.trim()}`);
        }
      }
    });
  }
} catch (e) {
  problems.push("could not verify test counts: " + e.message);
}

// 5. Account archives. The audience-readout skill collects a real person's
// posting history, and that must never be committed. .gitignore covers the usual
// filenames, but a renamed file would slip straight through — so match on SHAPE.
try {
  const { execSync } = require("child_process");
  const tracked = execSync("git ls-files", { cwd: root, encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean);
  const ARCHIVE_COLS = ["views", "likes", "replies", "reposts"];
  const archiveWarn = f => problems.push(f + " looks like a collected account archive. " +
    "Archives identify a real person and must not be committed — move it outside the repo.");
  for (const f of tracked) {
    if (/\.(tsv|csv)$/i.test(f)) {
      let head;
      try { head = (read(f).split(/\r?\n/)[0] || ""); } catch { continue; }
      const cols = head.toLowerCase().split(/[\t,]/).map(c => c.trim());
      const hits = ARCHIVE_COLS.filter(c => cols.includes(c));
      if (hits.length >= 3 && cols.includes("text")) archiveWarn(f + " (has " + hits.join(", ") + " and post text)");
    } else if (/\.(json|jsonl|ndjson)$/i.test(f)) {
      // A collector could just as easily emit JSON; match the same SHAPE there:
      // an object (or array/lines of objects) carrying 3+ archive keys plus text.
      let sample;
      try {
        const raw = read(f);
        sample = /\.jsonl$|\.ndjson$/i.test(f)
          ? JSON.parse(raw.split(/\r?\n/).find(l => l.trim()) || "null")
          : JSON.parse(raw);
      } catch { continue; }
      if (Array.isArray(sample)) sample = sample[0];
      if (!sample || typeof sample !== "object") continue;
      const keys = Object.keys(sample).map(k => k.toLowerCase());
      const hits = ARCHIVE_COLS.filter(c => keys.includes(c));
      if (hits.length >= 3 && (keys.includes("text") || keys.includes("full_text"))) {
        archiveWarn(f + " (object with " + hits.join(", ") + " and post text)");
      }
    }
  }
} catch (e) {
  problems.push("could not scan for account archives: " + e.message);
}

// 6. British spellings. The repo was swept to US spellings once already, and the
// worst instance was inside a quote box: a card said "personalised" where X had
// written "personalized", turning a precision claim into a misquote. Prose drifts
// back one commit at a time — two more crept in during the session that added
// this — so check it rather than remember it.
const BRITISH = new RegExp(
  "\\b(analys(?:e|ed|es|ing)|behaviour|optimis(?:e|ed|es|ing|ation)|" +
  "recognis(?:e|ed|es|ing)|summaris(?:e|ed|es|ing)|personalis(?:e|ed|es|ing|ation)|" +
  "organis(?:e|ed|es|ing|ation)|centre|colour|favourite|catalogue|whilst|honour)" +
  "\\w*\\b", "gi");
try {
  const { execSync } = require("child_process");
  const tracked = execSync("git ls-files", { cwd: root, encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean)
    .filter(f => /\.(md|txt|html|js)$/i.test(f))
    // this file names the spellings it looks for, so it always matches itself
    .filter(f => !/check-versions/.test(f));
  for (const f of tracked) {
    let text;
    try { text = read(f); } catch { continue; }
    text.split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(BRITISH)) {
        problems.push(`${f}:${i + 1} uses British spelling "${m[0]}" — this repo is US English`
          + `\n    ${line.trim().slice(0, 90)}`);
      }
    });
  }
} catch (e) {
  problems.push("could not scan for British spellings: " + e.message);
}

// 7. The three packaging lists must name the same files, and those files must
// exist. Adding a file to the extension means editing THREE places — this
// script's BOM list, package-guard's SHIPPED, and make-package.ps1's $items —
// and the failure mode when you miss one is silent: make-package builds from
// its own list, so a file absent there is simply not in the zip, and the guard
// only verifies files it was told about. A typo is just as quiet; adding
// welcome.html landed "$extackground.js" in the PowerShell list, which would
// have shipped a store build with no service worker and no welcome page.
try {
  const guardList = (read("store-assets/package-guard.js")
    .match(/const SHIPPED = \[([\s\S]*?)\];/) || [])[1];
  const psList = (read("store-assets/make-package.ps1")
    .match(/\$items = @\(([\s\S]*?)\)/) || [])[1];
  if (!guardList || !psList) throw new Error("could not locate one of the packaging lists");

  const names = s => new Set([...s.matchAll(/"([^"]+)"/g)]
    .map(m => m[1].replace(/^\$ext[\\/]/, "").replace(/^extension[\\/]/, ""))
    .filter(n => n !== "icons"));

  const sets = {
    "check-versions.js": names(JSON.stringify(SHIPPED)),
    "package-guard.js": names(guardList),
    "make-package.ps1": names(psList)
  };
  const union = new Set(Object.values(sets).flatMap(s => [...s]));

  for (const [where, set] of Object.entries(sets)) {
    for (const f of union) {
      if (!set.has(f)) {
        problems.push(`${f} is missing from the packaging list in ${where} — every shipped ` +
          `file must appear in all three, or it silently does not reach the store build`);
      }
    }
  }
  // A name that survives the set comparison can still be a typo present in all
  // three, so prove each one is a real file.
  for (const f of union) {
    if (!fs.existsSync(path.join(root, "extension", f))) {
      problems.push(`packaging lists name extension/${f}, which does not exist`);
    }
  }
} catch (e) {
  problems.push("could not cross-check the packaging lists: " + e.message);
}

if (problems.length) {
  console.error("version check FAILED\n");
  problems.forEach(p => console.error("  - " + p));
  process.exit(1);
}
console.log(`version check ok — everything agrees on ${manifest}`);
