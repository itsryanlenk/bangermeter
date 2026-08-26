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

  // ── Locale string tables ────────────────────────────────────────────────
  // Every string below was transcribed from X's OWN production i18n bundles
  // (abs.twimg.com/responsive-web/client-web/i18n/<locale>.<hash>.js, fetched
  // 2026-08-25 and cross-checked against Feb–Aug 2026 Wayback captures of the
  // same bundles — identical). Same rule as the weight layer: no guessed
  // strings. A locale missing here still works through the data-testid
  // fallback in content.js, which needs no words at all.
  //
  // aria-label count words. The number precedes the word in all 16 locales
  // (message keys d0eeb127/dc0e7f37/e089b42d/e0a8fe39/c58b2ab7), so each
  // metric is matched as NUMBER + word-alternative, longest alternative
  // first, and the separator between metrics never matters. Russian and
  // Arabic entries are stems that cover the case/dual endings.
  var COUNT_WORD_TABLE = {
    replies: [
      "reply", "replies",                       // en
      "respuesta", "respuestas",                // es
      "resposta", "respostas",                  // pt
      "réponse", "réponses",                    // fr
      "antwort", "antworten",                   // de
      "risposta", "risposte",                   // it
      "antwoord", "antwoorden",                 // nl
      "yanıt",                                  // tr
      "balasan",                                // id
      "件の返信",                                // ja
      "답글",                                    // ko
      "رد",                                     // ar stem (رد/ردود/ردان)
      "ответ",                                  // ru stem (ответ/ответа/ответов)
      "जवाब",                                    // hi
      "回复",                                    // zh
      "則回覆"                                   // zh-Hant
    ],
    retweets: [
      "repost", "reposts",                      // en/es/pt/fr/de/it/nl
      "retweet", "retweets",                    // legacy wording
      "yeniden gönderi",                        // tr
      "posting ulang",                          // id
      "件のリポスト",                             // ja
      "재게시",                                  // ko
      "إعادة نشر", "إعادات نشر", "إعادتا نشر",   // ar
      "репост",                                 // ru stem
      "रीपोस्ट",                                  // hi stem (रीपोस्ट/रीपोस्ट्स)
      "次转帖",                                  // zh
      "次轉發"                                   // zh-Hant
    ],
    likes: [
      "like", "likes",                          // en
      "me gusta",                               // es (invariant)
      "curtida", "curtidas",                    // pt
      "j'aime", "j’aime",                       // fr (either apostrophe)
      "„gefällt mir“-angabe", "„gefällt mir“-angaben",  // de (typographic quotes)
      "mi piace",                               // it (invariant)
      "vind-ik-leuk", "vind-ik-leuks",          // nl
      "beğeni",                                 // tr
      "suka",                                   // id
      "件のいいね",                               // ja
      "마음에 들어요",                             // ko
      "إعجاب",                                   // ar stem
      "отмет",                                  // ru stem (отметка/отметки/отметок «Нравится»)
      "पसंद",                                     // hi
      "喜欢",                                    // zh
      "個喜歡"                                   // zh-Hant
    ],
    bookmarks: [
      "bookmark", "bookmarks",                  // en
      "elemento guardado", "elementos guardados", // es
      "item salvo", "itens salvos",             // pt
      "signet", "signets",                      // fr
      "lesezeichen",                            // de (invariant)
      "segnalibro", "segnalibri",               // it
      "bladwijzer", "bladwijzers",              // nl
      "yer işareti",                            // tr
      "markah",                                 // id
      "件のブックマーク",                          // ja
      "북마크",                                  // ko
      "علامة مرجعية", "علامات مرجعية", "علامتان مرجعيتان", // ar (tanween handled by the U+064B strip)
      "закладк",                                // ru stem
      "बुकमार्क",                                 // hi
      "书签",                                    // zh
      "個書籤"                                   // zh-Hant
    ],
    views: [
      "view", "views",                          // en
      "reproducción", "reproducciones",         // es
      "visualização", "visualizações",          // pt
      "vue", "vues",                            // fr
      "mal angezeigt",                          // de (invariant)
      "visualizzazione", "visualizzazioni",     // it
      "keer bekeken",                           // nl (invariant)
      "görüntülenme",                           // tr
      "tayangan",                               // id
      "件の表示",                                 // ja
      "조회수",                                   // ko
      "مشاهد",                                   // ar stem (مشاهدة/مشاهدات/مشاهدتان)
      "просмотр",                               // ru stem
      "व्यू",                                     // hi
      "次观看",                                  // zh
      "次觀看"                                   // zh-Hant
    ]
  };

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  // One compiled pattern per metric: NUMBER (+ optional K/M/B) + any of the
  // word alternatives, longest first. Leftmost match wins, so a duplicated
  // word cannot overwrite an earlier count.
  var COUNT_PATTERNS = (function () {
    var out = {};
    Object.keys(COUNT_WORD_TABLE).forEach(function (key) {
      var alts = COUNT_WORD_TABLE[key].slice()
        .sort(function (a, b) { return b.length - a.length; })
        .map(escapeRe);
      out[key] = new RegExp("(\\d[\\d.,]*)(?:\\s?([KMB]))?\\s*(?:" + alts.join("|") + ")", "iu");
    });
    return out;
  })();

  // Marker text that identifies a post as a reply. m: "p" = must start the
  // line (the marker is its own rendered line); m: "c" = contains, for the
  // locales (tr/hi/ko) where the mentions come first and the phrase is a
  // suffix. Callers pass individual LINES, and content.js only scans the text
  // ABOVE the tweet's own text, so a post whose body mentions "replying to"
  // cannot flag.
  var REPLY_MARKERS = [
    { t: "replying to", m: "p" },                          // en
    { t: "respondiendo a", m: "p" }, { t: "en respuesta a", m: "p" },      // es
    { t: "respondendo a", m: "p" }, { t: "em resposta a", m: "p" },
    { t: "respondendo para", m: "p" },                     // pt
    { t: "en réponse à", m: "p" },                         // fr
    { t: "antwort an", m: "p" }, { t: "antwortet", m: "p" },               // de
    { t: "in risposta a", m: "p" },                        // it
    { t: "als antwoord op", m: "p" }, { t: "je antwoordt op", m: "p" },    // nl
    { t: "yanıt olarak", m: "c" }, { t: "yanıt veriliyor", m: "c" },       // tr (suffix)
    { t: "membalas ", m: "p" },                            // id
    { t: "返信先", m: "p" },                                // ja
    { t: "에게 보내는 답글", m: "c" },                        // ko (suffix)
    { t: "ردا على", m: "p" },                              // ar (post U+064B strip)
    { t: "в ответ ", m: "p" }, { t: "вы отвечаете", m: "p" },              // ru
    { t: "जवाब दे रहे हैं", m: "c" },                        // hi (suffix)
    { t: "回复 ", m: "p" },                                 // zh
    { t: "回覆給", m: "p" }, { t: "回覆 ", m: "p" }          // zh-Hant
  ];

  // "1 reply, 5 reposts, 30 likes, 2 bookmarks, 1034 views" -> counts object.
  // Also: "3件の返信、30件のいいね…", "5 ردود، 10 إعجابات…", etc. Zero-count
  // metrics are omitted from X's label; missing keys stay absent here too.
  function parseActionBarLabel(label) {
    var counts = {};
    if (!label) return counts;
    // The bundles ship two diacritic orderings of several Arabic words;
    // stripping fathatan (U+064B) lets a single spelling match both.
    var s = String(label).replace(/ً/g, "");
    Object.keys(COUNT_PATTERNS).forEach(function (key) {
      var m = COUNT_PATTERNS[key].exec(s);
      if (m) counts[key] = parseCount(m[1] + (m[2] || ""));
    });
    return counts;
  }

  // ---- reply detection, by surface ------------------------------------------
  // The "Replying to" label is NOT rendered everywhere. Inside a conversation
  // and on /with_replies, X marks a reply by ADJACENCY — the parent post is
  // rendered directly above, and that is the whole marker. A label-only reader
  // scores every reply under a post as an original, missing the x0.75 factor
  // that in-network replies actually take (found live on x.com, 2026-08-25).
  //
  // Which signal is trustworthy depends on the surface, and getting that wrong
  // is dangerous in one specific direction: on a home timeline EVERY post has a
  // different author above it, so adjacency there would flag the entire feed as
  // replies. Hence surface gating rather than one universal rule.
  //
  //   conversation  — /user/status/123. The thread is the page: the first
  //                   article is the top of it, everything below replies to
  //                   something. Ancestors above the focal post are replies
  //                   too, and so is the focal post when it has ancestors.
  //                   Recommendations below the thread ("Discover more") are
  //                   NOT part of it — the caller flags those via beyondThread.
  //   with_replies  — conversation PAIRS: someone else's post, then the
  //                   account's reply to it. A different author directly above
  //                   is the signal (the rule collect.js already uses).
  //   timeline      — home, profile, search. Label only. Adjacency means
  //                   nothing here and must never be consulted.
  function surfaceFromPath(pathname) {
    var p = String(pathname || "");
    if (/^\/[^\/]+\/status\/\d+/.test(p)) return "conversation";
    if (/\/with_replies\/?$/.test(p)) return "with_replies";
    return "timeline";
  }

  function replyVerdict(o) {
    o = o || {};
    // A repost is a repost, whatever is around it.
    if (o.isRepost) return { isReply: false, signal: "repost" };
    // The label is authoritative wherever X bothers to render it.
    if (o.hasMarker) return { isReply: true, signal: "label" };

    if (o.surface === "conversation" && !o.beyondThread) {
      if (o.hasArticleAbove) return { isReply: true, signal: "thread-position" };
      return { isReply: false, signal: "thread-top" };
    }
    if (o.surface === "with_replies") {
      if (o.hasPrevArticle && o.prevAuthorDiffers) return { isReply: true, signal: "parent" };
      return { isReply: false, signal: o.hasPrevArticle ? "same-author-above" : "first-in-dom" };
    }
    return { isReply: false, signal: "none" };
  }

  // Does this line carry a reply marker in any supported locale?
  function replyMarkerIn(text) {
    if (!text) return false;
    var t = String(text).replace(/ً/g, "").replace(/^\s+/, "").toLowerCase();
    if (!t) return false;
    for (var i = 0; i < REPLY_MARKERS.length; i++) {
      var mk = REPLY_MARKERS[i];
      var idx = t.indexOf(mk.t);
      if (mk.m === "p" ? idx === 0 : idx !== -1) return true;
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
    // Only what the popup renders — nothing speculative. A views field was
    // stored here once, unrendered; the PII review flagged it and it is gone.
    return {
      id: features.tweetId || null,
      t: now,
      c: result.content ? result.content.score : null,
      e: (result.engagement && result.engagement.available) ? result.engagement.score : null,
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
    // The published serving code emits percentages as STRINGS with a % sign
    // ("7.14%", formatPercentage in underTheHoodReport.User.strato); early
    // community write-ups showed numbers. Accept both, normalize to a number.
    function pct(v) {
      if (typeof v === "number") return isFinite(v) ? v : null;
      if (typeof v === "string" && /^\d{1,3}(\.\d{1,4})?%?$/.test(v.trim())) {
        var n = parseFloat(v);
        return isFinite(n) ? n : null;
      }
      return null;
    }
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
          percentageOfPosts: pct(row.percentageOfPosts),
          // Account-label rows carry day counts instead of post counts.
          days: num(row.days),
          daysInPeriod: num(row.daysInPeriod),
          percentageOfDays: pct(row.percentageOfDays)
        });
      }
      return rows;
    }

    var period = (raw.period && typeof raw.period === "object" && !Array.isArray(raw.period)) ? {
      startDate: str(raw.period.startDate, 40),
      endDate: str(raw.period.endDate, 40)
    } : null;

    // generatedAt exists in the file but nothing renders it — not kept.
    return {
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

  // Engagement-bait phrasing. Scope is deliberately the IMPERATIVE CTA family
  // — "do X if you Y", "tell me honestly", "change my mind" — because that is
  // the phrasing that invites the not-interested and mute heads, and because
  // it can be matched without guessing at intent.
  //
  // NOT detected, on purpose: the rhetorical-question / forced-binary genre
  // ("Kya sach mein …?", "X ya Y?"). It is real and common, but it cannot be
  // told apart from a sincere question by pattern. The structural rule
  // proposed for it — short + question mark + an absolutist word like
  // most/always/never/sabse — was tested against 228 real posts from an
  // account whose rates we know: it fired on exactly one, and that one was a
  // top-quartile post, while missing both "Like if you agree!" and "Comment
  // karo agar tum bhi single ho" outright. A detector that flags good posts
  // and misses bait is worse than none, so this stays out.
  var BAIT_PATTERNS = [
    // English
    "like if", "rt if", "retweet if", "repost if", "follow me", "follow for",
    "drop a", "comment below", "tag someone", "tag a friend", "change my mind",

    // Hinglish (Latin script), supplied by a native speaker 2026-08-25.
    // "karo agar" is the load-bearing one: it covers comment/like/RT/share
    // karo agar, which is how the CTA is written in Latin-script Hinglish.
    // Bare "comment karo" and "follow karo" were dropped after checking real
    // posts: the first is usually an argument ("pehle padho, phir comment
    // karo") and the second usually means "follow these steps".
    "karo agar", "likho agar", "tag karo", "mujhe follow karo", "follow kar lo",
    "sach batao", "sach bataiye", "honestly batao", "honestly batana",

    // Devanagari patterns are added below rather than here — see DEV_BAIT.
    "कमेंट बॉक्स में जरूर"
  ];

  // Devanagari bait. NOT transliterations of the Hinglish above: Hindi puts
  // the call to action LAST, so "like karo agar X" is an English calque that
  // essentially never appears in Devanagari. Real bait reads "X तो लाइक करें",
  // or carries जरूर ("definitely").
  //
  // Every pattern anchors on that solicitation marker, because searching X for
  // the bare verb phrases turned up mostly ARGUMENTS: "पहले पढ़ो, फिर कमेंट
  // करो" is a rebuke, and about a quarter of bare "कमेंट बॉक्स में" hits were
  // the same shape. The तो / जरूर / मुझे anchor is what separates a request
  // for engagement from a person telling an opponent to go and comment.
  //
  // Verb endings are enumerated rather than stem-matched. A bare stem would
  // match past and declarative forms too — "कमेंट में लिखा था" ("it was
  // written in the comments") is not bait, and लिख alone cannot tell that
  // from "कमेंट में लिखो".
  var DEV_BAIT = (function () {
    var KAR = ["करो", "करें", "करना", "करिए", "करिये", "कीजिए", "कीजिये", "कर लो", "कर दो"];
    var LIKH = ["लिखो", "लिखें", "लिखना", "लिखिए", "लिखिये", "लिखकर"];
    var BATA = ["बताओ", "बताएं", "बताये", "बताना", "बताइए", "बताइये", "दो", "दें"];
    var out = [];
    function expand(prefix, verbs) {
      verbs.forEach(function (v) { out.push(prefix + v); });
    }
    expand("तो लाइक ", KAR);          // "…पसंद आए तो लाइक करें"
    expand("तो शेयर ", KAR);          // "…सहमत हैं तो शेयर करें"
    expand("तो कमेंट ", KAR);         // "…दिख रही है तो कमेंट करो"
    expand("कमेंट में ", LIKH);       // "कमेंट में लिखो आप कहाँ से हो"
    expand("कमेंट में ", BATA);
    expand("सच सच ", BATA);           // reduplicated सच is the bait tell
    expand("फॉलो जरूर ", KAR);        // जरूर blocks the "follow these steps" reading
    expand("मुझे फॉलो ", KAR);
    expand("टैग ", KAR);              // "दोस्तों को टैग करो"
    out.push("फॉलो कर लो");
    return out;
  })();
  BAIT_PATTERNS = BAIT_PATTERNS.concat(DEV_BAIT);
  // Boundaries, NOT \b. JavaScript's \b is defined by \w = [A-Za-z0-9_], so
  // there is never a word boundary beside a Devanagari (or Arabic, or CJK)
  // character and a \b-anchored pattern in those scripts can never match —
  // silently, with no error. Verified: /\b(कमेंट करो)\b/ misses
  // "कमेंट करो अगर …" at the start of a string, mid-string, everywhere.
  // Requiring a string edge, whitespace or punctuation instead works in every
  // script while still refusing to match inside a longer word, which is the
  // only thing \b was buying ("unlike iffy" must not match "like if").
  var EDGE_BEFORE = "(?:^|[\\s.,!?;:\"'()\\[\\]—–-])";
  var EDGE_AFTER = "(?=$|[\\s.,!?;:\"'()\\[\\]—–-])";
  var BAIT_RE = new RegExp(
    EDGE_BEFORE + "(" + BAIT_PATTERNS.map(escapeRe).join("|") + ")" + EDGE_AFTER, "i");

  // Hindi social text is full of invisible zero-width joiners, and Devanagari
  // has more than one way to encode what looks like the same word. Without
  // this, a pattern misses text that is visually identical to what it matches.
  function normalizeForMatch(s) {
    var t = String(s).replace(/[​-‍﻿]/g, "");
    return t.normalize ? t.normalize("NFC") : t;
  }

  function analyzeText(text) {
    var t = normalizeForMatch(text || "");
    // Case detection is Latin-only by nature: Devanagari and other caseless
    // scripts have no capitals to count, so this simply never fires there —
    // no false positives, and no detection either.
    var letters = t.replace(/[^A-Za-z]/g, "");
    var caps = t.replace(/[^A-Z]/g, "");
    return {
      length: t.length,
      hasQuestion: /\?/.test(t),
      isBait: BAIT_RE.test(t),
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
    replyVerdict: replyVerdict,
    surfaceFromPath: surfaceFromPath,
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
