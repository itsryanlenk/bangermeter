"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { plan, hashFromBody, BRANCH } = require("../lib/publish");

const head = { sha: "e1a0375aaaa", date: "2026-10-13T08:05:54Z" };
const R = extra => Object.assign({ hash: "h1", upstreamHead: head, liveStamp: "s", pinnedStamp: "p", baseline: null,
  fatal: [], auto: [], needsYou: [{ kind: "added", param: "x", severity: "inert", live: { vmParams: 0 }, arrivals: {} }], review: [] }, extra);
const auto = [{ kind: "value", param: "p", label: "Likes", repo: 0.5, live: 0.6, arrivals: {} }];
const wrote = { changed: ["extension/weights.js"], staleLines: [], sums: null, sumsMoved: false, ceilingMoved: false, stamp: null };
const S = extra => Object.assign({ issue: null, pr: null, foreignCommits: false }, extra);
const types = actions => actions.map(a => a.type);
const O = { owner: "itsryanlenk" };

test("first sighting opens the issue, cc'ing the owner", () => {
  const a = plan(R(), S(), O);
  assert.deepEqual(types(a), ["issue.create"]);
  assert.match(a[0].body, /cc @itsryanlenk/);
  assert.equal(a[0].label, "upstream-drift");
});

test("the same findings again do nothing — open or closed (closed means dismissed)", () => {
  assert.deepEqual(plan(R(), S({ issue: { number: 7, open: true, hash: "h1" } }), O), []);
  assert.deepEqual(plan(R(), S({ issue: { number: 7, open: false, hash: "h1" } }), O), []);
});

test("new findings update the open issue and @mention once", () => {
  const a = plan(R(), S({ issue: { number: 7, open: true, hash: "old" } }), O);
  assert.deepEqual(types(a), ["issue.update", "issue.comment"]);
  assert.match(a[1].body, /^@itsryanlenk /);
});

test("a hand-edited body without the marker gets one update and comment, not a daily one", () => {
  assert.deepEqual(types(plan(R(), S({ issue: { number: 7, open: true, hash: null } }), O)), ["issue.update", "issue.comment"]);
});

test("new findings after the issue was closed open a new issue", () => {
  assert.deepEqual(types(plan(R(), S({ issue: { number: 7, open: false, hash: "old" } }), O)), ["issue.create"]);
});

test("nothing left closes the open issue, and a bot-only PR", () => {
  const clean = R({ needsYou: [] });
  assert.deepEqual(types(plan(clean, S({ issue: { number: 7, open: true, hash: "h1" }, pr: { number: 9 } }), O)), ["issue.close", "pr.close"]);
  assert.deepEqual(types(plan(clean, S({ issue: { number: 7, open: false, hash: "h1" } }), O)), []);
  assert.deepEqual(types(plan(clean, S({ pr: { number: 9 }, foreignCommits: true }), O)), [], "a branch with your commits stays open");
});

test("mechanical edits push the bot branch and open a draft PR before the issue", () => {
  const a = plan(R({ auto, write: wrote }), S(), O);
  assert.deepEqual(types(a), ["branch.push", "pr.create", "issue.create"]);
  assert.equal(a[0].branch, BRANCH);
  assert.match(a[0].message, /^Apply upstream values from e1a0375/);
});

test("an existing bot PR is force-updated when findings change", () => {
  assert.deepEqual(types(plan(R({ auto, write: wrote }), S({ issue: { number: 7, open: true, hash: "old" }, pr: { number: 9 } }), O)),
    ["branch.push", "pr.update", "issue.update", "issue.comment"]);
});

test("a branch carrying someone else's commits is never pushed; the PR gets a comment", () => {
  const a = plan(R({ auto, write: wrote }), S({ issue: { number: 7, open: true, hash: "old" }, pr: { number: 9 }, foreignCommits: true }), O);
  assert.deepEqual(types(a), ["pr.comment", "issue.update", "issue.comment"]);
});

test("auto now empty closes a bot-only PR", () => {
  assert.deepEqual(types(plan(R(), S({ issue: { number: 7, open: true, hash: "old" }, pr: { number: 9 } }), O)),
    ["pr.close", "issue.update", "issue.comment"]);
});

test("fatal findings never touch the PR, and fail the run every time", () => {
  const broken = R({ fatal: [{ kind: "baseline", message: "baseline: stamp gone" }], auto, write: wrote });
  assert.deepEqual(types(plan(broken, S({ issue: { number: 7, open: true, hash: "old" }, pr: { number: 9 } }), O)), ["issue.update", "issue.comment", "fail"]);
  assert.deepEqual(types(plan(broken, S({ issue: { number: 7, open: true, hash: "h1" }, pr: { number: 9 } }), O)), ["fail"]);
});

test("hashFromBody reads the marker", () => {
  assert.equal(hashFromBody("<!-- findings-hash: 0123456789abcdef -->\ncc"), "0123456789abcdef");
  assert.equal(hashFromBody("edited by hand"), null);
});
