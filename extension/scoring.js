// Bangermeter — scoring engine (pure functions, no DOM access)
//
// Implements the Phoenix weighted-value-model math from
// xai-org/x-algorithm, home-mixer/scorers/ranking_scorer.rs:
//   Score = offset_score( Σ(weight_i × P(action_i)) )
// plus the post-hoc rescoring chain (author diversity, then the OON factor).
//
// The weights are X's. The probabilities are ours — a browser can observe counts
// and content, not a Phoenix inference. Everything in the estimator layer is
// labeled as such in weights.js.

var BangermeterEngine = (function () {
  var C = BANGERMETER_CONFIG;

  // ---- helpers --------------------------------------------------------------

  // "1,234" | "12.3K" | "4.5M" | "12,3 K" -> number
  //
  // A comma is ambiguous: "1,234" is a thousands separator but "12,3 K" is a
  // decimal comma. Deciding by what FOLLOWS it — 3 digits means thousands, 1-2
  // means decimal — gets both right. Stripping commas first (as this did through
  // v0.8.0) silently turned "12,3 K" into 123,000.
  function parseCount(str) {
    if (str == null) return null;
    var s = String(str).trim().replace(/[\s  ]/g, "").toUpperCase();
    if (s === "") return null;

    var mult = 1;
    if (s.endsWith("K")) { mult = 1e3; s = s.slice(0, -1); }
    else if (s.endsWith("M")) { mult = 1e6; s = s.slice(0, -1); }
    else if (s.endsWith("B")) { mult = 1e9; s = s.slice(0, -1); }

    var hasDot = s.indexOf(".") !== -1;
    var commas = (s.match(/,/g) || []).length;
    if (hasDot) {
      // Both present: whichever comes last is the decimal separator.
      s = s.lastIndexOf(",") > s.lastIndexOf(".")
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
    } else if (commas === 1 && /,\d{1,2}$/.test(s)) {
      s = s.replace(",", ".");   // decimal comma
    } else {
      s = s.replace(/,/g, "");   // thousands separators
    }

    var n = parseFloat(s);
    return isNaN(n) ? null : Math.round(n * mult);
  }

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  // ---- locale-aware DOM-string parsing --------------------------------------
  // These parse strings the x.com DOM renders (action-bar aria-labels, reply
  // markers). They live in the engine, not content.js, so the test suite can
  // exercise them. Same discipline as the weight layer: a locale's strings are
  // added only once sourced from the real x.com UI — a wrong string fails
  // silently in the field, which is worse than falling back to the
  // testid-based per-button path content.js keeps as backup.

  // aria-label count words, per locale, lowercase. Keyed by the counts-object
  // key each word maps to.
  var COUNT_WORDS = {
    en: {
      replies: ["reply", "replies"],
      retweets: ["repost", "reposts", "retweet", "retweets"],
      likes: ["like", "likes"],
      bookmarks: ["bookmark", "bookmarks"],
      views: ["view", "views"]
    }
  };

  // Leading marker text that identifies a post as a reply, per locale.
  // Matched against the START of a text block (the marker is its own line in
  // the rendered post), never as a free substring — "I like replying to
  // people" must not flag.
  var REPLY_MARKERS = {
    en: ["replying to"]
  };

  // word (lowercase) -> counts key, flattened across locales once at load.
  var WORD_TO_KEY = (function () {
    var map = {};
    Object.keys(COUNT_WORDS).forEach(function (loc) {
      var words = COUNT_WORDS[loc];
      Object.keys(words).forEach(function (key) {
        words[key].forEach(function (w) { map[w] = key; });
      });
    });
    return map;
  })();

  // "1 reply, 5 reposts, 30 likes, 2 bookmarks, 1034 views" -> counts object.
  // Unicode-aware on the word side so non-Latin locales can join the table.
  // First value wins per key: the group label lists each count once, and a
  // duplicate word means we are misreading something — trusting the first
  // occurrence keeps the failure conservative.
  function parseActionBarLabel(label) {
    var counts = {};
    if (!label) return counts;
    var re = /([\d.,]+\s?[KMB]?)\s+([\p{L}\p{M}]+)/gu, m;
    while ((m = re.exec(label)) !== null) {
      var key = WORD_TO_KEY[m[2].toLowerCase()];
      if (key && counts[key] == null) counts[key] = parseCount(m[1]);
    }
    return counts;
  }

  // Does this text block START with a reply marker in any supported locale?
  function replyMarkerIn(text) {
    if (!text) return false;
    var t = String(text).replace(/^\s+/, "").toLowerCase();
    var locales = Object.keys(REPLY_MARKERS);
    for (var i = 0; i < locales.length; i++) {
      var markers = REPLY_MARKERS[locales[i]];
      for (var j = 0; j < markers.length; j++) {
        if (t.indexOf(markers[j]) === 0) return true;
      }
    }
    return false;
  }

  // ---- score history (pure list/entry logic; storage stays in content.js) ----
  var HISTORY_SNIPPET_CHARS = 80;

  function makeHistoryEntry(features, result, now) {
    var snippet = String(features.text || "").replace(/\s+/g, " ").trim();
    if (snippet.length > HISTORY_SNIPPET_CHARS) {
      snippet = snippet.slice(0, HISTORY_SNIPPET_CHARS - 1) + "…";
    }
    var counts = features.counts || {};
    return {
      id: features.tweetId || null,
      t: now,
      c: result.content ? result.content.score : null,
      e: (result.engagement && result.engagement.available) ? result.engagement.score : null,
      v: counts.views == null ? null : counts.views,
      r: features.isReply ? 1 : 0,
      s: snippet
    };
  }

  // ---- Under the Hood report parsing ----------------------------------------
  // Parses the JSON a pilot-cohort user downloads from x.com/i/under_the_hood
  // and imports by hand (the page never renders the labels into the DOM, and a
  // zero-network extension will not fetch them). User-supplied input, so:
  // strict shape validation, whitelisted label characters, capped string and
  // array sizes, and a null on anything that does not look like the report.
  // The rendering side must only ever use textContent on these fields.
  function parseUnderTheHoodReport(jsonText) {
    var raw;
    try { raw = JSON.parse(jsonText); } catch (e) { return null; }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    if (!Array.isArray(raw.postLabels) && !Array.isArray(raw.accountLabels)) return null;

    function str(v, cap) { return typeof v === "string" ? v.slice(0, cap) : null; }
    function num(v) { return (typeof v === "number" && isFinite(v)) ? v : null; }
    var LABEL_RE = /^[A-Za-z0-9_]{1,64}$/;

    function labelRows(arr) {
      if (!Array.isArray(arr)) return [];
      var rows = [];
      for (var i = 0; i < arr.length && rows.length < 50; i++) {
        var row = arr[i];
        if (!row || typeof row !== "object" || Array.isArray(row)) continue;
        var label = str(row.label, 64);
        if (!label || !LABEL_RE.test(label)) continue;
        rows.push({
          label: label,
          about: str(row.about, 400),
          effect: str(row.effect, 400),
          posts: num(row.posts),
          totalPostsInMonth: num(row.totalPostsInMonth),
          percentageOfPosts: num(row.percentageOfPosts)
        });
      }
      return rows;
    }

    var period = (raw.period && typeof raw.period === "object" && !Array.isArray(raw.period)) ? {
      startDate: str(raw.period.startDate, 40),
      endDate: str(raw.period.endDate, 40)
    } : null;

    return {
      generatedAt: num(raw.generatedAt),
      postCount: num(raw.postCount),
      period: period,
      postLabels: labelRows(raw.postLabels),
      accountLabels: labelRows(raw.accountLabels)
    };
  }

  // Newest first; an entry with the same id replaces the old one (a rescored
  // tweet is an update, not a new data point); capped ring buffer.
  function pushHistory(list, entry, cap) {
    var kept = (list || []).filter(function (x) {
      return !(entry.id != null && x.id === entry.id);
    });
    kept.unshift(entry);
    return kept.slice(0, cap);
  }

  // ---- published weight lookups ---------------------------------------------

  // reply_weight_for(candidate) — ranking_scorer.rs:186-193.
  // The +15.0 boost lands only on an ORIGINAL post whose author you mutually
  // follow. Replies and reposts are explicitly ineligible.
  function replyWeightFor(ctx) {
    var base = C.heads.reply.weight;
    var boost = C.bidirectionalFollowReplyBoost;
    if (boost !== 0 && ctx && ctx.isMutualFollow === true && !ctx.isReply && !ctx.isRepost) {
      return base + boost;
    }
    return base;
  }

  // oon_applies(candidate) — ranking_scorer.rs:747-754. A boolean gate, so the
  // 0.75 factor lands exactly once. EnableOonRescoreForInNetworkRepliesRetweets
  // defaults true, which is why an in-network reply or repost is discounted too.
  function oonApplies(ctx) {
    if (!ctx) return false;
    if (ctx.inNetwork === false) return true;
    if (ctx.inNetwork === true) return !!(ctx.isReply || ctx.isRepost);
    return false;
  }

  // diversity_multiplier(decay, floor, k) — ranking_scorer.rs:614-616
  function diversityMultiplier(k) {
    var d = C.rescorers.authorDiversity;
    return (1.0 - d.floor) * Math.pow(d.decay, k) + d.floor;
  }

  // offset_score(combined) — ranking_scorer.rs:525-533.
  // The sums come from the FULL published weight table, exactly as
  // ScoringWeights::new builds them — not from the subset of heads we happen to
  // be able to estimate. That is what makes the negative branch faithful: any
  // net-negative post is squashed into (0, offset), below every positive post.
  function offsetScore(combined) {
    var w = C.weightSums;
    var off = C.negativeScoresOffset;
    if (w.total === 0) return Math.max(combined, 0);
    if (combined < 0) return (combined + w.negative) / w.total * off;
    return combined + off;
  }

  // ---- the weighted sum -----------------------------------------------------
  // headPs: { headName: { weight, p } }  (p null = head not scored)
  function weightedScore(headPs) {
    var contributions = [];
    var pos = 0, neg = 0;

    Object.keys(headPs).forEach(function (name) {
      var h = headPs[name];
      if (h == null || h.p == null) return;
      var contrib = h.weight * h.p;
      // Production splits terms by SIGN OF THE TERM, not sign of the weight.
      if (contrib >= 0) pos += contrib; else neg -= contrib;
      if (h.weight !== 0) {
        contributions.push({ head: name, p: h.p, weight: h.weight, contribution: contrib });
      }
    });

    var combined = pos - neg;
    contributions.sort(function (a, b) {
      return Math.abs(b.contribution) - Math.abs(a.contribution);
    });
    return { raw: offsetScore(combined), combined: combined, pos: pos, neg: neg,
      contributions: contributions };
  }

  // offset_score is left bit-faithful, which means the deepest possible negative
  // lands a hair below zero (float error on negative_sum). Math.pow of a negative
  // base at a fractional exponent is NaN, so the guard belongs here, at the
  // display boundary — not inside the published arithmetic.
  function normalize(raw, baselineRaw) {
    if (!(baselineRaw > 0) || !(raw > 0)) return 0;
    return Math.round(clamp(C.display.midpoint * Math.pow(raw / baselineRaw, C.display.curve), 0, 100));
  }

  // Earlybird AgeDecay.compute(base, maxBoost=1, halflife, slope, age) — exact sigmoid
  function ageDecayFactor(ageMinutes) {
    var a = C.ageDecay;
    return a.base + ((1.0 - a.base) / (1 + Math.exp(a.slope * (ageMinutes - a.halflifeMinutes))));
  }

  // ---- shared rescoring chain ----------------------------------------------
  // Production order: author diversity, then the OON factor (ranking_scorer.rs:832-853).
  // Author diversity is slate-relative (needs the whole timeline), so it is
  // reported as context rather than applied to a single post's score.
  function applyRescorers(raw, features, settings, opts) {
    var rescorers = [];
    var s = settings || {};
    var netCtx = {
      inNetwork: s.assumeOutOfNetwork ? false : true,
      isReply: !!features.isReply,
      isRepost: !!features.isRepost
    };

    if (oonApplies(netCtx)) {
      var oon = C.rescorers.outOfNetwork;
      raw *= oon.factor;
      rescorers.push({
        label: oon.label,
        factor: oon.factor,
        reason: netCtx.inNetwork === false
          ? "Out-of-network view assumed"
          : (features.isReply ? "In-network reply" : "In-network repost")
      });
    }

    if (features.isVerified && s.applyVerifiedBoost2023) {
      var bv = C.rescorers.blueVerified;
      var bvFactor = s.assumeOutOfNetwork ? bv.outOfNetwork : bv.inNetwork;
      raw *= bvFactor;
      rescorers.push({ label: "Verified author ×" + bvFactor + " (2023 code, absent from the 2026 release)",
        factor: bvFactor });
    }

    // Community Note suppression applies to the PROSPECTIVE score only — a post's
    // actual counts already embed whatever suppression occurred.
    if (opts && opts.allowCommunityNote && features.hasCommunityNote) {
      var cn = C.rescorers.communityNote;
      raw *= cn.factor;
      rescorers.push({ label: cn.label, factor: cn.factor });
    }

    return { raw: raw, rescorers: rescorers };
  }

  function mutualCtx(features, settings) {
    var s = settings || {};
    return {
      isMutualFollow: features.isMutualFollow === true || s.assumeMutualFollow === true,
      isReply: !!features.isReply,
      isRepost: !!features.isRepost
    };
  }

  // ---- retrospective: engagement-weighted score -----------------------------
  // Only three heads are genuinely observable from the timeline DOM: likes,
  // replies and reposts. Quote counts are not exposed there, and bookmarks have
  // no head in the 2026 roster at all.
  function engagementScore(features, settings) {
    var counts = features.counts || {};
    var views = counts.views == null ? null : Number(counts.views);
    if (views == null || !isFinite(views) || views <= 0) {
      return { available: false, reason: "View count not visible — cannot derive engagement rates." };
    }

    // Empirical-Bayes shrinkage toward each head's baseline rate:
    //   p̂ = (count + K·p0) / (views + K)
    var K = C.engagementShrinkage.pseudoViews;
    function rate(n, p0) {
      if (n == null) return null;
      // Guard against a caller that bypassed parseCount: a string count would
      // concatenate instead of add, and a NaN would poison the whole score.
      var c = Number(n);
      if (!isFinite(c) || c < 0) return null;
      return clamp((c + K * p0) / (views + K), 0, 1);
    }

    // Measured timeline rates, NOT the content model's priors. This score asks
    // how a post's real rates compare to a real typical post, so its reference
    // has to be measured; contentScore's question is different and uses
    // baselineP. Merging the two flattens the content score — see weights.js.
    var B = C.observedRates;
    var replyW = replyWeightFor(mutualCtx(features, settings));

    var result = weightedScore({
      favorite: { weight: C.heads.favorite.weight, p: rate(counts.likes, B.favorite) },
      reply: { weight: replyW, p: rate(counts.replies, B.reply) },
      retweet: { weight: C.heads.retweet.weight, p: rate(counts.retweets, B.retweet) }
    });

    var resc = applyRescorers(result.raw, features, settings, { allowCommunityNote: false });

    // Fixed reference: a median post at baseline rates, base reply weight, no
    // rescoring. A mutual-follow post SHOULD score above this — that is the finding.
    var baseline = weightedScore({
      favorite: { weight: C.heads.favorite.weight, p: B.favorite },
      reply: { weight: C.heads.reply.weight, p: B.reply },
      retweet: { weight: C.heads.retweet.weight, p: B.retweet }
    }).raw;

    var unweightedSignals = [];
    if (counts.bookmarks != null) {
      unweightedSignals.push({
        label: "Bookmarks: " + counts.bookmarks.toLocaleString(),
        note: C.unweightedSignals.bookmark.note
      });
    }

    return {
      available: true,
      raw: resc.raw,
      score: normalize(resc.raw, baseline),
      contributions: result.contributions,
      rescorers: resc.rescorers,
      unweightedSignals: unweightedSignals,
      views: views,
      lowSample: views < K,
      smoothingNote: views < K
        ? "Only " + views.toLocaleString() + " views — rates are smoothed toward the median (empirical Bayes, K=" + K.toLocaleString() + "), so small samples can't spike or tank the score."
        : null,
      excludedNote: "Scored from the three heads a browser can see: likes (0.5), replies (" + replyW + "), reposts (1.0). The other 23 heads — shares (2.0 / 5.0 / 20.0), follows (4.0), clicks, dwell time and the negatives (−43.2 to −234.0) — need Phoenix's predictions, not counts."
    };
  }

  // ---- prospective: content score ------------------------------------------
  function analyzeText(text) {
    var t = text || "";
    var letters = t.replace(/[^A-Za-z]/g, "");
    var caps = t.replace(/[^A-Z]/g, "");
    return {
      length: t.length,
      hasQuestion: /\?/.test(t),
      isBait: /\b(like if|rt if|retweet if|repost if|follow me|follow for|drop a|comment below|tag someone|tag a friend)\b/i.test(t),
      mostlyCaps: letters.length >= 12 && caps.length / letters.length > 0.7
    };
  }

  // Is the video-quality-view head payable for this post?
  // Two gates in candidates_util.rs::vqv_weight — duration > MinVideoDurationMs,
  // and the VIEWER having under MAX_FOLLOWERS_THRESHOLD (10,000) followers. The
  // follower gate is viewer-state a page script cannot read, so it is disclosed
  // rather than modeled; the duration gate is enforced where the DOM reveals it.
  function vqvEligible(features) {
    if (!features.hasVideo) return false;
    if (features.isGif) return false;
    var minSeconds = C.sourcedFacts.minVideoDurationMs.value / 1000;
    if (features.videoSeconds != null && features.videoSeconds <= minSeconds) return false;
    return true;
  }

  // Heads scored for every post, regardless of media.
  var ALWAYS_ON = ["favorite", "reply", "retweet", "quote", "share", "share_via_dm",
    "share_via_copy_link", "follow_author", "click", "cont_dwell_time",
    "not_dwelled", "not_interested", "block_author", "mute_author", "report"];

  function contentScore(features, settings) {
    var B = C.baselineP;
    var text = analyzeText(features.text);

    var ps = {};
    ALWAYS_ON.forEach(function (h) { ps[h] = B[h]; });
    // Conditional heads — scored only when the post actually has the affordance.
    if (features.hasExternalLink) ps.open_link = B.open_link;
    if (features.hasImage && !features.hasVideo) ps.photo_expand = B.photo_expand;
    if (features.hasVideo) {
      ps.video_open = B.video_open;
      // candidates_util.rs::vqv_weight returns 0.0 unless duration is STRICTLY
      // greater than MinVideoDurationMs. GIFs never qualify; a known short
      // duration disqualifies; an unknown duration is credited but flagged,
      // since most X video clears 10s.
      if (vqvEligible(features)) ps.vqv = B.vqv;
    }
    if (features.isQuote) ps.quoted_click = B.quoted_click;

    var active = [];
    function bump(head, factor) {
      if (ps[head] != null) ps[head] = clamp(ps[head] * factor, 0, head === "cont_dwell_time" ? 600 : 1);
    }
    function applyMod(mod) {
      if (mod.applies) {
        mod.applies.split(",").forEach(function (h) { if (h) bump(h, mod.factor); });
      }
      if (mod.alsoApplies) {
        Object.keys(mod.alsoApplies).forEach(function (h) { bump(h, mod.alsoApplies[h]); });
      }
      active.push({ id: mod.id, label: mod.label, factor: mod.applies ? mod.factor : null,
        provenance: mod.provenance, why: mod.why });
    }

    C.contentModifiers.forEach(function (mod) {
      switch (mod.id) {
        case "question": if (text.hasQuestion) applyMod(mod); break;
        case "conversation_length": if (text.length >= 100) applyMod(mod); break;
        case "thread_starter": if (features.isThreadStarter) applyMod(mod); break;
        case "media_image": if (features.hasImage && !features.hasVideo) applyMod(mod); break;
        case "has_video": if (features.hasVideo) applyMod(mod); break;
        case "external_link": if (features.hasExternalLink) applyMod(mod); break;
        case "link_no_context":
          if (features.hasExternalLink && text.length < 50) applyMod(mod); break;
        case "many_hashtags": if ((features.hashtagCount || 0) >= 3) applyMod(mod); break;
        case "engagement_bait": if (text.isBait) applyMod(mod); break;
        case "all_caps_shout": if (text.mostlyCaps) applyMod(mod); break;
      }
    });

    var replyW = replyWeightFor(mutualCtx(features, settings));
    var headPs = {};
    Object.keys(ps).forEach(function (name) {
      if (ps[name] == null) return;
      headPs[name] = {
        weight: name === "reply" ? replyW : C.heads[name].weight,
        p: ps[name]
      };
    });

    var result = weightedScore(headPs);
    var resc = applyRescorers(result.raw, features, settings, { allowCommunityNote: true });

    // Fixed reference: median text-only post, base reply weight, no modifiers.
    var baseHeadPs = {};
    ALWAYS_ON.forEach(function (h) {
      baseHeadPs[h] = { weight: C.heads[h].weight, p: B[h] };
    });
    var baseline = weightedScore(baseHeadPs).raw;

    return {
      available: true,
      raw: resc.raw,
      score: normalize(resc.raw, baseline),
      combined: result.combined,
      netNegative: result.combined < 0,
      contributions: result.contributions,
      modifiers: active,
      rescorers: resc.rescorers
    };
  }

  // ---- combined per-tweet result -------------------------------------------
  function scoreTweet(features, settings) {
    var content = contentScore(features, settings);
    var engagement = engagementScore(features, settings);
    var age = null;
    if (features.ageMinutes != null) {
      age = { minutes: features.ageMinutes, factor: ageDecayFactor(features.ageMinutes) };
    }
    return { content: content, engagement: engagement, ageDecay: age, features: features };
  }

  return {
    parseCount: parseCount,
    parseActionBarLabel: parseActionBarLabel,
    replyMarkerIn: replyMarkerIn,
    makeHistoryEntry: makeHistoryEntry,
    pushHistory: pushHistory,
    parseUnderTheHoodReport: parseUnderTheHoodReport,
    ageDecayFactor: ageDecayFactor,
    offsetScore: offsetScore,
    weightedScore: weightedScore,
    replyWeightFor: replyWeightFor,
    oonApplies: oonApplies,
    vqvEligible: vqvEligible,
    diversityMultiplier: diversityMultiplier,
    engagementScore: engagementScore,
    contentScore: contentScore,
    scoreTweet: scoreTweet,
    analyzeText: analyzeText
  };
})();
