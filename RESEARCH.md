# The Research — Does the pre-Phoenix algorithm data still hold in 2026?

Bangermeter scores tweets with the formulas and weights from X's open-sourced ranking
code. Those weights were published in **March 2023** and production moved to the Grok-based
**Phoenix** ranker in late 2025 — so before trusting them, every scoring element was
source-traced against everything published since. This document is the result (compiled
August 2026), plus live backtesting notes.

## Headline findings

1. **A successor repo exists.** xAI open-sourced the Phoenix-era production stack on
   **Jan 20, 2026** at [xai-org/x-algorithm](https://github.com/xai-org/x-algorithm)
   (Rust/Python; Home Mixer, Thunder, Phoenix transformer ported from Grok-1), updated
   **May 15, 2026** with "Grox" content classifiers (slop_score 1–3, quality_score 0–1
   with ~0.4 viral threshold) and a runnable non-production "mini Phoenix" checkpoint.
2. **The scoring skeleton survives verbatim.** `Score = Σ(weight_i × P(action_i)) + offset`,
   times multiplicative rescorers, is still production (`weighted_scorer.rs`,
   `ranking_scorer.rs`). The out-of-network multiplier and author-diversity
   decay-with-floor carry over in identical functional form (`oon_scorer.rs`,
   `author_diversity_scorer.rs`). This is why Bangermeter's architecture matches current
   production even though its weights are historical.
3. **Weights are still redacted everywhere.** The `params` module that `weighted_scorer.rs`
   imports is absent from both 2026 trees. The **March 2023 table remains the only sourced
   weight set ever released**. Researchers quoted by Engadget (Feb 4, 2026) confirm
   unverifiability.
4. **Every viral 2026 "weight leak" fails source-tracing.** "Reply = 27× a like" is
   13.5/0.5 recycled; "150×" is 75.0/0.5 recycled (and usually *misread* — see below);
   "bookmark 20×", "retweet 20×", "links −30–50%", "3+ hashtags −40%", "follow +50",
   "block −120" exist in no repo release.
5. **The September 2025 re-release is the transition state.**
   [twitter/the-algorithm](https://github.com/twitter/the-algorithm) received exactly one
   post-2023 commit — `c54bec0d`, authored 2025-09-03 (+65,319/−3,195, squashed) —
   containing the new engagement heads, weights redacted to 0.0, and dormant Phoenix hooks.
   Nothing has changed there since.

## Phoenix timeline

| Date | Event |
|---|---|
| May 3, 2025 | Musk announces Grok-based ranker ("lightweight version of @Grok") |
| Sep 3, 2025 | twitter/the-algorithm re-release commit (the code Bangermeter is built from) |
| Oct 17, 2025 | Musk: "deletion of all heuristics within 4 to 6 weeks" |
| ~Nov 27, 2025 | Grok ranking default for For You AND Following ("purely AI since November") |
| Jan 20, 2026 | xai-org/x-algorithm open-sourced (production Phoenix stack) |
| Mar 18, 2026 | Premium reply downvotes added as negative training signal |
| May 15, 2026 | Grox VLM classifiers (slop/quality/banger), ad blending, mini-Phoenix checkpoint |
| Jul 13, 2026 | "Mutuals visibility boost" ships |
| Jul 28–29, 2026 | Musk/Bier publicly declare the link penalty dead ("haven't for over a year") |

## Verdict table (per scoring element)

| Element | Verdict | Note |
|---|---|---|
| fav 0.5 | **supported** | Head persists in 2026 roster; 0.5 is the anchor value |
| retweet 1.0 | **supported** | "20×" folklore contradicts published 2× ratio |
| reply 13.5 | **supported** | "27×" claims are recycled arithmetic |
| reply_engaged_by_author 75.0 | **changed by Phoenix** | Dropped as named head in 2026. Kept for pre-Phoenix fidelity. NOT a self-reply bonus — it rewards the author engaging with repliers |
| good_click_v1 11.0 / v2 10.0 | **changed by Phoenix** | Composites replaced by plain click/dwell heads in 2026; kept with max() combine pre-Phoenix |
| good_profile_click 12.0 | **supported** | profile_click persists in 2026 |
| video_playback_50 0.005 | **supported** | Socialinsider ~850k-post data consistent with tiny weight; "10× video boost" refuted |
| tweet_detail_dwell / profile_dwell | **unknown** | Never published; excluded (0) |
| bookmark | **changed by Phoenix** | Never published AND dropped from 2026 roster; excluded (0) |
| share / share_menu_click | **unknown** | Persist in 2026 (share_via_dm etc.) but weights redacted; excluded (0) |
| negative_feedback_v2 −74.0 | **supported** | Granularized in 2026 (not_interested/block/mute) but −74 is the last sourced value |
| report −369.0 | **supported** | Head persists in 2026 |
| strong/weak negative feedback | **unknown** | Never published; excluded (0) |
| Out-of-network ×0.75 | **supported** | Mechanism survives as oon_scorer.rs (value redacted there) |
| Reply candidate ×0.75 | **supported** | For pre-Phoenix. (Reply *ranking* was overhauled Mar–Apr 2026) |
| Author diversity decay 0.5 / floor 0.25 | **supported** | Strongest survivor — identical form in author_diversity_scorer.rs |
| Feedback fatigue ×0.2 floor, 140d | **supported** | FeedbackFatigueScorer.scala:38-39; viewer-specific, unobservable from a browser |
| Control AI ×20 / ×0.05 | **supported** | Viewer-specific; omitted |
| Grok slop decay (off, 1.0 in 2025 code) | **changed by Phoenix** | Dormant 2025 hook became production Grox classifiers May 2026 |
| MTL normalization | **supported** | Monotonic; safe to omit for relative ranking |
| Heartbeat optimizer | **supported (off)** | Reveals production weights were per-user-bucket and time-varying → any static set is approximate |
| Earlybird link handling | **changed by Phoenix** | No explicit penalty ever existed; suppression happens via head omission (no head rewards link clicks). Officially "dead" since ~mid-2025 |
| Earlybird multiple-hashtags penalty | **changed by Phoenix** | Exists in code, magnitude never published; "−40%" is folklore. Direction (3+) plausible |
| Earlybird offensive/text-quality | **changed by Phoenix** | Retired in production ("eliminated every single hand-engineered feature"); safety now via Grox |

## Deep-dive: the seven never-published heads (Aug 2026)

A second research pass focused exclusively on the heads that have never had a published
weight (bookmark, share, share_menu_click, tweet_detail_dwell, profile_dwell, strong/weak
negative feedback), including direct raw-file verification of the xai-org tree and a hunt
through the runnable mini-Phoenix release. Evidence grades: **A** = shipped code/official
number · **B** = official qualitative statement · **C** = rigorous third-party estimation ·
**D** = folklore.

**Bottom line: zero of the seven has a production numeric weight above grade D, and no
rigorous third-party estimate exists anywhere.** The algorithmic-audit literature (FAccT
2025 sock-puppet audit, ICWSM 2026, Milli et al.) measures exposure outcomes, never
per-head weights. So none of these ships a number — but the pass surfaced real findings:

| Head | Best evidence | What's actually sourced |
|---|---|---|
| bookmark | B | Musk (Jan 2023): a bookmark is a "de facto silent like" — ≈ like-equivalence, directly contradicting "10×/20×" folklore. Confirmed absent from the 2026 roster. |
| share | A (sign) | Officially positive (xai-org README). Musk (Sep 2024): DM-forwarding is "one of the strongest signals". 2026 splits it into three separately-weighted heads (share / via-DM / copy-link). |
| share_menu_click | none | No number, no statement, no 2026 successor head. Stays excluded. |
| tweet_detail_dwell | A (structure) | ≥15s threshold is a shipped constant; dwell buckets bounded non-negative; the "+10 dwell" figure is folklore. |
| profile_dwell | A (structure) | ≥20s threshold shipped; no named 2026 head — folded into the dwell/profile-click family. |
| strong_negative_feedback | A (sign) | Shipped bounds **[−1000, 0]** prove it can only be negative; report's floor is **[−20000, 0]** — 20× deeper, the only sourced relative-magnitude hint. |
| weak_negative_feedback | A (sign) | Same bounds posture; action mapping never published. |

**Folklore traced to its source:** the circulating "block −120 / mute −100" numbers
originate from an unaffiliated fan site (x-algorithm-six.vercel.app) presenting invented
values alongside recycled 2023 ratios; competing pages circulate mutually-contradictory
inventions ("block −75", "−1000×"). None cites a code path.

**Genuinely new grade-A facts this pass surfaced:**

- **The exact 2026 head roster (19 heads, verified verbatim in `weighted_scorer.rs`):**
  favorite, reply, retweet, photo_expand, click, profile_click, vqv, share, share_via_dm,
  share_via_copy_link, dwell, quote, quoted_click, cont_dwell_time, follow_author,
  not_interested, block_author, mute_author, report. Bookmark and reply_engaged_by_author
  confirmed dropped; `quoted_click` was previously uncatalogued.
- **Scroll-past is an explicit penalty:** `not_dwelled` is a negative-weighted head in
  `ranking_scorer.rs` (direction sourced, value redacted).
- **Sourced interaction thresholds** (constants, not weights — displayable as facts):
  a click "counts" at ≥2s post-click dwell, good profile click at ≥10s, detail-page dwell
  at ≥15s, profile dwell at ≥20s, conversation dwell at ≥60s, good-click-v2 at ≥2min.
- **The Grox banger gate:** `quality_score ≥ 0.4` (0–1 scale) marks a post
  banger-positive; **only original posts are eligible — replies are excluded** from the
  banger screen (`banger_initial_screen.py`, `task_filters.py`). The slop_score rubric
  remains unpublished (prompt templates scrubbed from the repo).
- **Net-negative posts rank below all net-positive posts:** `offset_score()` compresses
  any net-negative combined score into a band strictly below every net-positive post.
- **Blocks/mutes are filters, not weights, for users who already acted:** existing
  blocks/mutes remove candidates before scoring; the negative *weights* apply only to
  *predicted* P(block)/P(mute) of users who haven't acted yet.
- **The mini-Phoenix demo leaks a combiner — but it's a demo:** `run_pipeline.py`
  scores `P(fav)·1.0 + P(reply)·0.5 + P(retweet)·0.3 + P(dwell)·0.2`. Real xAI code,
  but it weights only 4 of 19 heads and inverts the 2023 production ordering
  (reply 27× fav), so it establishes only that dwell is positive-and-smallest in the
  demo — it is not a production weight set.
- **The redaction is airtight and deliberate:** the published home-mixer crate cannot
  compile (`lib.rs` declares no `mod params`), and GitHub issues are disabled on
  xai-org/x-algorithm — there is no channel through which the weights can leak short of
  an official release.

Bangermeter ships all of the above as labeled facts and directional signals; the score
itself remains built exclusively from the 2023 published weight set.

## The weight set Bangermeter uses (extension/weights.js)

fav 0.5 · retweet 1.0 · reply 13.5 · good_profile_click 12.0 · good_click_v1 11.0 (max with
v2 10.0) · video_playback_50 0.005 · reply_engaged_by_author 75.0 · negative_feedback_v2
−74.0 · report −369.0 · all never-published heads 0.0 (shown as unweighted signals) ·
OON ×0.75 · reply ×0.75 · author-diversity 0.5/0.25 (feed mode only).

## Design consequences

- The weight layer (published values) is kept strictly separate from the estimator layer
  (probability proxies derived from what a browser can observe) — heuristics are never
  baked into weights.
- No folklore numbers anywhere. Link and hashtag signals appear only as mild,
  explicitly-labeled directional flags.
- Observed engagement rates are smoothed toward the median with empirical-Bayes shrinkage
  (K = 2,000 pseudo-views), because raw `count ÷ views` on tiny samples produces absurd
  scores — and the real ranker predicts probabilities with a model rather than dividing
  small counts.
- Output is framed as a **relative score**, not predicted reach: the heartbeat-optimizer
  code shows production weights were only ever one point in a moving distribution.
- Premium/verified status is a large empirical reach factor (~10× median impressions in
  Buffer's 18.8M-post study) but has no term in the published formula — surfaced as
  context, never as a score component.

## Field testing

Three days of live use on an active account (Aug 2026): the scores cleanly separate posts
that go on to perform well from posts that don't, and the content-score signals (question
phrasing, bare links, hashtag piles, engagement bait) point the expected direction on real
timelines. Qualitative and small-sample — treat it as a sanity check that the historical
weights still rank *relative* performance sensibly, not as a formal validation study.
The small-sample shrinkage matters in practice: without it, any reply on a low-view post
pins the engagement score to 100.

## Key sources

- [xai-org/x-algorithm](https://github.com/xai-org/x-algorithm) (Jan 20 + May 15, 2026) — production structure
- [twitter/the-algorithm](https://github.com/twitter/the-algorithm) (Mar 2023 + Sep 2025) — formulas and the only published weights
- [ernests.github.io/the-algorithm](https://ernests.github.io/the-algorithm/) (Nov 2025) — file-line-cited explainer
- ppc.land (Jan 20/21, 2026) — Phoenix feed mechanics; link suppression via head omission
- Engadget (Feb 4, 2026) — researchers on weight unverifiability
- Buffer 18.8M-post Premium study (Oct 2025); Socialinsider ~850k-post benchmarks (2026)
- Social Media Today (Mar 18/19, 2026) — reply downvotes, reply-ranking overhaul
- Musk/Bier posts: Oct 17 2025, Jan 10 2026, Apr 8 2026, Jul 13 2026, Jul 28–29 2026
