#!/usr/bin/env node
"use strict";
// Writes a SYNTHETIC post sample for trying the CLI:
//
//   node examples/make-sample.js sample.jsonl
//
// Generated rather than committed: the repo refuses to track anything shaped
// like a collected account archive (store-assets/check-versions.js), and a
// sample file that measures nobody should not look like one that does.
// Every row carries synthetic: true. The numbers are invented and measure nothing.
const fs = require("fs");

const out = process.argv[2];
if (!out) { console.error("usage: node examples/make-sample.js <out.jsonl>"); process.exit(2); }

const now = Date.now();
const DAY = 86400000;
const rows = [
  ["Shipped the billing rewrite. Here is the hard way I learned to price by seat", "photo", 3200, 260, 40, "hard_way"],
  ["What would you cut first if you had to ship in a week?", "text", 4100, 150, 12, "contrarian"],
  ["Stage 1: idea. Stage 2: waitlist. Stage 3: first paying user. Where are you?", "text", 8800, 190, 70, "stage_ladder"],
  ["Screenshot of a famous founder agreeing with me", "photo", 46000, 700, 20, "screenshot_celeb"],
  ["5 tips for writing a changelog people read", "video", 21000, 520, 410, "tip_list"],
  ["Like if you agree! Drop a comment below if you build in public", "text", 5200, 30, 1, "engagement_bait"],
  ["Our launch post, with the link", "link", 1500, 24, 3, "ship_proof"],
  ["Weekend thread on what broke", "text", 900, 40, 6, "hard_way"],
  ["Quick demo of the new editor", "video", 700, 21, 15, "ship_proof"],
  ["A contrarian take on hiring your first engineer", "text", 600, 9, 2, "contrarian"],
  ["Revenue chart, month 14", "photo", 14000, 160, 30, "ship_proof"],
  ["Tiny post nobody saw", "text", 150, 4, 0, "tip_list"]
];

const lines = rows.map(([text, media, views, likes, bookmarks, format], i) => JSON.stringify({
  synthetic: true, id: "ex" + (i + 1), url: null, text, media, format,
  views, likes, bookmarks, replies: Math.round(likes / 15), reposts: Math.round(likes / 25),
  createdAt: new Date(now - (i + 3) * DAY).toISOString()
}));
fs.writeFileSync(out, lines.join("\n") + "\n");
console.log("wrote " + lines.length + " synthetic posts to " + out);
