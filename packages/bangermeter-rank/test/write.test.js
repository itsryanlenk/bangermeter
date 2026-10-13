"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const write = require("../lib/write");
const { sync, config: C } = require("..");
const { makeRoot } = require("./repo-fixture");

const W = "extension/weights.js", T = "extension/test.html";
const FXP = "packages/bangermeter-rank/test/fixtures/param.rs", FXV = "packages/bangermeter-rank/test/fixtures/vm-params.rs";
const NEW_STAMP = "2026-10-12T16:00:33Z";
const exp = sync.expected();
const finding = (param, live) => ({ kind: "value", param, label: "x", path: exp[param].path, files: exp[param].files, repo: exp[param].value, live });
const report = (auto, extra) => Object.assign({ auto, needsYou: [], stampBump: false, pinnedStamp: C.paramRsLastSync, liveStamp: NEW_STAMP }, extra);
const notes = text => text.split(/\r?\n/).filter(l => /note:/.test(l));

test("every synced param has exactly one write site in the real weights.js and fixtures", () => {
  const root = makeRoot();
  try {
    for (const [param, e] of Object.entries(exp)) {
      const r = write.applyAuto({ root: root.dir, report: report([finding(param, e.value)]) });
      assert.deepEqual(r.changed, [], param + " rewrote its own value");
    }
  } finally { root.cleanup(); }
});

test("a head change edits weights.js, the PARAM_RS table, the sums and both fixtures — nothing else", () => {
  const root = makeRoot();
  try {
    const before = { w: root.read(W), t: root.read(T) };
    const r = write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_favorite_weight", 0.6)]) });
    assert.deepEqual(r.changed.sort(), [T, W, FXP, FXV].sort());
    const w = root.read(W), t = root.read(T);
    assert.equal(w.replace("favorite: { weight: 0.6", "favorite: { weight: 0.5"), before.w, "only the one literal changed");
    assert.match(t, /favorite: 0\.6, reply: 5\.0/);
    assert.match(t, /check\("positive_sum = 43\.34", approx\(C\.weightSums\.positive, 43\.34, 1e-9\)/);
    assert.match(t, /check\("total_sum = 414\.88", approx\(C\.weightSums\.total, 414\.88, 1e-9\)/);
    assert.match(root.read(FXP), /"rust_home_mixer_favorite_weight",\s*0\.6/);
    assert.match(root.read(FXV), /"rust_home_mixer_favorite_weight",\s*0\.6/);
    assert.deepEqual(notes(w), notes(before.w), "no note string touched");
    assert.equal(r.sumsMoved, true);
    assert.equal(r.ceilingMoved, false, "0.000896 still rounds the same");
    assert.equal(r.stamp, null);
  } finally { root.cleanup(); }
});

test("running it twice changes nothing the second time", () => {
  const root = makeRoot();
  try {
    const rep = report([finding("rust_home_mixer_favorite_weight", 0.6)]);
    write.applyAuto({ root: root.dir, report: rep });
    assert.deepEqual(write.applyAuto({ root: root.dir, report: rep }).changed, []);
  } finally { root.cleanup(); }
});

test("a moved ceiling updates the test's expected figure, so the stale note goes red", () => {
  const root = makeRoot();
  try {
    const r = write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_not_interested_weight", -60.0)]) });
    assert.equal(r.ceilingMoved, true);
    assert.equal(r.sums.after.ceiling, "0.000899");
    const t = root.read(T);
    assert.match(t, /note quotes the current ceiling \(0\.000899\)/);
    assert.match(t, /\/0\\\.000899\/\.test\(SF\.negativeOffsetRule\.note\)/);
    assert.match(root.read(W), /0\.000896/, "the note itself is left for a human");
    assert.ok(r.staleLines.some(s => s.file === "README.md" && s.figure === "0.000896"));
    assert.ok(r.staleLines.some(s => s.file === "RESEARCH.md" && s.figure === "371.54"));
  } finally { root.cleanup(); }
});

test("a vm-only param edits weights.js and the vm fixture only, and moves no sum", () => {
  const root = makeRoot();
  try {
    const r = write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_oon_weight_factor", 0.8)]) });
    assert.deepEqual(r.changed.sort(), [W, FXV].sort());
    assert.equal(r.sumsMoved, false);
  } finally { root.cleanup(); }
});

test("the stamp moves in code and test pins only when the report allows it — never in prose or comments", () => {
  const root = makeRoot();
  try {
    const old = C.paramRsLastSync;
    const r = write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_favorite_weight", 0.6)], { stampBump: true }) });
    assert.deepEqual(r.stamp, { from: old, to: NEW_STAMP });
    const w = root.read(W);
    assert.match(w, new RegExp('paramRsLastSync: "' + NEW_STAMP + '"'));
    assert.match(w, new RegExp("weightsSnapshot: .*" + old), "the snapshot prose keeps its stamp");
    const t = root.read(T);
    assert.match(t, new RegExp('C\\.paramRsLastSync === "' + NEW_STAMP + '"'));
    assert.match(t, new RegExp("// home-mixer/params/param\\.rs \\(sync " + old + "\\)"), "comments untouched");
    assert.match(root.read(FXP), new RegExp("last sync " + NEW_STAMP));
    assert.doesNotMatch(root.read("packages/bangermeter-rank/test/sync.test.js"), new RegExp(old));
    assert.doesNotMatch(root.read("packages/bangermeter-rank/test/modes.test.js"), new RegExp(old));
  } finally { root.cleanup(); }
});

test("CRLF stays CRLF and test.html keeps its BOM", () => {
  const root = makeRoot({ eol: "crlf" });
  try {
    root.write(T, "\uFEFF" + root.read(T).replace(/^\uFEFF/, ""));
    write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_favorite_weight", 0.6)]) });
    for (const rel of [W, T, FXP]) assert.doesNotMatch(root.read(rel), /[^\r]\n/, rel + " gained a bare LF");
    assert.equal(root.read(T).charCodeAt(0), 0xFEFF);
  } finally { root.cleanup(); }
});

test("zero or several edit sites throw, and nothing is written", () => {
  const root = makeRoot();
  try {
    const before = root.read(W);
    const bad = Object.assign(finding("rust_home_mixer_favorite_weight", 0.6), { path: ["heads", "nosuch", "weight"] });
    assert.throws(() => write.applyAuto({ root: root.dir, report: report([bad]) }), write.WriteError);
    // A second, still-valid site: duplicating the head's first line would leave weights.js unparseable.
    root.write(W, before + "\nvar DUP = {\n  favorite: { weight: 0.5 }\n};\n");
    assert.throws(() => write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_favorite_weight", 0.6)]) }), /found 2/);
    assert.equal(root.read(FXP).includes('"rust_home_mixer_favorite_weight", 0.6'), false, "fixtures untouched");
  } finally { root.cleanup(); }
});

test("odd upstream literals are written in weights.js style", () => {
  assert.equal(write.formatLike("0.5", 0.6), "0.6");
  assert.equal(write.formatLike("5.0", 6), "6.0");
  assert.equal(write.formatLike("-234.0", -250), "-250.0");
  assert.equal(write.formatLike("10000", 15000), "15000");
  assert.equal(write.formatLike("0.00001", 1e-5), "0.00001");
});

test("refuses to run outside the repo; the allowlist is exact", () => {
  assert.throws(() => write.applyAuto({ root: require("os").tmpdir(), report: report([]) }), /inside the Bangermeter repo/);
  assert.deepEqual(write.outsideAllowlist(["extension/weights.js", "README.md", "extension\\test.html"]), ["README.md"]);
});
