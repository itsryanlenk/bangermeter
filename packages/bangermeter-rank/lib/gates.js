"use strict";
// Two ship gates (handoff §8, tests 7–8).
//
// Copy gate: the three claims marketing may never make.
// Numbers Gate: every research figure in client-facing copy must resolve to
// receipts/2026-09-23.json. It does NOT police a customer's own numbers (their
// posts' like rates) — those are measurements of their data, not claims — so it
// runs over copy and the report's research sections, not over whole reports.
const fs = require("fs");
const path = require("path");
const { C } = require("./engine");
const receipts = require("./receipts");

const FORBIDDEN = [
  { re: /\bpredicts\s+virality\b/i, why: "C and E do not predict virality (validation Spearman C vs like rate 0.0809)" },
  { re: /\bguarantee[sd]?\s+reach\b/i, why: "nothing here guarantees reach" },
  { re: /\bC\s+score\s+means\s+it\s+will\s+perform\b/i, why: "C is a checklist, not a forecast" }
];

function copyGate(text, file) {
  const out = [];
  String(text).split(/\r?\n/).forEach((line, i) => {
    for (const f of FORBIDDEN) {
      const m = f.re.exec(line);
      if (m) out.push({ file: file || null, line: i + 1, match: m[0], why: f.why });
    }
  });
  return out;
}

// Constants of the method itself, each with its reason. Not research figures.
const POLICY = {
  "2000": "E lowSample gate K", "48": "maturity hours", "100": "validation views floor",
  "200": "view band floor", "999": "view band label", "1000": "view band edge", "10000": "view band edge",
  "468": "X's own documented misreading (234.0 ÷ 0.5) that X calls incorrect"
};

function weightTokens() {
  const out = new Set();
  const add = v => { if (typeof v === "number") { out.add(String(Math.abs(v))); out.add(Math.abs(v).toFixed(1)); } };
  Object.values(C.heads).forEach(h => add(h.weight));
  Object.values(C.rescorers).forEach(r => { add(r.factor); add(r.decay); add(r.floor); });
  add(C.bidirectionalFollowReplyBoost);
  return out;
}

let ALLOWED = null;
function allowed() {
  if (!ALLOWED) {
    ALLOWED = new Set([...receipts.allowedTokens(), ...weightTokens(), ...Object.keys(POLICY)]);
  }
  return ALLOWED;
}

// Strip things that contain digits but are not figures.
function stripNonFigures(text) {
  return String(text)
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\b\d{4}-\d\d-\d\d(T\d\d:\d\d:\d\dZ?)?/g, " ")
    .replace(/\bv?\d+\.\d+\.\d+\b/g, " ")
    .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(,\s*\d{4})?/g, " ")
    .replace(/\b(19|20)\d\d\b(?![.,]\d)/g, " ")
    .replace(/[A-Za-z_]+\d[\w]*/g, " "); // identifiers like p50, rust_…_5m, h2
}

const TOKEN_RE = /(?<![\w.])[−-]?\$?\d[\d,]*(?:\.\d+)?(?:%|x\b|k\b|K\b)?/g;

function isFigure(tok) {
  if (/%|x$|^\$|^[−-]?\$/.test(tok)) return true;
  if (/\.\d/.test(tok)) return true;
  const n = Number(receipts.normalize(tok).replace(/[kK]$/, ""));
  const scaled = /[kK]$/.test(tok) ? n * 1000 : n;
  return scaled >= 100;
}

function canonical(tok) {
  let t = receipts.normalize(tok.replace(/,$/, ""));
  if (/[kK]$/.test(t)) t = String(Number(t.slice(0, -1)) * 1000);
  return t;
}

function numbersGate(text, file) {
  const out = [];
  const ok = allowed();
  // Fenced code in Markdown shows a schema or a command, not a claim.
  const md = /\.md$/i.test(file || "");
  let fenced = false;
  String(text).split(/\r?\n/).forEach((line, i) => {
    if (md && /^\s*```/.test(line)) { fenced = !fenced; return; }
    if (fenced) return;
    const clean = stripNonFigures(line);
    for (const m of clean.matchAll(TOKEN_RE)) {
      const tok = m[0].replace(/,$/, "");
      if (!isFigure(tok)) continue;
      if (!ok.has(canonical(tok))) out.push({ file: file || null, line: i + 1, token: tok });
    }
  });
  return out;
}

// Copy gate runs wide: anything a user or customer can read. The Numbers Gate
// runs on this package's client-facing copy; the extension's figures come from
// weights.js sourced facts and are guarded by its own test suite.
const DEFAULT_TARGETS = {
  copy: [
    "README.md", "store-assets/store-description.txt",
    "extension/popup.html", "extension/welcome.html", "extension/content.js", "extension/popup.js",
    "packages/bangermeter-rank/README.md", "packages/bangermeter-rank/lib/copy.js",
    "packages/bangermeter-rank/lib/report.js"
  ],
  numbers: ["packages/bangermeter-rank/README.md", "packages/bangermeter-rank/lib/copy.js"]
};

function scan(root, targets) {
  const t = targets || DEFAULT_TARGETS;
  const res = { copy: [], numbers: [], missing: [] };
  const read = rel => {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) { res.missing.push(rel); return null; }
    return fs.readFileSync(p, "utf8");
  };
  for (const rel of t.copy || []) { const s = read(rel); if (s != null) res.copy.push(...copyGate(s, rel)); }
  for (const rel of t.numbers || []) { const s = read(rel); if (s != null) res.numbers.push(...numbersGate(s, rel)); }
  return res;
}

module.exports = { copy: copyGate, numbers: numbersGate, scan, DEFAULT_TARGETS, FORBIDDEN, POLICY };
