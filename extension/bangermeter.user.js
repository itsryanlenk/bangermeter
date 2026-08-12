// ==UserScript==
// @name         Bangermeter — Pre-Phoenix Algorithm Scorer
// @namespace    bangermeter
// @version      1.6.0
// @description  Scores tweets with the open-sourced pre-Phoenix X ranking fundamentals (exact NaviModelScorer math + last published weights, 2026-research-validated).
// @match        https://x.com/*
// @match        https://twitter.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// Single-file build generated from extension/ (weights.js + scoring.js + content.js + styles.css).
// The settings popup is not available in the userscript version; defaults apply
// (badges ON, draft meter ON, theme AUTO, out-of-network OFF, 2023 verified boost OFF —
// edit BANGERMETER_DEFAULT_SETTINGS below to change).
(function () {
  var s = document.createElement('style');
  s.textContent = "/* Bangermeter — injected styles (neo-brutalist brand system)\n   Rules: hard shadows (no blur), 2-3px borders, flat opaque colors, sharp corners,\n   physical hover feedback, high contrast. No gradients, no transparency.\n   Panel + meter are theme-aware via [data-bm-theme=\"dark\"] (set from X\u0027s own theme);\n   the badge stays light deliberately — it is the brand chip. */\n\n:root {\n  --ts-black: #000000;\n  --ts-white: #FFFFFF;\n  --ts-cream: #F5F0E6;\n  --ts-red: #FF5252;\n  --ts-yellow: #FFEB3B;\n  --ts-blue: #2196F3;\n  --ts-green: #4CAF50;\n  --ts-orange: #FF9800;\n  /* Font stacks intentionally rely on locally-installed fonts with strong\n     fallbacks (Arial Black / Impact / Arial) — a content script should not\n     phone home to a font CDN. */\n  --ts-font-display: \u0027Archivo Black\u0027, \u0027Arial Black\u0027, Impact, sans-serif;\n  --ts-font-body: \u0027Space Grotesk\u0027, Arial, sans-serif;\n}\n\n/* Theme tokens: light defaults, dark overrides */\n.bangermeter-panel,\n.bangermeter-meter {\n  --bm-surface: #FFFFFF;\n  --bm-text: #000000;\n  --bm-ink: #555555;\n  --bm-line: #000000;\n  --bm-shadow: #000000;\n  --bm-up: #2E7D32;\n  --bm-down: #C62828;\n  --bm-barpos: #C8E6C9;\n  --bm-barneg: #FFCDD2;\n  --bm-link: #2196F3;\n}\n.bangermeter-panel[data-bm-theme=\"dark\"],\n.bangermeter-meter[data-bm-theme=\"dark\"] {\n  --bm-surface: #1C1C1C;\n  --bm-text: #FFFFFF;\n  --bm-ink: #B8B8B8;\n  --bm-line: #FFFFFF;\n  --bm-shadow: #FFFFFF;\n  --bm-up: #7DDB82;\n  --bm-down: #FF8A80;\n  --bm-barpos: #1E4620;\n  --bm-barneg: #5A1F1F;\n  --bm-link: #64B5F6;\n}\n\n/* ── Badge (always light — the brand chip) ─────────────────────────────── */\n\n.bangermeter-badge {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  margin-left: 10px;\n  padding: 2px 7px;\n  border-radius: 0;\n  background: var(--ts-white);\n  border: 2px solid var(--ts-black);\n  box-shadow: 2px 2px 0 var(--ts-black);\n  font-family: var(--ts-font-body);\n  font-size: 12px;\n  font-weight: 700;\n  line-height: 16px;\n  color: var(--ts-black);\n  cursor: pointer;\n  user-select: none;\n  align-self: center;\n  transition: transform 0.1s ease, box-shadow 0.1s ease;\n}\n.bangermeter-badge:hover {\n  transform: translate(-1px, -1px);\n  box-shadow: 3px 3px 0 var(--ts-black);\n}\n.bangermeter-badge:active {\n  transform: translate(1px, 1px);\n  box-shadow: 1px 1px 0 var(--ts-black);\n}\n.bangermeter-badge:focus-visible {\n  outline: 3px solid var(--ts-blue);\n  outline-offset: 2px;\n}\n\n.bangermeter-icon { display: inline-flex; align-items: center; }\n.bangermeter-icon svg { width: 12px; height: 12px; display: block; }\n\n/* The brand mark: bolt is ALWAYS black on yellow, regardless of surrounding\n   text color (fixes white-bolt bug in the black header). */\n.bangermeter-bolt-box {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 16px;\n  height: 16px;\n  background: var(--ts-yellow);\n  border: 2px solid var(--ts-black);\n  color: var(--ts-black);\n  flex: none;\n}\n.bangermeter-bolt-box svg { width: 10px; height: 10px; display: block; }\n\n/* Score chips: flat neo color + black text + black border (both themes) */\n.bangermeter-seg {\n  padding: 0 4px;\n  border: 2px solid var(--ts-black);\n  color: var(--ts-black);\n  font-weight: 700;\n}\n.bangermeter-high { background: var(--ts-green); }\n.bangermeter-mid { background: var(--ts-yellow); }\n.bangermeter-low { background: var(--ts-red); }\n\n/* ── Breakdown panel ───────────────────────────────────────────────────── */\n\n.bangermeter-panel {\n  position: fixed;\n  z-index: 2147483647;\n  width: 380px;\n  max-height: 70vh;\n  overflow-y: auto;\n  background: var(--bm-surface);\n  color: var(--bm-text);\n  border: 3px solid var(--bm-line);\n  border-radius: 0;\n  box-shadow: 8px 8px 0 var(--bm-shadow);\n  font-family: var(--ts-font-body);\n  font-size: 13px;\n  padding: 0 0 8px 0;\n}\n\n/* Neo scrollbar: square yellow thumb, thick rails */\n.bangermeter-panel::-webkit-scrollbar { width: 14px; }\n.bangermeter-panel::-webkit-scrollbar-track {\n  background: var(--bm-surface);\n  border-left: 2px solid var(--bm-line);\n}\n.bangermeter-panel::-webkit-scrollbar-thumb {\n  background: var(--ts-yellow);\n  border: 2px solid var(--bm-line);\n  border-radius: 0;\n}\n.bangermeter-panel::-webkit-scrollbar-thumb:hover { background: var(--ts-orange); }\n\n.bangermeter-panel-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 10px 14px;\n  border-bottom: 3px solid var(--bm-line);\n  position: sticky;\n  top: 0;\n  z-index: 2;\n  background: var(--ts-black);\n}\n.bangermeter-panel-title {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-family: var(--ts-font-display);\n  font-weight: 400;\n  font-size: 14px;\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n  color: var(--ts-white);\n}\n\n.bangermeter-panel-close {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  border: 2px solid var(--ts-black);\n  background: var(--ts-yellow);\n  color: var(--ts-black);\n  cursor: pointer;\n  width: 26px;\n  height: 26px;\n  padding: 0;\n  border-radius: 0;\n  box-shadow: 2px 2px 0 var(--ts-white);\n  transition: transform 0.1s ease, box-shadow 0.1s ease;\n  flex: none;\n}\n.bangermeter-panel-close svg { width: 12px; height: 12px; display: block; }\n.bangermeter-panel-close:hover {\n  transform: translate(-1px, -1px);\n  box-shadow: 3px 3px 0 var(--ts-white);\n}\n.bangermeter-panel-close:active {\n  transform: translate(1px, 1px);\n  box-shadow: 1px 1px 0 var(--ts-white);\n}\n.bangermeter-panel-close:focus-visible {\n  outline: 3px solid var(--ts-blue);\n  outline-offset: 2px;\n}\n\n.bangermeter-panel-section {\n  padding: 12px 14px;\n  border-bottom: 2px solid var(--bm-line);\n}\n.bangermeter-panel-section:last-child { border-bottom: none; }\n\n.bangermeter-panel-scorerow {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  margin-bottom: 8px;\n}\n.bangermeter-panel-scorelabel {\n  font-family: var(--ts-font-display);\n  font-weight: 400;\n  font-size: 13px;\n  text-transform: uppercase;\n  letter-spacing: 0.03em;\n}\n.bangermeter-panel-scoreval {\n  font-family: var(--ts-font-display);\n  font-weight: 400;\n  font-size: 20px;\n  line-height: 1.2;\n  padding: 1px 10px;\n  border: 2px solid var(--ts-black);\n  box-shadow: 2px 2px 0 var(--bm-shadow);\n  margin-left: auto;\n  color: var(--ts-black);\n}\n\n.bangermeter-sub {\n  font-size: 11.5px;\n  color: var(--bm-ink);\n  margin: 0 0 8px;\n  line-height: 1.4;\n}\n\n/* Contribution rows (inside \"Show the math\") */\n.bangermeter-contrib {\n  position: relative;\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 2px 0;\n  min-height: 18px;\n}\n.bangermeter-contrib-bar {\n  position: absolute;\n  left: 0;\n  top: 2px;\n  bottom: 2px;\n  background: var(--bm-barpos);\n  border-radius: 0;\n  z-index: 0;\n}\n.bangermeter-contrib-bar.bangermeter-neg { background: var(--bm-barneg); }\n.bangermeter-contrib-label { position: relative; z-index: 1; flex: 1; font-size: 12px; }\n.bangermeter-contrib-val {\n  position: relative;\n  z-index: 1;\n  font-variant-numeric: tabular-nums;\n  font-size: 11px;\n  color: var(--bm-ink);\n}\n\n.bangermeter-subhead {\n  font-family: var(--ts-font-display);\n  font-weight: 400;\n  font-size: 11px;\n  text-transform: uppercase;\n  letter-spacing: 0.04em;\n  margin: 8px 0 4px;\n}\n\n.bangermeter-mod { display: flex; gap: 6px; padding: 2px 0; font-size: 12.5px; align-items: baseline; }\n.bangermeter-mod-dir { width: 14px; text-align: center; font-weight: 700; flex: none; }\n.bangermeter-mod-label { flex: 1; }\n.bangermeter-up { color: var(--bm-up); }\n.bangermeter-down { color: var(--bm-down); }\n\n/* Rescorer callout: yellow highlight bar (both themes — brand) */\n.bangermeter-rescorer {\n  display: inline-block;\n  margin-top: 8px;\n  font-size: 12px;\n  font-weight: 700;\n  color: var(--ts-black);\n  background: var(--ts-yellow);\n  border: 2px solid var(--ts-black);\n  padding: 2px 8px;\n}\n\n.bangermeter-unweighted { margin-top: 6px; font-size: 12px; color: var(--bm-ink); }\n.bangermeter-context {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 12px;\n  font-weight: 700;\n  margin-bottom: 6px;\n}\n.bangermeter-context .bangermeter-icon svg { width: 14px; height: 14px; }\n.bangermeter-fineprint { font-size: 11px; color: var(--bm-ink); margin-top: 6px; line-height: 1.4; }\n\n.bangermeter-plainrow {\n  display: flex;\n  gap: 7px;\n  padding: 3px 0;\n  font-size: 12.5px;\n  align-items: flex-start;\n}\n.bangermeter-plainrow .bangermeter-icon { margin-top: 2px; }\n.bangermeter-plainrow .bangermeter-icon svg { width: 14px; height: 14px; }\n.bangermeter-plainrow \u003e span:not(.bangermeter-icon):not(.bangermeter-worth) {\n  white-space: nowrap;\n  flex: none;\n}\n.bangermeter-worth { color: var(--bm-ink); font-size: 11.5px; flex: 1 1 140px; min-width: 140px; }\n\n/* Expandable math sections */\n.bangermeter-math { margin-top: 10px; }\n.bangermeter-math summary {\n  cursor: pointer;\n  font-family: var(--ts-font-display);\n  font-weight: 400;\n  font-size: 11px;\n  text-transform: uppercase;\n  letter-spacing: 0.03em;\n  color: var(--bm-link);\n  user-select: none;\n  list-style: none;\n}\n.bangermeter-math summary:hover { text-decoration: underline; }\n.bangermeter-math summary::-webkit-details-marker { display: none; }\n.bangermeter-math summary::before { content: \"+ \"; }\n.bangermeter-math[open] summary::before { content: \"− \"; }\n.bangermeter-math summary:focus-visible {\n  outline: 3px solid var(--ts-blue);\n  outline-offset: 2px;\n}\n\n/* ── Compose meter ─────────────────────────────────────────────────────── */\n\n.bangermeter-meter {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin: 8px 0 4px;\n  font-family: var(--ts-font-body);\n  font-size: 12px;\n  color: var(--bm-text);\n}\n.bangermeter-meter.bangermeter-hidden { display: none; }\n.bangermeter-meter-track {\n  flex: 0 0 90px;\n  height: 12px;\n  border-radius: 0;\n  background: var(--bm-surface);\n  border: 2px solid var(--bm-line);\n  box-shadow: 2px 2px 0 var(--bm-shadow);\n  overflow: hidden;\n}\n.bangermeter-meter-fill { height: 100%; border-radius: 0; transition: width 0.2s ease; }\n.bangermeter-fill-high { background: var(--ts-green); }\n.bangermeter-fill-mid { background: var(--ts-yellow); }\n.bangermeter-fill-low { background: var(--ts-red); }\n.bangermeter-meter-score {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  font-weight: 700;\n}\n.bangermeter-meter-hints {\n  display: flex;\n  gap: 10px;\n  font-weight: 600;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n/* ── Motion preferences ────────────────────────────────────────────────── */\n\n@media (prefers-reduced-motion: reduce) {\n  .bangermeter-badge, .bangermeter-panel-close, .bangermeter-meter-fill {\n    transition: none;\n  }\n  .bangermeter-badge:hover, .bangermeter-panel-close:hover {\n    transform: none;\n  }\n}\n";
  (document.head || document.documentElement).appendChild(s);
})();

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
    if (features.isVerified && settings && settings.applyVerifiedBoost2023) {
      var bv = C.rescorers.blueVerified;
      var bvFactor = (settings && settings.assumeOutOfNetwork) ? bv.outOfNetwork : bv.inNetwork;
      raw *= bvFactor;
      rescorers.push({ label: "Verified author ×" + bvFactor + " (2023 code, removed Sept 2025)",
        factor: bvFactor });
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
    if (features.isVerified && settings && settings.applyVerifiedBoost2023) {
      var bv = C.rescorers.blueVerified;
      var bvFactor = (settings && settings.assumeOutOfNetwork) ? bv.outOfNetwork : bv.inNetwork;
      raw *= bvFactor;
      rescorers.push({ label: "Verified author ×" + bvFactor + " (2023 code, removed Sept 2025)",
        factor: bvFactor });
    }
    // Community Note suppression applies to the PROSPECTIVE score only — a tweet's
    // actual counts (engagement score) already embed any suppression that occurred.
    if (features.hasCommunityNote) {
      raw *= C.rescorers.communityNote.factor;
      rescorers.push({ label: C.rescorers.communityNote.label, factor: C.rescorers.communityNote.factor });
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
    if (/Replying to/i.test(firstDivs) && !(socialContext && /reposted/i.test(socialContext.innerText))) {
      isReply = true;
    }

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
      hasImage: hasImage,
      hasExternalLink: hasCard || hasTco || linkishAnchor,
      hashtagCount: hashtagCount,
      isReply: isReply,
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
    has_video: "Has video — watches barely count (tiny weight, despite the folklore)",
    external_link: "Contains a link — the algorithm gives zero credit for link clicks",
    link_no_context: "Mostly just a link — low-context link posts do worse",
    many_hashtags: "3+ hashtags — the old algorithm flags hashtag piles",
    engagement_bait: "“Like if…” bait — invites “show less” clicks and penalties",
    all_caps_shout: "MOSTLY CAPS — reads as shouting, invites negative feedback"
  };

  function plainRescorerText(r) {
    if (r.label.indexOf("Reply") === 0) return "This is a reply — the algorithm scores replies at 75%";
    if (r.label.indexOf("Out-of-network") === 0) return "Out-of-network view assumed — scored at 75%";
    if (r.label.indexOf("Verified") === 0) {
      return "Verified author — ×" + r.factor + " boost per 2023 code (removed from X's code Sept 2025)";
    }
    if (r.label.indexOf("Community-noted") === 0) {
      return "Community Note attached — future engagement suppressed ~50% (three causal studies)";
    }
    return r.label;
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
        "Replies are also ineligible for X's Grok “banger screen” — only original posts get " +
        "the viral quality gate (shipped 2026 code).");
      sec1.appendChild(bangNote);
    }

    var d1 = mathDetails();
    d1.appendChild(el("div", "bangermeter-fineprint",
      "Score = Σ(weight × P) over engagement heads (exact NaviModelScorer math, ε = 0.001), " +
      "× rescorers, normalized so a median post = 50 (√ curve, capped at 100). " +
      "Raw: " + result.content.raw.toFixed(4)));
    contributionList(d1, result.content.contributions);
    sec1.appendChild(d1);
    panel.appendChild(sec1);

    // ── Earned engagement (plain English; math collapsed) ──
    var sec2 = el("div", "bangermeter-panel-section");
    if (result.engagement.available) {
      sectionScoreRow(sec2, "Earned engagement", result.engagement.score, null);
      subtitle(sec2, "How the algorithm values what this post actually earned, from " +
        result.engagement.views.toLocaleString() + " views. 50 = typical rates.");

      var counts = result.features.counts || {};
      [
        { icon: "reply", n: counts.replies, one: "reply", many: "replies",
          worth: "the algorithm's favorite — each worth ~27 likes",
          tip: "Weight 13.5 vs 0.5 for a like (Mar 2023 published values)" },
        { icon: "repost", n: counts.retweets, one: "repost", many: "reposts",
          worth: "each worth ~2 likes",
          tip: "Weight 1.0 vs 0.5 for a like" },
        { icon: "like", n: counts.likes, one: "like", many: "likes",
          worth: "the baseline unit",
          tip: "Weight 0.5" },
        { icon: "bookmark", n: counts.bookmarks, one: "bookmark", many: "bookmarks",
          worth: "≈ a “quiet like” (Musk) — never weighted publicly",
          tip: (BANGERMETER_CONFIG.heads.bookmark.note || "") }
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
        "Verified author: 2023-era code boosted verified posts ×4 in-network / ×2 out-of-network " +
        "(removed from X's code Sept 2025). Not applied to this score — enable “2023 verified " +
        "boost” in the popup to simulate that era.");
      sec3.appendChild(vNote);
    }

    // Grade-A facts for the never-published heads (Aug 2026 deep research) —
    // facts only, none of these enters the score.
    var F = BANGERMETER_CONFIG.sourcedFacts;
    var d4 = mathDetails("Sourced signals without published weights");
    [
      "▲ Shares — officially positive; DM-forwarding is “one of the strongest signals” (Musk, Sep 2024). No number ever published.",
      "▲ Bookmarks — ≈ a “quiet like” per Musk (Jan 2023); dropped from the 2026 head roster. 10×/20× claims are folklore.",
      "▲ Dwell — positive by structure. What counts (shipped constants): click ≥" +
        F.thresholds.goodClickSeconds + "s, profile visit ≥" + F.thresholds.goodProfileClickSeconds +
        "s, detail page ≥" + F.thresholds.detailDwellSeconds + "s, profile dwell ≥" +
        F.thresholds.profileDwellSeconds + "s, conversation ≥" + F.thresholds.convoDwellSeconds + "s.",
      "▼ Scroll-past — “not_dwelled” is an explicit negative head in 2026 production (direction sourced, value redacted).",
      "▼ Strong/weak negative feedback — provably negative-only (shipped bounds −1000…0); report's allowed floor is 20× deeper.",
      "· Grok banger screen (2026): quality_score ≥ " + F.grox.qualityGate +
        " gates viral distribution; original posts only — replies ineligible.",
      "· 2026 scorer structure: " + F.phoenix2026.headCount +
        " heads; any net-negative post ranks below every net-positive post."
    ].forEach(function (line) {
      var mark = line.charAt(0);
      var row = el("div", "bangermeter-mod");
      row.appendChild(el("span", "bangermeter-mod-dir" +
        (mark === "▼" ? " bangermeter-down" : mark === "▲" ? " bangermeter-up" : ""), mark));
      row.appendChild(el("span", "bangermeter-mod-label", line.slice(2)));
      d4.appendChild(row);
    });
    d4.appendChild(el("div", "bangermeter-fineprint",
      "Shipped-code and official-statement facts (Aug 2026 deep research). None carries a " +
      "published weight, so none is included in the score."));
    sec3.appendChild(d4);

    var d3 = mathDetails("About these scores");
    d3.appendChild(el("div", "bangermeter-fineprint", BANGERMETER_CONFIG.contextNotes.phoenix));
    d3.appendChild(el("div", "bangermeter-fineprint",
      "Weights: last published set (Mar 2023), confirmed still the only sourced values as of Aug 2026. Relative score, not predicted reach."));
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

  function ensureMeter(editor) {
    var host = editor.closest('div[data-testid^="tweetTextarea"]');
    if (!host || !host.parentElement) return null;
    var container = host.parentElement;
    if (!container.parentElement) return null;
    var meter = container.parentElement.querySelector(".bangermeter-meter");
    if (meter) return meter;

    meter = el("div", "bangermeter-meter");
    meter.setAttribute("role", "img");
    var bar = el("div", "bangermeter-meter-track");
    bar.setAttribute("aria-hidden", "true");
    bar.appendChild(el("div", "bangermeter-meter-fill"));
    meter.appendChild(bar);
    meter.appendChild(el("span", "bangermeter-meter-score", ""));
    meter.appendChild(el("span", "bangermeter-meter-hints", ""));
    container.insertAdjacentElement("afterend", meter);
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
  }

  document.addEventListener("input", function (ev) {
    var editor = ev.target && ev.target.closest &&
      ev.target.closest('div[data-testid^="tweetTextarea"] [contenteditable="true"], [data-testid^="tweetTextarea"][contenteditable="true"]');
    if (editor) updateMeter(editor);
  }, true);

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
