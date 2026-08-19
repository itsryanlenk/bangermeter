// Audience read-out — analysis over a collected sample.
//
//   node analyze.js sample.tsv
//
// Everything is a RATE per view. Raw counts mostly measure how much reach a post
// happened to get, which is the thing we are trying to explain, so ranking by
// them is circular.
//
// Per-post MEDIANS, never pooled totals. Pooled answers "what does a random
// impression see" and a handful of viral posts dominate it; we are comparing
// posts to each other, so the reference has to be the typical POST.
//
// Scores the sample with Bangermeter's engine when the repo is alongside;
// falls back to rates alone when it is not.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const file = process.argv[2];
if (!file) { console.error("usage: node analyze.js <sample.tsv>"); process.exit(2); }

// ── optional: the Bangermeter engine ────────────────────────────────────────
let E = null, C = null;
for (const guess of [
  path.join(__dirname, "..", "..", "..", "extension"),
  path.join(process.cwd(), "extension")
]) {
  try {
    const ctx = { Math, Object, JSON, console };
    vm.createContext(ctx);
    for (const f of ["weights.js", "scoring.js"]) {
      vm.runInContext(fs.readFileSync(path.join(guess, f), "utf8"), ctx, { filename: f });
    }
    E = ctx.BangermeterEngine; C = ctx.BANGERMETER_CONFIG;
    break;
  } catch (e) { /* engine not alongside — rates only */ }
}

// ── load ────────────────────────────────────────────────────────────────────
const lines = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
const sep = lines[0].includes("\t") ? "\t" : ",";
const cols = lines[0].split(sep);
let rows = lines.slice(1).map(l => {
  const v = l.split(sep), o = {};
  cols.forEach((c, i) => { o[c] = /^-?\d+$/.test(v[i]) ? +v[i] : v[i]; });
  return o;
}).filter(r => r.views > 0 && !r.isRepost);

if (!rows.length) { console.error("no scoreable rows (need views > 0)"); process.exit(2); }

// ── Cleaning ────────────────────────────────────────────────────────────────
// Longer scans pick up posts that are not comparable to the rest. Removing them
// is not tidiness — leaving them in silently shifts every median.
//
//   --keep-fresh   keep posts younger than the maturity cutoff
//   --keep-pinned  keep pinned posts
//   --hours=N      change the maturity cutoff (default 48)
const KEEP_FRESH = process.argv.includes("--keep-fresh");
const KEEP_PINNED = process.argv.includes("--keep-pinned");
const MATURITY_H = (() => {
  const a = process.argv.find(x => x.startsWith("--hours="));
  return a ? Math.max(0, parseInt(a.slice(8), 10) || 0) : 48;
})();

const dropped = { fresh: 0, pinned: 0 };
{
  // Age is measured against the NEWEST post in the sample, not against now, so a
  // scan analysed weeks later gives the same answer as one analysed immediately.
  const newest = Math.max(...rows.map(r => Date.parse(r.iso)).filter(t => !isNaN(t)));
  rows.forEach(r => {
    const t = Date.parse(r.iso);
    r.ageH = isNaN(t) ? Infinity : (newest - t) / 3600000;
  });
  const before = rows.length;
  rows = rows.filter(r => {
    // A young post is still accruing views. Likes arrive fast from followers and
    // views keep coming for days, so its rate is measured mid-flight and reads
    // high — around 1.4x on the samples this was calibrated against.
    if (!KEEP_FRESH && r.ageH < MATURITY_H) { dropped.fresh++; return false; }
    // A pinned post sits at the top of the profile accruing views for months.
    if (!KEEP_PINNED && r.isPinned) { dropped.pinned++; return false; }
    return true;
  });
  if (before !== rows.length) {
    console.log(`cleaned : dropped ${dropped.fresh} posts under ${MATURITY_H}h` +
      (dropped.pinned ? `, ${dropped.pinned} pinned` : "") +
      `  (${rows.length} of ${before} remain)`);
  }
  if (!rows.length) { console.error("nothing left after cleaning — try --keep-fresh"); process.exit(2); }
}

