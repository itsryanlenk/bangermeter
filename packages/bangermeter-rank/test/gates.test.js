"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { gates, copy, receipts } = require("..");

// Acceptance 7 — forbidden marketing strings.
test("acceptance 7: copy gate forbids the three claims and allows the honest words", () => {
  const bad = [
    "Bangermeter predicts virality.",
    "It guarantees reach for every post",
    "A high C score means it will perform",
    "Our model predicts virality before you post"
  ];
  for (const s of bad) assert.ok(gates.copy(s).length >= 1, s);
  const ok = "A checklist against published weights, plus a retrospective score. Does not predict virality.";
  assert.deepEqual(gates.copy(ok), []);
});

test("copy gate reports file and line", () => {
  const v = gates.copy("line one\nwe guarantee reach\n", "x.md");
  assert.equal(v[0].file, "x.md");
  assert.equal(v[0].line, 2);
});

test("the shipped UI copy passes the copy gate", () => {
  assert.deepEqual(gates.copy(copy.allText()), []);
});

// Acceptance 8 — Numbers Gate.
test("acceptance 8: numbers gate passes receipt figures and fails invented ones", () => {
  assert.deepEqual(gates.numbers("Spearman 0.0809 on n=918; viral sample −0.187 on n=662."), []);
  assert.deepEqual(gates.numbers("10k+ median like rate 1.22% vs 2k–10k 3.86%."), []);
  assert.deepEqual(gates.numbers("Video save-to-like 0.494 across 184 posts; views p50 27,858."), []);
  const bad = gates.numbers("Posts with questions get 42% more likes and 3.1x reach.");
  assert.deepEqual(bad.map(b => b.token), ["42%", "3.1x"]);
});

test("numbers gate ignores dates, timestamps, versions, and published weights", () => {
  assert.deepEqual(gates.numbers("Synced 2026-09-24T16:24:49Z, weights v0.10.2, on Sep 25, 2026."), []);
  assert.deepEqual(gates.numbers("Reply is 5.0, report −234.0, like 0.5, video open 0.07."), []);
});

test("numbers gate skips fenced code in Markdown but still checks the prose around it", () => {
  const md = "Shape:\n```json\n{ \"views\": 5200, \"likes\": 140 }\n```\nPosts gain 37% more saves.\n";
  assert.deepEqual(gates.numbers(md, "x.md").map(v => [v.token, v.line]), [["37%", 5]]);
  // Outside Markdown there is no fence exemption.
  assert.equal(gates.numbers("```\n5200 views\n```", "x.js").length, 1);
});

test("the shipped UI copy passes the numbers gate", () => {
  assert.deepEqual(gates.numbers(copy.allText()), []);
});

test("receipts.get throws on an unknown id and formats rates as percentages", () => {
  assert.throws(() => receipts.get("viral.made_up"), /not in receipts/);
  assert.equal(receipts.fmt("viral.band.10k_plus.like_rate_p50"), "1.22%");
  assert.equal(receipts.fmt("viral.views_p50"), "27,858");
  assert.equal(receipts.fmt("viral.c_vs_like_rate.spearman"), "−0.187");
});

test("repo scan: README, store description, and package docs pass both gates", () => {
  const root = path.join(__dirname, "..", "..", "..");
  const res = gates.scan(root, gates.DEFAULT_TARGETS);
  assert.deepEqual(res.copy, [], JSON.stringify(res.copy, null, 1));
  assert.deepEqual(res.numbers, [], JSON.stringify(res.numbers, null, 1));
});
