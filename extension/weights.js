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
  version: "1.0.0",

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
    // Never-published heads — excluded from score, surfaced as unweighted signals.
    bookmark: { weight: 0, provenance: "excluded", label: "Bookmarks",
      note: "No published value; dropped from the 2026 head roster entirely." },
    share: { weight: 0, provenance: "excluded", label: "Shares" },
    share_menu_click: { weight: 0, provenance: "excluded", label: "Share menu clicks" },
    tweet_detail_dwell: { weight: 0, provenance: "excluded", label: "Detail dwell 15s" },
    profile_dwell: { weight: 0, provenance: "excluded", label: "Profile dwell 20s" },
    strong_negative_feedback: { weight: 0, provenance: "excluded", label: "Strong negative" },
    weak_negative_feedback: { weight: 0, provenance: "excluded", label: "Weak negative" }
  },

  epsilon: 0.001, // NaviModelScorer.Epsilon

  // Heuristic rescoring chain (HeuristicScorer.scala; confirmed surviving in 2026 as
  // oon_scorer.rs / author_diversity_scorer.rs).
  rescorers: {
    outOfNetwork: { factor: 0.75, provenance: "2025-repo", label: "Out-of-network ×0.75",
      note: "Viewer-specific; shown as context, applied only in OON view mode." },
    reply: { factor: 0.75, provenance: "2025-repo", label: "Reply ×0.75" },
    authorDiversity: { decay: 0.5, floor: 0.25, provenance: "2025-repo",
      label: "Author diversity decay", note: "Feed-mode only: (1-floor)·decay^n + floor" }
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
  assumeOutOfNetwork: false
};
