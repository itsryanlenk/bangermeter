"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const upstream = require("../lib/upstream");
const { makeRepo, fixture, setStamp, setValue } = require("./git-fixture");

const P = upstream.FILES.paramRs, V = upstream.FILES.vmParams;
const FAV = "rust_home_mixer_favorite_weight", OON = "rust_home_mixer_oon_weight_factor";
// Likes as the fixtures hold it today, and a value they do not: a fixed 0.6
// would stop being a move the day upstream (and the bot) land Likes 0.6.
const OLD = require("../lib/sync").parse(fixture("param.rs")).params[FAV], NEW = +(OLD + 0.1).toFixed(10);
const B = "2026-09-29T17:02:52Z";                       // the fixtures' stamp
const paramRs = fixture("param.rs"), vmParams = fixture("vm-params.rs");
const CLONE = path.join(__dirname, "..", "..", "..", "repo", "x-algorithm");

test("findBaseline returns the commit that introduced the pinned stamp", () => {
  const r = makeRepo([
    { date: "2026-09-26T03:39:02Z", files: { [P]: setStamp(paramRs, "2026-09-25T16:24:28Z"), [V]: vmParams } },
    { date: "2026-09-30T03:53:42Z", files: { [P]: paramRs } },
    { date: "2026-10-01T02:13:55Z", files: { [P]: setStamp(paramRs, "2026-09-30T16:00:40Z") } }
  ]);
  try {
    const b = upstream.findBaseline(r.dir, B);
    assert.equal(b.sha, r.sha("HEAD~1"));
    assert.equal(b.date, "2026-09-30T03:53:42Z");
    assert.equal(b.stamp, B);
  } finally { r.cleanup(); }
});

test("findBaseline throws, naming the stamp, when upstream never published it", () => {
  const r = makeRepo([{ date: "2026-09-30T03:53:42Z", files: { [P]: setStamp(paramRs, "2026-09-25T16:24:28Z"), [V]: vmParams } }]);
  try { assert.throws(() => upstream.findBaseline(r.dir, B), /2026-09-29T17:02:52Z/); }
  finally { r.cleanup(); }
});

test("arrival dates a change by its own file's commit, with param.rs's stamp", () => {
  const r = makeRepo([
    { date: "2026-09-30T03:53:42Z", files: { [P]: paramRs, [V]: vmParams } },
    { date: "2026-10-01T02:13:55Z", files: { [P]: setStamp(paramRs, "2026-09-30T16:00:40Z") } },
    { date: "2026-10-13T08:05:54Z", files: { [P]: setValue(setStamp(paramRs, "2026-10-12T16:00:33Z"), FAV, String(NEW)) } }
  ]);
  try {
    const a = upstream.arrival(r.dir, "paramRs", FAV, upstream.findBaseline(r.dir, B));
    assert.deepEqual(a, { sha: r.sha("HEAD"), date: "2026-10-13T08:05:54Z", stamp: "2026-10-12T16:00:33Z", from: OLD, to: NEW });
    assert.equal(upstream.arrival(r.dir, "vmParams", FAV, upstream.findBaseline(r.dir, B)), null, "vm-ranker never moved");
  } finally { r.cleanup(); }
});

test("a value that moves and moves back dates from its latest arrival, not its first", () => {
  const r = makeRepo([
    { date: "2026-09-30T03:00:00Z", files: { [P]: paramRs, [V]: vmParams } },
    { date: "2026-10-02T03:00:00Z", files: { [P]: setValue(paramRs, FAV, String(NEW)) } },
    { date: "2026-10-03T03:00:00Z", files: { [P]: setValue(paramRs, FAV, String(OLD)) } },
    { date: "2026-10-06T03:00:00Z", files: { [P]: setValue(paramRs, FAV, String(NEW)) } }
  ]);
  try {
    const a = upstream.arrival(r.dir, "paramRs", FAV, upstream.findBaseline(r.dir, B));
    assert.equal(a.date, "2026-10-06T03:00:00Z");
    assert.equal(a.from, OLD);
  } finally { r.cleanup(); }
});

test("a vm-only change is dated by vm-ranker's commit, stamped with param.rs at that commit", () => {
  const r = makeRepo([
    { date: "2026-09-30T03:00:00Z", files: { [P]: paramRs, [V]: vmParams } },
    { date: "2026-10-07T03:05:56Z", files: { [P]: setStamp(paramRs, "2026-10-06T16:00:58Z"), [V]: setValue(vmParams, OON, "0.8") } }
  ]);
  try {
    const a = upstream.arrival(r.dir, "vmParams", OON, upstream.findBaseline(r.dir, B));
    assert.equal(a.stamp, "2026-10-06T16:00:58Z");
    assert.equal(a.to, 0.8);
  } finally { r.cleanup(); }
});

test("a removal is dated too (to: undefined)", () => {
  const r = makeRepo([
    { date: "2026-09-30T03:00:00Z", files: { [P]: paramRs, [V]: vmParams } },
    { date: "2026-10-08T05:09:20Z", files: { [P]: paramRs.replace(/param!\(DwellWeight[^;]*;/, "") } }
  ]);
  try {
    const a = upstream.arrival(r.dir, "paramRs", "rust_home_mixer_dwell_weight", upstream.findBaseline(r.dir, B));
    assert.equal(a.date, "2026-10-08T05:09:20Z");
    assert.equal(a.from, 0.05);
    assert.equal(a.to, undefined);
  } finally { r.cleanup(); }
});

test("commitsTouching a directory lists commits after the baseline, oldest first; existsAt checks paths", () => {
  const r = makeRepo([
    { date: "2026-09-30T03:00:00Z", files: { "grox/flows/reply_spam/task_filter.py": "x = 1\n" } },
    { date: "2026-10-02T03:00:00Z", files: { "README.md": "unrelated\n" } },
    { date: "2026-10-03T03:00:00Z", files: { "grox/flows/reply_spam/task_filter.py": "x = 2\n" } }
  ]);
  try {
    const base = r.sha("HEAD~2");
    const c = upstream.commitsTouching(r.dir, "grox/flows/reply_spam/", { since: base });
    assert.deepEqual(c, [{ sha: r.sha("HEAD"), date: "2026-10-03T03:00:00Z" }]);
    assert.equal(upstream.existsAt(r.dir, base, "grox/flows/reply_spam/"), true);
    assert.equal(upstream.existsAt(r.dir, base, "grox/flows/nope.py"), false);
    assert.equal(upstream.existsAt(r.dir, "deadbee", "grox/flows/reply_spam/"), false);
  } finally { r.cleanup(); }
});

// The dates weights.js already records, reproduced from real history.
test("real history: click 0.4 → 0.3 arrived in a707cc2 (Sept 28 sync, published Sept 29)",
  { skip: !fs.existsSync(path.join(CLONE, ".git")) && "no local clone at repo/x-algorithm" }, () => {
    const b = upstream.findBaseline(CLONE, "2026-09-18T16:21:20Z", { head: "77d431a" });
    assert.equal(b.sha.slice(0, 7), "8b25829");
    const a = upstream.arrival(CLONE, "paramRs", "rust_home_mixer_click_weight", b, { head: "77d431a" });
    assert.equal(a.sha.slice(0, 7), "a707cc2");
    assert.equal(a.stamp, "2026-09-28T16:00:35Z");
    assert.equal(a.date, "2026-09-29T03:06:30Z");
    assert.equal(a.from, 0.4);
    assert.equal(a.to, 0.3);
  });
