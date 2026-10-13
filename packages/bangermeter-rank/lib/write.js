"use strict";
// --write: apply the report's AUTO bucket to the repo. Numbers in code and
// tests only. A note, weightsSnapshot, README, RESEARCH.md or store copy is
// never touched; the PR body lists the lines that quote an old figure
// instead. Every edit site must match exactly once, and nothing is written
// until all of them have.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const F = {
  weights: "extension/weights.js",
  testHtml: "extension/test.html",
  fxParam: "packages/bangermeter-rank/test/fixtures/param.rs",
  fxVm: "packages/bangermeter-rank/test/fixtures/vm-params.rs",
  userscript: "extension/bangermeter.user.js",
  stampTests: ["packages/bangermeter-rank/test/sync.test.js", "packages/bangermeter-rank/test/modes.test.js", "packages/bangermeter-rank/test/report.test.js"]
};
const WRITABLE = [F.weights, F.testHtml, F.userscript, F.fxParam, F.fxVm, ...F.stampTests];
const FIXTURE_FOR = { paramRs: F.fxParam, vmParams: F.fxVm };
// Read for stale figures, never written. The UI files carry figures in user-facing strings ("▼ Reply ×0.75").
const PROSE = ["README.md", "RESEARCH.md", "store-assets/store-description.txt", "packages/bangermeter-rank/README.md", F.weights,
  "extension/content.js", "extension/popup.html", "extension/popup.js"];
const GENERIC = new Set(["rust", "home", "mixer", "weight", "factor"]);
const SUMS = ["positive", "negative", "total"];

const NUM = "-?\\d[\\d_]*(?:\\.\\d+)?(?:[eE][-+]?\\d+)?";
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class WriteError extends Error {}

// Write n the way the old literal was written: weights.js keeps ".0" on round numbers.
function formatLike(old, n) {
  return Number.isInteger(n) && /\./.test(old) ? n.toFixed(1) : String(n);
}

// Replace capture group 2 of the single match of `re` (group 1 is the prefix).
function replaceOnce(text, re, fn, where) {
  const hits = [...text.matchAll(re)];
  if (hits.length !== 1) throw new WriteError(where + ": expected exactly one edit site, found " + hits.length);
  const m = hits[0];
  const start = m.index + m[1].length;
  return text.slice(0, start) + fn(m[2]) + text.slice(start + m[2].length);
}

function replaceInBlock(text, open, close, re, fn, where) {
  const s = text.indexOf(open);
  if (s < 0) throw new WriteError(where + ": block `" + open + "` not found");
  const e = text.indexOf(close, s);
  return text.slice(0, s) + replaceOnce(text.slice(s, e), re, fn, where) + text.slice(e);
}

// The weights.js literal for a key path: `key: <num>` at top level, or the
// first `field:` inside the `obj: { … }` object (never crossing a brace).
function weightsSite(p) {
  if (p.length === 1) return new RegExp("^(\\s*" + esc(p[0]) + ":\\s*)(" + NUM + ")(?=\\s*,)", "gm");
  const [obj, field] = p.slice(-2);
  return new RegExp("^(\\s*" + esc(obj) + ":\\s*\\{[^{}]*?\\b" + esc(field) + ":\\s*)(" + NUM + ")", "gm");
}
const fixtureSite = param =>
  new RegExp("(param!\\(\\s*\\w+\\s*,\\s*[\\w:<>]+\\s*,\\s*\"" + esc(param) + "\"\\s*,\\s*)(" + NUM + ")", "g");
const tableSite = name => new RegExp("(\\b" + esc(name) + ":\\s*)(" + NUM + ")", "g");

function loadConfig(text) {
  const ctx = { Math, Object, Array, JSON, String, Number, isNaN, isFinite, parseFloat, parseInt, console };
  vm.createContext(ctx);
  vm.runInContext(text, ctx, { filename: "weights.js" });
  return ctx.BANGERMETER_CONFIG;
}

const round = n => +n.toFixed(10);
function sums(C) {
  const w = C.weightSums;
  return { positive: round(w.positive), negative: round(w.negative), total: round(w.total),
    ceiling: (w.negative / w.total * C.negativeScoresOffset).toFixed(6) };
}

function assertRepo(root) {
  const ok = fs.existsSync(path.join(root, "extension", "manifest.json")) &&
    fs.existsSync(path.join(root, "packages", "bangermeter-rank", "package.json"));
  if (!ok) throw new WriteError("--write only runs inside the Bangermeter repo (no extension/manifest.json under " + root + ")");
}

function figureRe(fig) {
  const variants = new Set([fig]);
  if (fig.startsWith("-")) variants.add("\u2212" + fig.slice(1));
  const n = Number(fig);
  if (Number.isInteger(n)) for (const v of [...variants]) variants.add(v + ".0");
  return new RegExp("(?<![\\d.])(?:" + [...variants].map(esc).join("|") + ")(?!\\d)");
}

// Words prose uses for a non-head param: its own name's tokens ("oon",
// "topic", "decay"), "out-of-network" for an OON factor, and the words of
// its weights.js label.
function aliases(f, config) {
  const words = f.param.split("_").filter(w => w.length >= 3 && !GENERIC.has(w));
  if (words.includes("oon")) words.push("out-of-network", "out of network");
  const obj = f.path.slice(0, -1).reduce((o, k) => (o ? o[k] : undefined), config);
  if (obj && typeof obj.label === "string") words.push(...obj.label.toLowerCase().split(/[^a-z-]+/).filter(w => w.length >= 4));
  return words;
}

