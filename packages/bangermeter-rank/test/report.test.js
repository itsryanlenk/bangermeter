"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const bmr = require("..");
const { NOW, post } = require("./helpers");

function sample() {
  return [
    post({ id: "w1", views: 3000, likes: 240, text: "The hard way I learned to ship <fast>" }),
    post({ id: "w2", views: 4000, likes: 160 }),
    post({ id: "m1", views: 5000, likes: 25 }),
    post({ id: "m2", views: 6000, likes: 40 }),
    post({ id: "tiny", views: 120, likes: 10 })
  ];
}

// Acceptance 4 — customer report: winners + ≥1 miss; hedge that C is not a forecast.
test("acceptance 4: report shows winners, at least one miss, and the C hedge", () => {
  const html = bmr.report.html(bmr.rank(sample(), { now: NOW }), { account: "@acct", generatedAt: NOW });
  assert.match(html, /<h2[^>]*>Winners/);
  assert.match(html, /<h2[^>]*>Misses/);
  assert.match(html, /data-id="m1"|data-id="m2"/);
  assert.match(html, /C does not forecast reach or likes/);
  assert.match(html, /2026-09-24T16:24:49Z/);
  assert.match(html, /@page/);
});

// Acceptance 10 — viral-factor section labels associations and states no control.
test("acceptance 10: 'what traveled' section is labeled associations with no non-viral control", () => {
  const html = bmr.report.html(bmr.rank(sample(), { now: NOW }), { account: "@acct", generatedAt: NOW });
  const sec = html.slice(html.indexOf('id="traveled"'));
  assert.match(sec, /associations only/i);
  assert.match(sec, /no non-viral control/i);
  assert.match(sec, /1\.22%/);
  assert.match(sec, /0\.494/);
});

test("report escapes post text and lists unranked posts with reasons", () => {
  const html = bmr.report.html(bmr.rank(sample(), { now: NOW }), { account: "@acct", generatedAt: NOW });
  assert.ok(!html.includes("<fast>"));
  assert.match(html, /&lt;fast&gt;/);
  assert.match(html, /under 200 views/);
});

test("report refuses a non-audit result", () => {
  assert.throws(() => bmr.report.html(bmr.rank(sample(), { mode: "checklist", now: NOW }), {}), /audit/);
});

test("report research section passes the numbers and copy gates", () => {
  const html = bmr.report.html(bmr.rank(sample(), { now: NOW }), { account: "@acct", generatedAt: NOW });
  const research = bmr.report.researchText(html);
  assert.ok(research.length > 200);
  assert.deepEqual(bmr.gates.numbers(research), []);
  assert.deepEqual(bmr.gates.copy(html), []);
});

test("a customer's own post text cannot trip the report's copy gate", () => {
  const posts = sample();
  posts[0].text = "Everyone says this app predicts virality, it does not";
  const html = bmr.report.html(bmr.rank(posts, { now: NOW }), { account: "@acct", generatedAt: NOW });
  assert.deepEqual(bmr.report.gate(html), []);
});

test("report only links http(s) URLs", () => {
  const posts = sample();
  posts[0].url = "javascript:alert(document.domain)";
  posts[1].url = "https://x.com/acct/status/2";
  const html = bmr.report.html(bmr.rank(posts, { now: NOW }), { account: "@acct", generatedAt: NOW });
  assert.ok(!/href="javascript:/i.test(html));
  assert.match(html, /href="https:\/\/x\.com\/acct\/status\/2"/);
});

test("report says so when no post fell below its band median", () => {
  const same = [1, 2, 3].map(i => post({ id: "t" + i, views: 5000, likes: 100 }));
  const html = bmr.report.html(bmr.rank(same, { now: NOW }), { account: "@acct", generatedAt: NOW });
  assert.match(html, /No post fell below its band median/);
  assert.match(html, /No post beat its band median/);
});
