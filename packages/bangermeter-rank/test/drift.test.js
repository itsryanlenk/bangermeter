"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const drift = require("../lib/drift");
const { sync, config: C } = require("..");
const upstream = require("../lib/upstream");
const { makeRepo, fixture, setStamp, setValue } = require("./git-fixture");

const P = upstream.FILES.paramRs, V = upstream.FILES.vmParams;
const FAV = "rust_home_mixer_favorite_weight";
// Likes as the fixtures hold it today, and a value they do not: a fixed 0.6
// would stop being a move the day upstream (and the bot) land Likes 0.6.
const OLD = require("..").sync.parse(fixture("param.rs")).params[FAV], NEW = +(OLD + 0.1).toFixed(10);
const paramRs = fixture("param.rs"), vmParams = fixture("vm-params.rs");
const newHead = (text, value) => text + '\nparam!(ReactWithVideoWeight, f64, "rust_home_mixer_react_with_video_weight", ' + value + ");\n";
const cls = files => drift.classify(sync.check(files));

test("both files agreeing on a new value is auto", () => {
  const r = cls({ paramRs: setValue(paramRs, FAV, String(NEW)), vmParams: setValue(vmParams, FAV, String(NEW)) });
  assert.equal(r.needsYou.length, 0);
  assert.equal(r.auto.length, 1);
  const f = r.auto[0];
  assert.equal(f.param, FAV);
  assert.equal(f.label, "Likes");
  assert.equal(f.repo, OLD);
  assert.equal(f.live, NEW);
  assert.deepEqual(f.path, ["heads", "favorite", "weight"]);
  assert.deepEqual(f.files, ["paramRs", "vmParams"]);
});

test("files that disagree are needs-you, score-moving, and never auto", () => {
  const r = cls({ paramRs: setValue(paramRs, FAV, String(NEW)), vmParams });
  assert.equal(r.auto.length, 0);
  assert.equal(r.needsYou[0].kind, "disagree");
  assert.equal(r.needsYou[0].severity, "score-moving");
  assert.deepEqual(r.needsYou[0].live, { paramRs: NEW, vmParams: OLD });
});

test("a new head at weight 0 is inert; at a real weight it is score-moving", () => {
  const zero = cls({ paramRs, vmParams: newHead(vmParams, "0.0") }).needsYou[0];
  assert.equal(zero.kind, "added");
  assert.equal(zero.severity, "inert");
  assert.deepEqual(zero.live, { vmParams: 0 });
  assert.equal(cls({ paramRs: newHead(paramRs, "1.5"), vmParams: newHead(vmParams, "1.5") }).needsYou[0].severity, "score-moving");
});

