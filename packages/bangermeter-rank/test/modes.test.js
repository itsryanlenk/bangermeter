"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const bmr = require("..");
const { NOW, HOUR, post } = require("./helpers");

test("clean: drops fresh, reposts, replies to others, cold @-starts; keeps self-replies", () => {
  const posts = [
    post({ id: "keep" }),
    post({ id: "fresh", createdAt: new Date(NOW - 47 * HOUR).toISOString() }),
    post({ id: "rt", isRepost: true }),
    post({ id: "rt-text", text: "RT @someone: their words" }),
    post({ id: "reply", isReply: true }),
    post({ id: "self", isReply: true, replyToSelf: true }),
    post({ id: "cold", text: "@someone hey have you seen this" }),
    post({ id: "noviews", views: 0 })
  ];
  const { kept, dropped } = bmr.clean(posts, { now: NOW });
  assert.deepEqual(kept.map(p => p.id), ["keep", "self"]);
  assert.deepEqual(dropped, { invalid: 0, fresh: 1, repost: 2, replyToOthers: 1, coldMention: 1, noViews: 1 });
});

// Acceptance 1 — 500 views / 10 likes: C renders; E lowSample; no winner badge from E.
test("acceptance 1: low-view post renders C, flags E lowSample, never ranks on E", () => {
  const low = post({ id: "low", views: 500, likes: 10 });
  const card = bmr.card(low);
  assert.equal(typeof card.C.score, "number");
  assert.ok(Array.isArray(card.C.modifiers));
  assert.equal(card.C.kind, "checklist");
  assert.equal(card.E.lowSample, true);
  assert.equal(card.E.usableForRanking, false);
  assert.equal(card.lowSample, true);

  const hi = post({ id: "hi", views: 8000, likes: 40 });
  const r = bmr.rank([low, hi], { mode: "engagement", now: NOW });
  assert.deepEqual(r.ranked.map(x => x.card.id), ["hi"]);
  assert.deepEqual(r.lowSample.map(c => c.id), ["low"]);
  assert.ok(r.ranked.every(x => x.card.id !== "low"));
  // No badge of any kind may come from a low-sample E.
  const audit = bmr.rank([low, hi, post({ views: 600 }), post({ views: 700 })], { now: NOW });
  const lowRow = audit.ranked.find(x => x.card.id === "low");
  assert.ok(lowRow, "low still ranks in audit on like_rate");
  assert.equal(lowRow.card.E.usableForRanking, false);
  assert.ok(!(lowRow.badges || []).some(b => /E/.test(b)));
});

// Acceptance 2 — 5,000 views: E available; band ranking works.
test("acceptance 2: 5,000-view post has usable E and ranks inside its view band", () => {
  const posts = [
    post({ id: "a", views: 5000, likes: 400 }),
    post({ id: "b", views: 6000, likes: 60 }),
    post({ id: "c", views: 4000, likes: 120 })
  ];
  const card = bmr.card(posts[0]);
  assert.equal(card.E.lowSample, false);
  assert.equal(card.E.usableForRanking, true);
  assert.equal(typeof card.E.score, "number");
  const r = bmr.rank(posts, { now: NOW });
  assert.equal(r.mode, "audit");
  assert.deepEqual(r.ranked.map(x => x.card.id), ["a", "c", "b"]);
  assert.ok(r.ranked.every(x => x.card.band === "2k–10k"));
});

// Acceptance 3 — score card pins the param.rs sync timestamp.
test("acceptance 3: every card pins param.rs sync, weights version, mode, lowSample", () => {
  const c = bmr.card(post(), { mode: "checklist" });
  assert.equal(c.paramRsSync, "2026-09-24T16:24:49Z");
  assert.match(c.weightsVersion, /^\d+\.\d+\.\d+$/);
  assert.equal(c.mode, "checklist");
  assert.equal(typeof c.lowSample, "boolean");
});

