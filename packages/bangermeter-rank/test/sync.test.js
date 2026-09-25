"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { sync } = require("..");

const fx = f => fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8");
const paramRs = fx("param.rs");
const vmParams = fx("vm-params.rs");

test("parse reads the last-sync stamp and numeric defaults (including 10_000 literals)", () => {
  const p = sync.parse(paramRs);
  assert.equal(p.lastSync, "2026-09-24T16:24:49Z");
  assert.equal(p.params.rust_home_mixer_favorite_weight, 0.5);
  assert.equal(p.params.rust_home_mixer_report_weight, -234.0);
  assert.equal(p.params.rust_home_mixer_min_video_duration_ms, 10000);
});

// Acceptance 6 — weights match the live table (VideoOpen 0.07, Vqv 0.0, Dwell 0.05).
test("acceptance 6: repo weights match the pinned live table", () => {
  const r = sync.check({ paramRs, vmParams });
  assert.equal(r.ok, true, JSON.stringify(r.problems, null, 1));
  assert.equal(r.headsChecked, 25);
  assert.equal(r.live.rust_home_mixer_video_open_weight, 0.07);
  assert.equal(r.live.rust_home_mixer_vqv_weight, 0.0);
  assert.equal(r.live.rust_home_mixer_dwell_weight, 0.05);
  assert.equal(r.lastSync, "2026-09-24T16:24:49Z");
  assert.equal(r.stampMatchesPin, true);
});

test("drift on a critical head fails loudly and names it critical", () => {
  const bad = paramRs.replace('"rust_home_mixer_favorite_weight", 0.5', '"rust_home_mixer_favorite_weight", 0.6');
  const r = sync.check({ paramRs: bad, vmParams: vmParams.replace('"rust_home_mixer_favorite_weight", 0.5', '"rust_home_mixer_favorite_weight", 0.6') });
  assert.equal(r.ok, false);
  const p = r.problems.find(x => x.param === "rust_home_mixer_favorite_weight");
  assert.equal(p.kind, "value");
  assert.equal(p.critical, true);
  assert.equal(p.repo, 0.5);
  assert.equal(p.live, 0.6);
});

test("OON factor drift is caught (it lives in vm-ranker/params.rs)", () => {
  const r = sync.check({ paramRs, vmParams: vmParams.replace(/("rust_home_mixer_oon_weight_factor",\s*)0\.75/, "$10.8") });
  assert.equal(r.ok, false);
  const p = r.problems.find(x => x.param === "rust_home_mixer_oon_weight_factor");
  assert.equal(p.critical, true);
});

test("a head removed upstream, or a new head added, is drift", () => {
  const removed = paramRs.replace(/param!\(DwellWeight[^;]*;/, "");
  const vmRemoved = vmParams.replace(/param!\(DwellWeight[^;]*;/, "");
  const r1 = sync.check({ paramRs: removed, vmParams: vmRemoved });
  assert.equal(r1.ok, false);
  assert.ok(r1.problems.some(p => p.kind === "removed" && p.param === "rust_home_mixer_dwell_weight" && p.critical));

  const added = paramRs + '\nparam!(NewThingWeight, f64, "rust_home_mixer_new_thing_weight", 3.0);\n';
  const r2 = sync.check({ paramRs: added, vmParams });
  assert.equal(r2.ok, false);
  assert.ok(r2.problems.some(p => p.kind === "added" && p.param === "rust_home_mixer_new_thing_weight"));
});

test("the two upstream files disagreeing is drift", () => {
  const r = sync.check({ paramRs, vmParams: vmParams.replace('"rust_home_mixer_reply_weight", 5.0', '"rust_home_mixer_reply_weight", 6.0') });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some(p => p.kind === "disagree" && p.param === "rust_home_mixer_reply_weight"));
});

test("an advanced stamp with unchanged values passes but is reported", () => {
  const r = sync.check({ paramRs: paramRs.replace("2026-09-24T16:24:49Z", "2026-09-30T00:00:00Z"), vmParams });
  assert.equal(r.ok, true);
  assert.equal(r.stampMatchesPin, false);
  assert.equal(r.lastSync, "2026-09-30T00:00:00Z");
});

test("an unparseable file is an error, not a pass", () => {
  const r = sync.check({ paramRs: "<html>rate limited</html>", vmParams });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some(p => p.kind === "unparseable"));
});

// ── review findings: per-file checking, comments, truncation, stamp ─────────
test("a head missing from only ONE upstream file is drift (either file)", () => {
  const r1 = sync.check({ paramRs: paramRs.replace(/param!\(DwellWeight[^;]*;/, ""), vmParams });
  assert.equal(r1.ok, false);
  assert.ok(r1.problems.some(p => p.param === "rust_home_mixer_dwell_weight" && p.file === "paramRs"));
  const r2 = sync.check({ paramRs, vmParams: vmParams.replace(/param!\(ReportWeight[^;]*;/, "") });
  assert.equal(r2.ok, false);
  assert.ok(r2.problems.some(p => p.param === "rust_home_mixer_report_weight" && p.file === "vmParams" && p.critical));
});

test("a truncated file fails", () => {
  const r = sync.check({ paramRs: paramRs.slice(0, Math.floor(paramRs.length / 4)), vmParams });
  assert.equal(r.ok, false);
});

test("commented-out param! lines are not live values", () => {
  const commentOut = s => s.replace(/param!\(FavoriteWeight[^;]*;/, m => "// " + m);
  const r1 = sync.check({ paramRs: commentOut(paramRs), vmParams: commentOut(vmParams) });
  assert.equal(r1.ok, false);
  assert.ok(r1.problems.some(p => p.kind === "removed" && p.param === "rust_home_mixer_favorite_weight"));

  const changed = s => s.replace(/param!\(FavoriteWeight[^;]*;/,
    'param!(FavoriteWeight, f64, "rust_home_mixer_favorite_weight", 0.9);\n// was: param!(FavoriteWeight, f64, "rust_home_mixer_favorite_weight", 0.5);');
  const r2 = sync.check({ paramRs: changed(paramRs), vmParams: changed(vmParams) });
  assert.equal(r2.ok, false);
  assert.ok(r2.problems.some(p => p.kind === "value" && p.live === 0.9));

  const block = s => s.replace(/param!\(ReportWeight[^;]*;/, m => "/* " + m + " */");
  assert.equal(sync.check({ paramRs: block(paramRs), vmParams: block(vmParams) }).ok, false);
});

test("a parameter declared twice in one file is drift", () => {
  const dup = paramRs + '\nparam!(FavoriteWeight2, f64, "rust_home_mixer_favorite_weight", 0.5);\n';
  const r = sync.check({ paramRs: dup, vmParams });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some(p => p.kind === "duplicate"));
});

test("a missing last-sync stamp fails", () => {
  const r = sync.check({ paramRs: paramRs.replace(/^\/\/ mirrored.*$/m, ""), vmParams });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some(p => p.kind === "nostamp"));
});

test("the new-user OON factor is checked too", () => {
  const r = sync.check({ paramRs, vmParams: vmParams.replace(/0\.00001/, "0.5") });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some(p => p.param === "rust_home_mixer_new_user_oon_weight_factor"));
});
