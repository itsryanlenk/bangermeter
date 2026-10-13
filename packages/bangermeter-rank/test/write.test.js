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
// Values derived from today's weights.js, so a test's "upstream moved" stays a
// move after the bot lands a real change (a fixed 0.6 stops being one the day
// weights.js holds 0.6).
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const round = n => +n.toFixed(10);
const S = C.weightSums;
const OLD = C.heads.favorite.weight, NEW = round(OLD + 0.1);
const ceil = (neg, tot) => (neg / tot * C.negativeScoresOffset).toFixed(6);

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
    const r = write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_favorite_weight", NEW)]) });
    assert.deepEqual(r.changed.sort(), [T, W, FXP, FXV].sort());
    const w = root.read(W), t = root.read(T);
    const oldLit = /favorite: \{ weight: ([^,\s]+)/.exec(before.w)[1];
    assert.equal(w.replace("favorite: { weight: " + write.formatLike(oldLit, NEW), "favorite: { weight: " + oldLit), before.w, "only the one literal changed");
    assert.match(t, new RegExp("favorite: " + esc(NEW) + ", reply: "));
    const pos = write.formatLike("0.0", round(S.positive + NEW - OLD)), tot = write.formatLike("0.0", round(S.total + NEW - OLD));
    assert.ok(t.includes('check("positive_sum = ' + pos + '", approx(C.weightSums.positive, ' + pos + ", 1e-9)"), pos);
    assert.ok(t.includes('check("total_sum = ' + tot + '", approx(C.weightSums.total, ' + tot + ", 1e-9)"), tot);
    assert.match(root.read(FXP), new RegExp('"rust_home_mixer_favorite_weight",\\s*' + esc(NEW)));
    assert.match(root.read(FXV), new RegExp('"rust_home_mixer_favorite_weight",\\s*' + esc(NEW)));
    assert.deepEqual(notes(w), notes(before.w), "no note string touched");
    assert.equal(r.sumsMoved, true);
    assert.equal(r.ceilingMoved, ceil(S.negative, S.total) !== ceil(S.negative, S.total + NEW - OLD));
    assert.equal(r.stamp, null);
  } finally { root.cleanup(); }
});

test("running it twice changes nothing the second time", () => {
  const root = makeRoot();
  try {
    const rep = report([finding("rust_home_mixer_favorite_weight", NEW)]);
    write.applyAuto({ root: root.dir, report: rep });
    assert.deepEqual(write.applyAuto({ root: root.dir, report: rep }).changed, []);
  } finally { root.cleanup(); }
});

test("a moved ceiling updates the test's expected figure, so the stale note goes red", () => {
  const root = makeRoot();
  try {
    // Deepen not-interested by 12.5, enough to move the ceiling's sixth decimal.
    const NI_NEW = round(C.heads.not_interested.weight - 12.5);
    const before = ceil(S.negative, S.total), after = ceil(S.negative + 12.5, S.total + 12.5);
    root.write("README.md", "Rescaled into [0, " + before + ").\n");
    root.write("RESEARCH.md", "Sums: negative " + round(S.negative) + ".\n");
    const r = write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_not_interested_weight", NI_NEW)]) });
    assert.equal(r.ceilingMoved, true);
    assert.equal(r.sums.after.ceiling, after);
    const t = root.read(T);
    assert.ok(t.includes("note quotes the current ceiling (" + after + ")"));
    assert.ok(t.includes("/" + after.replace(".", "\\.") + "/.test(SF.negativeOffsetRule.note)"));
    assert.ok(root.read(W).includes(before), "the note itself is left for a human");
    assert.ok(r.staleLines.some(s => s.file === "README.md" && s.figure === before));
    assert.ok(r.staleLines.some(s => s.file === "RESEARCH.md" && s.figure === String(round(S.negative))));
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
    const r = write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_favorite_weight", NEW)], { stampBump: true }) });
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
    write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_favorite_weight", NEW)]) });
    for (const rel of [W, T, FXP]) assert.doesNotMatch(root.read(rel), /[^\r]\n/, rel + " gained a bare LF");
    assert.equal(root.read(T).charCodeAt(0), 0xFEFF);
  } finally { root.cleanup(); }
});

test("zero or several edit sites throw, and nothing is written", () => {
  const root = makeRoot();
  try {
    const before = root.read(W);
    const bad = Object.assign(finding("rust_home_mixer_favorite_weight", NEW), { path: ["heads", "nosuch", "weight"] });
    assert.throws(() => write.applyAuto({ root: root.dir, report: report([bad]) }), write.WriteError);
    // A second, still-valid site: duplicating the head's first line would leave weights.js unparseable.
    root.write(W, before + "\nvar DUP = {\n  favorite: { weight: 0.5 }\n};\n");
    assert.throws(() => write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_favorite_weight", NEW)]) }), /found 2/);
    assert.equal(root.read(FXP).includes('"rust_home_mixer_favorite_weight", ' + NEW), false, "fixtures untouched");
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
