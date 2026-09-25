"use strict";
// Pipeline (handoff §4): clean → score C always, E when views > 0 → rank by mode.
//
// The four modes answer different questions and must not borrow each other's
// sort key. C is a checklist: it never orders a "best posts" list. E is
// retrospective and gated at K views. Stealability orders by bookmarks.
// The account audit orders by like rate inside matched view bands.
const { E, C } = require("./engine");
const copy = require("./copy");

const HOUR = 3600 * 1000;
const MATURITY_HOURS = 48;
const K = C.engagementShrinkage.pseudoViews; // 2000 — E's lowSample gate
const MIN_BAND_N = 3;

// Handoff §7 "Like rate by view band" — the primary build lens.
const BANDS = [
  { lo: 200, hi: 1000, name: "200–999" },
  { lo: 1000, hi: 2000, name: "1k–2k" },
  { lo: 2000, hi: 10000, name: "2k–10k" },
  { lo: 10000, hi: Infinity, name: "10k+" }
];

const MODES = ["audit", "checklist", "engagement", "stealability"];

function median(xs) {
  const a = xs.filter(x => x != null && isFinite(x)).sort((p, q) => p - q);
  if (!a.length) return null;
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function num(v) {
  const n = Number(v);
  return v == null || !isFinite(n) ? null : n;
}

// ── clean ───────────────────────────────────────────────────────────────────
function clean(posts, opts) {
  const now = (opts && opts.now) || Date.now();
  const hours = (opts && opts.maturityHours) || MATURITY_HOURS;
  const dropped = { fresh: 0, repost: 0, replyToOthers: 0, coldMention: 0, noViews: 0 };
  const kept = [];
  for (const p of posts) {
    const text = String(p.text || "").trimStart();
    if (p.isRepost || /^RT @/.test(text)) { dropped.repost++; continue; }
    if (p.isReply && !p.replyToSelf) { dropped.replyToOthers++; continue; }
    if (!p.isReply && text.startsWith("@")) { dropped.coldMention++; continue; }
    const t = Date.parse(p.createdAt);
    if (!isFinite(t) || now - t < hours * HOUR) { dropped.fresh++; continue; }
    if (!(num(p.views) > 0)) { dropped.noViews++; continue; }
    kept.push(p);
  }
  return { kept, dropped };
}

// ── score card ──────────────────────────────────────────────────────────────
function features(p, now) {
  const media = p.media || "text";
  const text = String(p.text || "");
  const created = Date.parse(p.createdAt);
  return {
    text,
    hasImage: media === "photo",
    hasVideo: media === "video" || media === "gif",
    isGif: media === "gif",
    videoSeconds: num(p.videoSeconds),
    hasExternalLink: media === "link" || !!p.hasExternalLink,
    isThreadStarter: !!p.isThreadStarter,
    isQuote: !!p.isQuote,
    isReply: !!p.isReply,
    isRepost: !!p.isRepost,
    hashtagCount: p.hashtagCount != null ? p.hashtagCount : (text.match(/(^|\s)#\w/g) || []).length,
    ageMinutes: isFinite(created) && now ? Math.max(0, (now - created) / 60000) : null,
    counts: {
      views: num(p.views), likes: num(p.likes), replies: num(p.replies),
      retweets: num(p.reposts), bookmarks: num(p.bookmarks)
    }
  };
}

function bandOf(views) {
  if (views == null) return null;
  return BANDS.find(b => views >= b.lo && views < b.hi) || null;
}

function card(p, opts) {
  const mode = (opts && opts.mode) || "audit";
  const f = features(p, opts && opts.now);
  const content = E.contentScore(f, {});
  const eng = E.engagementScore(f, {});
  const views = f.counts.views;
  const likes = f.counts.likes;
  const bookmarks = f.counts.bookmarks;
  const lowSample = !(views >= K);
  const band = bandOf(views);
  return {
    id: p.id,
    url: p.url || null,
    text: f.text,
    media: p.media || "text",
    format: p.format || null,
    createdAt: p.createdAt || null,
    views, likes, bookmarks,
    replies: f.counts.replies,
    reposts: f.counts.retweets,
    mode,
    weightsVersion: C.version,
    paramRsSync: C.paramRsLastSync,
    lowSample,
    band: band ? band.name : null,
    rates: {
      like: views > 0 && likes != null ? likes / views : null,
      bookmark: views > 0 && bookmarks != null ? bookmarks / views : null,
      saveToLike: likes > 0 && bookmarks != null ? bookmarks / likes : null
    },
    C: {
      kind: "checklist",
      score: content.score,
      netNegative: content.netNegative,
      modifiers: content.modifiers.map(m => ({ id: m.id, label: m.label, provenance: m.provenance }))
    },
    E: eng.available
      ? { score: eng.score, lowSample, usableForRanking: !lowSample, note: lowSample ? copy.LOW_SAMPLE_NOTE : null }
      : { score: null, lowSample: true, usableForRanking: false, note: eng.reason }
  };
}

// ── modes ───────────────────────────────────────────────────────────────────
function header(mode) {
  const m = copy.MODES[mode];
  return { mode, label: m.label, headline: m.headline, subhead: m.subhead, hedges: copy.HONESTY.slice(),
    weightsVersion: C.version, paramRsSync: C.paramRsLastSync };
}

function checklist(posts, opts) {
  // Drafts have no views or age, so nothing is cleaned; order is the caller's.
  return Object.assign(header("checklist"), {
    items: posts.map(p => card(p, { mode: "checklist", now: opts.now }))
  });
}

function engagement(cards) {
  const usable = cards.filter(c => c.E.usableForRanking);
  usable.sort((a, b) => b.E.score - a.E.score);
  return Object.assign(header("engagement"), {
    ranked: usable.map((c, i) => ({ rank: i + 1, card: c })),
    lowSample: cards.filter(c => !c.E.usableForRanking)
  });
}

function stealability(cards) {
  const byBookmarks = (a, b) => (b.bookmarks || 0) - (a.bookmarks || 0) ||
    (b.rates.saveToLike || 0) - (a.rates.saveToLike || 0);
  const posts = cards.slice().sort(byBookmarks).map((c, i) => ({ rank: i + 1, card: c }));
  const groups = new Map();
  for (const c of cards) {
    const key = c.format || c.media || "text";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  const formats = [...groups].map(([format, cs]) => ({
    format, n: cs.length,
    bookmarksP50: median(cs.map(c => c.bookmarks)),
    saveToLikeP50: median(cs.map(c => c.rates.saveToLike))
  })).sort((a, b) => (b.bookmarksP50 || 0) - (a.bookmarksP50 || 0));
  return Object.assign(header("stealability"), { posts, formats });
}

function audit(cards, opts) {
  const unranked = [];
  const inBand = new Map(BANDS.map(b => [b.name, []]));
  for (const c of cards) {
    if (!c.band) unranked.push({ card: c, reason: "under 200 views — too few to compare fairly" });
    else inBand.get(c.band).push(c);
  }
  const bands = [];
  const ranked = [];
  for (const b of BANDS) {
    const cs = inBand.get(b.name);
    const p50 = median(cs.map(c => c.rates.like));
    bands.push({ band: b.name, n: cs.length, likeRateP50: p50 });
    if (cs.length && cs.length < MIN_BAND_N) {
      for (const c of cs) unranked.push({ card: c,
        reason: "only " + cs.length + " post" + (cs.length === 1 ? "" : "s") + " in the " + b.name +
          " view band — too thin to compare" });
      continue;
    }
    for (const c of cs) {
      ranked.push({ card: c, bandIndex: p50 > 0 ? c.rates.like / p50 : 0, bandLikeRateP50: p50,
        reportE: c.views >= K, badges: [] });
    }
  }
  ranked.sort((a, b) => b.bandIndex - a.bandIndex || b.card.rates.like - a.card.rates.like);
  ranked.forEach((r, i) => { r.rank = i + 1; });

  // A winner beat its band's median like rate; a miss fell below it. A post at
  // the median is neither. Misses are never hidden: if nothing fell below the
  // median, the lowest-ranked post that is not a winner is still shown.
  const n = ranked.length;
  const W = opts.winners || 5, L = opts.losers || 5;
  let winners = ranked.filter(r => r.bandIndex > 1).slice(0, W);
  let misses = ranked.filter(r => r.bandIndex < 1).reverse().slice(0, L);
  if (n >= 2 && !winners.length) winners = [ranked[0]];
  if (n >= 2 && !misses.length) {
    const last = ranked[n - 1];
    misses = winners.includes(last) ? [] : [last];
  }
  winners.forEach(r => r.badges.push("winner: band-matched like rate"));
  misses.forEach(r => r.badges.push("miss: band-matched like rate"));

  return Object.assign(header("audit"), { ranked, winners, misses, unranked, bands, maturityHours: MATURITY_HOURS });
}

function rank(posts, opts) {
  opts = opts || {};
  const mode = opts.mode || "audit";
  if (!MODES.includes(mode)) throw new Error("unknown mode '" + mode + "' (expected " + MODES.join(", ") + ")");
  if (opts.sortBy && /^c$/i.test(opts.sortBy)) {
    throw new Error("C is a checklist, not a forecast — it cannot be a sort key for a best-posts ranking");
  }
  const now = opts.now || Date.now();
  if (mode === "checklist") return checklist(posts, { now });

  const { kept, dropped } = clean(posts, { now, maturityHours: opts.maturityHours });
  const cards = kept.map(p => card(p, { mode, now }));
  let result;
  if (mode === "engagement") result = engagement(cards);
  else if (mode === "stealability") result = stealability(cards);
  else result = audit(cards, opts);
  result.dropped = dropped;
  result.n = cards.length;
  return result;
}

module.exports = { clean, card, rank, median, BANDS, MODES, K, MATURITY_HOURS };
