// Audience read-out — browser-side collector.
//
// Paste into the console on x.com (a profile, a search result page, or the home
// timeline), or eval it through browser automation. Read-only: it scrolls and
// parses rendered DOM. It never clicks, likes, follows or posts.
//
//   __arCollect()        scrape what is currently rendered  -> { added, total }
//   await __arSweep(20)  scroll and collect, stopping when it stalls
//   __arSave() / __arLoad()   persist to localStorage across reloads
//   __arExport()         download the sample as TSV
//   __arStats()          quick sanity read without leaving the page
//
// Set __AR_ONLY = "handle" to keep only that author (search pages surface others).

(function () {
  const KEY = "__arSample";
  window.__ar = window.__ar || { seen: new Map() };
  window.__AR_ONLY = window.__AR_ONLY || null;

  const WORDS = {
    reply: "replies", replies: "replies", repost: "reposts", reposts: "reposts",
    like: "likes", likes: "likes", bookmark: "bookmarks", bookmarks: "bookmarks",
    view: "views", views: "views"
  };

  // X's aria-labels carry no thousands separators ("1154 views"), so stripping
  // separators is safe here. Do not "fix" this into a locale-aware parser
  // without checking a real label first.
  const num = s => {
    const n = parseInt(String(s).replace(/[,.\s  ]/g, ""), 10);
    return isNaN(n) ? null : n;
  };

  window.__arCollect = function () {
    let added = 0;
    document.querySelectorAll('article[data-testid="tweet"]').forEach(a => {
      const t = a.querySelector('a[href*="/status/"] time');
      if (!t) return;
      const m = (t.parentElement.getAttribute("href") || "").match(/\/([^\/]+)\/status\/(\d+)/);
      if (!m) return;
      const handle = m[1], id = m[2];
      if (window.__AR_ONLY && handle.toLowerCase() !== window.__AR_ONLY.toLowerCase()) return;
      if (window.__ar.seen.has(id)) return;          // dedupe: search re-serves posts

      const grp = a.querySelector('div[role="group"][aria-label]');
      if (!grp) return;
      const c = {};
      grp.getAttribute("aria-label").split(",").forEach(part => {
        const mm = part.trim().match(/^([\d,.\s  ]+)\s+(\w+)$/);
        if (mm && WORDS[mm[2].toLowerCase()]) c[WORDS[mm[2].toLowerCase()]] = num(mm[1]);
      });
      if (c.views == null) return;                   // no denominator, no rate

      const social = a.querySelector('[data-testid="socialContext"]');
      const st = social ? social.innerText : "";
      const head = a.innerText.slice(0, 200);
      const quoteCard = a.querySelector('div[role="link"]');
      const txt = (a.querySelector('[data-testid="tweetText"]') || {}).innerText || "";
      const ts = Date.parse(t.getAttribute("datetime"));

      window.__ar.seen.set(id, {
        id, handle, iso: t.getAttribute("datetime"),
        ageMin: isNaN(ts) ? null : Math.round((Date.now() - ts) / 60000),
        views: c.views, likes: c.likes || 0, replies: c.replies || 0,
        reposts: c.reposts || 0, bookmarks: c.bookmarks || 0,
        isRepost: /reposted/i.test(st),
        isPinned: /pinned/i.test(st),
        isReply: /Replying to/i.test(head) && !/reposted/i.test(st),
        isQuote: !!(quoteCard && quoteCard.querySelector('[data-testid="tweetText"]')),
        hasImage: !!a.querySelector('[data-testid="tweetPhoto"]'),
        hasVideo: !!a.querySelector('[data-testid="videoPlayer"],[data-testid="videoComponent"],video'),
        verified: !!a.querySelector('svg[data-testid="icon-verified"]'),
        textLen: txt.length,
        text: txt.slice(0, 240).replace(/\s+/g, " ")
      });
      added++;
    });
    return { added, total: window.__ar.seen.size };
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Collects TWICE per scroll position. X renders after the scroll settles, so a
  // single collect right after scrollBy misses most of what appears — this is
  // the usual reason a sweep appears to stall at a low count.
  window.__arSweep = async function (rounds = 20, stallLimit = 5) {
    let stall = 0;
    for (let i = 0; i < rounds && stall < stallLimit; i++) {
      const before = window.__ar.seen.size;
      window.scrollBy(0, window.innerHeight * 0.75);
      await sleep(750); window.__arCollect();
      await sleep(650); window.__arCollect();
      stall = window.__ar.seen.size === before ? stall + 1 : 0;
    }
    window.__arSave();
    return { total: window.__ar.seen.size, stalled: stall >= stallLimit };
  };

  window.__arSave = () => {
    localStorage.setItem(KEY, JSON.stringify([...window.__ar.seen.values()]));
    return window.__ar.seen.size;
  };
  window.__arLoad = () => {
    try {
      JSON.parse(localStorage.getItem(KEY) || "[]")
        .forEach(r => window.__ar.seen.set(r.id, r));
    } catch (e) {}
    return window.__ar.seen.size;
  };
  window.__arClear = () => { localStorage.removeItem(KEY); window.__ar.seen.clear(); return 0; };

  window.__arStats = function () {
    const rows = [...window.__ar.seen.values()].filter(r => r.views > 0);
    if (!rows.length) return { n: 0 };
    const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
    const iso = rows.map(r => r.iso).sort();
    return {
      n: rows.length,
      oldest: iso[0], newest: iso[iso.length - 1],
      medianViews: q(rows.map(r => r.views), .5),
      medianLikeRate: +(q(rows.map(r => r.likes / r.views), .5) * 100).toFixed(2) + "%",
      quotes: rows.filter(r => r.isQuote).length,
      replies: rows.filter(r => r.isReply).length
    };
  };

  window.__arExport = function (name) {
    const rows = [...window.__ar.seen.values()];
    const cols = ["iso", "handle", "views", "likes", "replies", "reposts", "bookmarks",
      "isReply", "isRepost", "isQuote", "hasImage", "hasVideo", "verified", "textLen", "text"];
    const clean = s => String(s == null ? "" : s).replace(/[\t\r\n]+/g, " ").replace(/"/g, "'");
    const tsv = cols.join("\t") + "\n" + rows.map(r =>
      cols.map(c => typeof r[c] === "boolean" ? (r[c] ? 1 : 0) : clean(r[c])).join("\t")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([tsv], { type: "text/tab-separated-values" }));
    a.download = name || "audience-sample.tsv";
    document.body.appendChild(a); a.click(); a.remove();
    return { rows: rows.length, bytes: tsv.length };
  };

  window.__arLoad();
  console.log("audience-readout collector ready — __arCollect() / __arSweep() / __arExport()");
  console.log("restored from localStorage:", window.__ar.seen.size, "posts");
})();
