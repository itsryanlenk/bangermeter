// Bangermeter — content script: timeline badges, breakdown panel, compose meter
// Runs on x.com / twitter.com. Depends on weights.js + scoring.js (same isolated world).

(function () {
  "use strict";

  var settings = Object.assign({}, BANGERMETER_DEFAULT_SETTINGS);
  var scanTimer = null;

  try {
    chrome.storage.sync.get(BANGERMETER_DEFAULT_SETTINGS, function (stored) {
      settings = Object.assign({}, BANGERMETER_DEFAULT_SETTINGS, stored || {});
      if (!settings.showBadges) removeAllBadges();
      fullRescan();
    });
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "sync") return;
      Object.keys(changes).forEach(function (k) { settings[k] = changes[k].newValue; });
      if (!settings.showBadges) removeAllBadges();
      fullRescan();
    });
  } catch (e) { /* storage unavailable — run with defaults */ }

  // ── theming ───────────────────────────────────────────────────────────────
  // Panel + meter follow X's OWN theme (default/dim/lights-out), not the OS,
  // unless the user pins light/dark in settings. The badge stays light — brand.
  function xThemeIsDark() {
    try {
      var bg = getComputedStyle(document.body).backgroundColor;
      var m = bg.match(/\d+/g);
      if (!m || m.length < 3) return false;
      var lum = 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2];
      return lum < 128;
    } catch (e) { return false; }
  }

  function applyTheme(node) {
    var mode = settings.theme || "auto";
    var dark = mode === "dark" || (mode === "auto" && xThemeIsDark());
    if (dark) node.setAttribute("data-bm-theme", "dark");
    else node.removeAttribute("data-bm-theme");
  }

  // ── tweet feature extraction ──────────────────────────────────────────────

  var COUNT_WORDS = {
    reply: "replies", replies: "replies",
    repost: "retweets", reposts: "retweets", retweet: "retweets", retweets: "retweets",
    like: "likes", likes: "likes",
    bookmark: "bookmarks", bookmarks: "bookmarks",
    view: "views", views: "views"
  };

  // "1 reply, 5 reposts, 30 likes, 2 bookmarks, 1034 views" -> counts object
  function parseAriaCounts(label) {
    var counts = {};
    if (!label) return counts;
    var re = /([\d.,]+[KMB]?)\s+([A-Za-z]+)/g, m;
    while ((m = re.exec(label)) !== null) {
      var key = COUNT_WORDS[m[2].toLowerCase()];
      if (key && counts[key] == null) counts[key] = BangermeterEngine.parseCount(m[1]);
    }
    return counts;
  }

  function extractCounts(article) {
    var counts = {};
    var group = article.querySelector('div[role="group"][aria-label]');
    if (group) counts = parseAriaCounts(group.getAttribute("aria-label"));

    // Fallbacks per button when the group label was empty
    [["reply", "replies"], ["retweet", "retweets"], ["like", "likes"],
     ["bookmark", "bookmarks"]].forEach(function (pair) {
      if (counts[pair[1]] != null) return;
      var btn = article.querySelector('button[data-testid="' + pair[0] + '"]');
      if (btn) {
        var parsed = parseAriaCounts(btn.getAttribute("aria-label"));
        if (parsed[pair[1]] != null) counts[pair[1]] = parsed[pair[1]];
      }
    });
    if (counts.views == null) {
      var analytics = article.querySelector('a[href*="/analytics"]');
      if (analytics) {
        var parsed = parseAriaCounts(analytics.getAttribute("aria-label"));
        if (parsed.views != null) counts.views = parsed.views;
      }
    }
    ["replies", "retweets", "likes", "bookmarks"].forEach(function (k) {
      if (counts[k] == null) counts[k] = 0;
    });
    return counts;
  }

  function extractFeatures(article) {
    var textEl = article.querySelector('[data-testid="tweetText"]');
    var text = textEl ? textEl.innerText : "";

    // A quote-tweet embed is a div[role="link"] card containing its own tweetText.
    // Media inside it belongs to the QUOTED tweet, not the one being scored.
    function inQuote(node) {
      var link = node.closest('div[role="link"]');
      return !!(link && link.querySelector('[data-testid="tweetText"]'));
    }
    function anyOutsideQuote(selector) {
      var nodes = article.querySelectorAll(selector);
      for (var i = 0; i < nodes.length; i++) {
        if (!inQuote(nodes[i])) return true;
      }
      return false;
    }

    var hasVideo = anyOutsideQuote('[data-testid="videoPlayer"], [data-testid="videoComponent"], video');
    var hasImage = anyOutsideQuote('[data-testid="tweetPhoto"]');

    // The video-quality-view head is gated on duration > 10s (candidates_util.rs).
    // GIFs never qualify, and X labels them explicitly. Where a duration overlay
    // is present ("0:23" / "1:04:12") we can settle it outright; otherwise the
    // duration is unknown and we say so rather than assuming it qualifies.
    var isGif = hasVideo && /(^|\s)GIF(\s|$)/.test(article.innerText.slice(0, 400));
    var videoSeconds = null;
    if (hasVideo && !isGif) {
      var durMatch = article.innerText.match(/(?:^|\s)(\d{1,2}:\d{2}(?::\d{2})?)(?:\s|$)/);
      if (durMatch) {
        var parts = durMatch[1].split(":").map(Number);
        videoSeconds = parts.length === 3
          ? parts[0] * 3600 + parts[1] * 60 + parts[2]
          : parts[0] * 60 + parts[1];
      }
    }
    var hasCard = anyOutsideQuote('[data-testid="card.wrapper"]');
    var hasTco = !!(textEl && textEl.querySelector('a[href*="//t.co/"]'));
    var linkishAnchor = false;
    if (textEl) {
      var anchors = textEl.querySelectorAll("a");
      for (var i = 0; i < anchors.length; i++) {
        var t = (anchors[i].textContent || "").trim();
        if (!/^[@#$]/.test(t) && /\w+\.[a-z]{2,}/i.test(t)) { linkishAnchor = true; break; }
      }
    }
    var hashtagCount = textEl ? textEl.querySelectorAll('a[href*="/hashtag/"]').length : 0;

    var isReply = false;
    var socialContext = article.querySelector('[data-testid="socialContext"]');
    var firstDivs = article.innerText.slice(0, 200);
    var isRepost = !!(socialContext && /reposted/i.test(socialContext.innerText));
    if (/Replying to/i.test(firstDivs) && !isRepost) {
      isReply = true;
    }

    // Does THIS post quote another? (enables the quoted-click head)
    var quoteCard = article.querySelector('div[role="link"]');
    var isQuote = !!(quoteCard && quoteCard.querySelector('[data-testid="tweetText"]'));

    var ageMinutes = null;
    var timeEl = article.querySelector("time[datetime]");
    if (timeEl) {
      var ts = Date.parse(timeEl.getAttribute("datetime"));
      if (!isNaN(ts)) ageMinutes = Math.max(0, (Date.now() - ts) / 60000);
    }

    var isThreadStarter = /🧵/.test(text) || /(^|\s)1\/\d+/.test(text);

    // Verified badge on the AUTHOR (not a quoted tweet's author)
    var isVerified = false;
    var vIcons = article.querySelectorAll('svg[data-testid="icon-verified"]');
    for (var v = 0; v < vIcons.length; v++) {
      if (!inQuote(vIcons[v])) { isVerified = true; break; }
    }

    // Community Note attached (Birdwatch pivot element)
    var hasCommunityNote = !!article.querySelector('[data-testid="birdwatch-pivot"]');

    // FOSNR restricted-reach interstitial (qualitative flag; magnitude unpublished)
    var visibilityLimited = /visibility limited/i.test(firstDivs);

    var idLink = article.querySelector('a[href*="/status/"] time');
    var tweetId = null;
    if (idLink) {
      var href = idLink.parentElement.getAttribute("href") || "";
      var idm = href.match(/status\/(\d+)/);
      if (idm) tweetId = idm[1];
    }

    return {
      tweetId: tweetId,
      text: text,
      counts: extractCounts(article),
      hasVideo: hasVideo,
      isGif: isGif,
      videoSeconds: videoSeconds,
      hasImage: hasImage,
      hasExternalLink: hasCard || hasTco || linkishAnchor,
      hashtagCount: hashtagCount,
      isReply: isReply,
      isRepost: isRepost,
      isQuote: isQuote,
      isThreadStarter: isThreadStarter,
      isVerified: isVerified,
      hasCommunityNote: hasCommunityNote,
      visibilityLimited: visibilityLimited,
      ageMinutes: ageMinutes
    };
  }

  // ── badge injection ───────────────────────────────────────────────────────

  function scoreLevel(s) { return s >= 65 ? "high" : s >= 40 ? "mid" : "low"; }

  function renderBadge(article) {
    // Same selector extractCounts uses, so badge home and count source agree;
    // unqualified fallback in case the action bar ever loses its aria-label.
    var group = article.querySelector('div[role="group"][aria-label]') ||
      article.querySelector('div[role="group"]');
    if (!group) return;

    var features = extractFeatures(article);
    var result = BangermeterEngine.scoreTweet(features, settings);

    var badge = article.querySelector(".bangermeter-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "bangermeter-badge";
      badge.setAttribute("role", "button");
      badge.setAttribute("tabindex", "0");
      badge.title = "Bangermeter — click for breakdown";
      badge.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        openPanel(article, badge);
      }, true);
      // role="button" divs don't fire click on Enter/Space by themselves
      badge.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          ev.stopPropagation();
          openPanel(article, badge);
        }
      }, true);
      group.appendChild(badge);
    }

    badge.textContent = "";
    badge.appendChild(boltBox());

    var c = document.createElement("span");
    c.className = "bangermeter-seg bangermeter-" + scoreLevel(result.content.score);
    c.textContent = "C" + result.content.score;
    c.title = "Content score (prospective)";
    badge.appendChild(c);

    if (result.engagement.available) {
      var e = document.createElement("span");
      e.className = "bangermeter-seg bangermeter-" + scoreLevel(result.engagement.score);
      e.textContent = "E" + (result.engagement.lowSample ? "~" : "") + result.engagement.score;
      e.title = result.engagement.lowSample
        ? "Engagement score — low view sample, smoothed toward median"
        : "Engagement score (how the weights value actual engagement)";
      badge.appendChild(e);
    }

    article.setAttribute("data-bangermeter", features.tweetId || "scored");
  }

  function removeAllBadges() {
    document.querySelectorAll(".bangermeter-badge").forEach(function (b) { b.remove(); });
    document.querySelectorAll("[data-bangermeter]").forEach(function (a) {
      a.removeAttribute("data-bangermeter");
    });
  }

  // ── breakdown panel ───────────────────────────────────────────────────────

  var panel = null;
  var lastBadgeFocus = null;

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  // Inline SVG icons (static strings only — never interpolate page content here)
  var SVG_ICONS = {
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
    reply: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 4h18v13h-9l-6 4v-4H3V4z"/></svg>',
    repost: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 3 4 7h3v7h2V7h3L8 3zm8 18 4-4h-3v-7h-2v7h-3l4 4z"/></svg>',
    like: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21C5.5 15.5 2 12 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 4-3.5 7.5-10 13z"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 3h12v18l-6-5-6 5V3z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 3"/></svg>'
  };

  function icon(name) {
    var span = el("span", "bangermeter-icon");
    span.innerHTML = SVG_ICONS[name] || "";
    return span;
  }

  // Yellow square with black bolt — the brand mark
  function boltBox() {
    var box = el("span", "bangermeter-bolt-box");
    box.innerHTML = SVG_ICONS.bolt;
    return box;
  }

  function fmtP(p) {
    if (p >= 0.01) return (p * 100).toFixed(1) + "%";
    return (p * 100).toPrecision(2) + "%";
  }

  // Plain-English one-liners per detected signal (math lives in the tooltip + details)
  var PLAIN_SIGNALS = {
    question: "Asks a question — invites replies, the algorithm's favorite signal",
    conversation_length: "Meaty text — gives people a conversation to click into",
    thread_starter: "Starts a thread — keeps readers on the post longer",
    media_image: "Has a picture — small boost to likes",
    has_video: "Has video — watches barely count (0.05, and nothing under 10 seconds)",
    external_link: "Contains a link — opening it pays 0.2, small but not zero",
    link_no_context: "Mostly just a link — low-context link posts do worse",
    many_hashtags: "3+ hashtags — the old algorithm flags hashtag piles",
    engagement_bait: "“Like if…” bait — invites “show less” clicks and penalties",
    all_caps_shout: "MOSTLY CAPS — reads as shouting, invites negative feedback"
  };

  function plainRescorerText(r) {
    if (r.reason === "Out-of-network view assumed") return "Out-of-network view assumed — scored at 75%";
    if (r.reason === "In-network reply") return "This is a reply — replies take the same 75% discount as out-of-network posts";
    if (r.reason === "In-network repost") return "This is a repost — reposts take the same 75% discount as out-of-network posts";
    if (r.label.indexOf("Verified") === 0) {
      return "Verified author — ×" + r.factor + " boost per 2023 code (absent from the 2026 release)";
    }
    if (r.label.indexOf("Community-noted") === 0) {
      return "Community Note attached — future engagement suppressed ~50% (three causal studies)";
    }
    return r.label;
  }

  // Reply weight is viewer-dependent: 5.0 normally, 20.0 on an original post from
  // an author the viewer mutually follows (BidirectionalFollowReplyWeightBoost).
  function replyWorthText() {
    var w = BangermeterEngine.replyWeightFor({
      isMutualFollow: settings.assumeMutualFollow === true,
      isReply: false, isRepost: false
    });
    var likes = w / BANGERMETER_CONFIG.heads.favorite.weight;
    return settings.assumeMutualFollow
      ? "each worth " + likes + " likes (mutual-follow boost on)"
      : "each worth " + likes + " likes";
  }

  function mathDetails(summaryText) {
    var d = el("details", "bangermeter-math");
    d.appendChild(el("summary", null, summaryText || "Show the math"));
    return d;
  }

  function subtitle(parent, text) {
    parent.appendChild(el("div", "bangermeter-sub", text));
  }

  function sectionScoreRow(parent, label, score, rawNote) {
    var row = el("div", "bangermeter-panel-scorerow");
    row.appendChild(el("span", "bangermeter-panel-scorelabel", label));
    var v = el("span", "bangermeter-panel-scoreval bangermeter-" + scoreLevel(score), String(score));
    row.appendChild(v);
    if (rawNote) row.appendChild(el("span", "bangermeter-panel-raw", rawNote));
    parent.appendChild(row);
  }

  function contributionList(parent, contributions) {
    var maxAbs = 0;
    contributions.forEach(function (c) { maxAbs = Math.max(maxAbs, Math.abs(c.contribution)); });
    contributions.forEach(function (c) {
      var head = BANGERMETER_CONFIG.heads[c.head];
      var row = el("div", "bangermeter-contrib");
      var bar = el("div", "bangermeter-contrib-bar" + (c.contribution < 0 ? " bangermeter-neg" : ""));
      bar.style.width = maxAbs > 0 ? Math.round(Math.abs(c.contribution) / maxAbs * 100) + "%" : "0";
      row.appendChild(bar);
      var lbl = el("div", "bangermeter-contrib-label",
        (head ? head.label : c.head) + "  ·  w " + c.weight + " × P " + fmtP(c.p));
      row.appendChild(lbl);
      var val = el("div", "bangermeter-contrib-val", c.contribution.toFixed(4));
      row.appendChild(val);
      parent.appendChild(row);
    });
  }

  function openPanel(article, anchor) {
    closePanel();
    var features = extractFeatures(article);
    var result = BangermeterEngine.scoreTweet(features, settings);

    panel = el("div", "bangermeter-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Bangermeter score breakdown");
    applyTheme(panel);
    lastBadgeFocus = anchor;
    var head = el("div", "bangermeter-panel-head");
    var title = el("span", "bangermeter-panel-title");
    title.appendChild(boltBox());
    title.appendChild(document.createTextNode("Bangermeter"));
    head.appendChild(title);
    var close = el("button", "bangermeter-panel-close");
    close.setAttribute("aria-label", "Close breakdown");
    // SVG × so it is optically centered (a text glyph sits on its baseline)
    close.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="square" aria-hidden="true"><path d="M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5"/></svg>';
    close.addEventListener("click", closePanel);
    head.appendChild(close);
    panel.appendChild(head);

    // ── Content appeal (plain English; math collapsed) ──
    var sec1 = el("div", "bangermeter-panel-section");
    sectionScoreRow(sec1, "Content appeal", result.content.score, null);
    subtitle(sec1, "What the algorithm would predict from the content alone. 50 = a typical post.");

    if (result.content.modifiers.length) {
      result.content.modifiers.forEach(function (m) {
        var bad = (m.factor != null && m.factor < 1) ||
          m.id === "engagement_bait" || m.id === "all_caps_shout";
        var neutral = m.id === "has_video";
        var dir = neutral ? "·" : (bad ? "▼" : "▲");
        var cls = neutral ? "" : (bad ? " bangermeter-down" : " bangermeter-up");
        var mrow = el("div", "bangermeter-mod");
        mrow.appendChild(el("span", "bangermeter-mod-dir" + cls, dir));
        mrow.appendChild(el("span", "bangermeter-mod-label", PLAIN_SIGNALS[m.id] || m.label));
        mrow.title = m.why + (m.factor != null ? " (×" + m.factor + ", " + m.provenance + ")" : "");
        sec1.appendChild(mrow);
      });
    } else {
      sec1.appendChild(el("div", "bangermeter-sub", "No special signals — scored as a typical post."));
    }
    result.content.rescorers.forEach(function (r) {
      var rrow = el("div", "bangermeter-rescorer",
        (r.factor >= 1 ? "▲ " : "▼ ") + plainRescorerText(r));
      rrow.title = r.label;
      sec1.appendChild(rrow);
    });
    if (result.features.visibilityLimited) {
      var vl = el("div", "bangermeter-rescorer",
        "▼ Visibility limited by X — reach suppressed (magnitude unpublished)");
      vl.title = "FOSNR restricted-reach interstitial detected (FreedomOfSpeechNotReach.scala label taxonomy; numeric penalty never released)";
      sec1.appendChild(vl);
    }
    if (result.features.hasCommunityNote) {
      sec1.appendChild(el("div", "bangermeter-fineprint",
        "Community Note effect sourced from: X's own A/B test (25–34% fewer like/repost decisions), " +
        "Chuai et al. Nature Communications (−61% subsequent reposts), Slaughter et al. PNAS " +
        "(−46% reposts / −44% likes post-attach)."));
    }
    if (result.features.isReply) {
      var bangNote = el("div", "bangermeter-sub",
        "Replies are also filtered out of X's Grok “banger” pipeline before it runs — " +
        "it only ever evaluates original posts (grox/flows/upa/task_filter.py).");
      sec1.appendChild(bangNote);
    }

    var d1 = mathDetails();
    d1.appendChild(el("div", "bangermeter-fineprint",
      "Score = Σ(weight × P) over the Phoenix heads, then offset_score (ranking_scorer.rs), " +
      "× rescorers, normalized so a median post = 50 (√ curve, capped at 100). " +
      "Raw: " + result.content.raw.toFixed(4) +
      (result.content.netNegative
        ? " — NET NEGATIVE: X rescales any post whose weighted sum goes below zero into [0, 0.000894), which puts it under every positive-scoring post in the feed."
        : "")));
    contributionList(d1, result.content.contributions);
    sec1.appendChild(d1);
    panel.appendChild(sec1);

    // ── Earned engagement (plain English; math collapsed) ──
    var sec2 = el("div", "bangermeter-panel-section");
    if (result.engagement.available) {
      sectionScoreRow(sec2, "Earned engagement", result.engagement.score, null);
      subtitle(sec2, "How the algorithm values what this post actually earned, from " +
        result.engagement.views.toLocaleString() + " views. 50 = the median rate measured " +
        "across " + BANGERMETER_CONFIG.observedRates.n + " real timeline posts.");

      var counts = result.features.counts || {};
      [
        { icon: "reply", n: counts.replies, one: "reply", many: "replies",
          worth: replyWorthText(),
          tip: BANGERMETER_CONFIG.heads.reply.note },
        { icon: "repost", n: counts.retweets, one: "repost", many: "reposts",
          worth: "each worth 2 likes",
          tip: "Weight 1.0 vs 0.5 for a like (param.rs, Aug 2026)" },
        { icon: "like", n: counts.likes, one: "like", many: "likes",
          worth: "the baseline unit",
          tip: "Weight 0.5 (param.rs, Aug 2026)" },
        { icon: "bookmark", n: counts.bookmarks, one: "bookmark", many: "bookmarks",
          worth: "not a scored action at all — no bookmark head exists",
          tip: BANGERMETER_CONFIG.unweightedSignals.bookmark.note }
      ].forEach(function (r) {
        if (r.n == null) return;
        var row = el("div", "bangermeter-plainrow");
        row.appendChild(icon(r.icon));
        row.appendChild(el("span", null,
          r.n.toLocaleString() + " " + (r.n === 1 ? r.one : r.many)));
        row.appendChild(el("span", "bangermeter-worth", "— " + r.worth));
        row.title = r.tip;
        sec2.appendChild(row);
      });

      if (result.engagement.smoothingNote) {
        sec2.appendChild(el("div", "bangermeter-fineprint", result.engagement.smoothingNote));
      }
      result.engagement.rescorers.forEach(function (r) {
        var rrow = el("div", "bangermeter-rescorer",
          (r.factor >= 1 ? "▲ " : "▼ ") + plainRescorerText(r));
        rrow.title = r.label;
        sec2.appendChild(rrow);
      });

      var d2 = mathDetails();
      d2.appendChild(el("div", "bangermeter-fineprint",
        "Engagement rates = count ÷ views, smoothed toward the median with K=" +
        BANGERMETER_CONFIG.engagementShrinkage.pseudoViews.toLocaleString() +
        " pseudo-views (empirical Bayes), then run through the same weighted-sum formula. " +
        "Raw: " + result.engagement.raw.toFixed(4)));
      contributionList(d2, result.engagement.contributions);
      d2.appendChild(el("div", "bangermeter-fineprint", result.engagement.excludedNote));
      sec2.appendChild(d2);
    } else {
      sec2.appendChild(el("div", "bangermeter-panel-scorelabel", "Earned engagement"));
      sec2.appendChild(el("div", "bangermeter-sub",
        "Can't score this one — the view count isn't visible, so there's nothing to compute rates from."));
    }
    panel.appendChild(sec2);

    // ── Context footer ──
    var sec3 = el("div", "bangermeter-panel-section");
    if (result.ageDecay) {
      var ageText = result.ageDecay.minutes < 90
        ? Math.round(result.ageDecay.minutes) + " min"
        : (result.ageDecay.minutes / 60).toFixed(1) + " h";
      var fresh = el("div", "bangermeter-context");
      fresh.appendChild(icon("clock"));
      fresh.appendChild(el("span", null,
        "Freshness: ×" + result.ageDecay.factor.toFixed(2) + " at " + ageText +
        " old — posts fade over ~6 hours, never below ×0.60"));
      fresh.title = "Earlybird age-decay sigmoid: base 0.6, halflife 360 min, slope 0.003";
      sec3.appendChild(fresh);
    }
    if (result.features.isVerified && !settings.applyVerifiedBoost2023) {
      var vNote = el("div", "bangermeter-fineprint",
        "Verified author: 2023-era code boosted verified posts ×4 in-network / ×2 out-of-network. " +
        "No such multiplier appears anywhere in the Aug 2026 release. Not applied to this score — " +
        "enable “2023 verified boost” in the popup to simulate that era.");
      sec3.appendChild(vNote);
    }

    // What the Aug 13, 2026 release actually says. Every WEIGHT here is read
    // from the transcribed param.rs table; the ratios are arithmetic on those
    // weights, and they describe value PER EVENT, not how often the event
    // happens. The closing note keeps that distinction visible, because a
    // heavy weight on a rare action is not the same as a big lever.
    var H = BANGERMETER_CONFIG.heads;
    var F = BANGERMETER_CONFIG.sourcedFacts;
    var d4 = mathDetails("What X's published weights actually say");
    [
      "▲ Copying a post's link carries " + H.share_via_copy_link.weight + ", the heaviest positive " +
        "coefficient X publishes. It is also one of the rarest things a reader does — which is " +
        "part of why the number is that large.",
      "▲ Sharing to DMs carries " + H.share_via_dm.weight + ", the same coefficient as a reply. " +
        "The share menu itself carries " + H.share.weight + ". Musk called DM-forwarding “one of " +
        "the strongest signals”; the 2026 file finally puts a number on it.",
      "▲ A reply from someone you mutually follow is worth " +
        (H.reply.weight + BANGERMETER_CONFIG.bidirectionalFollowReplyBoost) + ", not " +
        H.reply.weight + " — but only on original posts, never on replies or reposts.",
      "▲ Gaining a follower off a post pays " + H.follow_author.weight + ".",
      "▲ Opening a link pays " + H.open_link.weight + ". Small, but the “links get zero credit” " +
        "story is now provably wrong.",
      "· Profile clicks pay NOTHING (" + H.profile_click.weight + "). The 2023 table paid 12.0 " +
        "for a profile-click-and-engage — that head has been zeroed out.",
      "· Binary dwell pays nothing either. Only dwell TIME pays, at " + H.cont_dwell_time.weight +
        " per second.",
      "· Video is worth " + H.vqv.weight + " per quality view, and anything under " +
        (F.minVideoDurationMs.value / 1000) + " seconds earns none of it.",
      "· Bookmarks have no head at all — they are not a scored action in 2026.",
      "▼ Scrolling straight past costs " + H.not_dwelled.weight + ". Tiny per impression, but it " +
        "happens on most of them.",
      "▼ Muting (" + H.mute_author.weight + ") hurts nearly twice as much as blocking (" +
        H.block_author.weight + "). Reporting costs " + H.report.weight + ".",
      "▼ Any post whose weighted sum goes net-negative is rescaled below every positive post, " +
        "no matter what else it earned.",
      "· Grok's “banger” pipeline only ever looks at original posts — replies and " +
        "protected accounts are filtered out before it runs."
    ].forEach(function (line) {
      var mark = line.charAt(0);
      var row = el("div", "bangermeter-mod");
      row.appendChild(el("span", "bangermeter-mod-dir" +
        (mark === "▼" ? " bangermeter-down" : mark === "▲" ? " bangermeter-up" : ""), mark));
      row.appendChild(el("span", "bangermeter-mod-label", line.slice(2)));
      d4.appendChild(row);
    });
    d4.appendChild(el("div", "bangermeter-fineprint",
      BANGERMETER_CONFIG.weightsMeaningNote + " These are values per event, not per post: a " +
      "heavy weight on a rare action still moves fewer posts than a light weight on a common " +
      "one. Only likes, replies and reposts above come from this post's real counts — the rest " +
      "need Phoenix's own predictions, so they inform what you read here without entering the " +
      "score above."));
    sec3.appendChild(d4);

    var d3 = mathDetails("About these scores");
    d3.appendChild(el("div", "bangermeter-fineprint",
      "Weights: " + BANGERMETER_CONFIG.weightsSnapshot + ". X states these are kept in sync with " +
      "the live production configuration by cron, which makes them the first ranking weights ever " +
      "published as current rather than historical."));
    d3.appendChild(el("div", "bangermeter-fineprint",
      "Alternative scoring modes exist in the same code (dwell-regret, with far deeper negatives). " +
      "The shipped default is the weighted sum modelled here (value_model_mode = “" +
      F.valueModelMode.value + "”). Relative score, not predicted reach."));
    sec3.appendChild(d3);
    panel.appendChild(sec3);

    document.body.appendChild(panel);
    var rect = anchor.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    var w = panel.offsetWidth, h = panel.offsetHeight;

    // Open ABOVE the badge (top-left/top-right of the cursor) so the panel never
    // runs under the OS taskbar; fall back below only when there is clearly more
    // room under the badge than above it.
    var spaceAbove = rect.top - 16;
    var spaceBelow = vh - rect.bottom - 16;
    var placeAbove = spaceAbove >= Math.min(h, 240) || spaceAbove >= spaceBelow;
    var maxH = Math.max(120, Math.min(h, placeAbove ? spaceAbove : spaceBelow));
    panel.style.maxHeight = maxH + "px";
    // Re-measure: offsetHeight includes padding/borders on top of max-height.
    var actualH = panel.offsetHeight;
    var top = placeAbove ? rect.top - actualH - 8 : rect.bottom + 8;
    // Hard clamp: never off-screen, never under the taskbar edge.
    top = Math.max(8, Math.min(top, vh - actualH - 8));

    // Right-align to the badge so the panel extends to the LEFT of the cursor.
    var left = rect.right - w;
    left = Math.max(8, Math.min(left, vw - w - 8));

    panel.style.top = top + "px";
    panel.style.left = left + "px";

    setTimeout(function () {
      document.addEventListener("click", outsideClose, true);
      document.addEventListener("keydown", escClose, true);
    }, 0);
    // Move focus into the dialog for keyboard users
    try { close.focus({ preventScroll: true }); } catch (e) { /* focus optional */ }
  }

  function outsideClose(ev) {
    if (panel && !panel.contains(ev.target)) closePanel();
  }
  function escClose(ev) { if (ev.key === "Escape") closePanel(); }
  function closePanel() {
    var hadPanel = !!panel;
    if (panel) { panel.remove(); panel = null; }
    document.removeEventListener("click", outsideClose, true);
    document.removeEventListener("keydown", escClose, true);
    // Return focus to the badge that opened the dialog
    if (hadPanel && lastBadgeFocus && lastBadgeFocus.isConnected) {
      try { lastBadgeFocus.focus({ preventScroll: true }); } catch (e) { /* optional */ }
    }
    lastBadgeFocus = null;
  }

  // ── compose-box draft meter ───────────────────────────────────────────────

  function draftFeatures(editor, text) {
    var composeRoot = editor.closest('div[data-testid^="tweetTextarea"]');
    var scope = (composeRoot && composeRoot.parentElement && composeRoot.parentElement.parentElement) || document;
    var hasImage = !!scope.querySelector('[data-testid="attachments"] img');
    var hasVideo = !!scope.querySelector('[data-testid="attachments"] video');
    var hashtagCount = (text.match(/#[\w\u00c0-\uffff]+/g) || []).length;
    var hasExternalLink = /https?:\/\/\S+|\w+\.[a-z]{2,}\/\S*/i.test(text);
    return {
      text: text,
      hasVideo: hasVideo,
      hasImage: hasImage,
      hasExternalLink: hasExternalLink,
      hashtagCount: hashtagCount,
      isReply: false,
      isThreadStarter: /🧵/.test(text) || /(^|\s)1\/\d+/.test(text)
    };
  }

  // Live meters, so scroll/resize can reposition them and drop dead ones.
  var meters = [];

  // Place the meter just below its editor, flipping above and clamping to the
  // viewport when there is no room. Hidden entirely when the editor is not on
  // screen — if you cannot see the composer you are not typing in it.
  function positionMeter(entry) {
    var editor = entry.editor, meter = entry.meter;
    if (!editor.isConnected) { meter.remove(); return false; }
    if (meter.classList.contains("bangermeter-hidden")) return true;

    var r = editor.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    if (r.width === 0 && r.height === 0) { meter.style.visibility = "hidden"; return true; }

    // Always write a position, even when about to hide: a fixed element with no
    // top/left falls back to its static position, which for a body child is
    // somewhere down the document.
    var mw = meter.offsetWidth || 260;
    var mh = meter.offsetHeight || 30;
    var top = r.bottom + 8;
    if (top + mh > vh - 8) top = r.top - mh - 8;      // flip above
    top = Math.max(8, Math.min(top, vh - mh - 8));    // clamp into the viewport
    var left = Math.max(8, Math.min(r.left, vw - mw - 8));
    meter.style.top = top + "px";
    meter.style.left = left + "px";

    // No visible composer, no chip.
    meter.style.visibility = (r.bottom < 0 || r.top > vh) ? "hidden" : "";
    return true;
  }

  function repositionMeters() {
    meters = meters.filter(positionMeter);
  }

  function ensureMeter(editor) {
    for (var i = 0; i < meters.length; i++) {
      if (meters[i].editor === editor) return meters[i].meter;
    }
    var meter = el("div", "bangermeter-meter");
    meter.setAttribute("role", "img");
    var host = editor.closest('div[data-testid^="tweetTextarea"]');
    var testid = editor.getAttribute("data-testid") || (host && host.getAttribute("data-testid"));
    if (testid) meter.setAttribute("data-bm-for", testid);
    var bar = el("div", "bangermeter-meter-track");
    bar.setAttribute("aria-hidden", "true");
    bar.appendChild(el("div", "bangermeter-meter-fill"));
    meter.appendChild(bar);
    meter.appendChild(el("span", "bangermeter-meter-score", ""));
    meter.appendChild(el("span", "bangermeter-meter-hints", ""));
    // Pinned to <body> so no ancestor of the composer can clip or cover it.
    document.body.appendChild(meter);
    meters.push({ editor: editor, meter: meter });
    return meter;
  }

  function updateMeter(editor) {
    if (!settings.scoreDrafts) return;
    var meter = ensureMeter(editor);
    if (!meter) return;
    // Read innerText once per keystroke (it forces layout) and pass it down.
    var text = editor.innerText || "";
    if (text.trim().length === 0) { meter.classList.add("bangermeter-hidden"); return; }
    meter.classList.remove("bangermeter-hidden");
    applyTheme(meter);
    // Match the composer's own width so the chip reads as part of it.
    var hostRect = (editor.closest('div[data-testid^="tweetTextarea"]') || editor)
      .getBoundingClientRect();
    if (hostRect.width > 120) meter.style.maxWidth = Math.round(hostRect.width) + "px";

    var result = BangermeterEngine.contentScore(draftFeatures(editor, text), settings);
    meter.setAttribute("aria-label", "Bangermeter draft score " + result.score + " out of 100");
    var fill = meter.querySelector(".bangermeter-meter-fill");
    fill.style.width = result.score + "%";
    fill.className = "bangermeter-meter-fill bangermeter-fill-" + scoreLevel(result.score);

    var scoreEl = meter.querySelector(".bangermeter-meter-score");
    scoreEl.textContent = "";
    scoreEl.appendChild(icon("bolt"));
    scoreEl.appendChild(document.createTextNode(String(result.score)));

    var hintsEl = meter.querySelector(".bangermeter-meter-hints");
    hintsEl.textContent = "";
    result.modifiers
      .filter(function (m) { return m.factor != null || m.id === "has_video"; })
      .forEach(function (m) {
        var bad = (m.factor != null && m.factor < 1) ||
          m.id === "engagement_bait" || m.id === "all_caps_shout";
        hintsEl.appendChild(el("span", bad ? "bangermeter-down" : "bangermeter-up",
          (bad ? "▼ " : "▲ ") + m.label));
      });

    repositionMeters();
  }

  document.addEventListener("input", function (ev) {
    var editor = ev.target && ev.target.closest &&
      ev.target.closest('div[data-testid^="tweetTextarea"] [contenteditable="true"], [data-testid^="tweetTextarea"][contenteditable="true"]');
    if (editor) updateMeter(editor);
  }, true);

  // The composer moves under the meter constantly: the dialog body scrolls as
  // the draft grows, the timeline scrolls behind it, and the window resizes.
  // capture:true so scrolls inside X's own overflow containers are seen too.
  var reposTimer = null;
  function scheduleReposition() {
    if (reposTimer) return;
    reposTimer = requestAnimationFrame(function () {
      reposTimer = null;
      repositionMeters();
    });
  }
  window.addEventListener("scroll", scheduleReposition, { capture: true, passive: true });
  window.addEventListener("resize", scheduleReposition, { passive: true });

  // ── scanning loop ─────────────────────────────────────────────────────────

  function scan() {
    scanTimer = null;
    if (settings.showBadges) {
      var articles = document.querySelectorAll('article[data-testid="tweet"]');
      articles.forEach(function (article) {
        var stamped = article.getAttribute("data-bangermeter");
        if (!stamped) { renderBadge(article); return; }
        // Fallback stamp means the tweet ID couldn't be resolved — treat as
        // always-stale so virtualized-list recycling can't pin an old score.
        if (stamped === "scored") { renderBadge(article); return; }
        // Virtualized list reuse: re-render when the underlying tweet changed
        var timeLink = article.querySelector('a[href*="/status/"] time');
        if (timeLink) {
          var href = timeLink.parentElement.getAttribute("href") || "";
          var m = href.match(/status\/(\d+)/);
          if (m && m[1] !== stamped) renderBadge(article);
        }
      });
    }
    if (settings.scoreDrafts) {
      document.querySelectorAll('div[data-testid^="tweetTextarea"] [contenteditable="true"]')
        .forEach(function (editor) { updateMeter(editor); });
    }
  }

  function scheduleScan() {
    if (scanTimer != null) return;
    scanTimer = setTimeout(scan, 350);
  }

  function fullRescan() {
    document.querySelectorAll("[data-bangermeter]").forEach(function (a) {
      a.removeAttribute("data-bangermeter");
    });
    scheduleScan();
  }

  var observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleScan();
})();
