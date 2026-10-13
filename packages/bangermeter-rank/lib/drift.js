"use strict";
// Turns sync.check() output into the upstream-sync report. Every finding lands
// in exactly one bucket. AUTO: every file declaring the param agrees on a new
// value. NEEDS-YOU: added, removed, the two files disagree, or a citation that
// does not resolve. REVIEW: a cited file touched since it was verified.
// FATAL: the check itself cannot be trusted. Findings are dated from upstream
// history and hashed, so unchanged drift never alerts twice.
const crypto = require("crypto");
const { C } = require("./engine");
const sync = require("./sync");
const upstream = require("./upstream");

const FATAL = new Set(["unparseable", "duplicate", "nostamp"]);
const PATH_RE = /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]*)+$/;
const GH_BLOB = /^https:\/\/github\.com\/xai-org\/x-algorithm\/blob\/[^/]+\/(.+)$/;
const SEVERITY_ORDER = { "score-moving": 0, inert: 1 };
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0); // locale-independent

function labelFor(e, config) {
  if (!e) return null;
  if (e.path[0] === "heads") { const h = config.heads[e.path[1]]; return (h && h.label) || e.path[1]; }
  return e.what;
}

// Inert = every value involved is zero (or absent): nothing it touches moves a score today.
const severity = values => values.every(v => v === 0 || v === undefined || v === null) ? "inert" : "score-moving";

function classify(result, exp, config) {
  exp = exp || sync.expected();
  config = config || C;
  const out = { fatal: [], auto: [], needsYou: [] };
  const byParam = new Map();
  for (const p of result.problems) {
    if (FATAL.has(p.kind)) { out.fatal.push({ kind: p.kind, file: p.file || null, message: p.message }); continue; }
    if (!byParam.has(p.param)) byParam.set(p.param, []);
    byParam.get(p.param).push(p);
  }
  for (const [param, ps] of byParam) {
    const e = exp[param];
    const of = k => ps.filter(p => p.kind === k);
    const base = { param, what: e ? e.what : "new head", label: labelFor(e, config), message: ps.map(p => p.message).join("; ") };
    if (of("added").length) {
      const live = {};
      for (const p of of("added")) live[p.file] = p.live;
      out.needsYou.push(Object.assign(base, { kind: "added", repo: null, live, severity: severity(Object.values(live)) }));
    } else if (of("removed").length) {
      out.needsYou.push(Object.assign(base, { kind: "removed", repo: e.value, live: {}, missingFrom: of("removed").map(p => p.file), severity: severity([e.value]) }));
    } else if (of("disagree").length) {
      const d = of("disagree")[0];
      out.needsYou.push(Object.assign(base, { kind: "disagree", repo: e.value, live: d.values, path: e.path, severity: severity([e.value, ...Object.values(d.values)]) }));
    } else {
      out.auto.push(Object.assign(base, { kind: "value", repo: e.value, live: of("value")[0].live, path: e.path, files: e.files }));
    }
  }
  return out;
}

// "path", "dir/ (a.py, b.py)", or "path@sha (lines …: prose)". Anything else
// (a param name, a sentence) is not a path and yields nothing.
function parseCitation(s) {
  const str = String(s).trim();
  const m = /^(\S+)/.exec(str);
  if (!m) return [];
  let token = m[1], sha = null;
  const at = token.lastIndexOf("@");
  if (at > 0 && /^[0-9a-f]{7,40}$/.test(token.slice(at + 1))) { sha = token.slice(at + 1); token = token.slice(0, at); }
  if (!PATH_RE.test(token)) return [];
  if (token.endsWith("/")) {
    const list = /^\S+\s*\(([^)]*)\)/.exec(str);
    const files = list ? list[1].split(",").map(f => f.trim()).filter(f => /^[\w.-]+$/.test(f)) : [];
    if (files.length) return files.map(f => ({ path: token + f, sha }));
  }
  return [{ path: token, sha }];
}

