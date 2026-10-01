// Bangermeter — weight configuration (single source of truth)
//
// TWO STRICTLY SEPARATE LAYERS:
//   1. WEIGHT LAYER  — the published algorithm values. Never invented.
//   2. ESTIMATOR LAYER — how we approximate P(action) from what a browser can see.
//      Clearly labeled estimates; the honesty boundary lives here.
//
// Provenance codes:
//   "2026-published" — transcribed verbatim from xai-org/x-algorithm,
//                      home-mixer/params/param.rs (the Aug 13, 2026 release) and,
//                      since Sept 23, 2026 (1b3fec2), its duplicate vm-ranker/params.rs.
//   "2026-config"    — constant from home-mixer/params/config.rs.
//   "2023-archived"  — 2023-era code, removed from the current release; opt-in only.
//   "earlybird-archived" — Earlybird-era constant from twitter/the-algorithm; display context only.
//   "2026-studies"   — external causal research, not an X parameter.
//   "estimate"       — estimator-layer number (baseline rates / directional modifiers).

var BANGERMETER_CONFIG = {
  version: "0.10.3",

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
  weightsSnapshot: "September 29, 2026 — xai-org/x-algorithm, vm-ranker/params.rs and its mirror home-mixer/params/param.rs (upstream last-sync stamp 2026-09-29T17:02:52Z; all 25 values re-verified in both files, which agree). Three CHANGED in the Sept 28 sync, published Sept 29 — click 0.4→0.3, cont_click_dwell_time 0.0→0.4, not_interested −43.2→−47.52. Earlier: X deleted a 26th head, cont_active_secs_5m_residual_norm, weighted 0.0, in the Sept 23 sync, and three changed on Aug 25 — vqv 0.05→0.0, binary dwell 0.0→0.05, video_open 0.05→0.07",
  // Machine-readable copy of the stamp above. Every score card pins this, and
  // packages/bangermeter-rank's sync job fails when live param.rs drifts from it.
  // Only param.rs carries a stamp; vm-ranker/params.rs has none.
  paramRsLastSync: "2026-09-29T17:02:52Z",
  // WHERE THE SCORE IS COMPUTED (moved Sept 24, 2026 — 44d37eb). home-mixer's
  // RankingScorer (ranking_scorer.rs) was deleted. home-mixer now sends each
  // slate to a separate vm-ranker service, which computes the final score with
  // the xai-value-model crate from the weights declared in vm-ranker/params.rs.
  // The head combination, offset, author diversity and OON factor are the same
  // math at published defaults; only the location changed. param.rs still
  // declares the same 25 head weights, used for home-mixer's local fallback
  // score and to pick the cold-start candidate.
  weightsSourceUrl: "https://github.com/xai-org/x-algorithm/blob/main/vm-ranker/params.rs",
  scorerSourceUrl: "https://github.com/xai-org/x-algorithm/blob/main/xai-value-model/scoring.rs",

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
  // Phoenix heads. Score = Σ(weight × P(action)), compute_value_scores in
  // xai-value-model/scoring.rs (the deleted ranking_scorer.rs did the same sum).
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
    click: { weight: 0.3, param: "rust_home_mixer_click_weight",
      provenance: "2026-published", label: "Post click",
      note: "Cut from 0.4 to 0.3 in the Sept 28, 2026 sync (published Sept 29). The same push turned on click DWELL at 0.4: the click itself now carries less, and a reader who clicks in and stays now carries something where before it carried nothing. (0.4 against 0.3 does not make staying 'worth more' than clicking — click dwell multiplies a smaller probability.)" },
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
      note: "In-network only — hard-wired in xai-value-model since Sept 24, 2026 (until then the PostUnexploredWeightInNetworkOnly switch, default true). Viewer-specific novelty — excluded from the content score." },
    cont_dwell_time: { weight: 0.004, param: "rust_home_mixer_cont_dwell_time_weight",
      provenance: "2026-published", label: "Dwell time",
      continuous: true,
      note: "CONTINUOUS head: multiplies predicted dwell in seconds, not a probability. At a few seconds of dwell this is one of the largest terms for an ordinary post." },
    dwell: { weight: 0.05, param: "rust_home_mixer_dwell_weight",
      provenance: "2026-published", label: "Dwell (binary)",
      note: "TURNED ON August 25, 2026, at 0.05. Through v0.10.0 this head shipped at 0.0 and this tool said binary dwell paid nothing — that is no longer true. X now pays a flat amount for the reader dwelling at all, on TOP of the continuous dwell-time term (cont_dwell_time, 0.004/second). Stopping the scroll is the cheapest thing a post can win." },
    cont_click_dwell_time: { weight: 0.4, param: "rust_home_mixer_cont_click_dwell_time_weight",
      provenance: "2026-published", label: "Click dwell",
      note: "TURNED ON in the Sept 28, 2026 sync (published Sept 29), from 0.0 to 0.4 — the coefficient a click carried before that push. Because it needs a click AND a stay, its probability is always below a click's, so comparing the two coefficients says nothing about which is worth more. Despite the cont_ prefix it is NOT paid per second: X's published model config trains this head as 'click-dwell-binary' with a 10.0 threshold, and binary heads skip the seconds rescale at inference, so the 0.4 multiplies a PROBABILITY — the chance a reader clicks into the post and stays past that mark. (The serving-side mapping from model output to this field is not in the repo; the training config is the published evidence.) Like cont_dwell_time it is kept out of positive_sum, so it does not move the negative-offset scale. Bangermeter cannot see a click or what follows it, so this head is scored from a baseline estimate." },

    // Heads X ships with an explicit 0.0 — they exist, they are wired in, and they
    // currently contribute exactly nothing. That is a finding, not an omission.
    profile_click: { weight: 0.0, param: "rust_home_mixer_profile_click_weight",
      provenance: "2026-published", label: "Profile click",
      note: "ZEROED. The 2023 table paid 12.0 for a profile-click-and-engage. It is now worth nothing." },
    vqv: { weight: 0.0, param: "rust_home_mixer_vqv_weight",
      provenance: "2026-published", label: "Video quality view",
      note: "ZEROED August 25, 2026 — it shipped at 0.05 through v0.10.0. The duration gate is still live and this tool still evaluates it: the clip must run STRICTLY LONGER than MinVideoDurationMs = 10,000, so a 10.000s clip and every GIF fail it (xai-value-model/proto.rs). The second gate — a VIEWER with 10,000 or more followers getting no vqv weight — no longer reaches the served ranking: since Sept 24, 2026 the final score comes from vm-ranker, which checks duration only, and the follower gate survives only in home-mixer's local fallback score (candidates_util.rs). Either way the gate now guards a term worth nothing. Kept because the machinery is intact and X can re-enable it by moving one number." },
    quoted_vqv: { weight: 0.0, param: "rust_home_mixer_quoted_vqv_weight",
      provenance: "2026-published", label: "Quoted video quality view", note: "ZEROED." },
    // cont_active_secs_5m_residual_norm (0.0) was deleted from param.rs and
    // ranking_scorer.rs in the 2026-09-23T16:28:43Z sync (published Sept 24,
    // 44d37eb). It paid nothing, so no score moved; it is gone here so the
    // roster matches live 25/25. home-mixer still sends the prediction and logs
    // it at weight 0.0, but no weight declares it.

    // Negative heads.
    not_interested: { weight: -47.52, param: "rust_home_mixer_not_interested_weight",
      provenance: "2026-published", label: "Not interested",
      note: "Deepened from −43.2 to −47.52 (exactly 10% harsher) in the Sept 28, 2026 sync, published Sept 29. It is the first time X has moved any negative weight since publishing the table on Aug 13 — block, mute, report and not-dwelled are unchanged." },
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

  // reply_weight_for(candidate), xai-value-model/weights.rs. Applies ONLY when the
  // candidate is an original post (not a reply, not a repost) AND the author is a
  // mutual follow. 5.0 + 15.0 = 20.0.
  bidirectionalFollowReplyBoost: 15.0,
  // dwell_weight_for(candidate) — same gate, but shipped at 0.0, so it is inert.
  bidirectionalFollowDwellBoost: 0.0,

  // NEGATIVE_SCORES_OFFSET — xai-value-model/weights.rs, and still declared
  // (also 0.001) in home-mixer/params/config.rs.
  negativeScoresOffset: 0.001,

  // ValueModelWeights::positive_sum / negative_sum, xai-value-model/weights.rs
  // (the same membership the deleted ranking_scorer.rs used). Note what is NOT
  // here: the cont_* heads — including click dwell, now weighted 0.4 — and the
  // bidirectional boost are excluded from positive_sum.
  // These sums only matter on the negative branch of offset_score, where they
  // rescale any net-negative post into (0, offset) — below every positive post.
  weightSumMembers: {
    positive: ["favorite", "reply", "retweet", "photo_expand", "video_open", "click",
      "open_link", "profile_click", "vqv", "share", "share_via_dm", "share_via_copy_link",
      "dwell", "quote", "quoted_click", "quoted_vqv", "follow_author", "post_unexplored"],
    negative: ["not_interested", "block_author", "mute_author", "report", "not_dwelled"]
  },

  // Rescoring applied AFTER the weighted sum (xai-value-model/scoring.rs, run
  // inside vm-ranker). Order in production: author diversity, then the OON
  // factor. The factors and author diversity live only in vm-ranker/params.rs.
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
    newUserOutOfNetwork: { factor: 0.00001, param: "rust_home_mixer_new_user_oon_weight_factor",
      provenance: "2026-published", inert: true,
      label: "New-user OON ×0.00001",
      note: "A published feature switch since Sept 22, 2026 — before that it was a hard-coded constant in home-mixer — and since Sept 24 it lives only in vm-ranker/params.rs. INERT at published defaults: the gate requires the VIEWER's account to be younger than NewUserAgeThresholdSecs AND to follow at least 5 accounts, and that threshold ships at 0, so `age < 0s` is false for every account. Since the move it is doubly unreachable from the For You path — vm-ranker reads the follow count from a request field home-mixer never sets. The mechanism exists and would annihilate out-of-network content for new accounts if both were switched on." },
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
      note: "There is NO bookmark WEIGHT in the 2026 Phoenix roster — no coefficient multiplies a predicted bookmark, so a bookmark cannot be converted into score the way a like or a reply can. That is the precise claim, and the precision matters: bookmarks are NOT absent from the system. A post's bookmark_count is hydrated from engagement counts and sent to Phoenix with every candidate (home-mixer/models/candidate.rs, alongside content_features) — but no published model code reads it: the published feature prep takes five counts, likes, replies, reposts, quotes and views. What the published model does take in is the VIEWER's own bookmarking, as one action in their engagement history; and ClientTweetBookmark is in the POSITIVE_ENGAGEMENTS list in viewer_history.rs used to build the set of authors a viewer has engaged with. So bookmarking shapes what the bookmarker is shown; a post's bookmark count has no published path into its own score. (Version 0.10.2 called bookmark_count a model input. Sent to the model is as far as the published code goes.) Through v0.10.0 this tool said bookmarks survived only inside the dwell-regret gate — X deleted that gate on Sept 18, 2026, and the statement was too narrow even before then. Musk's 'de facto silent like' remark (Jan 2023) never became a shipped weight, and the '10×/20×' claims are folklore." }
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
      provenance: "xai-value-model/scoring.rs offset_score (formerly ranking_scorer.rs)",
      note: "Any post whose weighted sum is net-negative is rescaled into [0, 0.000896) — negative_sum/total_sum × the 0.001 offset — so it ranks below every net-positive post regardless of how good the rest of it was. (The ceiling was 0.000894 until the Sept 29, 2026 weight change.)" },

    // ── Published by X on Aug 14 2026 ─────────────────────────────────────
    reportBaselineRatio: { value: 1000, provenance: "2026-published",
      note: "X: 'the baseline probability of a Report is more than 1000x lower than a Like, so it's weighted more to allow the prediction to affect the final ranking at all.' The large negative coefficients are large BECAUSE the actions are rare — which is precisely why dividing one by the like weight produces a meaningless number." },

    homeTimelineOnly: { provenance: "2026-published",
      note: "Engagement only counts toward ranking if it happened on a post served in the Home Timeline. X: 'Directly navigating to a post (i.e., coordinating via groupchat) has no ranking impact.' Sending your own link round a group chat does nothing for reach — the copy-link coefficient pays for a VIEWER copying it in-feed, not for the visits that follow." },

    brigadingResistance: { provenance: "2026-published",
      note: "Mass block/report campaigns do not straightforwardly suppress reach. X gives two reasons: the model predicts an individual viewer's likelihood of the action rather than summing weights over counts, and recommendations are personalized — so reports from bad actors mainly affect what gets recommended to users similar to those bad actors, rather than moving the post for everyone." },

    // Counted at 77d431a: numeric literals in the FxHashSet, all unique.
    brazil2026ElectionFilter: { accounts: 2795, accountsAsOf: "2026-09-30", provenance: "2026-published",
      param: "home-mixer/filters/brazil_2026_election_filter.rs",
      note: "For You removes posts from 2,795 accounts reported to Brazil's Electoral Court for the 2026 election, unless the viewer follows the account (count read Sept 30, 2026). The list is revised roughly weekly and has grown steadily — 665 accounts when X first published it on Aug 14, 2,328 on Aug 25, 2,776 by Sept 18, 2,786 on Sept 25, 2,795 on Sept 30 — so treat the count as a reading, not a constant. Compiled in rather than feature-switched: IDs obfuscated, usernames left in source for transparency. A hard filter that runs before scoring, so no weight can offset it." },

    // ── Author cold start (verified against the repo 2026-09-30) ─────────
    // The one published mechanism that deliberately promotes newer posts from
    // smaller accounts, and it ships ON. Bangermeter cannot detect whether a
    // given post WAS cold-started — the slate is server-side — so this is
    // reported as eligibility context, never as a score component.
    //
    // Every gate below moved in the 2026-09-29T17:02:52Z sync (77d431a,
    // published Sept 30): followers 1,000→50,000, Home impressions
    // 1,000→200, age 48h→2h, position ratio 0.85→0.97, and selection switched
    // from highest score to Thompson sampling.
    authorColdStart: {
      enabled: true, enabledParam: "rust_home_mixer_enable_viewer_cold_start_boost",
      followerCap: 50000, impressionThreshold: 200, maxPostAgeHours: 2,
      slotMin: 15, slotMax: 16, maxPositionRatio: 0.97,
      originalPostsOnly: true, postsPromotedPerRequest: 1,
      selection: "thompson", betaAlpha0: 0.75, betaBeta0: 49.25, thompsonTopK: 2,
      asOf: "2026-09-29",
      provenance: "2026-published",
      source: "home-mixer/scorers/author_cold_start.rs",
      note: "Ships ON. On each For You request AT MOST ONE candidate is promoted — if nothing qualifies, scores are returned untouched. To qualify, a post must be an original post (not a reply, not a repost) from an author with 50,000 or fewer followers, be no more than 2 hours old, have fewer than 200 Home impressions so far, and already rank inside the top 97% of the candidates that scored above zero. Among the qualifiers the pick is no longer simply the highest score: X runs Thompson sampling on the like rate — for each post it draws a plausible like rate from Beta(0.75 + likes, 49.25 + Home impressions − likes), keeps the two highest draws, and promotes whichever of those two the model scored higher. So early likes per impression pick a shortlist of two, with some luck in the draw, and the model's score picks the winner; with only one or two qualifiers, likes change nothing. What the winner gets is a score FLOOR, not a seat: its score is raised to whatever the post at rank 15 scored (max(own, target)), so it lands ABOUT slot 15 of 35 — later rescoring can still move it, and a post already scoring higher gains nothing. All of these gates moved in the Sept 29, 2026 sync (published Sept 30): until then the cap was 1,000 followers, the window 48 hours, the impression ceiling 1,000, the position ratio 85%, and the highest-scoring qualifier won outright. The window is now the first two hours. One post per request, not per author and not per session — a narrow lane, not a small-account boost." },

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
      note: "Added to the published repo on Sept 8, 2026 and sent to Phoenix with every candidate: seven facts about a post's content — whether it has video, the longest video's duration, whether it has a photo, how many media items, the weighted text length, the newline count, and whether it has a URL. No published model code reads them yet: the published Phoenix feature prep never touches these fields, and the only other published consumer is an off-by-default vm-ranker debias payload. So the repo shows X SENDING them to the ranker, not what the ranker does with them. Weighted length follows X's text rules in simplified form — any http:// or https:// token counts 23 regardless of its real length, CJK and emoji count 2, Latin counts 1. Note is_url matches only those two prefixes, so a bare domain is counted character by character. Two consequences worth knowing: a media attachment's own t.co link is subtracted before has_url is decided, so posting an image does NOT make your post 'have a link'; and newline_count is a field in its own right, the first published sign that X considers post SHAPE — not just length — worth sending to the ranker. No weights are attached to any of these, so this tool reports them and does not score them." },

    // ── Reply-specific facts (verified against the repo 2026-09-19) ───────
    conversationRanker: { published: false, provenance: "2026-published",
      note: "The service that ORDERS replies under a post is not in the open-source release — the repo's own README scopes it to the For You feed. What the repo DOES ship is the 0-3 reply-ranking score generator (grox/flows/reply_spam/), not the ordering logic that consumes it. Any claim about a reply's position inside a thread is unpublished territory and this tool says so rather than guessing." },

    oonReplyFilter: { provenance: "2026-published",
      source: "home-mixer/filters/oon_retweet_reply_filter.rs",
      note: "OONRetweetReplyFilter removes replies (and reposts) from unfollowed accounts from For You candidates entirely — an out-of-network reply is not down-weighted, it is gone. Replies with a missing parent are dropped too." },

    // ── The "Visibility limited" notice (verified against 77d431a, 2026-09-30) ──
    // Through v0.10.2 the panel said "reach suppressed (magnitude unpublished)"
    // and cited FreedomOfSpeechNotReach.scala. That file is the 2023 archive.
    // The 2026 code has no reach magnitude to withhold: For You drops these
    // posts. Unchanged at 8b25829 (Sept 18), and present in 47c1bcd (Aug 13),
    // the first release to publish the visibility-filtering rules. (The repo
    // itself was first published Jan 20, at aaa167b.)
    visibilityLimited: {
      provenance: "2026-published",
      verifiedAt: "77d431a", verifiedAsOf: "2026-09-30",
      forYouLevels: ["TimelineHome", "TimelineHomeRecommendations"],
      droppedExceptAuthor: ["FOSNR_HATEFUL_CONDUCT", "FOSNR_VIOLENT_SPEECH",
        "FOSNR_ABUSE", "FOSNR_CIVIC_INTEGRITY"],
      droppedOutOfNetwork: ["FOSNR_ABUSE_INSULTS"],
      fosnrLimitedEngagementRule: false,
      noticeRenderingPublished: false,
      sources: [
        "home-mixer/candidate_hydrators/vf_candidate_hydrator.rs@77d431a (lines 67-106: in-network posts and reposted originals at TimelineHome; out-of-network posts, ancestors and quoted posts at TimelineHomeRecommendations)",
        "home-mixer/candidate_hydrators/vf_candidate_hydrator.rs@77d431a (lines 140-170: a post whose quoted post, reposted original or ancestor is dropped is flagged, and AncillaryVFFilter removes it)",
        "home-mixer/candidate_pipeline/phoenix_candidate_pipeline.rs@77d431a (lines 425, 444-445: wired into For You)",
        "home-mixer/filters/vf_filter.rs@77d431a (lines 14-27: Drop, Tombstone and NotEvaluated are removed; a post with no verdict is kept)",
        "home-mixer/candidate_pipeline/for_you_candidate_pipeline.rs@77d431a (lines 203-212: PushToHomeSource posts get no VF filter)",
        "home-mixer/sources/thunder_source.rs@77d431a (lines 92-98: an in-network reply's ancestors are its parent and thread root)",
        "visibility-filtering/rules/tweet_rules.rs@77d431a (lines 163-185: four labels dropped except for the author; lines 574-580: FOSNR_ABUSE_INSULTS)",
        "visibility-filtering/rules/registry.rs@77d431a (lines 134-164, 265-275: the four drops run at both levels, FOSNR_ABUSE_INSULTS at the out-of-network level only)",
        "visibility-filtering/models/verdict.rs@77d431a (lines 84-90: no FOSNR limited-engagement reason)",
        "visibility-filtering-client/graphql_results.rs@77d431a (lines 186-203: decodes a FosnrReason that no published rule emits)",
        "home-mixer/candidate_hydrators/vf_following_candidate_hydrator.rs@77d431a (line 63: the chronological Following feed checks every post at TimelineHome)",
        "home-mixer/server.rs@77d431a (line 548: the ranked Following feed sets in_network_only and runs the For You pipeline)",
        "under-the-hood/strato/lib/underTheHoodLabels.strato@77d431a (lines 69-98: X's own description of the notice)"
      ],
      panel: "Visibility limited by X — For You removes it for everyone but the author",
      panelDetail: "One exception: a post labeled FOSNR_ABUSE_INSULTS is removed only out-of-network, so followers can still get it, and so can anyone who follows an account that reposts it. Where the post still appears, as here, X shows this notice. That rendering is not in X's published code.",
      note: "X's own descriptions say five FOSNR labels come with 'a label explaining that the post has limited visibility', shown to all users (underTheHoodLabels.strato). The on-screen words 'Visibility limited' are not in source. For You checks in-network posts and reposted originals at the TimelineHome safety level, and out-of-network posts, plus every candidate's ancestors and quoted post, at TimelineHomeRecommendations. FOSNR_HATEFUL_CONDUCT, FOSNR_VIOLENT_SPEECH, FOSNR_ABUSE and FOSNR_CIVIC_INTEGRITY are dropped at both levels for every viewer except the author. FOSNR_ABUSE_INSULTS is dropped at the out-of-network level only. vf_filter.rs removes every Drop verdict, so these posts are gone from For You, not ranked lower. A post that quotes one, or whose parent or thread root is one, is removed with it. Two published paths skip all of this: a post whose visibility check fails gets no verdict and is kept, and posts from PushToHomeSource pass through no VF filter. The chronological Following feed checks every post at TimelineHome, so it removes the same four labels. The ranked Following feed runs the For You checks. No published rule emits a FOSNR limited-engagement verdict. Where and how X renders the notice is not in the published code. Bangermeter's score assumes the post can reach For You. Apart from those two paths, a post carrying this notice reaches only its author in For You, plus, when the label is FOSNR_ABUSE_INSULTS, the author's followers and anyone following an account that reposts it." },

    replyQualityGate: {
      followerThreshold: 250000, scoreMin: 0, scoreMax: 3,
      // Traced commit by commit through every commit touching task_filter.py
      // or, since Sept 16, grox/flows/reply_spam/constants.py, where the value
      // now lives. Raised ELEVEN times since publication: 15,000 (Aug 13),
      // 30,000 (Aug 14), 40,000 (Aug 17), 60,000 (Aug 18), 80,000 (Aug 21),
      // 100,000 (Aug 24), 120,000 (Aug 25), 150,000 (Sep 8), 180,000 (Sep 16,
      // first as the named constant GROK_GEMMA_FOLLOWER_SPLIT), 200,000
      // (Sep 17), 225,000 (Sep 23), 250,000 (Sep 24). 0.10.2 counted eight raises (there
      // had been nine) and this comment dated 200,000 to Sep 16 — the trace had
      // skipped the 180,000 step. Read the value below as a
      // dated reading, not a rule — and re-trace it, because `git diff` of
      // task_filter.py alone no longer shows the gate moving at all.
      thresholdParam: "GROK_GEMMA_FOLLOWER_SPLIT",
      thresholdAsOf: "2026-09-30",
      // GEMMA_REPLY_SPAM_MIN_FOLLOWERS, constants.py — 150,000 until Sept 26.
      gemmaSpamModelMinFollowers: 125000,
      // classifier_simple_reply_scorer.py, since Sept 22: a reply carrying a
      // quoted post bypasses Gemma and is scored by the full Grok ReplyScorer.
      quoteRepliesAlwaysGrok: true,
      // task_write.py: the score-0 label is skipped for these repliers.
      labelExempt: ["high page rank (v2)", "grey badge"],
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
      note: "Replies are routed to the Grok reply-ranking scorer (GROK_4_MINI_CRITICAL, 0-3) when the DIRECT PARENT author or the THREAD-ROOT author has strictly more than 250,000 followers, as of Sept 30, 2026. Treat that as a dated reading: X has raised the gate eleven times since publishing it — 15,000 (Aug 13), 30,000 (Aug 14), 40,000 (Aug 17), 60,000 (Aug 18), 80,000 (Aug 21), 100,000 (Aug 24), 120,000 (Aug 25), 150,000 (Sept 8), 180,000 (Sept 16), 200,000 (Sept 17), 225,000 (Sept 23), 250,000 (Sept 24). Version 0.10.2 said eight raises; there had been nine — our trace had missed the 180,000 step on Sept 16. Versions through v0.10.0 said 100,000. That figure was CORRECT when it shipped — the gate stood at exactly 100,000 from Aug 24 — and it went stale within a day, the same way the weights did. (A 0.10.2 draft of this note claimed the 100,000 had been mis-sourced from the model's prompt string. That self-correction was itself wrong and was caught in review: the prompt does carry 100,000, and it still does, so anyone re-deriving this number TODAY would land on the wrong one — but that is a live trap, not what happened here.) A score of 0 applies the RiskyHighVizReply safety label — unless the replier is a high-page-rank or grey-badge account, which X exempts; the duration of that application is not published (a separate enforcement rule applies the same label for 30 days on a different trigger, llm_slop_post). Self-replies are exempt — the filter skips a reply whose author is the parent author or the root author. The scoring rubric itself is withheld by X 'to reduce gameability', so no tool can honestly claim to reproduce it, this one included. Below the gate a reply goes to a lighter Gemma scorer instead, which switches to a reply-spam-tuned model above 125,000 thread followers (150,000 until Sept 26) — so that model covers the 125,001-250,000 band. One exception since Sept 22: a reply that QUOTES a post skips Gemma and is scored by the full Grok scorer, whatever the follower counts." },

    // ── "Under the Hood" transparency pilot (announced Aug 13, 2026) ──────
    underTheHood: {
      provenance: "2026-published",
      source: "under-the-hood/ (underTheHoodLabels.strato, under_the_hood.thrift, uth_serving.thrift)",
      // The upstream README moved the link to /i/jf/ on Sept 25, 2026 (bf7db1b).
      path: "x.com/i/jf/under_the_hood",
      // The two published eligibility checks, verbatim from
      // underTheHoodReport.User.strato. X's announcement described a limited
      // pilot cohort beyond these, but no selection mechanism is in the repo.
      eligibility: "account at least 1 year old, 10 or more posts in the prior month",
      aggregatesOnly: true,
      note: "A pilot report of visibility-impacting safety labels on the user's own account and posts, downloadable as JSON. The report holds MONTHLY PER-LABEL AGGREGATES — counts and percentages, no post IDs — so it can say 'N posts carried label X this month', never 'this post was deboosted'. The report is served via GraphQL as a single JSON blob (published serving code). When we tested in Aug 2026 the page only offered it as a file download, without putting the label data on the page. On Sept 25, 2026 X published the code for a page that DOES render the labels (under-the-hood/jetfuel/) and moved the link to x.com/i/jf/under_the_hood. Whether that page exposes the labels to an extension has not been checked live, so Bangermeter still takes the downloaded file by user-initiated import and parses it locally — no network access either way.",
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
    // Click dwell (live at 0.4 since the Sept 28 2026 sync) is a PROBABILITY:
    // the chance a reader clicks into the post AND stays past the head's 10.0
    // threshold. The label needs a click, so it is bounded by P(click). Of the
    // 0.010 who click, we assume about 30% stay that long — an estimate, kept
    // close to the 26% the reference dwell distribution gives for clearing ten
    // seconds in-feed. 0.010 × 0.30 = 0.003.
    cont_click_dwell_time: 0.003,
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
    { id: "thread_starter", label: "Thread starter", applies: "click,quote,cont_click_dwell_time",
      factor: 1.3, provenance: "estimate",
      why: "Threads drive post clicks (0.3) and give people something to quote (5.0). Since X's Sept 28 2026 sync it also pays 0.4 when a reader clicks in AND stays past the click-dwell mark — which a thread, read on its own page, is built to earn." },
    { id: "media_image", label: "Has image", applies: "favorite", factor: 1.1,
      provenance: "estimate", why: "Images raise like rates mildly and enable the photo-expand head (0.05)." },
    { id: "has_video", label: "Has video", applies: "", factor: 1.0,
      enables: "video_open,vqv", provenance: "estimate",
      alsoApplies: { dwell: 1.4, not_dwelled: 0.85 },
      why: "Enables video_open, which X raised from 0.05 to 0.07 on Aug 25 2026. It also enables video-quality-view — but X zeroed that head in the same push, so clearing its duration gate (STRICTLY over 10 seconds) is now worth nothing. Video did not stop being paid for holding attention, though: the binary dwell head turned on in the same push at a ten-second mark, which video reaches far more easily than text, so the credit moved rather than vanished. That shift in routing is published; the size of the dwell nudge here is our estimate. The '10× video boost' remains folklore." },
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
      why: "'Like if / RT if / follow me' phrasing — plus Hinglish ('karo agar', '1 likho agar', 'sach batao') and Devanagari ('…तो लाइक करें', 'कमेंट बॉक्स में जरूर', 'सच सच बताओ') — invites the not-interested (−47.52 since X's Sept 28 2026 sync, up from −43.2) and mute (−58.8) heads, and a net-negative post is rescaled below every positive post. Detection covers imperative calls to action ONLY; the rhetorical-question genre ('Kya …?', 'X ya Y?') is deliberately not claimed, because no pattern separates it from a sincere question. Note the Devanagari patterns are not transliterations: Hindi puts the call to action last, so 'like karo agar X' is an English calque that barely occurs, and every Devanagari pattern anchors on तो / जरूर / मुझे instead. That anchor is load-bearing — on X the bare verb phrase is usually an argument ('पहले पढ़ो, फिर कमेंट करो'), not a solicitation. Validated against real Hindi posts: zero false positives, and deliberately conservative recall." },
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
