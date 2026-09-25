"use strict";
// Ship gates (handoff §8, tests 7–8).
//
// Copy gate: the three claims marketing may never make, in any wording, with
// the negations the product must say ("does not predict virality") allowed.
//
// Numbers Gate: every research figure in client-facing copy must resolve to
// receipts/2026-09-23.json. Two narrower exceptions, each only in context:
// published weights next to the head they belong to ("reply 5.0"), and the
// method's own constants next to what they measure ("2,000 views").
// A customer's own numbers (their posts' like rates) are measurements of their
// data, not claims, so the gate runs over copy and the report's research
// sections — never over whole reports.
const fs = require("fs");
const path = require("path");
const { C } = require("./engine");
const receipts = require("./receipts");

// ── copy gate ───────────────────────────────────────────────────────────────
const W = "(?:[\\w’'-]+\\s+){0,2}?"; // up to two words in between
const FORBIDDEN = [
  { re: new RegExp("\\bpredict\\w*\\s+" + W + "(?:virality|viral\\w*)\\b", "gi"),
    why: "C and E do not predict virality (validation Spearman C vs like rate 0.0809)" },
  { re: new RegExp("\\bguarantee\\w*\\s+" + W + "reach\\b", "gi"), why: "nothing here guarantees reach" },
  { re: /\bC[\s-]+scores?\b[\s\S]{0,40}?\bwill\s+perform\b/gi, why: "C is a checklist, not a forecast" }
];
const NEGATION = /\b(?:not|never|no|cannot|can't|won't|doesn't|don't|isn't|didn't)\s+(?:[\w’'-]+\s+){0,2}$/i;

// Blank out markup without moving offsets, so line numbers stay true.
function visible(text) {
  return String(text)
    .replace(/<[^>]*>/g, m => m.replace(/[^\n]/g, " "))
    .replace(/&nbsp;|&#160;/g, m => " ".repeat(m.length));
}

function lineAt(text, i) { return text.slice(0, i).split("\n").length; }

function copyGate(text, file) {
  const t = visible(text);
  const out = [];
  for (const f of FORBIDDEN) {
    f.re.lastIndex = 0;
    for (const m of t.matchAll(f.re)) {
      const before = t.slice(Math.max(0, m.index - 40), m.index);
      if (NEGATION.test(before) || /\b(?:not|never|n't)\b/i.test(m[0])) continue;
      out.push({ file: file || null, line: lineAt(t, m.index), match: m[0].replace(/\s+/g, " "), why: f.why });
    }
  }
  return out.sort((a, b) => a.line - b.line);
}

// ── head-count claims ───────────────────────────────────────────────────────
// "All 26 ranking heads" went stale the day X deleted one. A present-tense
// count must equal the engine's roster; a dated, historical line is exempt.
const HEAD_COUNT_RE = /\b(?:all|the)\s+(\d+)\s+(?:(?:published|ranking)\s+)?(?:weight\s+)?(?:heads|weights)\b/gi;
const DATED = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b\.?\s+\d{1,2}\b|\b\d{4}-\d\d-\d\d\b/;

function headCount(text, file) {
  const n = Object.keys(C.heads).length;
  const out = [];
  String(text).split(/\r?\n/).forEach((line, i) => {
    if (DATED.test(line)) return;
    for (const m of line.matchAll(HEAD_COUNT_RE)) {
      if (Number(m[1]) !== n) out.push({ file: file || null, line: i + 1, match: m[0], why: "the engine models " + n + " heads" });
    }
  });
  return out;
}

// ── numbers gate ────────────────────────────────────────────────────────────
// Method constants, each allowed only near the words that say what it is.
const POLICY = [
  { value: "2000", near: /views|\bK\b|\bE\b|lowSample/i, why: "E lowSample gate K" },
  { value: "100", near: /views/i, why: "validation views floor" },
  { value: "200", near: /views|band/i, why: "view band floor" },
  { value: "999", near: /band|200/i, why: "view band label" },
  { value: "1000", near: /band/i, why: "view band edge" },
  { value: "10000", near: /band/i, why: "view band edge" },
  { value: "468", near: /report|likes/i, why: "X's own documented misreading (234.0 ÷ 0.5) that X calls incorrect" }
];
const BAND_K = new Set(["1000", "2000", "10000"]); // "1k–2k", "10k+" are band labels wherever they appear

// Published weights, each allowed only after a word naming its head.
function weightContexts() {
  const map = new Map();
  const add = (v, words) => {
    if (typeof v !== "number") return;
    for (const key of [String(v), v.toFixed(1)]) {
      if (!map.has(key)) map.set(key, new Set());
      words.forEach(w => map.get(key).add(w));
    }
  };
  const wordsOf = s => String(s).toLowerCase().split(/[^a-z]+/)
    .filter(w => w.length >= 3 && !["via", "the", "binary"].includes(w)).map(w => w.replace(/s$/, ""));
  for (const [key, h] of Object.entries(C.heads)) add(h.weight, wordsOf(key + " " + h.label));
  for (const [key, r] of Object.entries(C.rescorers)) {
    const words = wordsOf(key + " " + (r.label || "")).concat(["oon", "network", "factor"]);
    add(r.factor, words); add(r.decay, words.concat("decay")); add(r.floor, words.concat("floor"));
  }
  add(C.bidirectionalFollowReplyBoost, ["mutual", "bidirectional", "boost", "reply"]);
  return map;
}

let CACHE = null;
function tables() {
  if (!CACHE) CACHE = { receipts: receipts.allowedTokens(), weights: weightContexts() };
  return CACHE;
}

// Strip things that contain digits but are not figures.
const MONTH = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
function stripNonFigures(text) {
  const blank = m => " ".repeat(m.length);
  return String(text)
    .replace(/https?:\/\/\S+/g, blank)
    .replace(/\b\d{4}-\d\d-\d\d(?:T\d\d:\d\d(?::\d\d)?(?:\.\d+)?Z?)?/g, blank)
    .replace(/\bv?\d+\.\d+\.\d+\b/g, blank)
    .replace(new RegExp("\\b" + MONTH + "\\b\\.?\\s+\\d{1,2}\\b(?:,\\s*\\d{4})?", "g"), blank)
    .replace(new RegExp("\\b" + MONTH + "\\b\\.?\\s+\\d{4}\\b", "g"), blank)
    .replace(/\b(?:in|since|by|©|\(c\))\s+(?:19|20)\d\d\b/gi, blank)
    .replace(/[A-Za-z_]+\d[\w]*/g, blank); // identifiers like p50, rust_…_5m, h2
}

const TOKEN_RE = /(?<![\w.])[−+-]?\$?\d[\d,]*(?:\.\d+)?(?:%|×|x\b|k\b|K\b)?/g;

// Canonical form keeps the sign, the $ and the % or × suffix: −0.187 and 0.187
// are different claims, and so are $20 and 20.
function canonical(tok) {
  let t = tok.replace(/,$/, "").replace(/^−/, "-").replace(/^\+/, "").replace(/,/g, "").replace(/x$/, "×");
  const k = /^(-?\$?)([\d.]+)[kK]$/.exec(t);
  if (k) t = k[1] + String(Number(k[2]) * 1000);
  return t;
}

function isFigure(tok) {
  if (/[%×x$]|^[−+-]/.test(tok)) return true;
  if (/\.\d/.test(tok)) return true;
  const c = canonical(tok);
  return Number(c) >= 100;
}

function numbersGate(text, file) {
  const out = [];
  const T = tables();
  const md = /\.md$/i.test(file || "");
  let fenceOpen = 0;
  String(text).split(/\r?\n/).forEach((line, i) => {
    // Fenced code in Markdown shows a schema or a command, not a claim.
    if (md && /^\s*```/.test(line)) { fenceOpen = fenceOpen ? 0 : i + 1; return; }
    if (fenceOpen) return;
    const clean = stripNonFigures(line);
    for (const m of clean.matchAll(TOKEN_RE)) {
      const tok = m[0].replace(/,$/, "");
      if (!isFigure(tok)) continue;
      const c = canonical(tok);
      if (T.receipts.has(c)) continue;
      const ctx = line.slice(Math.max(0, m.index - 40), m.index + tok.length + 25);
      if (/[kK]$/.test(tok) && BAND_K.has(c)) continue;
      if (POLICY.some(p => p.value === c && p.near.test(ctx))) continue;
      const before = line.slice(Math.max(0, m.index - 40), m.index).toLowerCase();
      const heads = T.weights.get(c.replace(/^-/, "-"));
      if (heads && [...heads].some(w => before.includes(w))) continue;
      out.push({ file: file || null, line: i + 1, token: tok });
    }
  });
  if (fenceOpen) out.push({ file: file || null, line: fenceOpen, token: "unclosed code fence" });
  return out;
}

// ── repo scan ───────────────────────────────────────────────────────────────
// Copy + head-count gates run wide: anything a user or customer can read. The
// Numbers Gate covers this package's client-facing copy. The extension's own
// figures (weights, sourced facts) are asserted by extension/test.html, and
// its README/store copy predates receipts — deliberately out of this gate's scope.
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
  const res = { copy: [], headCount: [], numbers: [], missing: [] };
  const read = rel => {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) { res.missing.push(rel); return null; }
    return fs.readFileSync(p, "utf8");
  };
  for (const rel of t.copy || []) {
    const s = read(rel);
    if (s == null) continue;
    res.copy.push(...copyGate(s, rel));
    res.headCount.push(...headCount(s, rel));
  }
  for (const rel of t.numbers || []) { const s = read(rel); if (s != null) res.numbers.push(...numbersGate(s, rel)); }
  return res;
}

module.exports = { copy: copyGate, numbers: numbersGate, headCount, scan, DEFAULT_TARGETS, FORBIDDEN, POLICY };