test("a removed head is needs-you and lists the files it left", () => {
  const strip = t => t.replace(/param!\(DwellWeight[^;]*;/, "");
  const f = cls({ paramRs: strip(paramRs), vmParams: strip(vmParams) }).needsYou[0];
  assert.equal(f.kind, "removed");
  assert.deepEqual(f.missingFrom.sort(), ["paramRs", "vmParams"]);
  assert.equal(f.severity, "score-moving");
});

test("an unstamped param.rs is fatal, not a finding", () => {
  const r = cls({ paramRs: paramRs.replace(/last sync \S+Z/, ""), vmParams });
  assert.equal(r.fatal[0].kind, "nostamp");
});

test("parseCitation handles a path, a dir with a file list, and path@sha with prose", () => {
  assert.deepEqual(drift.parseCitation("phoenix/reference/world.py"), [{ path: "phoenix/reference/world.py", sha: null }]);
  assert.deepEqual(drift.parseCitation("grox/flows/reply_spam/ (plan.py, task_filter.py)"),
    [{ path: "grox/flows/reply_spam/plan.py", sha: null }, { path: "grox/flows/reply_spam/task_filter.py", sha: null }]);
  assert.deepEqual(drift.parseCitation("home-mixer/f.rs@77d431a (lines 1-2: a (nested) note)"), [{ path: "home-mixer/f.rs", sha: "77d431a" }]);
  assert.deepEqual(drift.parseCitation("rust_home_mixer_min_video_duration_ms"), []);
  assert.deepEqual(drift.parseCitation("X's blog post, Sept 2026"), []);
});

test("citedPaths takes the citation's sha, else verifiedAt, else the default baseline", () => {
  const config = {
    weightsSourceUrl: "https://github.com/xai-org/x-algorithm/blob/main/vm-ranker/params.rs",
    sourcedFacts: {
      a: { source: "phoenix/reference/world.py" },
      b: { source: "grox/flows/reply_spam/ (task_filter.py)", verifiedAt: "abc1234" },
      c: { param: "home-mixer/filters/x.rs" },
      d: { param: "rust_home_mixer_min_video_duration_ms" },
      e: { sources: ["home-mixer/f.rs@77d431a (line 5)"], verifiedAt: "abc1234" }
    }
  };
  assert.deepEqual(drift.citedPaths(config, "BASE"), [
    { path: "grox/flows/reply_spam/task_filter.py", baseline: "abc1234", facts: ["b"] },
    { path: "home-mixer/f.rs", baseline: "77d431a", facts: ["e"] },
    { path: "home-mixer/filters/x.rs", baseline: "BASE", facts: ["c"] },
    { path: "phoenix/reference/world.py", baseline: "BASE", facts: ["a"] },
    { path: "vm-ranker/params.rs", baseline: "BASE", facts: ["weightsSourceUrl"] }
  ]);
});

test("the real weights.js cites the files the last catch-up had to re-check", () => {
  const paths = drift.citedPaths(C, "BASE").map(c => c.path);
  for (const p of ["grox/flows/reply_spam/task_filter.py", "home-mixer/scorers/author_cold_start.rs",
    "home-mixer/filters/brazil_2026_election_filter.rs", "home-mixer/filters/vf_filter.rs", "xai-value-model/scoring.rs"]) {
    assert.ok(paths.includes(p), p);
  }
});

const cfg = Object.assign({}, C, {
  weightsSourceUrl: undefined, scorerSourceUrl: undefined,
  sourcedFacts: { dwellMark: { source: "phoenix/reference/world.py" } }
});

test("buildReport dates a disagreement and lists a touched cited file", () => {
  const r = makeRepo([
    { date: "2026-09-30T03:53:42Z", files: { [P]: paramRs, [V]: vmParams, "phoenix/reference/world.py": "DWELL = 10\n" } },
    { date: "2026-10-13T08:05:54Z", files: { [P]: setValue(setStamp(paramRs, "2026-10-12T16:00:33Z"), FAV, String(NEW)), "phoenix/reference/world.py": "DWELL = 12\n" } }
  ]);
  try {
    const rep = drift.buildReport({ clone: r.dir, config: cfg });
    assert.deepEqual(rep.fatal, []);
    assert.equal(rep.liveStamp, "2026-10-12T16:00:33Z");
    assert.equal(rep.baseline.sha, r.sha("HEAD~1"));
    const d = rep.needsYou.find(f => f.param === FAV);
    assert.equal(d.kind, "disagree");
    assert.equal(d.arrivals.paramRs.date, "2026-10-13T08:05:54Z");
    assert.equal(d.arrivals.vmParams, undefined);
    assert.deepEqual(rep.review.map(x => [x.path, x.commits.length]), [["phoenix/reference/world.py", 1]]);
    assert.equal(rep.stampBump, false, "a weight finding is still open");
    assert.match(rep.hash, /^[0-9a-f]{16}$/);
  } finally { r.cleanup(); }
});

test("buildReport: agreeing files are auto, dated in both files, and allow the stamp bump", () => {
  const r = makeRepo([
    { date: "2026-09-30T03:53:42Z", files: { [P]: paramRs, [V]: vmParams, "phoenix/reference/world.py": "x\n" } },
    { date: "2026-10-13T08:05:54Z", files: { [P]: setValue(setStamp(paramRs, "2026-10-12T16:00:33Z"), FAV, String(NEW)), [V]: setValue(vmParams, FAV, String(NEW)) } }
  ]);
  try {
    const rep = drift.buildReport({ clone: r.dir, config: cfg });
    assert.equal(rep.auto.length, 1);
    assert.deepEqual(Object.keys(rep.auto[0].arrivals).sort(), ["paramRs", "vmParams"]);
    assert.equal(rep.stampBump, true);
  } finally { r.cleanup(); }
});

test("buildReport: a cited path missing at its baseline is a badcitation, not silence", () => {
  const r = makeRepo([{ date: "2026-09-30T03:53:42Z", files: { [P]: paramRs, [V]: vmParams } }]);
  try {
    const rep = drift.buildReport({ clone: r.dir, config: cfg });
    assert.equal(rep.needsYou[0].kind, "badcitation");
    assert.match(rep.needsYou[0].message, /phoenix\/reference\/world\.py/);
    assert.equal(rep.stampBump, true, "a bad citation does not block the stamp");
  } finally { r.cleanup(); }
});

test("buildReport: a pinned stamp upstream never published is fatal", () => {
  const r = makeRepo([{ date: "2026-09-30T03:53:42Z", files: { [P]: setStamp(paramRs, "2026-09-25T16:24:28Z"), [V]: vmParams } }]);
  try {
    const rep = drift.buildReport({ clone: r.dir, config: cfg });
    assert.equal(rep.fatal[0].kind, "baseline");
    assert.equal(rep.stampBump, false);
  } finally { r.cleanup(); }
});

test("hash ignores array order and changes when a finding changes", () => {
  const a = { fatal: [], auto: [], needsYou: [{ param: "a", severity: "inert" }, { param: "b", severity: "inert" }], review: [] };
  const b = { fatal: [], auto: [], needsYou: [a.needsYou[1], a.needsYou[0]], review: [] };
  assert.equal(drift.hash(a), drift.hash(b));
  const c = { fatal: [], auto: [], needsYou: a.needsYou, review: [{ path: "x", commits: [{ sha: "1" }] }] };
  assert.notEqual(drift.hash(a), drift.hash(c));
});

test("buildReport: a moved file cited from the pinned sync holds the stamp, so a bump cannot drop it unchecked", () => {
  const r = makeRepo([
    { date: "2026-09-30T03:53:42Z", files: { [P]: paramRs, [V]: vmParams, "phoenix/reference/world.py": "x\n" } },
    { date: "2026-10-13T08:05:54Z", files: { [P]: setValue(setStamp(paramRs, "2026-10-12T16:00:33Z"), FAV, String(NEW)), [V]: setValue(vmParams, FAV, String(NEW)), "phoenix/reference/world.py": "y\n" } }
  ]);
  try {
    const rep = drift.buildReport({ clone: r.dir, config: cfg });
    assert.equal(rep.auto.length, 1);
    assert.equal(rep.review[0].baseline, rep.baseline.sha, "dwellMark has no sha of its own");
    assert.equal(rep.stampBump, false);
    assert.equal(rep.stampHold, "unverified-citations");
  } finally { r.cleanup(); }
});
