"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const BIN = path.join(__dirname, "..", "bin", "bangermeter-rank.js");
const MAKE = path.join(__dirname, "..", "examples", "make-sample.js");
const run = (...args) => spawnSync(process.execPath, [BIN, ...args], { encoding: "utf8" });

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bmr-cli-"));
const sample = path.join(dir, "sample.jsonl");
test.before(() => {
  const r = spawnSync(process.execPath, [MAKE, sample], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test("the example generator writes synthetic, clearly-labeled posts", () => {
  const rows = fs.readFileSync(sample, "utf8").trim().split("\n").map(JSON.parse);
  assert.ok(rows.length >= 10);
  assert.ok(rows.every(r => r.synthetic === true));
});

test("rank --json FILE works with the flag before the file", () => {
  const r = run("rank", "--json", sample);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).mode, "audit");
});

test("bad --winners values are usage errors, not silent drops", () => {
  for (const v of ["-1", "abc", "1.5"]) {
    const r = run("rank", sample, "--winners", v);
    assert.equal(r.status, 2, v);
    assert.match(r.stderr, /winners/);
  }
  const zero = run("rank", sample, "--winners", "0", "--json");
  assert.equal(zero.status, 0, zero.stderr);
  assert.equal(JSON.parse(zero.stdout).winners.length, 0);
});

test("an unknown mode or a missing --out value exits 2 with a message, no stack trace", () => {
  const m = run("rank", sample, "--mode", "virality");
  assert.equal(m.status, 2);
  assert.match(m.stderr, /unknown mode/);
  assert.doesNotMatch(m.stderr, /\n\s+at /);
  const o = run("report", sample, "--out");
  assert.equal(o.status, 2);
  assert.match(o.stderr, /--out/);
});

test("report writes a file that passes its own gates", () => {
  const out = path.join(dir, "audit.html");
  const r = run("report", sample, "--out", out, "--account", "@example");
  assert.equal(r.status, 0, r.stderr);
  assert.match(fs.readFileSync(out, "utf8"), /Misses/);
});

test("sync against local fixtures passes, and against a drifted file exits 1", () => {
  const fx = f => path.join(__dirname, "fixtures", f);
  const ok = run("sync", "--param-rs", fx("param.rs"), "--vm-params", fx("vm-params.rs"));
  assert.equal(ok.status, 0, ok.stderr);
  const bad = path.join(dir, "bad.rs");
  fs.writeFileSync(bad, fs.readFileSync(fx("param.rs"), "utf8").replace('"rust_home_mixer_reply_weight", 5.0', '"rust_home_mixer_reply_weight", 6.0'));
  const r = run("sync", "--param-rs", bad, "--vm-params", fx("vm-params.rs"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /CRITICAL/);
});

const upstream = require("../lib/upstream");
const { makeRepo, fixture, setStamp, setValue } = require("./git-fixture");
const { makeRoot } = require("./repo-fixture");
const FAVP = "rust_home_mixer_favorite_weight";
const upstreamWith = (paramRsText, vmText) => makeRepo([
  { date: "2026-09-30T03:53:42Z", files: { [upstream.FILES.paramRs]: fixture("param.rs"), [upstream.FILES.vmParams]: fixture("vm-params.rs") } },
  { date: "2026-10-13T08:05:54Z", files: { [upstream.FILES.paramRs]: setStamp(paramRsText, "2026-10-12T16:00:33Z"), [upstream.FILES.vmParams]: vmText } }
]);

test("sync --history --report: drift is reported with exit 0, not a failure", () => {
  const up = upstreamWith(setValue(fixture("param.rs"), FAVP, "0.6"), fixture("vm-params.rs"));
  const out = path.join(dir, "drift.json");
  try {
    const r = run("sync", "--history", up.dir, "--report", out);
    assert.equal(r.status, 0, r.stderr);
    const rep = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.equal(rep.needsYou.find(f => f.param === FAVP).kind, "disagree");
    assert.equal(rep.write, undefined);
    assert.match(r.stdout, /NEEDS YOU/);
  } finally { up.cleanup(); }
});

test("sync --write applies auto findings under --root and records them in the report", () => {
  const up = upstreamWith(setValue(fixture("param.rs"), FAVP, "0.6"), setValue(fixture("vm-params.rs"), FAVP, "0.6"));
  const root = makeRoot();
  const out = path.join(dir, "drift-w.json");
  try {
    const r = run("sync", "--history", up.dir, "--report", out, "--write", "--root", root.dir);
    assert.equal(r.status, 0, r.stderr);
    const rep = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.ok(rep.write.changed.includes("extension/weights.js"));
    assert.match(root.read("extension/weights.js"), /favorite: \{ weight: 0\.6/);
  } finally { up.cleanup(); root.cleanup(); }
});

test("sync --history exits 1 when weights.js pins a stamp upstream never published", () => {
  const up = makeRepo([{ date: "2026-09-30T03:53:42Z", files: {
    [upstream.FILES.paramRs]: setStamp(fixture("param.rs"), "2026-09-25T16:24:28Z"), [upstream.FILES.vmParams]: fixture("vm-params.rs") } }]);
  try {
    const r = run("sync", "--history", up.dir);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /FATAL/);
  } finally { up.cleanup(); }
});

test("sync --write without --history or --report is a usage error", () => {
  assert.equal(run("sync", "--write").status, 2);
  assert.equal(run("sync", "--history", dir, "--write").status, 2);
});
