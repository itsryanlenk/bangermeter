// Refuses to build a store package from a tree that is not what it looks like,
// and proves afterwards that the zip contains what the repo contains.
//
//   node store-assets/package-guard.js --pre
//   node store-assets/package-guard.js --verify dist/bangermeter-0.9.5.zip
//
// Why this exists. Version 0.9.4 went to the Chrome Web Store telling users
// that For You hard-filters 670 accounts reported to Brazil's Electoral Court.
// The real number is 665. The correction was committed at 15:02 on 16 Aug; the
// zip was built at 15:02 on 16 Aug, from the tree as it stood a moment earlier,
// and was uploaded three days later without being rebuilt. Nothing in the
// pipeline compared the artifact to the repo, because check-versions.js only
// compares repo files to each other and the zip is not one of them.
//
// So the check that matters is not "is the tree clean at build time" — that
// tree WAS clean. It is "does this artifact still match HEAD when you upload
// it". --verify answers that, and is the one to run before touching the
// developer dashboard.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const SHIPPED = ["manifest.json", "weights.js", "scoring.js", "content.js",
  "styles.css", "popup.html", "popup.js"];

const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

const die = lines => {
  console.error("package guard FAILED\n");
  (Array.isArray(lines) ? lines : [lines]).forEach(l => console.error("  - " + l));
  process.exit(1);
};

// ── minimal zip reader ──────────────────────────────────────────────────────
// Walks the central directory rather than scanning for local headers, so a
// stray signature inside compressed data cannot desynchronise it. Handles the
// two methods Compress-Archive emits: stored (0) and deflate (8).
function readZip(file) {
  const buf = fs.readFileSync(file);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 65536; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) die(file + " is not a readable zip (no end-of-central-directory record)");

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();

  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) die("corrupt central directory in " + file);
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const cmtLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    // Compress-Archive writes Windows separators into entry names; every other
    // zip tool writes forward slashes. Normalise so comparisons are stable.
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen).replace(/\\/g, "/");

    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const start = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compSize);

    if (!name.endsWith("/")) {
      out.set(name, method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw));
    }
    p += 46 + nameLen + extraLen + cmtLen;
  }
  return out;
}

const buildInfoPath = zip => zip.replace(/\.zip$/i, ".build.json");

// ── --pre ───────────────────────────────────────────────────────────────────
function pre() {
  const problems = [];

  // Uncommitted changes to a shipped file mean the artifact will contain code
  // that exists nowhere in history, and nothing afterwards can tell you what
  // was in it.
  const dirty = git("status", "--porcelain", "--", "extension")
    .split(/\r?\n/).filter(Boolean);
  if (dirty.length && !process.argv.includes("--allow-dirty")) {
    problems.push("extension/ has uncommitted changes — the package would contain code that is " +
      "in no commit:\n      " + dirty.join("\n      ") +
      "\n      (commit them, or pass --allow-dirty for a throwaway local build)");
  }

  // Packaging from a tree behind its upstream ships code you have already
  // superseded — which is the shape of the 0.9.4 incident.
  try {
    const upstream = git("rev-parse", "--abbrev-ref", "@{upstream}");
    git("fetch", "--quiet");
    const behind = +git("rev-list", "--count", "HEAD..@{upstream}");
    if (behind > 0) {
      problems.push(`HEAD is ${behind} commit(s) behind ${upstream} — pull before packaging`);
    }
  } catch {
    console.log("  note: no upstream to compare against, skipping behind-check");
  }

  if (problems.length) die(problems);
  console.log("package guard ok — tree is clean and current");
}

