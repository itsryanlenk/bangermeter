// Bangermeter — weight configuration (single source of truth)
//
// TWO STRICTLY SEPARATE LAYERS (per RESEARCH.md builder guidance):
//   1. WEIGHT LAYER  — the published algorithm values. Never invented.
//   2. ESTIMATOR LAYER — how we approximate P(engagement) from what a browser can see.
//      Clearly labeled estimates; the honesty boundary lives here.
//
// Provenance codes:
//   "2023-published"   — March 2023 open-source release published this exact value;
//                        2026 research confirms it is still the only sourced number.
//   "2025-repo"        — concrete default in the Sept 2025 re-release code (this project's repo).
//   "2026-structural"  — mechanism confirmed in xai-org/x-algorithm (Jan/May 2026) though value redacted.
//   "excluded"         — head exists in the repo but NO value was ever published; weight 0,
//                        shown as unweighted signal only.
//   "estimate"         — estimator-layer number (baseline rates / directional modifiers).

var BANGERMETER_CONFIG = {
  version: "0.7.0",

  // The weight table below is the APRIL 5, 2023 snapshot (the-algorithm-ml commit
  // b85210863f). The original March 31 table had reply=27 and max-semantics
  // good-clicks; the same Apr 5 edit added X's own disclaimer that weights live in
  // a Feature Switch config and are "periodically adjusted" — i.e. any static table
  // is a dated snapshot by X's own admission (leak-hunt research, Aug 2026).
  weightsSnapshot: "April 5, 2023 (the-algorithm-ml commit b85210863f)",

  // ── WEIGHT LAYER ────────────────────────────────────────────────────────────
  // Heavy-ranker heads (PredictedScoreFeature.scala; NaviModelScorer weighted sum).
  heads: {
    fav: { weight: 0.5, provenance: "2023-published", label: "Likes" },
    retweet: { weight: 1.0, provenance: "2023-published", label: "Reposts" },
    reply: { weight: 13.5, provenance: "2023-published", label: "Replies" },
    reply_engaged_by_author: {
      weight: 75.0, provenance: "2023-published", label: "Author engages replier",
      note: "P(you reply AND the author engages with your reply). NOT a self-reply bonus."
    },
    good_click_v1: { weight: 11.0, provenance: "2023-published", label: "Conversation click + engage" },
    good_click_v2: { weight: 10.0, provenance: "2023-published", label: "Conversation click + 2min",
      combine: "max_with_v1" },
    good_profile_click: { weight: 12.0, provenance: "2023-published", label: "Profile click + engage" },
    video_playback_50: { weight: 0.005, provenance: "2023-published", label: "Video 50% watch" },
    negative_feedback_v2: { weight: -74.0, provenance: "2023-published", label: "Negative feedback" },
    reported: { weight: -369.0, provenance: "2023-published", label: "Reports" },
    // Never-published heads — excluded from the score, surfaced as sourced signals.
    // Deep-dive (Aug 2026) verdict: no number above folklore grade exists for ANY of
    // these; what IS sourced is direction, structure, and a few official statements.
    bookmark: { weight: 0, provenance: "excluded", label: "Bookmarks",
      note: "Never numerically published. Musk (Jan 2023): a bookmark is a 'de facto silent like' — ≈1 like, official statement, not a shipped number. Dropped from the 2026 Phoenix roster. '10×/20×' claims are folklore." },
    share: { weight: 0, provenance: "excluded", label: "Shares",
      note: "Weight redacted, but officially POSITIVE (xai-org README). Musk (Sep 2024): forwarding a post to friends is 'one of the strongest signals'. 2026 has three separate share heads (share / via-DM / copy-link)." },
    share_menu_click: { weight: 0, provenance: "excluded", label: "Share menu clicks",
      note: "Never published and no successor head exists in the 2026 roster." },
    tweet_detail_dwell: { weight: 0, provenance: "excluded", label: "Detail dwell 15s",
      note: "Never published. Positive by structure; fires at ≥15s on the detail page (shipped constant). The '+10 dwell' figure is folklore." },
    profile_dwell: { weight: 0, provenance: "excluded", label: "Profile dwell 20s",
      note: "Never published. Fires at ≥20s (shipped constant). No named head in 2026 — folded into the dwell/profile-click family." },
    strong_negative_feedback: { weight: 0, provenance: "excluded", label: "Strong negative",
      note: "Value never published, but shipped param bounds [-1000, 0] prove it can only be negative. Report's allowed floor is 20× deeper (-20000). 'Block -120 / mute -100' trace to a fan-site fabrication." },
    weak_negative_feedback: { weight: 0, provenance: "excluded", label: "Weak negative",
      note: "Same posture as strong negative: negative-only by shipped bounds [-1000, 0]; value and action-mapping never published." }
  },

  // Grade-A facts with no published weights — displayable as FACTS in the UI,
  // never fed into the score (deep-dive research, Aug 2026).
  sourcedFacts: {
    thresholds: {
      goodClickSeconds: 2,
      goodProfileClickSeconds: 10,
      detailDwellSeconds: 15,
      profileDwellSeconds: 20,
      convoDwellSeconds: 60,
      goodClickV2Seconds: 120,
      provenance: "shipped constants: signal.thrift, PredictedScoreFeature.scala, CombinedFeatures.scala"
    },
    grox: {
      qualityGate: 0.4,
      repliesIneligible: true,
      provenance: "grox/classifiers/content/banger_initial_screen.py:129 + task_filters.py (xai-org, May 2026)"
    },
    negativeBounds: {
      strongWeakFloor: -1000,
      reportFloor: -20000,
      provenance: "HomeGlobalParams.scala shipped FSBoundedParam bounds (Sept 2025)"
    },
    phoenix2026: {
      headCount: 19,
      notDwelledIsNegative: true,
      offsetRule: "any net-negative post ranks below every net-positive post",
      dmShareStatement: "Musk (Sep 2024): forwarding posts to friends is 'one of the strongest signals'",
      provenance: "weighted_scorer.rs / ranking_scorer.rs / README (xai-org, 2026)"
    }
  },

  epsilon: 0.001, // NaviModelScorer.Epsilon

  // Heuristic rescoring chain (HeuristicScorer.scala; confirmed surviving in 2026 as
  // oon_scorer.rs / author_diversity_scorer.rs).
  rescorers: {
    outOfNetwork: { factor: 0.75, provenance: "2025-repo", label: "Out-of-network ×0.75",
      note: "Viewer-specific; shown as context, applied only in OON view mode." },
    reply: { factor: 0.75, provenance: "2025-repo", label: "Reply ×0.75" },
    authorDiversity: { decay: 0.5, floor: 0.25, provenance: "2025-repo",
      label: "Author diversity decay", note: "Feed-mode only: (1-floor)·decay^n + floor" },
    // Recovered from the ARCHIVED initial release commit ec83d01dca (leak-hunt, Aug 2026):
    // the only real numeric multipliers ever in serving code. Removed in the Sept 2025
    // re-release — applied here as an explicitly historical 2023-era factor.
    // OFF BY DEFAULT (field regression 2026-08-05): with the score normalized against an
    // unverified median baseline, a default-on ×4 floors every verified author near 99
    // and erases all differentiation. The multiplier is also 2023-era code REMOVED from
    // the Sept 2025 snapshot this tool targets — so it ships as an opt-in historical mode.
    blueVerified: { inNetwork: 4.0, outOfNetwork: 2.0, provenance: "2023-archived-commit",
      enabledBySetting: "applyVerifiedBoost2023",
      label: "Verified author boost",
      note: "BlueVerifiedAuthorInNetworkMultiplier 4.0 / OutOfNetwork 2.0 at commit ec83d01dca; removed Sept 2025." },
    // Community Notes: scoring fully open (crhThreshold 0.40 etc.); the engagement effect
    // of a DISPLAYED note is quantified by three independent causal studies — X's own A/B
    // (25-34% fewer like/repost decisions), Chuai et al. Nature Comms (-61.2% subsequent
    // reposts), Slaughter et al. PNAS (-46.1% reposts / -44.1% likes post-attach).
    // Applied to the prospective content score only (actual counts already embed it).
    communityNote: { factor: 0.5, provenance: "2026-studies",
      label: "Community-noted ×0.5",
      note: "Sourced suppression range ≈0.4–0.55× on go-forward engagement; midpoint applied." }
  },

  // ── ESTIMATOR LAYER ─────────────────────────────────────────────────────────
  // Baseline P(engagement) per viewer/impression for a median tweet. These are estimates
  // (typical public benchmark rates), NOT algorithm values. Used for the prospective
  // content score; the retrospective engagement score derives P from actual counts/views.
  baselineP: {
    fav: 0.005,                     // ~0.5% of viewers like a median tweet
    retweet: 0.0005,
    reply: 0.0005,
    reply_engaged_by_author: 0.0001,
    good_click_v1: 0.002,
    good_click_v2: 0.0015,
    good_profile_click: 0.001,
    video_playback_50: 0.15,        // among viewers, when a video exists; 0 otherwise
    negative_feedback_v2: 0.0002,
    reported: 0.00002,
    provenance: "estimate"
  },

  // Small-sample smoothing for the retrospective engagement score. Observed rates are
  // shrunk toward baseline via empirical Bayes: p̂ = (count + K·p0) / (views + K).
  // At 13 views a stray reply barely moves the needle; at 100k views the data dominates.
  // The real ranker predicts probabilities with a model and never divides tiny counts,
  // so this makes the estimator behave like the system it approximates.
  engagementShrinkage: { pseudoViews: 2000, provenance: "estimate" },

  // Directional content modifiers — multiply specific baseline Ps when a feature is
  // detected. Small magnitudes on purpose: research explicitly refutes the folklore
  // numbers (link −30–50%, hashtags −40%), so these are labeled mild/directional.
  contentModifiers: [
    { id: "question", label: "Asks a question", applies: "reply,reply_engaged_by_author",
      factor: 1.4, provenance: "estimate",
      why: "Questions raise expected reply rate; reply is the heaviest observable positive head (13.5)." },
    { id: "conversation_length", label: "Substantive text (≥100 chars)",
      applies: "good_click_v1,good_click_v2", factor: 1.3, provenance: "estimate",
      why: "Longer posts create conversation-click and dwell opportunities (good-click heads)." },
    { id: "thread_starter", label: "Thread starter", applies: "good_click_v1,good_click_v2",
      factor: 1.3, provenance: "estimate",
      why: "Threads drive detail-page clicks and ≥2min sessions." },
    { id: "media_image", label: "Has image", applies: "fav", factor: 1.1,
      provenance: "estimate", why: "Images raise like rates mildly; photo_expand head was never weighted." },
    { id: "has_video", label: "Has video", applies: "video_playback_50", factor: 1.0,
      enables: true, provenance: "2023-published",
      why: "Enables the video_playback_50 head (weight 0.005 — tiny; '10× video boost' is refuted folklore)." },
    { id: "external_link", label: "External link", applies: "good_click_v1,good_click_v2",
      factor: 0.75, provenance: "2026-structural",
      why: "No head rewards link clicks — attention leaves the scoring loop (link suppression is via head omission, not an explicit penalty; ppc.land Jan 2026)." },
    { id: "link_no_context", label: "Bare link (little text)", applies: "fav,reply",
      factor: 0.85, provenance: "estimate",
      why: "Mild directional penalty for low-context link posts. The '−30–50% link penalty' figure is unsourced." },
    { id: "many_hashtags", label: "3+ hashtags", applies: "fav,retweet,reply",
      factor: 0.9, provenance: "estimate",
      why: "Earlybird HAS_MULTIPLE_HASHTAGS_OR_TRENDS penalty exists in code; magnitude never published. Mild directional." },
    { id: "engagement_bait", label: "Engagement-bait phrasing", applies: "negative_feedback_v2",
      factor: 3.0, provenance: "estimate",
      why: "'Like if / RT if / follow me' phrasing invites negative feedback; Grok-era bait enforcement (Jul 2026: 3 strikes = demonetization) makes this riskier." },
    { id: "all_caps_shout", label: "Mostly ALL-CAPS", applies: "negative_feedback_v2",
      factor: 1.5, provenance: "estimate", why: "Shouting correlates with 'show less' feedback." }
  ],

  // Age decay (earlybird AgeDecay; display context only — not applied to the 0-100 score)
  ageDecay: { slope: 0.003, halflifeMinutes: 360, base: 0.6, provenance: "2025-repo" },

  // Display normalization: score 50 = the baseline median tweet; sqrt curve compresses
  // outliers; capped 0–100.
  display: { midpoint: 50, curve: 0.5 },

  // Contextual notes surfaced in the panel when relevant (not score components)
  contextNotes: {
    premium: "Verified/Premium authors see ~10× median impressions empirically (Buffer 18.8M-post study) — real, but not a term in the published formula.",
    phoenix: "Since ~Nov 2025 production ranking is Phoenix (Grok transformer). This score reflects the last fully-published pre-Phoenix fundamentals; the weighted-sum skeleton is confirmed to survive in 2026 production."
  }
};

var BANGERMETER_DEFAULT_SETTINGS = {
  showBadges: true,
  scoreDrafts: true,
  assumeOutOfNetwork: false,
  applyVerifiedBoost2023: false,
  theme: "auto"
};