// Lines in prose that quote a figure this write made stale. A head's value
// counts only on a line that also names the head. A non-head figure counts
// with any of its aliases, or written as a multiplier (×0.75). Sums and the
// ceiling are distinctive enough to count anywhere. Over-reporting is the
// safe direction.
function findStale(get, root, report, before, after, ceilingMoved, config) {
  const needles = report.auto.map(f => {
    const re = figureRe(String(f.repo));
    if (f.path[0] === "heads") {
      return { figure: String(f.repo), re, names: [f.param, f.label, f.path[1]].filter(Boolean).map(s => s.toLowerCase()) };
    }
    return { figure: String(f.repo), re, names: aliases(f, config), multRe: new RegExp("×\\s*" + re.source) };
  });
  for (const k of SUMS) if (before[k] !== after[k]) needles.push({ figure: String(before[k]), re: figureRe(String(before[k])), names: null });
  if (ceilingMoved) needles.push({ figure: before.ceiling, re: figureRe(before.ceiling), names: null });
  const out = [];
  for (const rel of PROSE) {
    if (!fs.existsSync(path.join(root, rel))) continue;
    get(rel).split(/\r?\n/).forEach((line, i) => {
      const lower = line.toLowerCase();
      const hit = needles.find(n => n.re.test(line) &&
        (!n.names || n.names.some(x => lower.includes(x)) || (n.multRe && n.multRe.test(line))));
      if (hit) out.push({ file: rel, line: i + 1, figure: hit.figure, text: line.trim().slice(0, 160) });
    });
  }
  return out;
}

function applyAuto({ root, report }) {
  assertRepo(root);
  const disk = rel => fs.readFileSync(path.join(root, rel), "utf8");
  const files = new Map();
  const get = rel => (files.has(rel) ? files.get(rel) : disk(rel));
  const set = (rel, text) => files.set(rel, text);
  // An unchanged value keeps its literal exactly (the fixtures write 10_000).
  const num = v => old => (Number(old.replace(/_/g, "")) === v ? old : formatLike(old, v));

  const original = loadConfig(get(F.weights));
  const before = sums(original);
  for (const f of report.auto) {
    set(F.weights, replaceOnce(get(F.weights), weightsSite(f.path), num(f.live), F.weights + " " + f.path.join(".")));
    if (f.path[0] === "heads") {
      set(F.testHtml, replaceInBlock(get(F.testHtml), "var PARAM_RS = {", "};", tableSite(f.path[1]), num(f.live), F.testHtml + " PARAM_RS." + f.path[1]));
    }
    for (const key of f.files) {
      set(FIXTURE_FOR[key], replaceOnce(get(FIXTURE_FOR[key]), fixtureSite(f.param), num(f.live), FIXTURE_FOR[key] + " " + f.param));
    }
  }
  const after = sums(loadConfig(get(F.weights)));
  const sumsMoved = SUMS.some(k => before[k] !== after[k]);
  const ceilingMoved = before.ceiling !== after.ceiling;
  if (sumsMoved) {
    for (const k of SUMS) {
      set(F.testHtml, replaceOnce(get(F.testHtml), new RegExp('(check\\("' + k + '_sum = )(' + NUM + ")", "g"), num(after[k]), F.testHtml + " " + k + "_sum name"));
      set(F.testHtml, replaceOnce(get(F.testHtml), new RegExp("(approx\\(C\\.weightSums\\." + k + ", )(" + NUM + ")", "g"), num(after[k]), F.testHtml + " " + k + "_sum value"));
    }
  }
  if (ceilingMoved) {
    // The test that pins the panel note to the ceiling must expect the NEW
    // figure; otherwise it stays green while the note is stale.
    set(F.testHtml, replaceOnce(get(F.testHtml), /(note quotes the current ceiling \()(0\.\d+)/g, () => after.ceiling, F.testHtml + " ceiling name"));
    set(F.testHtml, replaceOnce(get(F.testHtml), /(\/)(0\\\.\d+)(?=\/\.test\(SF\.negativeOffsetRule\.note\))/g, () => after.ceiling.replace(".", "\\."), F.testHtml + " ceiling regex"));
  }
  let stamp = null;
  if (report.stampBump && report.liveStamp && report.liveStamp !== report.pinnedStamp) {
    stamp = { from: report.pinnedStamp, to: report.liveStamp };
    set(F.weights, replaceOnce(get(F.weights), /(paramRsLastSync:\s*")([^"]+)(?=")/g, () => stamp.to, F.weights + " paramRsLastSync"));
    set(F.testHtml, replaceOnce(get(F.testHtml), /(C\.paramRsLastSync === ")([^"]+)(?=")/g, () => stamp.to, F.testHtml + " stamp check"));
    set(F.fxParam, replaceOnce(get(F.fxParam), /(last sync )(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)/g, () => stamp.to, F.fxParam + " stamp"));
    for (const rel of F.stampTests) set(rel, get(rel).split(stamp.from).join(stamp.to));
  }
  const staleLines = findStale(get, root, report, before, after, ceilingMoved, original);
  const changed = [];
  for (const [rel, text] of files) {
    if (text !== disk(rel)) { fs.writeFileSync(path.join(root, rel), text, "utf8"); changed.push(rel); }
  }
  return { changed, sums: { before, after }, sumsMoved, ceilingMoved, stamp, staleLines };
}

const outsideAllowlist = paths => paths.map(p => p.replace(/\\/g, "/")).filter(p => !WRITABLE.includes(p));

module.exports = { applyAuto, formatLike, outsideAllowlist, WRITABLE, WriteError };