// The published ranking weights changed on 13 Aug 2026. A sample spanning that
// date mixes two regimes, and any before/after comparison is confounded by it.
{
  const CHANGE = Date.parse("2026-08-13T00:00:00Z");
  const t = rows.map(r => Date.parse(r.iso)).filter(x => !isNaN(x));
  const before = t.filter(x => x < CHANGE).length, after = t.length - before;
  if (before >= 5 && after >= 5) {
    console.log(`WARNING : sample straddles the 13 Aug 2026 weight change ` +
      `(${before} before, ${after} after) — treat any trend across that date with care`);
  }
}


rows.forEach(r => {
  r.lr = r.likes / r.views;
  r.rr = r.replies / r.views;
  r.tr = r.reposts / r.views;
  r.br = (r.bookmarks || 0) / r.views;
  r.text = r.text || "";
  r.hasQ = /\?/.test(r.text);
  r.words = r.text.split(/\s+/).filter(Boolean).length;
  r.month = (r.iso || "").slice(0, 7);
  if (E) {
    r.score = E.engagementScore({
      counts: { likes: r.likes, replies: r.replies, retweets: r.reposts, views: r.views },
      isReply: !!r.isReply, isRepost: false
    }, {}).score;
  }
});

const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const med = a => q(a, .5);
const pc = x => (x * 100).toFixed(2) + "%";
const pctOf = (set, f) => Math.round(100 * set.filter(f).length / set.length);

const iso = rows.map(r => r.iso).filter(Boolean).sort();
console.log(`sample : ${rows.length} original posts` +
  (iso.length ? `, ${iso[0].slice(0, 10)} → ${iso[iso.length - 1].slice(0, 10)}` : ""));
console.log(`engine : ${E ? "Bangermeter v" + C.version : "not found — rates only"}`);
if (E) {
  const O = C.observedRates;
  console.log(`baseline: typical feed post likes ${pc(O.favorite)}, replies ${pc(O.reply)} ` +
    `(measured, n=${O.n})`);
}

// ── distribution: the floor matters more than the median ────────────────────
console.log("\nDISTRIBUTION");
console.log(`  like rate   p10 ${pc(q(rows.map(r => r.lr), .1))}   median ${pc(med(rows.map(r => r.lr)))}   p90 ${pc(q(rows.map(r => r.lr), .9))}`);
console.log(`  views       p10 ${q(rows.map(r => r.views), .1)}   median ${med(rows.map(r => r.views))}   p90 ${q(rows.map(r => r.views), .9)}`);
if (E) {
  const s = rows.map(r => r.score);
  const pinned = pctOf(rows, r => r.score === 100);
  console.log(`  E score     p10 ${q(s, .1)}   median ${med(s)}   p90 ${q(s, .9)}   at 100: ${pinned}%`);
  if (pinned >= 30) {
    console.log(`  !! the score is saturating (${pinned}% at the cap) — rank by like rate instead`);
  }
}

// ── top vs bottom quartile ──────────────────────────────────────────────────
const byRate = [...rows].sort((a, b) => b.lr - a.lr);
const cut = Math.max(3, Math.floor(rows.length / 4));
const top = byRate.slice(0, cut), bottom = byRate.slice(-cut);

function profile(label, set) {
  console.log(`\n${label} (n=${set.length})`);
  console.log(`  like ${pc(med(set.map(r => r.lr)))}  reply ${pc(med(set.map(r => r.rr)))}  bookmark ${pc(med(set.map(r => r.br)))}`);
  console.log(`  median views ${med(set.map(r => r.views))}   length ${med(set.map(r => r.textLen))} chars / ${med(set.map(r => r.words))} words`);
  console.log(`  image ${pctOf(set, r => r.hasImage)}%  video ${pctOf(set, r => r.hasVideo)}%  quote ${pctOf(set, r => r.isQuote)}%  question ${pctOf(set, r => r.hasQ)}%`);
}
profile("TOP QUARTILE by like rate", top);
profile("BOTTOM QUARTILE by like rate", bottom);

// ── length bands ────────────────────────────────────────────────────────────
console.log("\nBY LENGTH");
[[0, 80], [80, 140], [140, 220], [220, 1e4]].forEach(([lo, hi]) => {
  const s = rows.filter(r => r.textLen >= lo && r.textLen < hi);
  if (s.length < 3) return;
  console.log(`  ${String(lo).padStart(3)}-${String(hi === 1e4 ? "+" : hi).padEnd(4)} n=${String(s.length).padStart(3)}  like ${pc(med(s.map(r => r.lr)))}  reply ${pc(med(s.map(r => r.rr)))}  medViews ${med(s.map(r => r.views))}`);
});

