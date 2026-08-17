// Bangermeter — baseline calibration against a real feed sample.
//
//   node calibration/calibrate.js [csv]
//
// Loads the SHIPPED engine (weights.js + scoring.js) and runs it over a sample
// of real posts scraped from a logged-in timeline, then reports:
//   - measured per-post median rates for the three observable heads
//   - the score distribution the shipped baseline produces
//   - the distribution a measured baseline would produce
//
// Why per-post medians and not pooled (total events / total views): pooled
// answers "what rate does a random impression see", which a handful of viral
// posts dominate. The score normalizes ONE POST against a reference post, so
// the reference has to be the typical POST, not the typical impression.
const fs = require("fs"), path = require("path"), vm = require("vm");

const csvPath = process.argv[2] || path.join(__dirname, "feed-sample-2026-08-13.csv");
const ext = path.join(__dirname, "..", "extension");

const ctx = { Math, Object, JSON, console };
vm.createContext(ctx);
for (const f of ["weights.js", "scoring.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ext, f), "utf8"), ctx, { filename: f });
}
const C = ctx.BANGERMETER_CONFIG, E = ctx.BangermeterEngine;

const lines = fs.readFileSync(csvPath, "utf8").trim().split(/\r?\n/);
const cols = lines[0].split(",");
const rows = lines.slice(1).map(l => {
  const v = l.split(","), o = {};
  cols.forEach((c, i) => { o[c] = /^-?\d+$/.test(v[i]) ? +v[i] : v[i]; });
  return o;
}).filter(r => r.views > 0);

const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const pct = (a, f) => Math.round(100 * a.filter(f).length / a.length);

function scoreAll(sample) {
  return sample.map(r => E.engagementScore({
    counts: { likes: r.likes, replies: r.replies, retweets: r.reposts, views: r.views },
    isReply: !!r.isReply, isRepost: !!r.isRepost
  }, {}).score);
}

function report(name, sample) {
  const s = scoreAll(sample);
  return {
    n: sample.length,
    medianViews: q(sample.map(r => r.views), .5),
    rates: {
      favorite: +q(sample.map(r => r.likes / r.views), .5).toFixed(6),
      reply: +q(sample.map(r => r.replies / r.views), .5).toFixed(6),
      retweet: +q(sample.map(r => r.reposts / r.views), .5).toFixed(6)
    },
    score: { p10: q(s, .1), median: q(s, .5), p90: q(s, .9),
             pctAbove50: pct(s, x => x > 50), pctPinnedAt100: pct(s, x => x === 100) }
  };
}

const forYou = rows.filter(r => r.feed === "forYou");
const following = rows.filter(r => r.feed === "following");

console.log("sample      : " + path.basename(csvPath) + "  (" + rows.length + " posts)");
console.log("engine      : weights.js v" + C.version + ", K=" + C.engagementShrinkage.pseudoViews);
const O = C.observedRates;
console.log("reference   : favorite " + O.favorite + ", reply " + O.reply + ", retweet " + O.retweet +
            "  (" + O.provenance + ", n=" + O.n + ", " + O.feed + ", " + O.collected + ")");
console.log("model priors: favorite " + C.baselineP.favorite + ", reply " + C.baselineP.reply +
            ", retweet " + C.baselineP.retweet + "  (" + C.baselineP.provenance +
            " — content score only, deliberately not the measured rates)\n");

for (const [label, s] of [["FOR YOU", forYou], ["FOLLOWING", following], ["COMBINED", rows]]) {
  if (!s.length) continue;
  const r = report(label, s);
  console.log(label.padEnd(10) + " n=" + String(r.n).padStart(4) +
    "  medViews " + String(r.medianViews).padStart(7) +
    "  rates fav " + r.rates.favorite + " reply " + r.rates.reply + " rt " + r.rates.retweet);
  console.log("           score p10 " + String(r.score.p10).padStart(3) +
    "  median " + String(r.score.median).padStart(3) +
    "  p90 " + String(r.score.p90).padStart(3) +
    "   >50: " + String(r.score.pctAbove50).padStart(3) + "%" +
    "   at 100: " + String(r.score.pctPinnedAt100).padStart(3) + "%");
}

// A correctly centered scale puts the median post at 50. Report the gap.
const med = q(scoreAll(forYou), .5);
console.log("\nFor You median score is " + med + "; a centered scale would put it at 50" +
  (med === 50 ? "." : " — off by " + (med - 50) + "."));
console.log("Measured For You medians: favorite " + q(forYou.map(r => r.likes / r.views), .5).toFixed(5) +
  ", reply " + q(forYou.map(r => r.replies / r.views), .5).toFixed(5) +
  ", retweet " + q(forYou.map(r => r.reposts / r.views), .5).toFixed(5));
