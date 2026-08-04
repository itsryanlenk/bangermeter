// Bangermeter — scoring engine (pure functions, no DOM access)
// Implements the exact NaviModelScorer weighted-sum math from the repo
// (home-mixer .../scorer/NaviModelScorer.scala) over estimated or derived
// engagement probabilities, plus the HeuristicScorer rescoring chain.

var BangermeterEngine = (function () {
  var C = BANGERMETER_CONFIG;

  // ---- helpers --------------------------------------------------------------

  // "1,234" | "12.3K" | "4.5M" | "12,3 K" -> number
  function parseCount(str) {
    if (str == null) return null;
    var s = String(str).trim().replace(/[,\s ]/g, "").toUpperCase();
    if (s === "") return null;
    var mult = 1;
    if (s.endsWith("K")) { mult = 1e3; s = s.slice(0, -1); }
    else if (s.endsWith("M")) { mult = 1e6; s = s.slice(0, -1); }
    else if (s.endsWith("B")) { mult = 1e9; s = s.slice(0, -1); }
    var n = parseFloat(s.replace(",", "."));
    return isNaN(n) ? null : Math.round(n * mult);
  }

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  // ---- exact NaviModelScorer math ------------------------------------------
  // heads: { name: { weight, p } }  (p may be null = head not scored)
  // Faithful details:
  //  - good_click_v1's extracted score is max(pV1, pV2) (PredictedScoreFeature.scala:52-60);
  //    good_click_v2 is ALSO summed separately with its own weight.
  //  - missing p contributes 0 but its weight still counts in the pos/neg weight sums
  //    ONLY if the head is part of the scored set. We include a head in the sums iff
  //    it has a non-null p (extension adaptation: unobservable heads are excluded
  //    entirely rather than zero-filled, and this is surfaced in the breakdown).
  function naviScore(headPs) {
    var contributions = [];
    var combined = 0, posSum = 0, negSum = 0;

    var pV1 = headPs.good_click_v1 != null ? headPs.good_click_v1.p : null;
    var pV2 = headPs.good_click_v2 != null ? headPs.good_click_v2.p : null;

    Object.keys(headPs).forEach(function (name) {
      var h = headPs[name];
      if (h == null || h.p == null || h.weight === 0) return;
      var p = h.p;
      if (name === "good_click_v1" && pV2 != null) p = Math.max(pV1 != null ? pV1 : 0, pV2);
      var contrib = h.weight * p;
      combined += contrib;
      if (h.weight > 0) posSum += h.weight; else negSum += Math.abs(h.weight);
      contributions.push({ head: name, p: p, weight: h.weight, contribution: contrib });
    });

    var total = posSum + negSum;
    var score;
    if (total === 0) score = Math.max(combined, 0);
    else if (combined < 0) score = ((combined + negSum) / total) * C.epsilon;
    else score = combined + C.epsilon;

    contributions.sort(function (a, b) { return Math.abs(b.contribution) - Math.abs(a.contribution); });
    return { raw: score, combined: combined, contributions: contributions };
  }

  function normalize(raw, baselineRaw) {
    if (baselineRaw <= 0) return 0;
    return Math.round(clamp(C.display.midpoint * Math.pow(raw / baselineRaw, C.display.curve), 0, 100));
  }

  // Earlybird AgeDecay.compute(base, maxBoost=1, halflife, slope, age) — exact sigmoid
  function ageDecayFactor(ageMinutes) {
    var a = C.ageDecay;
    return a.base + ((1.0 - a.base) / (1 + Math.exp(a.slope * (ageMinutes - a.halflifeMinutes))));
  }

  // ---- retrospective: engagement-weighted score -----------------------------
  // features: { counts: {likes, retweets, replies, bookmarks, views}, isReply, hasVideo }
  function engagementScore(features, settings) {
    var counts = features.counts || {};
    var views = counts.views;
    if (views == null || views <= 0) {
      return { available: false, reason: "View count not visible — cannot derive engagement rates." };
    }

    // Empirical-Bayes shrinkage toward each head's baseline rate:
    //   p̂ = (count + K·p0) / (views + K)
    // so tiny view samples (where 1 stray reply = a wild rate) stay near baseline,
    // while large samples are dominated by the observed data. At exactly baseline
    // rates this is an identity: p̂ = p0 for any view count.
    var K = C.engagementShrinkage.pseudoViews;
    function rate(n, p0) {
      return n == null ? null : clamp((n + K * p0) / (views + K), 0, 1);
    }

    var headPs = {
      fav: { weight: C.heads.fav.weight, p: rate(counts.likes, C.baselineP.fav) },
      retweet: { weight: C.heads.retweet.weight, p: rate(counts.retweets, C.baselineP.retweet) },
      reply: { weight: C.heads.reply.weight, p: rate(counts.replies, C.baselineP.reply) }
    };

    var result = naviScore(headPs);
    var rescorers = [];
    var raw = result.raw;

    if (features.isReply) {
      raw *= C.rescorers.reply.factor;
      rescorers.push({ label: C.rescorers.reply.label, factor: C.rescorers.reply.factor });
    }
    if (settings && settings.assumeOutOfNetwork) {
      raw *= C.rescorers.outOfNetwork.factor;
      rescorers.push({ label: C.rescorers.outOfNetwork.label, factor: C.rescorers.outOfNetwork.factor });
    }

    // Baseline over the same observable heads (median tweet rates)
    var B = C.baselineP;
    var baseline = naviScore({
      fav: { weight: C.heads.fav.weight, p: B.fav },
      retweet: { weight: C.heads.retweet.weight, p: B.retweet },
      reply: { weight: C.heads.reply.weight, p: B.reply }
    }).raw;

    var unweightedSignals = [];
    if (counts.bookmarks != null) {
      unweightedSignals.push({
        label: "Bookmarks: " + counts.bookmarks.toLocaleString(),
        note: C.heads.bookmark.note
      });
    }

    return {
      available: true,
      raw: raw,
      score: normalize(raw, baseline),
      contributions: result.contributions,
      rescorers: rescorers,
      unweightedSignals: unweightedSignals,
      views: views,
      lowSample: views < K,
      smoothingNote: views < K
        ? "Only " + views.toLocaleString() + " views — rates are smoothed toward the median (empirical Bayes, K=" + K.toLocaleString() + "), so small samples can't spike or tank the score."
        : null,
      excludedNote: "Unobservable heads excluded: author-engages-replier (75.0), conversation clicks (11/10), profile clicks (12.0), video 50% (0.005), negative feedback (−74/−369)."
    };
  }

  // ---- prospective: content score ------------------------------------------
  // features: { text, hasVideo, hasImage, hasExternalLink, hashtagCount, isReply,
  //             isThreadStarter, isQuote }
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

  function contentScore(features, settings) {
    var B = C.baselineP;
    var text = analyzeText(features.text);

    // Start from baseline probabilities (estimator layer)
    var ps = {
      fav: B.fav, retweet: B.retweet, reply: B.reply,
      reply_engaged_by_author: B.reply_engaged_by_author,
      good_click_v1: B.good_click_v1, good_click_v2: B.good_click_v2,
      good_profile_click: B.good_profile_click,
      video_playback_50: features.hasVideo ? B.video_playback_50 : null,
      negative_feedback_v2: B.negative_feedback_v2, reported: B.reported
    };

    // Apply directional modifiers
    var active = [];
    function applyMod(mod) {
      mod.applies.split(",").forEach(function (head) {
        if (ps[head] != null) ps[head] = clamp(ps[head] * mod.factor, 0, 1);
      });
      active.push({ id: mod.id, label: mod.label, factor: mod.factor,
        provenance: mod.provenance, why: mod.why });
    }

    C.contentModifiers.forEach(function (mod) {
      switch (mod.id) {
        case "question": if (text.hasQuestion) applyMod(mod); break;
        case "conversation_length": if (text.length >= 100) applyMod(mod); break;
        case "thread_starter": if (features.isThreadStarter) applyMod(mod); break;
        case "media_image": if (features.hasImage && !features.hasVideo) applyMod(mod); break;
        case "has_video": if (features.hasVideo) active.push({ id: mod.id, label: mod.label,
          factor: null, provenance: mod.provenance, why: mod.why }); break;
        case "external_link": if (features.hasExternalLink) applyMod(mod); break;
        case "link_no_context":
          if (features.hasExternalLink && text.length < 50) applyMod(mod); break;
        case "many_hashtags": if ((features.hashtagCount || 0) >= 3) applyMod(mod); break;
        case "engagement_bait": if (text.isBait) applyMod(mod); break;
        case "all_caps_shout": if (text.mostlyCaps) applyMod(mod); break;
      }
    });

    var headPs = {};
    Object.keys(ps).forEach(function (name) {
      if (ps[name] != null) headPs[name] = { weight: C.heads[name].weight, p: ps[name] };
    });

    var result = naviScore(headPs);
    var rescorers = [];
    var raw = result.raw;

    if (features.isReply) {
      raw *= C.rescorers.reply.factor;
      rescorers.push({ label: C.rescorers.reply.label, factor: C.rescorers.reply.factor });
    }
    if (settings && settings.assumeOutOfNetwork) {
      raw *= C.rescorers.outOfNetwork.factor;
      rescorers.push({ label: C.rescorers.outOfNetwork.label, factor: C.rescorers.outOfNetwork.factor });
    }

    // Fixed reference baseline: median no-video tweet, no modifiers, no rescoring
    var baseline = naviScore({
      fav: { weight: C.heads.fav.weight, p: B.fav },
      retweet: { weight: C.heads.retweet.weight, p: B.retweet },
      reply: { weight: C.heads.reply.weight, p: B.reply },
      reply_engaged_by_author: { weight: C.heads.reply_engaged_by_author.weight, p: B.reply_engaged_by_author },
      good_click_v1: { weight: C.heads.good_click_v1.weight, p: B.good_click_v1 },
      good_click_v2: { weight: C.heads.good_click_v2.weight, p: B.good_click_v2 },
      good_profile_click: { weight: C.heads.good_profile_click.weight, p: B.good_profile_click },
      negative_feedback_v2: { weight: C.heads.negative_feedback_v2.weight, p: B.negative_feedback_v2 },
      reported: { weight: C.heads.reported.weight, p: B.reported }
    }).raw;

    return {
      available: true,
      raw: raw,
      score: normalize(raw, baseline),
      contributions: result.contributions,
      modifiers: active,
      rescorers: rescorers
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
    ageDecayFactor: ageDecayFactor,
    naviScore: naviScore,
    engagementScore: engagementScore,
    contentScore: contentScore,
    scoreTweet: scoreTweet,
    analyzeText: analyzeText
  };
})();
