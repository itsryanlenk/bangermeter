// Bangermeter — weight configuration (single source of truth)
//
// TWO STRICTLY SEPARATE LAYERS:
//   1. WEIGHT LAYER  — the published algorithm values. Never invented.
//   2. ESTIMATOR LAYER — how we approximate P(action) from what a browser can see.
//      Clearly labeled estimates; the honesty boundary lives here.
//
// Provenance codes:
//   "2026-published" — transcribed verbatim from xai-org/x-algorithm,
//                      home-mixer/params/param.rs (the Aug 13, 2026 release).
//   "2026-config"    — constant from home-mixer/params/config.rs.
//   "2023-archived"  — 2023-era code, removed from the current release; opt-in only.
//   "earlybird-archived" — Earlybird-era constant from twitter/the-algorithm; display context only.
//   "2026-studies"   — external causal research, not an X parameter.
//   "estimate"       — estimator-layer number (baseline rates / directional modifiers).

var BANGERMETER_CONFIG = {
  version: "0.10.2",

  // ── PROVENANCE ──────────────────────────────────────────────────────────────
  // On August 13, 2026 X published the actual production ranking weights for the
  // first time. This supersedes the April 2023 snapshot every version of this
  // tool used through v0.8.0.
  //
  // param.rs header, verbatim:
  //   "// mirrored from config feature-switch defaults; last sync 2026-08-12T04:09:22Z"
  //
  // README, verbatim:
  //   "To enable experimentation, many tunable values are read from a configuration
  //    system rather than written into the code. To help people understand the
  //    production defaults, we run cron scripts that set the defaults in this
  //    repository's code to be the primary production values, for example in
  //    home-mixer/params/param.rs."
  //
  // That is a materially stronger claim than the 2023 release made — these are
  // asserted to BE the production values, not merely plausible defaults.
  weightsSnapshot: "September 24, 2026 — xai-org/x-algorithm, home-mixer/params/param.rs (upstream last-sync stamp 2026-09-24T16:24:49Z; all 25 values re-verified — X deleted a 26th head, cont_active_secs_5m_residual_norm, weighted 0.0, on Sept 23 — and three CHANGED on Aug 25 — vqv 0.05→0.0, binary dwell 0.0→0.05, video_open 0.05→0.07)",
  // Machine-readable copy of the stamp above. Every score card pins this, and
  // packages/bangermeter-rank's sync job fails when live param.rs drifts from it.
  paramRsLastSync: "2026-09-24T16:24:49Z",
  weightsSourceUrl: "https://github.com/xai-org/x-algorithm/blob/main/home-mixer/params/param.rs",
  scorerSourceUrl: "https://github.com/xai-org/x-algorithm/blob/main/home-mixer/scorers/ranking_scorer.rs",

  // X's own framing of what these numbers mean. On Aug 14 2026 they added an
  // explicit comment block to param.rs and ranking_scorer.rs, verbatim:
  //
  //   "Each weight multiplies the *predicted* probability of that action
  //    (P(favorite), P(repost), …) or a continuous value e.g. watch time -- the
  //    weights do not multiply raw engagement counts. One common
  //    misinterpretation is that you can read these weight ratios as count
  //    equivalences, e.g. the incorrect statement that 'one report cancels 468
  //    likes' -- this is incorrect because the weights apply to the predicted
  //    probabilities rather than raw counts."
  //
  //   "And the baseline probability of a Report is more than 1000x lower than a
  //    Like, so it's weighted more to allow the prediction to affect the final
  //    ranking at all."
  //
  // 468 is 234.0 / 0.5 — the exact division this tool refused to publish. The
  // ratio-as-value reading is now wrong by X's own documentation, not just by
  // our reasoning.
  weightsMeaningNote: "Weights multiply a PREDICTED PROBABILITY, not a count. X's own code comment calls the ratio reading — 'one report cancels 468 likes' — incorrect, and says a Report's baseline probability is over 1000x lower than a Like's, which is why its coefficient is large.",

  // ── WEIGHT LAYER ────────────────────────────────────────────────────────────
  // Phoenix heads. Score = Σ(weight × P(action)), ranking_scorer.rs:471-511.
  // `observable` marks heads a browser extension can actually derive from the DOM.
  heads: {
    favorite: { weight: 0.5, param: "rust_home_mixer_favorite_weight",
      provenance: "2026-published", label: "Likes", observable: true },
    reply: { weight: 5.0, param: "rust_home_mixer_reply_weight",
      provenance: "2026-published", label: "Replies", observable: true,
      note: "Rises to 20.0 (+15.0) on an ORIGINAL post from an author you mutually follow — see bidirectionalFollowReplyBoost. Down from 13.5 in the 2023 table. This boost IS the 'mutuals' change X's Head of Product announced on July 13, 2026 — xai-org's own docs/BIDIRECTIONAL_BOOST_CHANGE.md links that announcement to exactly this parameter (A/B tested at 0/5/10/15/20 from July 10, launched at 20.0 on July 13, reduced to 15.0 on July 24 2026). Press framed it as boosting mutuals' replies inside threads; the published implementation boosts original posts from mutuals in For You, and no thread ranker is in the repo." },
    retweet: { weight: 1.0, param: "rust_home_mixer_retweet_weight",
      provenance: "2026-published", label: "Reposts", observable: true },
    quote: { weight: 5.0, param: "rust_home_mixer_quote_weight",
      provenance: "2026-published", label: "Quotes",
      note: "Same weight as a reply. Quote counts are not exposed in the timeline DOM, so this is scored from the estimator only." },
    share: { weight: 2.0, param: "rust_home_mixer_share_weight",
      provenance: "2026-published", label: "Shares" },
    share_via_dm: { weight: 5.0, param: "rust_home_mixer_share_via_dm_weight",
      provenance: "2026-published", label: "Share via DM",
      note: "Musk (Sep 2024) called forwarding posts to friends 'one of the strongest signals'. The 2026 file puts a number on it: 5.0, the same coefficient as a reply and a quarter of a copy-link share. Not observable from the timeline, so this head is scored from a baseline estimate." },
    share_via_copy_link: { weight: 20.0, param: "rust_home_mixer_share_via_copy_link_weight",
      provenance: "2026-published", label: "Share via copy link",
      note: "The heaviest positive coefficient X publishes, at 20.0. Copy-link shares are also among the rarest things a reader does, and X's own comment says the weights already fold in how rare each action is — so this number is large partly BECAUSE the action is rare, and dividing it by the like weight would cancel exactly that. Bangermeter cannot observe copy-link shares at all; this head is scored from a baseline estimate." },
    follow_author: { weight: 4.0, param: "rust_home_mixer_follow_author_weight",
      provenance: "2026-published", label: "Follow author" },
    click: { weight: 0.4, param: "rust_home_mixer_click_weight",
      provenance: "2026-published", label: "Post click" },
    open_link: { weight: 0.2, param: "rust_home_mixer_open_link_weight",
      provenance: "2026-published", label: "Open link",
      note: "Links ARE rewarded, contradicting the long-standing 'links are punished' folklore — though at 0.2 the reward is small, and low-context link posts still lose more on likes/replies/dwell than they gain here." },
    photo_expand: { weight: 0.05, param: "rust_home_mixer_photo_expand_weight",
      provenance: "2026-published", label: "Photo expand" },
    video_open: { weight: 0.07, param: "rust_home_mixer_video_open_weight",
      provenance: "2026-published", label: "Video open",
      note: "Raised from 0.05 to 0.07 on August 25, 2026 — the only positive head X has moved UP since first publishing the table. Opening a video is now the better-paid of the two video signals, because the other one was zeroed in the same push (see vqv)." },
    quoted_click: { weight: 0.05, param: "rust_home_mixer_quoted_click_weight",
      provenance: "2026-published", label: "Quoted-post click" },
    post_unexplored: { weight: 0.02, param: "rust_home_mixer_post_unexplored_weight",
      provenance: "2026-published", label: "Post unexplored",
      note: "In-network only (PostUnexploredWeightInNetworkOnly = true). Viewer-specific novelty — excluded from the content score." },
    cont_dwell_time: { weight: 0.004, param: "rust_home_mixer_cont_dwell_time_weight",
      provenance: "2026-published", label: "Dwell time",
      continuous: true,
      note: "CONTINUOUS head: multiplies predicted dwell in seconds, not a probability. At a few seconds of dwell this is one of the largest terms for an ordinary post." },
    dwell: { weight: 0.05, param: "rust_home_mixer_dwell_weight",
      provenance: "2026-published", label: "Dwell (binary)",
      note: "TURNED ON August 25, 2026, at 0.05. Through v0.10.0 this head shipped at 0.0 and this tool said binary dwell paid nothing — that is no longer true. X now pays a flat amount for the reader dwelling at all, on TOP of the continuous dwell-time term (cont_dwell_time, 0.004/second). Stopping the scroll is the cheapest thing a post can win." },

    // Heads X ships with an explicit 0.0 — they exist, they are wired in, and they
    // currently contribute exactly nothing. That is a finding, not an omission.
    profile_click: { weight: 0.0, param: "rust_home_mixer_profile_click_weight",
      provenance: "2026-published", label: "Profile click",
      note: "ZEROED. The 2023 table paid 12.0 for a profile-click-and-engage. It is now worth nothing." },
    vqv: { weight: 0.0, param: "rust_home_mixer_vqv_weight",
      provenance: "2026-published", label: "Video quality view",
      note: "ZEROED August 25, 2026 — it shipped at 0.05 through v0.10.0. The two gates in candidates_util.rs::vqv_weight are still in the code and this tool still evaluates them (duration STRICTLY GREATER than MinVideoDurationMs = 10,000, so a 10.000s clip and every GIF fail it; and a VIEWER with ≥10,000 followers forces the weight to 0 outright). They now gate a term worth nothing. Kept because the machinery is intact and X can re-enable it by moving one number." },
    quoted_vqv: { weight: 0.0, param: "rust_home_mixer_quoted_vqv_weight",
      provenance: "2026-published", label: "Quoted video quality view", note: "ZEROED." },
    cont_click_dwell_time: { weight: 0.0, param: "rust_home_mixer_cont_click_dwell_time_weight",
      provenance: "2026-published", label: "Click dwell time", continuous: true, note: "ZEROED." },
    // cont_active_secs_5m_residual_norm (0.0) was deleted from param.rs and
    // ranking_scorer.rs in the 2026-09-23T16:28:43Z sync. It paid nothing, so no
    // score moved; it is gone here so the roster matches live 25/25.

    // Negative heads.
    not_interested: { weight: -43.2, param: "rust_home_mixer_not_interested_weight",
      provenance: "2026-published", label: "Not interested" },
    block_author: { weight: -31.2, param: "rust_home_mixer_block_author_weight",
      provenance: "2026-published", label: "Block author",
      note: "The long-circulated 'block = -120' figure was a fan-site fabrication. The real number is -31.2 — and it is the mildest of the four hard negatives." },
    mute_author: { weight: -58.8, param: "rust_home_mixer_mute_author_weight",
      provenance: "2026-published", label: "Mute author",
      note: "Nearly 2× a block. Muting is the harsher signal, which is the reverse of what most people assume." },
    report: { weight: -234.0, param: "rust_home_mixer_report_weight",
      provenance: "2026-published", label: "Report" },
    not_dwelled: { weight: -0.02, param: "rust_home_mixer_not_dwelled_weight",
      provenance: "2026-published", label: "Not dwelled",
      note: "Scrolling straight past is now a scored penalty. Tiny per impression, but it applies to the majority of impressions, so in aggregate it is the largest negative an ordinary post carries." }
  },

  // reply_weight_for(candidate), ranking_scorer.rs:186-193. Applies ONLY when the
  // candidate is an original post (not a reply, not a repost) AND the author is a
  // mutual follow. 5.0 + 15.0 = 20.0.
  bidirectionalFollowReplyBoost: 15.0,
  // dwell_weight_for(candidate) — same gate, but shipped at 0.0, so it is inert.
  bidirectionalFollowDwellBoost: 0.0,

  // NEGATIVE_SCORES_OFFSET, home-mixer/params/config.rs.
  negativeScoresOffset: 0.001,

  // ScoringWeights::new, ranking_scorer.rs:105-128. Note what is NOT here:
  // the cont_* heads and the bidirectional boost are excluded from positive_sum.
  // These sums only matter on the negative branch of offset_score, where they
  // rescale any net-negative post into (0, offset) — below every positive post.
  weightSumMembers: {
    positive: ["favorite", "reply", "retweet", "photo_expand", "video_open", "click",
      "open_link", "profile_click", "vqv", "share", "share_via_dm", "share_via_copy_link",
      "dwell", "quote", "quoted_click", "quoted_vqv", "follow_author", "post_unexplored"],
    negative: ["not_interested", "block_author", "mute_author", "report", "not_dwelled"]
  },

  // Rescoring applied AFTER the weighted sum (ranking_scorer.rs:743-853).
  // Order in production: author diversity, then the OON factor.
  rescorers: {
    // OonWeightFactor. oon_applies() returns true for out-of-network posts AND —
    // because EnableOonRescoreForInNetworkRepliesRetweets defaults true — for
    // in-network replies and reposts. It is a boolean gate: the factor is applied
    // exactly ONCE, never squared.
    outOfNetwork: { factor: 0.75, param: "rust_home_mixer_oon_weight_factor",
      provenance: "2026-published", label: "Out-of-network / reply / repost ×0.75" },
    topicOutOfNetwork: { factor: 0.5, param: "rust_home_mixer_topic_oon_weight_factor",
      provenance: "2026-published", label: "Topic-request OON ×0.5",
      note: "Replaces the 0.75 factor entirely when the request carries topic IDs." },
    newUserOutOfNetwork: { factor: 0.00001, provenance: "2026-config", inert: true,
      label: "New-user OON ×0.00001",
      note: "NEW_USER_OON_WEIGHT_FACTOR in config.rs. INERT at published defaults: the gate requires account age < NewUserAgeThresholdSecs AND ≥5 followed users, and that threshold ships at 0, so `age < 0s` is false for every account. The mechanism exists and would annihilate out-of-network content for new accounts if the threshold were raised." },
    authorDiversity: { decay: 0.5, floor: 0.25,
      param: "rust_home_mixer_author_diversity_decay",
      floorParam: "rust_home_mixer_author_diversity_floor",
      provenance: "2026-published", label: "Author diversity decay",
      note: "(1 - floor) × decay^k + floor, where k is the author's rank among their own posts in the slate. Flag-gated (EnableAuthorDiversity) but shipped true — and when enabled it applies to every candidate, not just out-of-network ones." },

    // NOT part of the 2026 release. 2023-era serving code (commit ec83d01dca),
    // removed Sept 2025. Opt-in only — see the v0.7.1 regression note.
    blueVerified: { inNetwork: 4.0, outOfNetwork: 2.0, provenance: "2023-archived",
      enabledBySetting: "applyVerifiedBoost2023",
      label: "Verified author boost",
      note: "BlueVerifiedAuthorInNetworkMultiplier 4.0 / OutOfNetwork 2.0 at commit ec83d01dca; absent from the 2026 code. Default off: a default-on ×4 floors every verified author near 99." },
    // Community Notes: the engagement effect of a DISPLAYED note, from three
    // independent causal studies (X's own A/B, Chuai et al. Nature Comms,
    // Slaughter et al. PNAS). Not an X ranking parameter.
    communityNote: { factor: 0.5, provenance: "2026-studies",
      label: "Community-noted ×0.5",
      note: "Three causal studies put a displayed note's effect on go-forward engagement between roughly ×0.39 and ×0.75 (Chuai et al. −61.2% reposts; Slaughter et al. −46.1% reposts / −44.1% likes; X's own A/B 25–34% fewer like/repost decisions). 0.5 is a round figure chosen inside that spread — it is our pick, not a published value. Content score only." }
  },

  // Observable signals with no head in the 2026 roster at all.
  unweightedSignals: {
    bookmark: { label: "Bookmarks",
      note: "There is NO bookmark WEIGHT in the 2026 Phoenix roster — no coefficient multiplies a predicted bookmark, so a bookmark cannot be converted into score the way a like or a reply can. That is the precise claim, and the precision matters: bookmarks are NOT absent from the model. bookmark_count is hydrated from engagement counts and sent to Phoenix as a model input (home-mixer/models/candidate.rs, the same struct literal that carries content_features), and ClientTweetBookmark is in the POSITIVE_ENGAGEMENTS list in viewer_history.rs used to build the set of authors a viewer has engaged with. So the model can see your bookmarks; the value model just has no term to pay them with. Through v0.10.0 this tool said bookmarks survived only inside the dwell-regret gate — X deleted that gate on Sept 18, 2026, and the statement was too narrow even before then. Musk's 'de facto silent like' remark (Jan 2023) never became a shipped weight, and the '10×/20×' claims are folklore." }
  },

  // Facts worth surfacing that are not score components.
  sourcedFacts: {
    minVideoDurationMs: { value: 10000, param: "rust_home_mixer_min_video_duration_ms",
      provenance: "2026-published",
      note: "Video shorter than 10s earns no video-quality-view weight — though that weight is now 0.0, so the gate no longer costs anything." },

    dwellMark: { seconds: 10, provenance: "2026-published",
      source: "phoenix/reference/world.py",
      note: "The binary dwell head does not mean 'looked at it'. X's reference implementation marks dwelled = the viewer engaged AND dwelled at least TEN SECONDS, while not-dwelled means the viewer did not engage at all. The two are not opposites: an impression that is read for four seconds and then scrolled past fires neither head. MinVideoDurationMs is also 10,000, but do not read the two as the same rule — that one gates on the CLIP'S OWN LENGTH, not on how long anyone watched, and it is a strict greater-than, so a video of exactly 10.000s fails it." },
    maxPostAgeHours: { value: 48, provenance: "2026-config",
      note: "MAX_POST_AGE in config.rs — candidates older than 48h are not retrieved." },
    resultSize: { value: 35, provenance: "2026-config",
      note: "RESULT_SIZE in config.rs — posts returned per For You request." },
    valueModelMode: { value: "weighted", provenance: "2026-published",
      removedParam: "rust_home_mixer_value_model_mode",
      note: "The weighted sum modeled here is now the ONLY scoring mode X publishes. Until September 18, 2026 a value_model_mode switch chose between it and two dwell-regret variants carrying far deeper negatives (report −60000); this tool caveated them through v0.10.0 because they were real code. On Sept 18 X deleted the switch, all 17 dwell_regret parameters and the value_model_gate.rs scorer outright — a separate push from the Aug 25 weight change, three weeks later. There is no longer an alternative mode to caveat." },
    // Grok "banger" pipeline eligibility. NOTE: a `quality_score >= 0.4` gate was
    // asserted here through v0.8.0 and has been REMOVED — no such threshold exists
    // anywhere in the published grox pipeline, and the file it was cited to
    // (grox/classifiers/content/banger_initial_screen.py) does not exist in the repo.
    // What IS in the shipped code is the eligibility filter below.
    grox: { repliesIneligible: true, privateAccountsIneligible: true,
      provenance: "2026-published",
      source: "grox/flows/upa/task_filter.py",
      note: "TaskInitialBangerFilter rejects any post with `ancestors` (i.e. any reply) and any post from a protected account. Quality is carried as a boolean `isHighQuality`, not a numeric threshold." },
    negativeOffsetRule: {
      provenance: "ranking_scorer.rs:525-533",
      note: "Any post whose weighted sum is net-negative is rescaled into [0, 0.000894) — negative_sum/total_sum × the 0.001 offset — so it ranks below every net-positive post regardless of how good the rest of it was." },

    // ── Published by X on Aug 14 2026 ─────────────────────────────────────
    reportBaselineRatio: { value: 1000, provenance: "2026-published",
      note: "X: 'the baseline probability of a Report is more than 1000x lower than a Like, so it's weighted more to allow the prediction to affect the final ranking at all.' The large negative coefficients are large BECAUSE the actions are rare — which is precisely why dividing one by the like weight produces a meaningless number." },

    homeTimelineOnly: { provenance: "2026-published",
      note: "Engagement only counts toward ranking if it happened on a post served in the Home Timeline. X: 'Directly navigating to a post (i.e., coordinating via groupchat) has no ranking impact.' Sending your own link round a group chat does nothing for reach — the copy-link coefficient pays for a VIEWER copying it in-feed, not for the visits that follow." },

    brigadingResistance: { provenance: "2026-published",
      note: "Mass block/report campaigns do not straightforwardly suppress reach. X gives two reasons: the model predicts an individual viewer's likelihood of the action rather than summing weights over counts, and recommendations are personalized — so reports from bad actors mainly affect what gets recommended to users similar to those bad actors, rather than moving the post for everyone." },

    brazil2026ElectionFilter: { accounts: 2776, provenance: "2026-published",
      param: "home-mixer/filters/brazil_2026_election_filter.rs",
      note: "For You removes posts from 2,776 accounts reported to Brazil's Electoral Court for the 2026 election, unless the viewer follows the account. The list is revised roughly weekly and has grown steadily — 665 accounts when X first published it on Aug 14, 2,328 on Aug 25, 2,776 by Sept 18 — so treat the count as a reading, not a constant. Compiled in rather than feature-switched: IDs obfuscated, usernames left in source for transparency. A hard filter that runs before scoring, so no weight can offset it." },

    // ── Author cold start (verified against the repo 2026-09-19) ─────────
    // The one published mechanism that deliberately promotes small accounts,
    // and it ships ON. Bangermeter cannot detect whether a given post WAS
    // cold-started — the slate is server-side — so this is reported as
    // eligibility context, never as a score component.
    authorColdStart: {
      enabled: true, enabledParam: "rust_home_mixer_enable_viewer_cold_start",
      followerCap: 1000, impressionThreshold: 1000, maxPostAgeHours: 48,
      slotMin: 15, slotMax: 16, maxPositionRatio: 0.85,
      originalPostsOnly: true, postsPromotedPerRequest: 1,
      provenance: "2026-published",
      source: "home-mixer/scorers/author_cold_start.rs",
      note: "EnableViewerColdStart ships true. On each For You request AT MOST ONE candidate is promoted — if nothing qualifies, scores are returned untouched. The winner is the highest-scoring post whose author has 1,000 or fewer followers, which is an original post (not a reply, not a repost), is under 48 hours old, has fewer than 1,000 Home impressions so far, and already ranks inside the top 85% of the candidates that scored above zero. What it gets is a score FLOOR, not a seat: its score is raised to whatever the post at rank 15 scored (max(own, target)), so it lands ABOUT slot 15 of 35 — later scorers can still move it, and a post already scoring higher gains nothing. The post-age ceiling was 24 hours until Aug 25, 2026. One post per request, not per author and not per session — a narrow lane, not a small-account boost." },

    // ── Content features the model actually receives (repo 2026-09-19) ────
    // New file upstream. This is the layer Bangermeter's estimator approximates,
    // so it is worth being exact about: these are the content inputs, and the
    // list is short. It is NOT a weight table — no coefficient is published.
    contentFeatures: {
      provenance: "2026-published",
      source: "home-mixer/models/content_features.rs",
      fields: ["has_video", "max_video_duration_ms", "has_photo", "media_count",
        "weighted_text_len", "newline_count", "has_url"],
      urlWeightedLen: 23, wideCharWeight: 2,
      mediaAttachmentIsNotExternalUrl: true,
      note: "Added to the published repo on Sept 8, 2026 and wired into every candidate. The model sees exactly seven things about a post's content: whether it has video, the longest video's duration, whether it has a photo, how many media items, the weighted text length, the newline count, and whether it has a URL. Weighted length follows X's text rules in simplified form — any http:// or https:// token counts 23 regardless of its real length, CJK and emoji count 2, Latin counts 1. Note is_url matches only those two prefixes, so a bare domain is counted character by character. Two consequences worth knowing: a media attachment's own t.co link is subtracted before has_url is decided, so posting an image does NOT make your post 'have a link'; and newline_count is a feature in its own right, which is the first published evidence that post SHAPE — not just length — reaches the ranker. No weights are attached to any of these, so this tool reports them and does not score them." },

    // ── Reply-specific facts (verified against the repo 2026-09-19) ───────
    conversationRanker: { published: false, provenance: "2026-published",
      note: "The service that ORDERS replies under a post is not in the open-source release — the repo's own README scopes it to the For You feed. What the repo DOES ship is the 0-3 reply-ranking score generator (grox/flows/reply_spam/), not the ordering logic that consumes it. Any claim about a reply's position inside a thread is unpublished territory and this tool says so rather than guessing." },

    oonReplyFilter: { provenance: "2026-published",
      source: "home-mixer/filters/oon_retweet_reply_filter.rs",
      note: "OONRetweetReplyFilter removes replies (and reposts) from unfollowed accounts from For You candidates entirely — an out-of-network reply is not down-weighted, it is gone. Replies with a missing parent are dropped too." },

    replyQualityGate: {
      followerThreshold: 200000, scoreMin: 0, scoreMax: 3,
      // Traced commit by commit through task_filter.py. The gate has been
      // raised EIGHT times since publication and has never held for more than
      // a few days: 15,000 at publication (Aug 13), then 30,000 (Aug 14),
      // 40,000 (Aug 17), 60,000 (Aug 18), 80,000 (Aug 21), 100,000 (Aug 24),
      // 120,000 (Aug 25), 150,000 (Sep 8), 200,000 (Sep 16, as the named
      // constant GROK_GEMMA_FOLLOWER_SPLIT). Read the value below as a dated
      // reading, not a rule — and re-trace it, because sampling only the
      // commits that touched param.rs misses most of these.
      thresholdParam: "GROK_GEMMA_FOLLOWER_SPLIT",
      thresholdAsOf: "2026-09-18",
      zeroScoreLabel: "RiskyHighVizReply",
      selfRepliesExempt: true, rubricWithheld: true,
      provenance: "2026-published",
      source: "grox/flows/reply_spam/ (plan_reply_ranking.py, task_filter.py, classifier_reply_ranking.py, task_write.py)",
      // Signals X's own pipeline feeds the scorer (grox/core/lm/thread.py).
      // The DIRECTION each signal moves the score is inside the withheld
      // prompt, so they are listed as inputs, never modeled as numbers.
      signals: ["replier follower count", "replies posted in the last 24 hours",
        "legitimate blocks received in the last 24 hours", "risky-safety-label flag",
        "pasted-text flag (is_pasted)", "missing-client-events flag",
        "account country and language", "up to 10 posts of thread context"],
      // NO duration is published for the score-0 label application:
      // task_write.py applies RiskyHighVizReply with no TTL argument, and the
      // strato module behind it is not in the repo. A DIFFERENT published
      // rule (abuse-enforcement-service enforcement_post.yaml,
      // act_add_llm_slop_post_label) applies the same label for 30 days on
      // its own llm_slop_post trigger — that TTL belongs to that rule, not
      // to the reply score. A 30-day figure shipped here briefly during
      // development and was caught by the provenance review before release.
      note: "Replies are routed to the Grok reply-ranking scorer (GROK_4_MINI_CRITICAL, 0-3) when the DIRECT PARENT author or the THREAD-ROOT author has strictly more than 200,000 followers, as of Sept 18, 2026. Versions through v0.10.0 said 100,000. That figure was CORRECT when it shipped — the gate stood at exactly 100,000 from Aug 24 — and it went stale within a day, the same way the weights did. (A 0.10.2 draft of this note claimed the 100,000 had been mis-sourced from the model's prompt string. That self-correction was itself wrong and was caught in review: the prompt does carry 100,000, and it still does, so anyone re-deriving this number TODAY would land on the wrong one — but that is a live trap, not what happened here.) A score of 0 applies the RiskyHighVizReply safety label; the duration of that application is not published (a separate enforcement rule applies the same label for 30 days on a different trigger, llm_slop_post). Self-replies are exempt — the filter skips a reply whose author is the parent author or the root author. The scoring rubric itself is withheld by X 'to reduce gameability', so no tool can honestly claim to reproduce it, this one included. Below the gate a reply goes to a lighter Gemma scorer instead, which switches to a reply-spam-tuned model above 150,000 thread followers — so that model runs only in the narrow 150,001-200,000 band, not on everything above 150,000." },

    // ── "Under the Hood" transparency pilot (announced Aug 13, 2026) ──────
    underTheHood: {
      provenance: "2026-published",
      source: "under-the-hood/ (underTheHoodLabels.strato, under_the_hood.thrift, uth_serving.thrift)",
      path: "x.com/i/under_the_hood",
      // The two published eligibility checks, verbatim from
      // underTheHoodReport.User.strato. X's announcement described a limited
      // pilot cohort beyond these, but no selection mechanism is in the repo.
      eligibility: "account at least 1 year old, 10 or more posts in the prior month",
      aggregatesOnly: true,
      note: "A pilot report of visibility-impacting safety labels on the user's own account and posts, downloadable as JSON. The report holds MONTHLY PER-LABEL AGGREGATES — counts and percentages, no post IDs — so it can say 'N posts carried label X this month', never 'this post was deboosted'. The report is served via GraphQL as a single JSON blob (published serving code); in our testing the page offers it as a file download and does not render the label data into the DOM (observed client behavior, Aug 2026) — so a zero-network extension cannot read it automatically, and Bangermeter accepts the file by user-initiated import instead, parsing it locally.",
      // The public allowlist of label names, transcribed from
      // underTheHoodLabels.strato. X does not claim these are the only labels
      // that exist — they are the ones the report discloses.
      postLabelAllowlist: ["NSFW_HIGH_RECALL", "NSFW_HIGH_PRECISION", "NSFW_TEXT",
        "NSFW_CARD_IMAGE", "GORE_AND_VIOLENCE_HIGH_PRECISION", "SPAM_HIGH_RECALL",
        "SPAM", "MALICIOUS_URL", "DO_NOT_AMPLIFY", "PDNA", "BOUNCE",
        "FOR_EMERGENCY_USE_ONLY", "FOSNR_ABUSE", "FOSNR_HATEFUL_CONDUCT",
        "FOSNR_VIOLENT_SPEECH", "FOSNR_CIVIC_INTEGRITY", "FOSNR_ABUSE_INSULTS",
        "NSFW_ADMIN"],
      accountLabelAllowlist: ["ReadOnly", "Compromised", "SpamHighRecall",
        "NsfwHighRecall", "NsfwHighPrecision", "NsfwAvatarImage", "NsfwNearPerfect",
        "NsfwBannerImage", "NsfwAdmin", "ImpersonationHighPrecision",
        "AbusiveHighRecall", "DoNotAmplify"]
    }
  },

  // ── MEASURED RATES (retrospective score only) ───────────────────────────────
  // What a real timeline actually does, per impression — the reference the
  // ENGAGEMENT score normalizes against.
  //
  // Sample: 158 posts scraped from a logged-in timeline on 2026-08-13 (141 For
  // You, 17 Following), per-post MEDIAN rate. Raw sample and method live in
  // `calibration/`; rerun `node calibration/calibrate.js` to re-derive.
  //
  // Per-post median rather than pooled (total events ÷ total views): the score
  // compares one post against a reference POST, and pooled answers a different
  // question that a handful of viral posts dominate.
  //
  // These replaced guesses of 0.005 / 0.0005 / 0.0005, which were low by 2.5×,
  // 2.7× and 1.4×. Under those, the median feed post scored 67 on a scale whose
  // midpoint is documented as 50, and 18% of posts pinned at the 100 cap.
  //
  // Limits: one account, one session, one day, 97% verified authors. Engagement
  // rate falls as reach rises (Spearman −0.37 against views in this sample), so
  // a low-reach feed reads higher — the Following slice ran ~2× For You. These
  // are calibrated to For You, where the extension is mostly used. They are NOT
  // population constants for X and should not be quoted as such.
  observedRates: {
    favorite: 0.0123,
    reply: 0.00135,
    retweet: 0.0007,
    provenance: "measured",
    sample: "calibration/feed-sample-2026-08-13.csv",
    n: 141,
    feed: "forYou",
    collected: "2026-08-13"
  },

  // ── ESTIMATOR LAYER (prospective score only) ────────────────────────────────
  // Model priors for a post carrying NO notable content signals — the starting
  // point the contentModifiers multiply.
  //
  // Deliberately NOT the measured rates above. A measured median is the rate of
  // a typical post *including* whatever signals it happens to carry; using it as
  // the signal-free base double-counts the average signal and flattens the
  // score's ability to separate a strong post from a weak one. These two numbers
  // answer different questions and must not be merged.
  //
  // Calibrated so weight × baselineP lands in a comparable band across heads,
  // which is the balance X's own note implies ("weights reflect ... typical
  // propensities"). Estimates, all of them.
  //
  // Continuous heads (cont_dwell_time) are in SECONDS, not probabilities.
  baselineP: {
    favorite: 0.005,
    reply: 0.0005,
    retweet: 0.0005,
    quote: 0.0001,
    share: 0.0004,
    share_via_dm: 0.0002,
    share_via_copy_link: 0.00005,
    follow_author: 0.0002,
    click: 0.010,
    open_link: 0.002,          // only when a link is present
    photo_expand: 0.012,       // only when an image is present
    video_open: 0.020,         // only when video is present
    vqv: 0.030,                // only when video ≥10s is present
    quoted_click: 0.004,       // only when the post quotes another
    cont_dwell_time: 3.0,      // SECONDS of predicted dwell, not a probability
    not_dwelled: 0.55,         // most impressions are scrolled past
    // Binary dwell went live at 0.05 on Aug 25 2026. It is NOT the complement of
    // not_dwelled — X's reference implementation defines them separately
    // (phoenix/reference/world.py): dwelled = engaged AND dwell >= 10s, while
    // not_dwelled = not engaged. There is a wide middle band that fires neither.
    // Derivation of the 0.12: not_dwelled 0.55 leaves 0.45 engaged, and the
    // reference's own no-affinity dwell distribution (lognormal, loc = ln 6,
    // sigma = 0.8) puts P(>= 10s) at about 0.26. 0.45 x 0.26 ~ 0.12. The
    // DEFINITION is published; this probability is still an estimate.
    dwell: 0.12,
    not_interested: 0.00005,
    block_author: 0.00001,
    mute_author: 0.00001,
    report: 0.000005,
    provenance: "estimate"
  },

  // Small-sample smoothing for the retrospective engagement score:
  //   p̂ = (count + K·p0) / (views + K)
  engagementShrinkage: { pseudoViews: 2000, provenance: "estimate" },

  // Directional content modifiers — multiply specific baseline Ps when a feature
  // is detected. `enables` marks a head that is scored ONLY when the feature is
  // present.
  contentModifiers: [
    { id: "question", label: "Asks a question", applies: "reply,quote",
      factor: 1.4, provenance: "estimate",
      why: "Questions raise expected reply rate. Reply is 5.0 — ten times a like — and quote matches it at 5.0." },
    { id: "conversation_length", label: "Substantive text (≥100 chars)",
      applies: "cont_dwell_time", factor: 1.35, provenance: "estimate",
      alsoApplies: { not_dwelled: 0.8, dwell: 1.5 },
      why: "Longer posts hold attention, and attention is now paid three ways: continuously (0.004/second), as a penalty for scrolling past (−0.02), and since Aug 25 2026 as a flat 0.05 for clearing a TEN-SECOND dwell mark. That mark is a threshold, not a slope, so length helps it more than it helps mean dwell time — which is why this modifier moves the binary head harder than the continuous one." },
    { id: "thread_starter", label: "Thread starter", applies: "click,quote",
      factor: 1.3, provenance: "estimate",
      why: "Threads drive post clicks (0.4) and give people something to quote (5.0)." },
    { id: "media_image", label: "Has image", applies: "favorite", factor: 1.1,
      provenance: "estimate", why: "Images raise like rates mildly and enable the photo-expand head (0.05)." },
    { id: "has_video", label: "Has video", applies: "", factor: 1.0,
      enables: "video_open,vqv", provenance: "estimate",
      alsoApplies: { dwell: 1.4, not_dwelled: 0.85 },
      why: "Enables video_open, which X raised from 0.05 to 0.07 on Aug 25 2026. It also enables video-quality-view — but X zeroed that head in the same push, so clearing its gates (duration STRICTLY over 10 seconds, and a viewer under 10,000 followers) is now worth nothing. Video did not stop being paid for holding attention, though: the binary dwell head turned on in the same push at a ten-second mark, which video reaches far more easily than text, so the credit moved rather than vanished. That shift in routing is published; the size of the dwell nudge here is our estimate. The '10× video boost' remains folklore." },
    { id: "external_link", label: "External link", applies: "", factor: 1.0,
      enables: "open_link", provenance: "2026-published",
      why: "The 2026 release pays 0.2 for opening a link — links are NOT structurally unrewarded, which retires the old 'link penalty by head omission' reading. 0.2 is small, but it is positive." },
    { id: "link_no_context", label: "Bare link (little text)",
      applies: "favorite,reply,cont_dwell_time", factor: 0.85, provenance: "estimate",
      alsoApplies: { not_dwelled: 1.2, dwell: 0.7 },
      why: "A link with no context earns less on every attention head than the 0.2 open-link weight pays back. The '−30–50% link penalty' figure remains unsourced; this is a mild directional estimate." },
    { id: "many_hashtags", label: "3+ hashtags", applies: "favorite,retweet,reply",
      factor: 0.9, provenance: "estimate",
      why: "Earlybird's HAS_MULTIPLE_HASHTAGS_OR_TRENDS penalty exists in code; magnitude never published. Mild directional." },
    { id: "engagement_bait", label: "Engagement-bait phrasing",
      applies: "not_interested,mute_author", factor: 3.0, provenance: "estimate",
      why: "'Like if / RT if / follow me' phrasing — plus Hinglish ('karo agar', '1 likho agar', 'sach batao') and Devanagari ('…तो लाइक करें', 'कमेंट बॉक्स में जरूर', 'सच सच बताओ') — invites the not-interested (−43.2) and mute (−58.8) heads, and a net-negative post is rescaled below every positive post. Detection covers imperative calls to action ONLY; the rhetorical-question genre ('Kya …?', 'X ya Y?') is deliberately not claimed, because no pattern separates it from a sincere question. Note the Devanagari patterns are not transliterations: Hindi puts the call to action last, so 'like karo agar X' is an English calque that barely occurs, and every Devanagari pattern anchors on तो / जरूर / मुझे instead. That anchor is load-bearing — on X the bare verb phrase is usually an argument ('पहले पढ़ो, फिर कमेंट करो'), not a solicitation. Validated against real Hindi posts: zero false positives, and deliberately conservative recall." },
    { id: "all_caps_shout", label: "Mostly ALL-CAPS", applies: "not_interested",
      factor: 1.5, provenance: "estimate", why: "Shouting correlates with 'show less' feedback." }
  ],

  // Age decay (earlybird AgeDecay; display context only — not applied to the score)
  ageDecay: { slope: 0.003, halflifeMinutes: 360, base: 0.6, provenance: "earlybird-archived" },

  // Display normalization: 50 = the baseline median post; sqrt compresses outliers.
  display: { midpoint: 50, curve: 0.5 },

  contextNotes: {
    premium: "Verified/Premium authors see ~10× median impressions empirically (Buffer 18.8M-post study) — real, but not a term in the published formula.",
    mutualFollow: "Replies to an original post from someone you mutually follow are weighted 20.0 instead of 5.0. This is viewer-specific: the same post scores differently for a mutual than for a stranger."
  }
};

