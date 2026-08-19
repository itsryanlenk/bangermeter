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
  "extension/content.js", "extension/popup.js", "extension/popup.html", "extension/styles.css"];
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
  for (const f of tracked) {
    if (!/\.(tsv|csv)$/i.test(f)) continue;
    let head;
    try { head = (read(f).split(/\r?\n/)[0] || ""); } catch { continue; }
    const cols = head.toLowerCase().split(/[\t,]/).map(c => c.trim());
    const hits = ARCHIVE_COLS.filter(c => cols.includes(c));
    if (hits.length >= 3 && cols.includes("text")) {
      problems.push(f + " looks like a collected account archive (has " + hits.join(", ") +
        " and post text). Archives identify a real person and must not be committed — " +
        "move it outside the repo.");
    }
  }
} catch (e) {
  problems.push("could not scan for account archives: " + e.message);
}

if (problems.length) {
  console.error("version check FAILED\n");
  problems.forEach(p => console.error("  - " + p));
  process.exit(1);
}
console.log(`version check ok — everything agrees on ${manifest}`);
