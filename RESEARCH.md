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
