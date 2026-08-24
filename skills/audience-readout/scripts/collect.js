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
    quote: "quotes", quotes: "quotes",
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
      const quoteCard = [...a.querySelectorAll('div[role="link"]')]
        .find(d => d.querySelector('[data-testid="tweetText"]'));
      const txt = (a.querySelector('[data-testid="tweetText"]') || {}).innerText || "";
      const ts = Date.parse(t.getAttribute("datetime"));

      window.__ar.seen.set(id, {
        id, handle, iso: t.getAttribute("datetime"),
        ageMin: isNaN(ts) ? null : Math.round((Date.now() - ts) / 60000),
        views: c.views, likes: c.likes || 0, replies: c.replies || 0,
        reposts: c.reposts || 0, bookmarks: c.bookmarks || 0, quotes: c.quotes || 0,
        isRepost: /reposted/i.test(st),
        isPinned: /pinned/i.test(st),
        isReply: /Replying to/i.test(head) && !/reposted/i.test(st),
        isQuote: !!quoteCard,
        hasImage: !!a.querySelector('[data-testid="tweetPhoto"]'),
        hasVideo: !!a.querySelector('[data-testid="videoPlayer"],[data-testid="videoComponent"],video'),
        verified: !!a.querySelector('svg[data-testid="icon-verified"]'),
        textLen: txt.length,
        hasQuestion: /[?？]/.test(txt),
        text: txt.slice(0, 240).replace(/\s+/g, " ")
      });
      added++;
    });
    return { added, total: window.__ar.seen.size };
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // Jittered, not fixed. A perfectly regular 750ms cadence held for hundreds of
  // scrolls is the most machine-looking thing this script could do, and it costs
  // nothing to vary it.
  const jitter = (base, spread) => sleep(base + Math.random() * spread);

  // Per-session budget. The point is to make a run end on its own rather than
  // relying on someone watching it. Raise deliberately, not reflexively.
  window.__AR_BUDGET = window.__AR_BUDGET || { posts: 250, minutes: 12 };

  // Collects TWICE per scroll position. X renders after the scroll settles, so a
  // single collect right after scrollBy misses most of what appears.
  //
  // Patience ESCALATES on a quiet round rather than giving up. A slow profile can
  // take several seconds to serve the next batch, and the previous fixed 1.3s
  // cadence with a 3-round stall limit abandoned real profiles at ~5 posts. Fast
  // pages never reach the longer waits, so this costs nothing when it is not needed.
  //
  // Stops on: budget reached, genuine stall after escalating patience, or throttling.
  window.__arSweep = async function (rounds = 24, stallLimit = 5) {
    const startedAt = Date.now();
    const startCount = window.__ar.seen.size;
    let stall = 0, reason = "rounds";

    for (let i = 0; i < rounds; i++) {
      if (window.__ar.seen.size >= window.__AR_BUDGET.posts) { reason = "post budget"; break; }
      if (Date.now() - startedAt > window.__AR_BUDGET.minutes * 60000) { reason = "time budget"; break; }

      const before = window.__ar.seen.size;
      window.scrollBy(0, window.innerHeight * (0.7 + Math.random() * 0.15));
      await jitter(900, 600); window.__arCollect();
      await jitter(900, 600); window.__arCollect();

      // A spinner that will not clear is the platform asking us to slow down.
      // Back off once; if it is still spinning, end the session.
      if (document.querySelector('[role="progressbar"]')) {
        await jitter(2500, 1500);
        if (document.querySelector('[role="progressbar"]')) { reason = "throttled"; break; }
      }

      if (window.__ar.seen.size === before) {
        stall++;
        // Give a slow page progressively longer to catch up before counting it out.
        await jitter(1000 * stall, 700);
        window.__arCollect();
        if (window.__ar.seen.size > before) stall = 0;   // it was slow, not finished
      } else {
        stall = 0;
      }
      if (stall >= stallLimit) { reason = "stalled"; break; }
    }

    window.__arSave();
    const out = {
      collected: window.__ar.seen.size - startCount,
      total: window.__ar.seen.size,
      stoppedBecause: reason,
      elapsedMin: +((Date.now() - startedAt) / 60000).toFixed(1)
    };
    if (reason === "throttled" || reason === "post budget" || reason === "time budget") {
      console.log("Session over (" + reason + "). Sample is saved — reload later and " +
                  "__arLoad() picks up where this left off.");
    }
    return out;

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
      "quotes", "isReply", "isRepost", "isQuote", "hasQuestion", "hasImage", "hasVideo",
      "verified", "textLen", "text"];
    const clean = s => String(s == null ? "" : s).replace(/[\t\r\n]+/g, " ").replace(/"/g, "'");
    const tsv = cols.join("\t") + "\n" + rows.map(r =>
      cols.map(c => typeof r[c] === "boolean" ? (r[c] ? 1 : 0) : clean(r[c])).join("\t")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([tsv], { type: "text/tab-separated-values" }));
    a.download = name || "audience-sample.tsv";
    document.body.appendChild(a); a.click(); a.remove();
    return { rows: rows.length, bytes: tsv.length };
  };

  // ── autosave on a clock, not on a pass counter ─────────────────────────────
  // A sweep that flushes every N passes loses everything since the last flush
  // when the tab navigates — and the tab does navigate, because a stray click
  // or a notification is all it takes. Six seconds caps the loss at six seconds.
  window.__arAutosave = function (ms) {
    if (window.__arHeartbeat) clearInterval(window.__arHeartbeat);
    window.__arHeartbeat = setInterval(() => { try { window.__arSave(); } catch (e) {} }, ms || 6000);
    return "autosaving every " + ((ms || 6000) / 1000) + "s";
  };

  // ── detached runners ───────────────────────────────────────────────────────
  // Browser-automation eval has a timeout (45s on CDP). An await that outlives
  // it kills the call while the page keeps working, so you lose the return value
  // and fly blind. These return immediately and publish progress on window.__run.
  //
  // UP walks already-loaded content: it is cached, needs no network, and is the
  // right direction after a human has scrolled the timeline open.
  // DOWN fetches new pages and is much slower — on a very long timeline the
  // renderer bogs down to roughly one pass per 45s.
  function runner(dir, opts) {
    opts = opts || {};
    window.__run = { active: true, done: false, passes: 0, dir: dir,
                     start: window.__ar.seen.size, total: window.__ar.seen.size };
    (async () => {
      const s = ms => new Promise(r => setTimeout(r, ms));
      const step = (opts.step || 0.85) * window.innerHeight * (dir === "up" ? -1 : 1);
      let stall = 0;
      while (window.__run.active && stall < (opts.stall || 8)) {
        if (dir === "up" && window.scrollY <= 0) { window.__run.reason = "reached top"; break; }
        const before = window.__ar.seen.size;
        window.scrollBy(0, step);
        await s(opts.wait || 450); window.__arCollect();
        await s(opts.wait2 || 300); window.__arCollect();
        window.__run.passes++;
        window.__run.y = Math.round(window.scrollY);
        window.__run.total = window.__ar.seen.size;
        if (document.querySelector('[role="progressbar"]')) {
          await s(2200);
          if (document.querySelector('[role="progressbar"]')) {
            window.__run.throttled = (window.__run.throttled || 0) + 1; await s(3000);
          }
        }
        if (window.__ar.seen.size === before) {
          stall++; await s(400 * stall); window.__arCollect();
          if (window.__ar.seen.size > before) stall = 0;
        } else stall = 0;
        if (window.__ar.seen.size >= window.__AR_BUDGET.posts) { window.__run.reason = "budget"; break; }
      }
      window.__arSave();
      window.__run.done = true; window.__run.active = false;
      window.__run.got = window.__ar.seen.size - window.__run.start;
      window.__run.reason = window.__run.reason || (stall >= (opts.stall || 8) ? "stalled" : "ended");
    })();
    return "running — poll window.__run";
  }
  window.__arRunUp = opts => runner("up", opts);
  window.__arRunDown = opts => runner("down", opts);

  // ── did this search window truncate? ───────────────────────────────────────
  // Search sorts newest-first and stops paginating well before it exhausts a
  // window. The tell is that everything collected clusters on the window's most
  // recent day or two while the older end comes back empty — which reads as "he
  // did not post then" and is wrong. Run this after every window.
  window.__arWindowAudit = function (since, until) {
    const inWin = [...window.__ar.seen.values()]
      .filter(r => r.iso && r.iso >= since && r.iso < until);
    const byDay = {};
    inWin.forEach(r => { const k = r.iso.slice(0, 10); byDay[k] = (byDay[k] || 0) + 1; });
    const days = Object.keys(byDay).sort();
    const spanDays = Math.round((Date.parse(until) - Date.parse(since)) / 86400000);
    // Everything sitting in the newest third of the window is the signature.
    const cut = new Date(Date.parse(until) - spanDays * 86400000 / 3).toISOString().slice(0, 10);
    const newestThird = days.filter(d => d >= cut).reduce((a, d) => a + byDay[d], 0);
    const clustered = inWin.length > 0 && newestThird / inWin.length > 0.85 && days.length < spanDays;
    return {
      window: since + " → " + until, posts: inWin.length,
      daysWithPosts: days.length, ofDays: spanDays,
      perDay: days.map(d => d.slice(5) + ":" + byDay[d]).join(" ") || "none",
      verdict: inWin.length === 0 ? "empty — either genuinely quiet or the filter did not apply"
        : clustered ? "LIKELY TRUNCATED — split this window and rerun"
        : "spread looks complete"
    };
  };

  window.__arLoad();

  // Guard against mixing accounts. localStorage is per-origin, so a sample from
  // the last account is still sitting there when you open the next one, and the
  // two silently merge into one archive. This has nearly happened more than once.
  (function () {
    const handles = [...new Set([...window.__ar.seen.values()].map(r => r.handle).filter(Boolean))];
    if (handles.length) {
      console.log("restored", window.__ar.seen.size, "posts from localStorage —", handles.join(", "));
      if (window.__AR_ONLY && !handles.some(h => h.toLowerCase() === window.__AR_ONLY.toLowerCase())) {
        console.warn("RESTORED SAMPLE IS A DIFFERENT ACCOUNT than __AR_ONLY — call __arClear() " +
                     "before collecting, or the two will merge into one archive.");
      }
    }
  })();
  console.log("audience-readout collector ready — __arCollect() / __arSweep() / __arExport()");
  console.log("detached runners: __arRunUp() / __arRunDown(), progress on window.__run");
  console.log("also: __arAutosave() before any long run, __arWindowAudit(since, until) after each search window");
})();
