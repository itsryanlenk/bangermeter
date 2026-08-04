# Bangermeter ⚡

**Score any tweet with X's own open-sourced ranking fundamentals.**

A Chrome extension that scores tweets on x.com using the exact weighted-sum formula from
[twitter/the-algorithm](https://github.com/twitter/the-algorithm) (`NaviModelScorer`) with
the last officially published weight set — validated against the Phoenix-era
[xai-org/x-algorithm](https://github.com/xai-org/x-algorithm) release and everything else
learned since January 2026. Full source-traced findings: [RESEARCH.md](RESEARCH.md).

## Install

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `extension/` folder
4. Browse x.com — every timeline tweet gets a ⚡ badge; click it for the full breakdown.
   The compose box gets a live draft meter as you type.

## What the scores mean

Every tweet gets up to two 0–100 scores (50 = median baseline tweet):

- **C — Content score (prospective).** Estimates how the pre-Phoenix pipeline would value
  this tweet's *content*: baseline engagement probabilities per head, adjusted by detected
  content signals (question, thread, video, bare link, hashtag spam, engagement bait), run
  through the exact repo formula.
- **E — Engagement score (retrospective).** Applies the published weights to the tweet's
  *actual* engagement rates (likes/reposts/replies ÷ views): "how the algorithm's weighted
  sum values what this tweet earned." Requires a visible view count.

Click the badge for the breakdown: per-head contributions (`weight × P`), detected signals
with direction and provenance, rescoring factors (reply ×0.75, optional out-of-network
×0.75), unweighted signals (e.g. bookmarks), and age-decay context.

## Methodology and honesty

- **Formula:** exact `NaviModelScorer.computeWeightedModelScore` math — weighted sum over
  engagement heads, ε = 0.001, negative-sum squashing, good-click v1/v2 max-combine — plus
  the `HeuristicScorer` rescoring chain. This score *skeleton* is confirmed to survive in
  X's 2026 production code (`xai-org/x-algorithm`, `weighted_scorer.rs`).
- **Weights:** the March 2023 published set (fav 0.5, retweet 1.0, reply 13.5, profile-click
  12, conversation-click 11/10, video-50% 0.005, author-engages-replier 75, negative
  feedback −74, report −369) — confirmed by 2026 research as **the only sourced values
  ever released**. Heads that never had a published value (bookmark, share, dwell, …) are
  **excluded**, not guessed, and shown as unweighted signals.
- **No folklore numbers.** "Links −30–50%", "3+ hashtags −40%", "bookmark 20×", "retweet
  20×" all fail source-tracing. Link/hashtag signals appear only as *mild, labeled,
  directional* estimator adjustments.
- **Two separate layers.** The weight layer (published values) never mixes with the
  estimator layer (how we approximate P(engagement) from what a browser can see). Every
  number in the UI is tagged with its provenance.
- **Relative score, not predicted reach.** The repo's heartbeat-optimizer code reveals
  production weights were per-user-bucket and time-varying; any static set is one point in
  a moving distribution. Since ~Nov 2025 production ranking is Phoenix (Grok transformer),
  so this is a historical-fundamentals lens, not a reach predictor.

## Known limitations

- "Replying to" detection and count parsing assume an English X locale.
- The E score needs a visible view count (hidden on some surfaces).
- Viewer-specific factors (in-network status, feedback fatigue, Control AI) can't be
  observed; out-of-network ×0.75 is available as a popup toggle instead.
- X changes its DOM without notice; selectors have documented fallbacks but may need
  updating.

## Project files

| File | Purpose |
|---|---|
| `extension/` | The Chrome extension (MV3, vanilla JS, no build step) |
| `extension/weights.js` | Single source of truth: weight layer + estimator layer, all provenance-tagged |
| `extension/scoring.js` | Pure scoring engine (exact repo math) |
| `extension/content.js` | Badges, breakdown panel, compose meter |
| `extension/test.html` | Engine self-test — open in any browser (24 assertions) |
| `extension/fixture.html` | X-DOM fixture harness for the content script |
| `extension/bangermeter.user.js` | Single-file Tampermonkey/Greasemonkey build of the same tool |

The scoring formulas were extracted from the September 2025 re-release of
[twitter/the-algorithm](https://github.com/twitter/the-algorithm) (commit `c54bec0d` —
`NaviModelScorer.scala`, `PredictedScoreFeature.scala`, `HeuristicScorer.scala`,
`RescoringFactorProvider.scala`, and the earlybird `AgeDecay` sigmoid), cross-checked
against the current production structure in
[xai-org/x-algorithm](https://github.com/xai-org/x-algorithm) (`weighted_scorer.rs`,
`oon_scorer.rs`, `author_diversity_scorer.rs`).

## Verification status

- Engine math: **24/24 self-tests pass** (`test.html`), including small-sample shrinkage
  regressions.
- Content script (badges, panel, meter, virtualized-list handling, quote-tweet scoping):
  **verified against the DOM fixture** (`fixture.html`).
- Live x.com: verified in a logged-in session (Aug 2026). X changes its DOM without
  notice; selectors target `article[data-testid="tweet"]`, the action-bar `role="group"`
  aria-label, and `tweetTextarea_*` with per-button fallbacks.