// Acceptance 5 — stealability sorts by bookmarks, not likes.
test("acceptance 5: stealability sorts posts and formats by bookmarks, not likes", () => {
  const posts = [
    post({ id: "likes-king", likes: 900, bookmarks: 5, format: "screenshot_celeb" }),
    post({ id: "saves-king", likes: 50, bookmarks: 300, format: "hard_way" }),
    post({ id: "mid", likes: 200, bookmarks: 40, format: "tip_list" }),
    post({ id: "mid2", likes: 210, bookmarks: 60, format: "tip_list" })
  ];
  const r = bmr.rank(posts, { mode: "stealability", now: NOW });
  assert.deepEqual(r.posts.map(x => x.card.id), ["saves-king", "mid2", "mid", "likes-king"]);
  assert.deepEqual(r.formats.map(f => f.format), ["hard_way", "tip_list", "screenshot_celeb"]);
  assert.equal(r.formats[1].bookmarksP50, 50);
  assert.match(r.subhead, /not a Phoenix ranking head/);
});

// Acceptance 9 — account-audit default sort = like_rate in view bands after 48h.
test("acceptance 9: default audit ranks by band-matched like_rate, not C and not raw views", () => {
  // Big-reach post has the lowest rate in its band; a bait post (C modifier) has a low rate.
  const posts = [
    post({ id: "reach", views: 90000, likes: 500 }),
    post({ id: "reach2", views: 40000, likes: 800 }),
    post({ id: "reach3", views: 20000, likes: 600 }),
    post({ id: "small-strong", views: 3000, likes: 240 }),
    post({ id: "small-mid", views: 4000, likes: 120 }),
    post({ id: "bait", views: 3500, likes: 35, text: "Like if you agree! Drop a comment below if you build in public too, everyone should" })
  ];
  const r = bmr.rank(posts, { now: NOW });
  assert.equal(r.mode, "audit");
  assert.equal(r.ranked[0].card.id, "small-strong");
  const ids = r.ranked.map(x => x.card.id);
  assert.ok(ids.indexOf("reach") > ids.indexOf("reach2"), "raw views do not win");
  assert.ok(r.ranked.every(x => typeof x.bandIndex === "number"));
  // Sorted strictly by bandIndex.
  for (let i = 1; i < r.ranked.length; i++) assert.ok(r.ranked[i - 1].bandIndex >= r.ranked[i].bandIndex);
  // Losers always shown beside winners.
  assert.ok(r.winners.length >= 1 && r.misses.length >= 1);
  assert.equal(r.misses.some(m => r.winners.includes(m)), false);
});

test("audit: winners beat their band median, misses fall below it; a median post is neither", () => {
  const posts = [];
  const likes = [400, 300, 200, 200, 200, 100, 50]; // median 200 at 5,000 views
  likes.forEach((l, i) => posts.push(post({ id: "m" + i, views: 5000, likes: l })));
  const r = bmr.rank(posts, { now: NOW });
  assert.deepEqual(r.winners.map(x => x.card.id), ["m0", "m1"]);
  assert.deepEqual(r.misses.map(x => x.card.id), ["m6", "m5"]);
  assert.ok(r.winners.every(x => x.bandIndex > 1) && r.misses.every(x => x.bandIndex < 1));
});

test("audit: no post is forced into winners or misses; equal posts are neither", () => {
  const same = [1, 2, 3].map(i => post({ id: "t" + i, views: 5000, likes: 100 }));
  const r1 = bmr.rank(same, { now: NOW });
  assert.deepEqual(r1.winners, []);
  assert.deepEqual(r1.misses, []);
  const zero = [1, 2, 3].map(i => post({ id: "z" + i, views: 5000, likes: 0 }));
  const r2 = bmr.rank(zero, { now: NOW });
  assert.deepEqual(r2.winners, []);
  assert.deepEqual(r2.misses, []);
  for (const r of r2.ranked) assert.ok(r.badges.length <= 1);
});

test("audit: missing likes or likes above views are unranked as bad data, not ranked as misses", () => {
  const posts = [
    post({ id: "nolikes", views: 5000, likes: undefined }),
    post({ id: "impossible", views: 5000, likes: 9000 }),
    post({ id: "a", views: 5000, likes: 100 }), post({ id: "b", views: 6000, likes: 90 }),
    post({ id: "c", views: 7000, likes: 300 })
  ];
  const r = bmr.rank(posts, { now: NOW });
  const reasons = Object.fromEntries(r.unranked.map(u => [u.card.id, u.reason]));
  assert.match(reasons.nolikes, /like count/);
  assert.match(reasons.impossible, /more likes than views/);
  assert.ok(!r.ranked.some(x => x.card.id === "nolikes" || x.card.id === "impossible"));
});