function citedPaths(config, defaultBaseline) {
  const out = new Map();
  const add = (fact, cites, factBaseline) => {
    for (const c of cites) {
      const baseline = c.sha || factBaseline || defaultBaseline;
      const key = c.path + "@" + baseline;
      if (!out.has(key)) out.set(key, { path: c.path, baseline, facts: [] });
      if (!out.get(key).facts.includes(fact)) out.get(key).facts.push(fact);
    }
  };
  for (const k of ["weightsSourceUrl", "scorerSourceUrl"]) {
    const m = GH_BLOB.exec(config[k] || "");
    if (m) add(k, [{ path: m[1], sha: null }], null);
  }
  for (const [name, f] of Object.entries(config.sourcedFacts || {})) {
    const cites = [];
    for (const k of ["source", "param"]) if (typeof f[k] === "string") cites.push(...parseCitation(f[k]));
    if (Array.isArray(f.sources)) for (const s of f.sources) cites.push(...parseCitation(s));
    add(name, cites, f.verifiedAt || null);
  }
  return [...out.values()].sort((a, b) => cmp(a.path + "@" + a.baseline, b.path + "@" + b.baseline));
}

function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    return Object.keys(v).sort().reduce((o, k) => { if (v[k] !== undefined) o[k] = canonical(v[k]); return o; }, {});
  }
  return v;
}

function hash(report) {
  const norm = arr => (arr || []).map(x => JSON.stringify(canonical(x))).sort();
  const body = JSON.stringify({ fatal: norm(report.fatal), auto: norm(report.auto), needsYou: norm(report.needsYou), review: norm(report.review) });
  return crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
}

function sortReport(r) {
  const key = f => f.param || f.path || "";
  r.auto.sort((a, b) => cmp(key(a), key(b)));
  r.needsYou.sort((a, b) => (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) || cmp(key(a), key(b)));
  r.review.sort((a, b) => cmp(a.path + "@" + a.baseline, b.path + "@" + b.baseline));
}

function buildReport(opts) {
  const clone = opts.clone;
  const head = opts.head || "HEAD";
  const config = opts.config || C;
  const cache = new Map();
  const files = {};
  for (const [key, file] of Object.entries(upstream.FILES)) files[key] = upstream.fileAt(clone, head, file, cache) || "";
  const result = sync.check(files);
  const cls = classify(result, sync.expected(), config);
  const report = {
    version: 1, upstreamHead: upstream.headCommit(clone, head),
    pinnedStamp: config.paramRsLastSync, liveStamp: result.lastSync, baseline: null,
    fatal: cls.fatal, auto: cls.auto, needsYou: cls.needsYou, review: [], stampBump: false, hash: null
  };
  try { report.baseline = upstream.findBaseline(clone, config.paramRsLastSync, { head, cache }); }
  catch (e) { report.fatal.push({ kind: "baseline", file: null, message: e.message }); }
  if (report.baseline) {
    for (const f of report.auto.concat(report.needsYou)) {
      f.arrivals = {};
      // An auto finding's `live` is one number; its files are listed separately.
      const keys = f.kind === "value" ? f.files : Object.keys(f.live || {}).concat(f.missingFrom || []);
      for (const key of keys) {
        const a = upstream.arrival(clone, key, f.param, report.baseline, { head, cache });
        if (a) f.arrivals[key] = a;
      }
    }
    for (const c of citedPaths(config, report.baseline.sha)) {
      if (!upstream.existsAt(clone, c.baseline, c.path)) {
        report.needsYou.push({ kind: "badcitation", param: null, path: c.path, facts: c.facts, severity: "inert",
          message: "`" + c.path + "` does not exist at `" + c.baseline.slice(0, 7) + "`, the commit " + c.facts.join(", ") + " cites, so it cannot be watched" });
        continue;
      }
      const commits = upstream.commitsTouching(clone, c.path, { since: c.baseline, head });
      if (commits.length) report.review.push(Object.assign({}, c, { commits }));
    }
  }
  // Citations without a sha of their own are watched from the pinned sync, so
  // bumping the stamp would drop them from the re-verify list unchecked.
  const unverified = report.baseline ? report.review.filter(r => r.baseline === report.baseline.sha).length : 0;
  report.stampHold = report.fatal.length ? "fatal"
    : report.needsYou.some(f => f.kind !== "badcitation") ? "weight-findings"
    : unverified ? "unverified-citations" : null;
  report.stampBump = !report.stampHold;
  sortReport(report);
  report.hash = hash(report);
  return report;
}

module.exports = { classify, parseCitation, citedPaths, buildReport, hash, canonical };
