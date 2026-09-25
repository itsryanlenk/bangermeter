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
  assert.deepEqual(res.headCount, [], JSON.stringify(res.headCount, null, 1));
  assert.deepEqual(res.missing, []);
});

// ── review findings: gate holes ─────────────────────────────────────────────
test("numbers gate catches the invented figures the review slipped past it", () => {
  const cases = [
    ["Reply = 27× a like", "27×"],
    ["Decreased 45% of reach", "45%"],
    ["Posts averaged 1950 likes", "1950"],
    ["Spearman +0.187 — a positive link", "+0.187"],
    ["E Spearman −0.7463 on the band", "−0.7463"],
    ["like rate 0.05 across the sample", "0.05"],
    ["Costs $20 a month", "$20"],
    ["It adds 3x reach", "3x"]
  ];
  for (const [text, tok] of cases) {
    assert.deepEqual(gates.numbers(text).map(v => v.token), [tok], text);
  }
});

test("numbers gate: a sign is part of the figure", () => {
  assert.deepEqual(gates.numbers("Spearman −0.187 (n=662)"), []);
  assert.deepEqual(gates.numbers("Spearman 0.187"), [{ file: null, line: 1, token: "0.187" }]);
});

test("numbers gate: an unclosed fence in Markdown is itself a failure", () => {
  const v = gates.numbers("text\n```\n9999 made up\n", "x.md");
  assert.ok(v.some(x => x.token === "unclosed code fence"));
});

test("copy gate catches variants, markup, and line breaks", () => {
  const bad = [
    "This can predict virality", "It predicted virality twice", "guarantees more reach",
    "guaranteeing reach for creators", "A high C score means your post will perform",
    "C scores mean it will perform", "predicts\nvirality", "predicts <b>virality</b>", "predicts&nbsp;virality"
  ];
  for (const s of bad) assert.ok(gates.copy(s).length >= 1, JSON.stringify(s));
});

test("copy gate allows the negations the product must say", () => {
  const ok = ["This tool never predicts virality.", "Does not predict virality.",
    "It does not guarantee reach.", "C does not forecast reach or likes."];
  for (const s of ok) assert.deepEqual(gates.copy(s), [], s);
});

test("head-count claims in UI copy match the engine's roster", () => {
  const n = require("..").config ? Object.keys(require("..").config.heads).length : 0;
  assert.equal(n, 25);
  assert.equal(gates.headCount("All 25 ranking heads, their published values").length, 0);
  assert.equal(gates.headCount("The popup labels all 26 ranking heads as").length, 1);
  // A dated, historical statement is not a current claim.
  assert.equal(gates.headCount("All 26 weights re-verified unchanged against X's published file on August 25.").length, 0);
});
