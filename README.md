# Bangermeter ⚡

**Score any post with X's own published ranking weights.**

A Chrome extension that scores posts on x.com using the real For You weights and the real
scorer arithmetic from [xai-org/x-algorithm](https://github.com/xai-org/x-algorithm) —
`home-mixer/params/param.rs` for the values, `home-mixer/scorers/ranking_scorer.rs` for the
math. Full source-traced findings: [RESEARCH.md](RESEARCH.md).

> **August 13, 2026.** X published the production weights for the For You timeline. Until
> that morning the only weights anyone had were a March/April 2023 snapshot, and about a
> third of the ranking heads had never been given a number at all. Bangermeter v0.9.0
> replaced the entire weight layer with the published set. Everything below describes the
> new one.

**Current release: v0.9.1** — v0.9.0 brought in the published weights; v0.9.1 pins the
compose draft meter to the viewport so X's scrolling compose dialog can no longer clip it.

## Install

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `extension/` folder
4. Browse x.com — every timeline post gets a ⚡ badge; click it for the full breakdown.
   The compose box gets a live draft meter as you type.

## What the scores mean

Every post gets up to two 0–100 scores (50 = median baseline post):

- **C — Content score (prospective).** What the ranker would be predisposed to predict from
  the *content* alone: baseline action probabilities per head, adjusted by detected content
  signals (question, thread, video, bare link, hashtag piles, engagement bait), run through
  the published weights and the real scorer arithmetic.
- **E — Engagement score (retrospective).** Applies the published weights to the post's
  *actual* rates (likes/reposts/replies ÷ views). Requires a visible view count.

Click the badge for the breakdown: per-head contributions (`weight × P`), detected signals
with direction and provenance, rescoring factors, freshness, and a collapsible table of
what the published weights actually say.

## Methodology and honesty

- **Formula:** `Σ(weight × P(action))` over the Phoenix head set, then `offset_score` —
  positive posts get `+0.001`, and any post whose weighted sum goes **net-negative** is
  rescaled into `[0, 0.000894)`, which drops it below every positive-scoring post no matter
  what else it earned. Then the post-hoc factors: author diversity
  `(1 − floor) × decay^k + floor`, and the ×0.75 out-of-network factor. This is a direct
  port of `ranking_scorer.rs`, not an approximation of it.
- **Weights:** the published production set. Likes 0.5 · replies 5.0 (**20.0** on an
  original post from a mutual follow) · reposts 1.0 · quotes 5.0 · shares 2.0 · DM shares
  5.0 · **copy-link shares 20.0** · follow-author 4.0 · post clicks 0.4 · link opens 0.2 ·
  photo expand / video open / video-quality-view / quoted click 0.05 · dwell time 0.004 per
  second · not-dwelled −0.02 · not-interested −43.2 · block −31.2 · mute −58.8 · report
  −234.0. Profile clicks, binary dwell and quoted-vqv ship at **0.0** — X zeroed them, and
  the tool shows that rather than hiding it.
- **Weights multiply predicted probabilities, not counts.** A report does not cost 234
  points; −234 is the coefficient on *how likely a viewer is to report the post*. X's own
  comment above the table says the values already fold in how rare each action typically
  is. Any tool or thread that reads these as per-action point totals is wrong.
- **The honest boundary.** The weights are X's. The probabilities are ours. X predicts them
  with Phoenix, a transformer we don't have; Bangermeter derives three of them from real
  counts (likes, replies, reposts) and estimates the rest from content signals. Every
  number in the UI is tagged with which layer it came from, and the popup labels every head
  as `from counts`, `estimated`, `zeroed by X` or `viewer-specific`.
- **Gates we can see and gates we can't.** Video-quality-view needs duration strictly over
  10s, so GIFs and short clips are excluded — the extension reads the duration overlay
  where X renders one. A second vqv gate (the *viewer* having under 10,000 followers) is
  viewer state a page script cannot read; it is disclosed, not modelled.
- **No folklore numbers.** "Bookmark 20×", "links −30–50%", "3+ hashtags −40%", "block
  −120 / mute −100" all failed source-tracing before the release — and none of them matched
  the real values when those arrived. Bookmarks turn out to have **no head at all**.
- **Two archival factors, opt-in or sourced.** The 2023-era **×4 / ×2** verified-author
  multiplier (archived commit `ec83d01dca`; absent from the 2026 release) is behind a
  default-off toggle. Posts with a displayed **Community Note** get ×0.5 on the prospective
  score — that 0.5 is our round figure inside a ×0.39–0.75 range from three causal studies,
  and is labelled as our pick, not X's.
- **Relative score, not predicted reach.** X says it syncs these defaults from production
  by cron, which makes them current rather than historical — but the score is still a
  relative read against a typical post, not an impression forecast.

## Known limitations

- Count parsing and "Replying to" detection assume an English X locale.
- The E score needs a visible view count (hidden on some surfaces).
- Viewer-specific factors can't be observed: in-network status, mutual-follow status and
  the vqv follower gate. Out-of-network and mutual-follow are popup toggles instead.
- Quote counts aren't exposed in the timeline DOM, so the quote head (5.0) is estimated
  rather than measured.
- X changes its DOM without notice; selectors have documented fallbacks.

## Project files

| File | Purpose |
|---|---|
| `extension/` | The Chrome extension (MV3, vanilla JS, no build step) |
| `extension/weights.js` | Single source of truth: weight layer + estimator layer, all provenance-tagged |
| `extension/scoring.js` | Pure scoring engine (direct port of `ranking_scorer.rs`) |
| `extension/content.js` | Badges, breakdown panel, compose meter |
| `extension/test.html` | Engine self-test — open in any browser (112 assertions) |
| `extension/fixture.html` | X-DOM fixture harness for the content script |
| `extension/fixture-compose.html` | Compose-meter visibility harness — asserts the draft meter survives X's scrolling, overflow-hidden compose dialog (9 assertions) |
| `extension/bangermeter.user.js` | Single-file Tampermonkey build (generated — see `store-assets/make-userscript.ps1`) |

## Verification status

- Engine math: **112/112 self-tests pass** (`test.html`). Every one of the 26 published
  weights and its feature-switch parameter name is asserted against `param.rs`
  individually, so a silent transcription error fails the suite rather than shipping.
- Adversarially reviewed at v0.9.0 by three independent passes — weight transcription,
  Rust-to-JS arithmetic fidelity, and a stale-claim sweep. The arithmetic pass swept
  ~654k generated inputs for NaN, out-of-range and non-monotonic scores and found none,
  and used mutation testing to prove which assertions were load-bearing. Findings from
  all three are fixed in this release; the notable ones are recorded in
  [RESEARCH.md](RESEARCH.md).
- Content script (badges, panel, meter, virtualized lists, quote-tweet scoping): exercised
  against the DOM fixture (`fixture.html`). The fixture is an eyeball harness — it renders
  and must not throw; it carries no assertions.
- Live x.com: **v0.9.0 verified in a logged-in session, Aug 13 2026.** Badge, panel and the
  rewritten per-head copy render correctly against the live DOM, and a spot-checked post
  (2 replies · 2 likes · 0 reposts · 126 views) scored E=66, matching the engine by hand to
  the rounded point. Selectors target `article[data-testid="tweet"]`, the action-bar
  `role="group"` aria-label, and `tweetTextarea_*`, each with fallbacks.