test("clean tolerates loose input: string numbers, string booleans, epoch dates, null rows", () => {
  const posts = [
    null,
    post({ id: "strs", views: "5,000", likes: "120", isRepost: "false", isReply: "false" }),
    post({ id: "epoch", createdAt: NOW - 72 * HOUR }),
    post({ id: "epoch-s", createdAt: Math.floor((NOW - 72 * HOUR) / 1000) }),
    post({ id: "rt-str", isRepost: "true" })
  ];
  const { kept, dropped } = bmr.clean(posts, { now: NOW });
  assert.deepEqual(kept.map(p => p.id), ["strs", "epoch", "epoch-s"]);
  assert.equal(dropped.invalid, 1);
  assert.equal(dropped.repost, 1);
  const c = bmr.card(kept[0], { now: NOW });
  assert.equal(c.views, 5000);
  assert.equal(c.likes, 120);
});

test("audit: posts under 200 views and thin bands are listed as unranked with a reason", () => {
  const posts = [
    post({ id: "tiny", views: 150, likes: 30 }),
    post({ id: "lonely", views: 1500, likes: 30 }),
    post({ id: "a", views: 5000, likes: 100 }),
    post({ id: "b", views: 6000, likes: 100 }),
    post({ id: "c", views: 7000, likes: 100 })
  ];
  const r = bmr.rank(posts, { now: NOW });
  const reasons = Object.fromEntries(r.unranked.map(u => [u.card.id, u.reason]));
  assert.match(reasons.tiny, /200 views/);
  assert.match(reasons.lonely, /band/);
  assert.deepEqual(r.ranked.map(x => x.card.id).sort(), ["a", "b", "c"]);
});

test("audit: E is reported only at or above 2,000 views; C is always checklist context", () => {
  const r = bmr.rank([
    post({ id: "under", views: 1200, likes: 40 }), post({ id: "u2", views: 1300, likes: 30 }),
    post({ id: "u3", views: 1800, likes: 20 }),
    post({ id: "over", views: 9000, likes: 40 }), post({ id: "o2", views: 5000, likes: 30 }),
    post({ id: "o3", views: 3000, likes: 20 })
  ], { now: NOW });
  for (const row of r.ranked) {
    assert.equal(row.card.C.kind, "checklist");
    if (row.card.views < 2000) assert.equal(row.reportE, false);
    else assert.equal(row.reportE, true);
  }
});

test("checklist mode never sorts by C and carries the required hedge verbatim", () => {
  const posts = [post({ id: "x" }), post({ id: "y", text: "What would you build first?" }), post({ id: "z" })];
  const r = bmr.rank(posts, { mode: "checklist", now: NOW });
  assert.deepEqual(r.items.map(c => c.id), ["x", "y", "z"]);
  assert.equal(r.headline, "Draft checklist against published weights");
  assert.equal(r.subhead, "C does not forecast reach or likes. Use it to see which weight heads your draft is aiming at.");
  const q = r.items[1].C.modifiers.find(m => m.id === "question");
  assert.equal(q.provenance, "estimate");
});

test("engagement mode carries its required subhead", () => {
  const r = bmr.rank([post()], { mode: "engagement", now: NOW });
  assert.equal(r.headline, "How this matured post’s rates compare");
  assert.match(r.subhead, /Strong correlation with like rate when views ≥ 2,000 is expected because E is built from those rates\./);
});

test("unknown mode is rejected, and C cannot be requested as a sort key", () => {
  assert.throws(() => bmr.rank([post()], { mode: "virality", now: NOW }), /unknown mode/);
  for (const sortBy of ["C", "C.score", "content", "views"]) {
    assert.throws(() => bmr.rank([post()], { mode: "audit", sortBy, now: NOW }), /fixed order/);
  }
});