var BANGERMETER_DEFAULT_SETTINGS = {
  showBadges: true,
  scoreDrafts: true,
  assumeOutOfNetwork: false,
  assumeMutualFollow: false,
  applyVerifiedBoost2023: false,
  // Local-only score log (chrome.storage.local, capped at 200 entries) written
  // when a breakdown panel is opened. Never synced, never transmitted. OFF by
  // default — logging other people's posts, even locally, is opt-in.
  keepHistory: false,
  theme: "auto",
  // Set once the user has seen the quick start — either by dismissing the strip
  // in the popup or by opening the welcome page from it. Syncs with the rest of
  // the settings, so a second machine does not re-explain the extension to
  // someone who already knows how it works.
  quickStartSeen: false
};

// Derived weight sums, built exactly as ScoringWeights::new does.
(function (C) {
  function sum(names) {
    return names.reduce(function (acc, n) { return acc + C.heads[n].weight; }, 0);
  }
  var positive = sum(C.weightSumMembers.positive);
  var negative = -sum(C.weightSumMembers.negative);
  C.weightSums = {
    positive: positive,
    negative: negative,
    total: positive + negative,
    positiveMembers: C.weightSumMembers.positive,
    negativeMembers: C.weightSumMembers.negative
  };
})(BANGERMETER_CONFIG);
