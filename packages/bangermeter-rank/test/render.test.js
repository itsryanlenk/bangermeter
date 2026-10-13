"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const render = require("../lib/render");

const arr = (date, stamp, sha) => ({ sha: sha || "e1a0375aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", date, stamp, from: 0.5, to: 0.6 });
const auto = { kind: "value", param: "rust_home_mixer_favorite_weight", label: "Likes", repo: 0.5, live: 0.6,
  arrivals: { paramRs: arr("2026-10-13T08:05:54Z", "2026-10-12T16:00:33Z") } };
const base = {
  hash: "0123456789abcdef", upstreamHead: { sha: "e1a0375aaaa", date: "2026-10-13T08:05:54Z" },
  liveStamp: "2026-10-12T16:00:33Z", pinnedStamp: "2026-09-29T17:02:52Z", baseline: { sha: "77d431abbbb" },
  fatal: [], auto: [], needsYou: [], review: []
};

test("datedLine gives both dates, the year once, and the commit", () => {
  assert.equal(render.datedLine(auto), "Likes: 0.5 → 0.6 in the Oct 12, 2026 sync, published Oct 13 (`e1a0375`)");
});

test("a dated line across a year boundary repeats the year on the publication date", () => {
  const f = Object.assign({}, auto, { arrivals: { paramRs: arr("2027-01-01T03:00:00Z", "2026-12-31T16:00:00Z") } });
  assert.equal(render.datedLine(f), "Likes: 0.5 → 0.6 in the Dec 31, 2026 sync, published Jan 1, 2027 (`e1a0375`)");
});

test("September is 'Sept', matching every date already in the repo", () => {
  assert.equal(render.day("2026-09-29T03:06:30Z", true), "Sept 29, 2026");
});

test("issueBody carries the hash marker, cc's the owner, and lists score-moving before inert", () => {
  const report = Object.assign({}, base, { needsYou: [
    { kind: "disagree", param: "rust_home_mixer_favorite_weight", label: "Likes", severity: "score-moving", repo: 0.5,
      live: { paramRs: 0.6, vmParams: 0.5 }, arrivals: { paramRs: auto.arrivals.paramRs } },
    { kind: "added", param: "rust_home_mixer_react_with_video_weight", label: null, severity: "inert", repo: null, live: { paramRs: 0, vmParams: 0 }, arrivals: {} }
  ] });
  const md = render.issueBody(report, { owner: "itsryanlenk" });
  assert.match(md, /^<!-- findings-hash: 0123456789abcdef -->/);
  assert.match(md, /cc @itsryanlenk/);
  assert.ok(md.indexOf("score-moving") < md.indexOf("inert"));
  assert.match(md, /upstream files disagree — param\.rs 0\.6 \(Oct 12, 2026 sync, published Oct 13, `e1a0375`\), vm-ranker\/params\.rs 0\.5\. weights\.js has 0\.5\./);
});

test("a long review list shows 5 commits per path and stays under GitHub's body limit", () => {
  const commits = Array.from({ length: 50 }, (_, i) => ({ sha: (i + "").padStart(7, "a"), date: "2026-10-0" + ((i % 9) + 1) + "T03:00:00Z" }));
  const line = render.reviewLine({ path: "home-mixer/filters/vf_filter.rs", baseline: "77d431a", facts: ["visibilityLimited"], commits });
  assert.match(line, /50 commits since `77d431a`/);
  assert.match(line, /and 45 earlier/);
  const review = Array.from({ length: 2000 }, (_, i) => ({ path: "p/" + i + ".rs", baseline: "77d431a", facts: ["f"], commits }));
  const md = render.issueBody(Object.assign({}, base, { review }), { runUrl: "https://example.test/run" });
  assert.ok(md.length <= render.MAX_BODY + 200, md.length);
  assert.match(md, /truncated/);
  assert.match(md, /^<!-- findings-hash: /, "the marker survives truncation");
});

test("issueComment @mentions the owner and counts what moved", () => {
  const report = Object.assign({}, base, { auto: [auto], needsYou: [{ severity: "score-moving" }, { severity: "inert" }] });
  assert.equal(render.issueComment(report, { owner: "itsryanlenk" }),
    "@itsryanlenk Upstream moved: 2 need you (1 score-moving), 1 mechanical, as of `e1a0375`. The issue body above is current.");
});

test("prBody flags red-on-purpose only when the ceiling moved, and reports gates", () => {
  const write = { changed: ["extension/weights.js"], staleLines: [{ file: "README.md", line: 98, figure: "0.000896", text: "rescaled into [0, 0.000896)" }],
    sums: { before: { positive: 43.24, negative: 371.54, total: 414.78, ceiling: "0.000896" }, after: { positive: 43.24, negative: 384.02, total: 427.26, ceiling: "0.000899" } },
    sumsMoved: true, ceilingMoved: true, stamp: null };
  const report = Object.assign({}, base, { auto: [auto], write });
  const md = render.prBody(report, { gates: [{ name: "Engine self-test", ok: false, tail: "1 failed" }, { name: "Package tests", ok: true, tail: "" }] });
  assert.match(md, /Red on purpose/);
  assert.match(md, /`README\.md:98` \(0\.000896\)/);
  assert.match(md, /\*\*Engine self-test\*\*: FAIL/);
  assert.match(md, /\*\*Package tests\*\*: pass/);
  assert.match(md, /`paramRsLastSync` not bumped/);
  const calm = render.prBody(Object.assign({}, report, { write: Object.assign({}, write, { ceilingMoved: false }) }), {});
  assert.doesNotMatch(calm, /Red on purpose/);
});
