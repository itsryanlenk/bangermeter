"use strict";
// Shared fixtures. NOW is fixed so maturity (≥48h) never depends on the clock.
const NOW = Date.parse("2026-09-25T12:00:00Z");
const HOUR = 3600 * 1000;

let seq = 0;
function post(o) {
  seq++;
  return Object.assign({
    id: "p" + seq,
    url: "https://x.com/acct/status/" + seq,
    text: "A plain statement about building things in public for a living",
    createdAt: new Date(NOW - 72 * HOUR).toISOString(),
    views: 5000, likes: 100, replies: 5, reposts: 3, bookmarks: 10,
    media: "text"
  }, o);
}

module.exports = { NOW, HOUR, post };
