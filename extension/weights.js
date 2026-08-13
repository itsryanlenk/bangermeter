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
  version: "0.9.0",

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
  weightsSnapshot: "August 13, 2026 — xai-org/x-algorithm, home-mixer/params/param.rs (feature-switch sync 2026-08-12T04:09:22Z)",
  weightsSourceUrl: "https://github.com/xai-org/x-algorithm/blob/main/home-mixer/params/param.rs",
  scorerSourceUrl: "https://github.com/xai-org/x-algorithm/blob/main/home-mixer/scorers/ranking_scorer.rs",

  // X's own framing of what these numbers mean (param.rs, above the weight block):
  //   "These weights reflect a combination of how much an action is valued in
  //    ranking and typical propensities of these actions across the X network
  //    (e.g. negative feedback is overall rare)."
  // i.e. report = -234 is large PARTLY because reports are rare. The weight is not
  // a "penalty per report" — it is a coefficient on a predicted probability.
  weightsMeaningNote: "Weights multiply a PREDICTED PROBABILITY, not a count. X states the values already fold in how rare each action typically is.",

  // ── WEIGHT LAYER ────────────────────────────────────────────────────────────
  // Phoenix heads. Score = Σ(weight × P(action)), ranking_scorer.rs:471-511.
  // `observable` marks heads a browser extension can actually derive from the DOM.
  heads: {
    favorite: { weight: 0.5, param: "rust_home_mixer_favorite_weight",
      provenance: "2026-published", label: "Likes", observable: true },
    reply: { weight: 5.0, param: "rust_home_mixer_reply_weight",
      provenance: "2026-published", label: "Replies", observable: true,
      note: "Rises to 20.0 (+15.0) on an ORIGINAL post from an author you mutually follow — see bidirectionalFollowReplyBoost. Down from 13.5 in the 2023 table." },
    retweet: { weight: 1.0, param: "rust_home_mixer_retweet_weight",
      provenance: "2026-published", label: "Reposts", observable: true },
    quote: { weight: 5.0, param: "rust_home_mixer_quote_weight",
      provenance: "2026-published", label: "Quotes",
      note: "Same weight as a reply. Quote counts are not exposed in the timeline DOM, so this is scored from the estimator only." },
    share: { weight: 2.0, param: "rust_home_mixer_share_weight",
      provenance: "2026-published", label: "Shares" },
    share_via_dm: { weight: 5.0, param: "rust_home_mixer_share_via_dm_weight",
      provenance: "2026-published", label: "Share via DM",
      note: "Musk (Sep 2024) called forwarding posts to friends 'one of the strongest signals'. Now confirmed numerically: a DM share is worth 10 likes." },
    share_via_copy_link: { weight: 20.0, param: "rust_home_mixer_share_via_copy_link_weight",
      provenance: "2026-published", label: "Share via copy link",
      note: "The single heaviest positive head — 40× a like, 4× a reply. Copying a post's link is the strongest positive action a viewer can take." },
    follow_author: { weight: 4.0, param: "rust_home_mixer_follow_author_weight",
      provenance: "2026-published", label: "Follow author" },
    click: { weight: 0.4, param: "rust_home_mixer_click_weight",
      provenance: "2026-published", label: "Post click" },
    open_link: { weight: 0.2, param: "rust_home_mixer_open_link_weight",
      provenance: "2026-published", label: "Open link",
      note: "Links ARE rewarded, contradicting the long-standing 'links are punished' folklore — though at 0.2 the reward is small, and low-context link posts still lose more on likes/replies/dwell than they gain here." },
    photo_expand: { weight: 0.05, param: "rust_home_mixer_photo_expand_weight",
      provenance: "2026-published", label: "Photo expand" },
    video_open: { weight: 0.05, param: "rust_home_mixer_video_open_weight",
      provenance: "2026-published", label: "Video open" },
    vqv: { weight: 0.05, param: "rust_home_mixer_vqv_weight",
      provenance: "2026-published", label: "Video quality view",
      note: "Two gates, both in candidates_util.rs::vqv_weight. (1) Duration must be STRICTLY GREATER than MinVideoDurationMs = 10,000 — a 10.000s clip earns nothing, and neither do GIFs. (2) If the VIEWER has ≥10,000 followers (MAX_FOLLOWERS_THRESHOLD), the weight is forced to 0 outright — large accounts earn no video-quality-view credit from their own feed at all." },
    quoted_click: { weight: 0.05, param: "rust_home_mixer_quoted_click_weight",
      provenance: "2026-published", label: "Quoted-post click" },
    post_unexplored: { weight: 0.02, param: "rust_home_mixer_post_unexplored_weight",
      provenance: "2026-published", label: "Post unexplored",
      note: "In-network only (PostUnexploredWeightInNetworkOnly = true). Viewer-specific novelty — excluded from the content score." },
    cont_dwell_time: { weight: 0.004, param: "rust_home_mixer_cont_dwell_time_weight",
      provenance: "2026-published", label: "Dwell time",
      continuous: true,
      note: "CONTINUOUS head: multiplies predicted dwell in seconds, not a probability. At a few seconds of dwell this is one of the largest terms for an ordinary post." },

    // Heads X ships with an explicit 0.0 — they exist, they are wired in, and they
    // currently contribute exactly nothing. That is a finding, not an omission.
    profile_click: { weight: 0.0, param: "rust_home_mixer_profile_click_weight",
      provenance: "2026-published", label: "Profile click",
      note: "ZEROED. The 2023 table paid 12.0 for a profile-click-and-engage. It is now worth nothing." },
    dwell: { weight: 0.0, param: "rust_home_mixer_dwell_weight",
      provenance: "2026-published", label: "Dwell (binary)",
      note: "ZEROED. Binary dwell pays nothing; only continuous dwell TIME is paid, via cont_dwell_time." },
    quoted_vqv: { weight: 0.0, param: "rust_home_mixer_quoted_vqv_weight",
      provenance: "2026-published", label: "Quoted video quality view", note: "ZEROED." },
    cont_click_dwell_time: { weight: 0.0, param: "rust_home_mixer_cont_click_dwell_time_weight",
      provenance: "2026-published", label: "Click dwell time", continuous: true, note: "ZEROED." },
    cont_active_secs_5m_residual_norm: { weight: 0.0, param: "rust_home_mixer_cont_active_secs_5m_residual_norm_weight",
      provenance: "2026-published", label: "Active seconds (5m residual)", continuous: true, note: "ZEROED." },

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
      note: "(1 - floor) × decay^k + floor, where k is the author's rank among their own posts in the slate. EnableAuthorDiversity ships true and it is applied unconditionally in RankingScorer::score." },

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
      note: "There is NO bookmark head in the 2026 Phoenix roster — bookmarks are not a scored action. They survive only as a user-history feature (n_bm_share) inside the dwell-regret gate. Musk's 'de facto silent like' remark (Jan 2023) never became a shipped weight, and the '10×/20×' claims are folklore." }
  },

  // Facts worth surfacing that are not score components.
  sourcedFacts: {
    minVideoDurationMs: { value: 10000, param: "rust_home_mixer_min_video_duration_ms",
      provenance: "2026-published",
      note: "Video shorter than 10s earns no video-quality-view weight." },
    maxPostAgeHours: { value: 48, provenance: "2026-config",
      note: "MAX_POST_AGE in config.rs — candidates older than 48h are not retrieved." },
    resultSize: { value: 35, provenance: "2026-config",
      note: "RESULT_SIZE in config.rs — posts returned per For You request." },
    valueModelMode: { value: "weighted", param: "rust_home_mixer_value_model_mode",
      provenance: "2026-published",
      note: "The weighted sum modelled here is the shipped default. Two alternative modes exist in code (dwell_regret_sigmoid, gated_dwell_regret) with far deeper negatives (report -60000); neither is the default." },
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
      note: "Any post whose weighted sum is net-negative is rescaled into [0, 0.000894) — negative_sum/total_sum × the 0.001 offset — so it ranks below every net-positive post regardless of how good the rest of it was." }
  },

  // ── ESTIMATOR LAYER ─────────────────────────────────────────────────────────
  // Baseline P(action) per impression for a median post. ESTIMATES, not X values.
  // Calibrated so that weight × baselineP lands in a comparable band across heads,
  // which is the balance X's own note implies ("weights reflect ... typical
  // propensities"). Continuous heads (cont_dwell_time) are in SECONDS, not
  // probabilities.
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
      alsoApplies: { not_dwelled: 0.8 },
      why: "Longer posts hold attention. Dwell time is paid continuously (0.004/second) and not-dwelling is penalised (−0.02), so length moves the largest pair of terms an ordinary post has." },
    { id: "thread_starter", label: "Thread starter", applies: "click,quote",
      factor: 1.3, provenance: "estimate",
      why: "Threads drive post clicks (0.4) and give people something to quote (5.0)." },
    { id: "media_image", label: "Has image", applies: "favorite", factor: 1.1,
      provenance: "estimate", why: "Images raise like rates mildly and enable the photo-expand head (0.05)." },
    { id: "has_video", label: "Has video", applies: "", factor: 1.0,
      enables: "video_open,vqv", provenance: "2026-published",
      why: "Enables video_open (0.05), and video-quality-view (0.05) when the clip qualifies: vqv needs duration STRICTLY over 10 seconds, so GIFs and short clips earn none of it. A second gate we cannot see — the viewer having under 10,000 followers — can zero it as well. The '10× video boost' remains folklore." },
    { id: "external_link", label: "External link", applies: "", factor: 1.0,
      enables: "open_link", provenance: "2026-published",
      why: "The 2026 release pays 0.2 for opening a link — links are NOT structurally unrewarded, which retires the old 'link penalty by head omission' reading. 0.2 is small, but it is positive." },
    { id: "link_no_context", label: "Bare link (little text)",
      applies: "favorite,reply,cont_dwell_time", factor: 0.85, provenance: "estimate",
      alsoApplies: { not_dwelled: 1.2 },
      why: "A link with no context earns less on every attention head than the 0.2 open-link weight pays back. The '−30–50% link penalty' figure remains unsourced; this is a mild directional estimate." },
    { id: "many_hashtags", label: "3+ hashtags", applies: "favorite,retweet,reply",
      factor: 0.9, provenance: "estimate",
      why: "Earlybird's HAS_MULTIPLE_HASHTAGS_OR_TRENDS penalty exists in code; magnitude never published. Mild directional." },
    { id: "engagement_bait", label: "Engagement-bait phrasing",
      applies: "not_interested,mute_author", factor: 3.0, provenance: "estimate",
      why: "'Like if / RT if / follow me' phrasing invites the not-interested (−43.2) and mute (−58.8) heads, and a net-negative post is rescaled below every positive post." },
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
  theme: "auto"
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