// ── --verify ────────────────────────────────────────────────────────────────
function verify(zipArg) {
  const zip = path.resolve(root, zipArg);
  if (!fs.existsSync(zip)) die("no such package: " + zipArg);

  const entries = readZip(zip);
  const problems = [];

  for (const f of SHIPPED) {
    const inZip = entries.get(f);
    if (!inZip) { problems.push(`${f} is missing from the package`); continue; }
    const onDisk = fs.readFileSync(path.join(root, "extension", f));
    if (!inZip.equals(onDisk)) {
      problems.push(`${f} in the package does not match extension/${f} — the package is stale`);
    }
  }

  const icons = [...entries.keys()].filter(k => k.startsWith("icons/"));
  if (!icons.length) problems.push("the package contains no icons/");

  // BOM in a shipped file makes Chrome reject the manifest; this already
  // happened to two releases.
  for (const [name, body] of entries) {
    if (body[0] === 0xEF && body[1] === 0xBB && body[2] === 0xBF) {
      problems.push(name + " starts with a UTF-8 BOM");
    }
  }

  // The version inside the artifact is what the store enforces uniqueness on.
  const mf = entries.get("manifest.json");
  const zipVersion = mf && (JSON.parse(mf.toString("utf8").replace(/^﻿/, "")).version);
  const diskVersion = JSON.parse(
    fs.readFileSync(path.join(root, "extension", "manifest.json"), "utf8").replace(/^﻿/, "")).version;
  if (zipVersion !== diskVersion) {
    problems.push(`package declares v${zipVersion}, extension/manifest.json says v${diskVersion}`);
  }
  if (!path.basename(zip).includes(zipVersion)) {
    problems.push(`package is named ${path.basename(zip)} but declares v${zipVersion}`);
  }

  // Provenance: the question "which commit is live?" cost a forensic diff
  // against an installed copy of the extension. It should cost one file read.
  const info = buildInfoPath(zip);
  if (!fs.existsSync(info)) {
    problems.push("no .build.json beside the package — rebuild with make-package.ps1 so provenance is recorded");
  } else {
    const b = JSON.parse(fs.readFileSync(info, "utf8"));
    const head = git("rev-parse", "HEAD");
    if (b.commit !== head) {
      // HEAD moving is not itself a problem — docs and skills commits move it
      // constantly and ship nothing. What matters is whether anything under
      // extension/ changed since the build. A guard that fails on every README
      // commit is a guard people learn to skip, which is worse than no guard.
      let shippedChanged = true;
      try {
        execFileSync("git", ["diff", "--quiet", b.commit, head, "--", "extension"], { cwd: root });
        shippedChanged = false;
      } catch { shippedChanged = true; }

      if (shippedChanged) {
        problems.push(`package was built from ${b.commit.slice(0, 7)} but extension/ has changed ` +
          `since (HEAD is ${head.slice(0, 7)}) — rebuild before uploading, this is exactly how ` +
          `v0.9.4 shipped a stale number`);
      } else {
        console.log(`  note: built at ${b.commit.slice(0, 7)}, HEAD is now ${head.slice(0, 7)}, ` +
          `but nothing under extension/ changed between them`);
      }
    }
  }

  if (problems.length) die(problems);
  console.log(`package verified — bangermeter-${zipVersion} matches extension/ at ${git("rev-parse", "--short", "HEAD")}`);
}

// ── --stamp (called by make-package.ps1 right after Compress-Archive) ───────
function stamp(zipArg) {
  const zip = path.resolve(root, zipArg);
  const head = git("rev-parse", "HEAD");
  fs.writeFileSync(buildInfoPath(zip), JSON.stringify({
    version: JSON.parse(fs.readFileSync(
      path.join(root, "extension", "manifest.json"), "utf8").replace(/^﻿/, "")).version,
    commit: head,
    commitSubject: git("log", "-1", "--format=%s"),
    commitDate: git("log", "-1", "--format=%cI"),
    treeClean: git("status", "--porcelain", "--", "extension").length === 0
  }, null, 2) + "\n");
  console.log("stamped " + path.basename(buildInfoPath(zip)) + " @ " + head.slice(0, 7));
}

const mode = process.argv[2];
if (mode === "--pre") pre();
else if (mode === "--stamp") stamp(process.argv[3]);
else if (mode === "--verify") verify(process.argv[3]);
else {
  console.error("usage: package-guard.js --pre | --stamp <zip> | --verify <zip>");
  process.exit(2);
}
