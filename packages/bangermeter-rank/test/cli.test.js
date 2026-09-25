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