// ── feature contrasts, with the confound check ──────────────────────────────
const FEATURES = [
  ["quote-tweet", r => r.isQuote],
  ["image", r => r.hasImage],
  ["video", r => r.hasVideo],
  ["question", r => r.hasQ],
  ["short (<80)", r => r.textLen < 80],
  ["long (>220)", r => r.textLen > 220]
];

console.log("\nFEATURE CONTRASTS — median like rate, and median views");
FEATURES.forEach(([name, f]) => {
  const a = rows.filter(f), b = rows.filter(r => !f(r));
  if (a.length < 4 || b.length < 4) {
    console.log(`  ${name.padEnd(14)} n=${a.length} — too few to call`);
    return;
  }
  const ra = med(a.map(r => r.lr)), rb = med(b.map(r => r.lr));
  console.log(`  ${name.padEnd(14)} with ${pc(ra)} / ${String(med(a.map(r => r.views))).padStart(6)} views (n=${a.length})` +
    `   without ${pc(rb)} / ${String(med(b.map(r => r.views))).padStart(6)} views (n=${b.length})   ratio ${(ra / rb).toFixed(2)}x`);
});

// A contrast is not a finding until it survives being split by month. If it only
// appears in the pooled data, it was probably a timing artifact.
const months = [...new Set(rows.map(r => r.month).filter(Boolean))].sort();
if (months.length > 1) {
  console.log("\nCONFOUND CHECK — does each contrast hold WITHIN each month?");
  FEATURES.forEach(([name, f]) => {
    const parts = [];
    months.forEach(m => {
      const s = rows.filter(r => r.month === m);
      const a = s.filter(f), b = s.filter(r => !f(r));
      if (a.length < 3 || b.length < 3) return;
      parts.push(`${m} ${(med(a.map(r => r.lr)) / med(b.map(r => r.lr))).toFixed(2)}x`);
    });
    if (parts.length) console.log(`  ${name.padEnd(14)} ${parts.join("   ")}`);
  });
  console.log("  (a ratio that flips or vanishes month to month was a timing artifact)");
}

// ── reach vs rate ───────────────────────────────────────────────────────────
const rank = arr => { const idx = arr.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = []; idx.forEach((p, i) => r[p[1]] = i + 1); return r; };
const spear = (a, b) => {
  const n = a.length, m = (n + 1) / 2;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - m) * (b[i] - m); da += (a[i] - m) ** 2; db += (b[i] - m) ** 2; }
  return num / Math.sqrt(da * db);
};
const rv = rank(rows.map(r => r.views));
console.log("\nREACH vs RATE");

const rateVsViews = spear(rank(rows.map(r => r.lr)), rv);
console.log(`  like rate vs views  Spearman ${rateVsViews.toFixed(2)}   ` + (
  rateVsViews < -0.2 ? "engagement rate falls as reach rises, the usual pattern"
  : rateVsViews > 0.2 ? "unusual — their bigger posts also convert better, so reach is not diluting them"
  : "rate is roughly independent of reach here"));

if (E) {
  const pinned = pctOf(rows, r => r.score === 100);
  const scoreVsViews = spear(rank(rows.map(r => r.score)), rv);
  if (pinned >= 30) {
    // With most posts at the cap the score has almost no variance left, so a
    // correlation against it describes the handful below the cap, not the account.
    console.log(`  E score   vs views  not interpretable — ${pinned}% of posts are pinned at 100`);
  } else {
    console.log(`  E score   vs views  Spearman ${scoreVsViews.toFixed(2)}   ` + (
      Math.abs(scoreVsViews) < 0.25
        ? "the score is not mostly measuring audience size"
        : "the score tracks reach more than it should — treat rankings from it with care"));
  }
}

// ── the actual posts ────────────────────────────────────────────────────────
const show = r => `  ${pc(r.lr).padStart(6)} | ${String(r.views).padStart(7)} views | ${r.text.slice(0, 96)}`;
console.log("\nBEST 6 BY RATE");
byRate.slice(0, 6).forEach(r => console.log(show(r)));
console.log("\nWORST 6 BY RATE");
byRate.slice(-6).forEach(r => console.log(show(r)));

console.log("\nReminder: mark anything under ~10 posts as directional only in the write-up.");
