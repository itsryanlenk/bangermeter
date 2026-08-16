# The Research — from "the weights are redacted" to having them

> ## ⚠️ Superseded in part, on August 13, 2026
>
> X published the production For You weights in
> [`home-mixer/params/param.rs`](https://github.com/xai-org/x-algorithm/blob/main/home-mixer/params/param.rs),
> with the file header `mirrored from config feature-switch defaults; last sync
> 2026-08-12T04:09:22Z` and a README note that "we run cron scripts that set the defaults
> in this repository's code to be the primary production values."
>
> **This falsifies headline finding 3 below, and resolves most of the "unknown" rows in
> the verdict table.** Bangermeter v0.9.0 replaced its entire weight layer with the
> published set the same day. The rest of this document is preserved as the research
> record that made that swap safe — see "What the release settled" immediately below for
> the reconciliation.
>
> It also **vindicated the folklore-debunking work**: every circulating "leaked weight"
> this project rejected over three research sweeps turned out to match none of the real
> values. "Block −120 / mute −100" is really −31.2 / −58.8. "Reply = 27× a like" is really
> 10×. "Bookmark 20×" describes a head that does not exist.

## Update — August 14, 2026: X documents the misreading

One day after publishing the weights, X added an explanatory comment block to both
[`param.rs`](https://github.com/xai-org/x-algorithm/blob/main/home-mixer/params/param.rs) and
[`ranking_scorer.rs`](https://github.com/xai-org/x-algorithm/blob/main/home-mixer/scorers/ranking_scorer.rs),
stating that its purpose is so "LLMs or people reading it are more likely to understand it
correctly." Verbatim:

> "Each weight multiplies the *predicted* probability of that action (P(favorite),
> P(repost), …) or a continuous value e.g. watch time -- the weights do not multiply raw
> engagement counts. One common misinterpretation is that you can read these weight ratios
> as count equivalences, e.g. the incorrect statement that **'one report cancels 468
> likes'** -- this is incorrect because the weights apply to the predicted probabilities
> rather than raw counts."

**468 is 234.0 ÷ 0.5** — the exact division this project refused to publish on Aug 13, when
the adversarial review killed "a copy-link is worth 40 likes" for the same reason. The
ratio-as-value reading is now wrong by X's own documentation rather than only by our
argument. **All 26 weights were re-verified against this update and none changed.**

Three further facts came with it, all now carried in `weights.js` under `sourcedFacts`:

- **Why the negatives are so large.** "The baseline probability of a Report is more than
  1000x lower than a Like, so it's weighted more to allow the prediction to affect the
  final ranking at all." The big coefficients are big *because* the actions are rare —
  which is exactly what makes dividing them by the like weight meaningless. (Our estimator
  independently assumed a 1000× ratio: `favorite` 0.005 against `report` 0.000005.)
- **Engagement only counts from the Home Timeline.** "Directly navigating to a post (i.e.,
  coordinating via groupchat) has no ranking impact." Sending your own link round a group
  chat does nothing for reach. Note the interaction with the heaviest head: `share_via_copy_link`
  pays for a *viewer copying the link in-feed*, not for the visits that follow.
- **Brigading is structurally weak.** Predictions are per-viewer and personalised, so mass
  reporting mainly shifts what gets recommended to users similar to the reporters, rather
  than moving the post for everyone.

And a new hard filter: **`Brazil2026ElectionFilter`** removes posts from **665 accounts**
reported to Brazil's Electoral Court for the 2026 election, unless the viewer follows the
account. It is compiled in rather than feature-switched — IDs obfuscated, usernames left in
source for transparency — and runs *before* scoring, so no weight can offset it.

## What the release settled

| Question this doc left open | Answer, Aug 13 2026 |
|---|---|
| Are shares weighted? | Yes: share 2.0, DM share 5.0, **copy-link share 20.0** — the heaviest positive head in the system |
| Is dwell weighted? | Continuous dwell time yes, 0.004/second. **Binary dwell ships at 0.0** |
| Is scroll-past really negative? | Yes: not_dwelled −0.02 |
| What are the granular negatives? | not_interested −43.2 · block −31.2 · mute −58.8 · report −234.0. **Muting hurts nearly 2× blocking** |
| Are bookmarks weighted? | There is **no bookmark head at all**. Bookmarks survive only as a user-history feature (`n_bm_share`) in the dwell-regret gate |
| Do links get credit? | Yes, `open_link` 0.2. The "suppression via head omission" reading is retired |
| Is profile-click still 12.0? | It is **0.0**. X zeroed the head |
| Did the reply weight hold at 13.5? | No: **5.0**, plus a +15.0 boost to **20.0** on original posts from mutual follows |
| Is the OON factor really 0.75? | Yes — and `EnableOonRescoreForInNetworkRepliesRetweets` (default true) applies it to in-network replies and reposts too, exactly once |
| Author diversity decay/floor? | Confirmed 0.5 / 0.25, formula identical |
| Was there ever a 0.4 Grok quality gate? | **No.** This project asserted one through v0.8.0 and it was wrong — no such threshold exists in the published grox pipeline, and the file it was cited to does not exist. What is real: `grox/flows/upa/task_filter.py` rejects replies and protected accounts outright |

## Headline findings (as of the original sweeps)

1. **A successor repo exists.** xAI open-sourced the Phoenix-era production stack on
   **Jan 20, 2026** at [xai-org/x-algorithm](https://github.com/xai-org/x-algorithm)
   (Rust/Python; Home Mixer, Thunder, Phoenix transformer ported from Grok-1), updated
   **May 15, 2026** with "Grox" content classifiers and a runnable non-production
   "mini Phoenix" checkpoint, and again **Aug 13, 2026** with the weights, the visibility
   filtering stack, and Phoenix training code.
2. **The scoring skeleton survives verbatim.** `Score = Σ(weight_i × P(action_i)) + offset`,
   times multiplicative rescorers, is still production (`ranking_scorer.rs`). The
   out-of-network multiplier and author-diversity decay-with-floor carry over in identical
   functional form. Confirmed exactly right when the values arrived.
3. ~~**Weights are still redacted everywhere.**~~ **FALSIFIED Aug 13, 2026** — see the
   supersession note above. True for the Jan and May 2026 releases; the August release
   published them. The Engadget (Feb 4, 2026) unverifiability reporting was accurate for
   its date.
4. **Every viral 2026 "weight leak" fails source-tracing.** Held up, and then some — none
   of the circulating figures matched the real values when those were published.
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

> **Historical.** This table records how each 2023-era element was judged *before* the
> Aug 13 2026 release. The "What the release settled" table above carries the current
> values. Rows marked **supported** for the 2023 numbers were supported *as the last
> published values* — several of those numbers have since changed (reply 13.5 → 5.0,
> report −369 → −234, profile-click 12.0 → 0.0).

The **Now** column carries the published Aug 13 2026 value, so no row needs the banner
above to be read correctly.

| Element (2023) | Verdict at the time | Now (Aug 13 2026) | Note |
|---|---|---|---|
| fav 0.5 | **supported** | **0.5 — unchanged** | Head persists; still the anchor value |
| retweet 1.0 | **supported** | **1.0 — unchanged** | "20×" folklore contradicts the published 2× ratio |
| reply 13.5 | **supported** | **5.0** (20.0 from a mutual follow) | "27×" claims were recycled arithmetic; the real ratio is 10× |
| reply_engaged_by_author 75.0 | **changed by Phoenix** | **head removed** | NOT a self-reply bonus — it rewarded the author engaging with repliers |
| good_click_v1 11.0 / v2 10.0 | **changed by Phoenix** | **heads removed** → `click` 0.4 | Composites replaced by a plain click head |
| good_profile_click 12.0 | **supported** | **`profile_click` 0.0** | Zeroed. The clearest reversal in the release |
| video_playback_50 0.005 | **supported** | **head removed** → `video_open` 0.05 + `vqv` 0.05 | Not a rename: 2026 splits video into an open and a quality-view head, and vqv is gated on duration >10s and on the viewer having <10k followers. "10× video boost" still refuted |
| tweet_detail_dwell / profile_dwell | **unknown** | **`dwell` 0.0**, `cont_dwell_time` 0.004/s | Threshold dwell heads gone; dwell is paid continuously instead |
| bookmark | **changed by Phoenix** | **no head exists** | Confirmed: not a scored action in 2026 |
| share / share_menu_click | **unknown** | **`share` 2.0 · `share_via_dm` 5.0 · `share_via_copy_link` 20.0** | The largest single gain in information from the release |
| negative_feedback_v2 −74.0 | **supported** | **split** → `not_interested` −43.2 · `block_author` −31.2 · `mute_author` −58.8 | Mute is the harshest of the three |
| report −369.0 | **supported** | **−234.0** | Still the heaviest weight in the system |
| strong/weak negative feedback | **unknown** | **no such heads** | Replaced by the four named negatives above |
| Out-of-network ×0.75 | **supported** | **0.75 — confirmed** | Also applied to in-network replies and reposts, exactly once |
| Reply candidate ×0.75 | **supported** | **confirmed, but it is the SAME factor** | Not a separate reply multiplier — `oon_applies` returns true for replies, so 0.75 lands once, never squared |
| Author diversity decay 0.5 / floor 0.25 | **supported** | **0.5 / 0.25 — confirmed** | Strongest survivor; identical functional form |
| Feedback fatigue ×0.2 floor, 140d | **supported** | not in the release | Viewer-specific and unobservable from a browser either way |
| Control AI ×20 / ×0.05 | **supported** | not in the release | Viewer-specific; omitted |
| Grok slop decay (off, 1.0 in 2025 code) | **changed by Phoenix** | Grox classifiers | Dormant 2025 hook became production classifiers May 2026 |
| MTL normalization | **supported** | n/a | Monotonic; safe to omit for relative ranking |
| Heartbeat optimizer | **supported (off)** | superseded | Its lesson — that weights were per-user-bucket and time-varying — is why the release's cron-synced defaults matter |
| Earlybird link handling | **resolved Aug 2026** | **`open_link` 0.2** | No explicit penalty ever existed, and the "suppression via head omission" reading was ALSO wrong. Links are rewarded, just weakly |
| Earlybird multiple-hashtags penalty | **changed by Phoenix** | no head | Exists in Earlybird code, magnitude never published; "−40%" is folklore. Direction (3+) plausible |
| Earlybird offensive/text-quality | **changed by Phoenix** | no head | Retired in production ("eliminated every single hand-engineered feature"); safety now via Grox |

## Deep-dive: the seven never-published heads (Aug 2026, pre-release)

> **Five of these seven now have published values** (share 2.0, share_via_dm 5.0,
> share_via_copy_link 20.0, dwell 0.0, not_dwelled −0.02). Bookmark turned out to have no
> head at all, and strong/weak negative feedback were replaced by the four named negatives.
> The section's conclusion — that no circulating number for any of them was credible — was
> correct, and is why none of them was ever guessed into the score.

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

- **The 2026 head roster** — catalogued here as 19 heads; the Aug 2026 release shows **26**,
  adding `video_open`, `open_link`, `quoted_vqv`, `post_unexplored`, `cont_click_dwell_time`,
  `cont_active_secs_5m_residual_norm` and `not_dwelled` to the list below:
  favorite, reply, retweet, photo_expand, click, profile_click, vqv, share, share_via_dm,
  share_via_copy_link, dwell, quote, quoted_click, cont_dwell_time, follow_author,
  not_interested, block_author, mute_author, report. Bookmark and reply_engaged_by_author
  confirmed dropped — both held up.
- **Scroll-past is an explicit penalty:** `not_dwelled`, confirmed at **−0.02**.
- **Interaction thresholds** (2023-era constants: click ≥2s, profile click ≥10s, detail
  dwell ≥15s, profile dwell ≥20s, conversation ≥60s, good-click-v2 ≥2min). **Superseded**
  as a scoring model: 2026 pays dwell continuously at 0.004/second rather than at
  thresholds, and the composite good-click heads no longer exist. The one duration gate
  that IS live is `MinVideoDurationMs` = 10,000 on video-quality-view, plus an
  undocumented second gate that zeroes vqv when the *viewer* has ≥10,000 followers
  (`candidates_util.rs`).
- **The Grox banger filter:** ~~`quality_score ≥ 0.4`~~ **RETRACTED** — no numeric quality
  threshold exists in the published pipeline, and the files this was cited to
  (`banger_initial_screen.py`, `task_filters.py`) are not in the repo. What is real, in
  `grox/flows/upa/task_filter.py`: `TaskInitialBangerFilter` rejects any post with
  `ancestors` (every reply) and any post from a protected account, before evaluation
  begins. Quality is carried as a boolean `isHighQuality`, not a score with a cutoff.
  **Only original posts from public accounts are eligible** — that half of the original
  claim holds. The slop_score rubric remains unpublished.
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
- **The redaction was airtight — until X chose to end it.** The published home-mixer crate
  could not compile (`lib.rs` declared no `mod params`), and GitHub issues are disabled on
  xai-org/x-algorithm, so there was no channel through which the weights could leak short
  of an official release. That conclusion was correct, and the resolution came exactly the
  way it predicted: an official release, on Aug 13 2026, adding the missing `params` module.

## The weight set Bangermeter uses (extension/weights.js)

**Current** — the published production set, transcribed verbatim from
`home-mixer/params/param.rs`:

favorite 0.5 · reply 5.0 (**20.0** with the +15.0 bidirectional-follow boost on original
posts) · retweet 1.0 · quote 5.0 · share 2.0 · share_via_dm 5.0 · **share_via_copy_link
20.0** · follow_author 4.0 · click 0.4 · open_link 0.2 · photo_expand 0.05 · video_open
0.05 · vqv 0.05 · quoted_click 0.05 · post_unexplored 0.02 · cont_dwell_time 0.004/s ·
**profile_click 0.0 · dwell 0.0 · quoted_vqv 0.0 · cont_click_dwell_time 0.0 ·
cont_active_secs_5m_residual_norm 0.0** · not_dwelled −0.02 · not_interested −43.2 ·
block_author −31.2 · mute_author −58.8 · report −234.0.

Sums as `ScoringWeights::from_params` builds them: positive 43.32, negative 367.22, total
410.54. Offset 0.001. Rescorers: OON ×0.75 (applied once, and also to in-network replies
and reposts), topic-request OON ×0.5, author diversity 0.5/0.25.

Superseded (v0.8.0 and earlier): fav 0.5 · retweet 1.0 · reply 13.5 · good_profile_click
12.0 · good_click_v1 11.0 (max with v2 10.0) · video_playback_50 0.005 ·
reply_engaged_by_author 75.0 · negative_feedback_v2 −74.0 · report −369.0.

## Adversarial review, v0.9.0

The weight swap was reviewed by three independent passes before shipping. Recording the
findings because two of them were the project's own errors, not X's:

- **Weight transcription:** 26/26 heads and all 26 feature-switch parameter strings verified
  exact against `param.rs`; no missing or invented heads. Clean.
- **Arithmetic fidelity:** the JS port matches `ranking_scorer.rs` on all six checked
  functions. ~654k generated inputs produced no NaN, no out-of-range score and no
  non-monotonicity. Mutation testing found five assertions that were not load-bearing;
  all five now have real coverage.
- **Errors found and fixed:**
  - A `quality_score ≥ 0.4` Grok gate asserted since v0.6.0 — **invented**. No such
    threshold exists, and the file it was cited to (`grox/classifiers/content/
    banger_initial_screen.py`) does not exist in the repo. Removed. What is real:
    `grox/flows/upa/task_filter.py` rejects replies and protected accounts.
  - `parseCount` stripped commas before its own decimal-comma branch could run, so
    "12,3 K" parsed as 123,000 — a latent 10×–1000× misparse behind the English-only
    locale guard. Fixed with coverage.
  - The vqv duration gate was documented but not implemented; GIFs and short clips were
    being credited 0.05 they never earn. Now gated, with GIF detection and duration
    parsing from the DOM overlay.
  - The new-user OON factor (0.00001) is **inert at published defaults** —
    `NewUserAgeThresholdSecs` ships at 0, so `age < 0s` is false for everyone. Documented
    as inert rather than described as live.

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

## Leak hunt: involuntary-disclosure channels (Aug 2026)

A third research pass swept the channels where internals could have leaked or been
compelled into the public record: US litigation (CourtListener/RECAP), the EU's entire
DSA track, the FTC consent decree, scrubbed git history and day-one forks, the Jan 2023
pre-open-source leak, ex-employee books/talks/podcasts, patents, and internal-document
journalism.

**Core verdict: no true weight leak exists anywhere.** Zero RECAP hits for internal
terminology ("heavy ranker", "TweepCred", "unregretted user-seconds"); the EU's €120M DSA
fine (Dec 2025) covers checkmarks/ad-repository/researcher-access only; the Jan 2023
GitHub leak contained auth/infra code only; no ex-employee has ever disclosed weights; no
verified config leak exists on any forum 2024–2026. Internals *have* been compelled twice —
into the European Commission's non-public file (Jan 2025 RFI + retention order) and the
Paris prosecutor's seizure (Feb 2026 raid, criminal probe) — so the watchlist for future
involuntary disclosure is an EC non-compliance decision on the recommender proceeding and
any French trial record.

**But the hunt recovered real, previously-uncatalogued grade-A material:**

- **There are TWO sourced weight snapshots, not one.** The original March 31, 2023 README
  of the-algorithm-ml had **reply = 27** (not 13.5) and scored the good-click pair as
  max(both probabilities) × 11. Commit `b85210863f` (Apr 5, 2023) rewrote it to the
  now-famous table — and added X's own disclaimer that weights live in a Feature Switch
  config and are **"periodically adjusted."** Bangermeter's table is the April 5 snapshot,
  now labeled as such. X retuned reply by 2× within five days of open-sourcing — the best
  evidence that any static table is a snapshot of a moving target.
- **Blue-verified author multipliers with hard values** survive in the archived initial
  commit (`ec83d01dca`): **×4.0 in-network / ×2.0 out-of-network** (plus creator
  multipliers 1.1/1.3) — the only real numeric multipliers ever present in serving code.
  Removed in the Sept 2025 re-release, which is why they were invisible until this pass.
  Bangermeter now applies them as an explicitly historical factor when the author is
  verified.
- **Community Notes is fully open and its effect is quantified.** Live scoring constants
  are public (crhThreshold 0.40, CRNH intercept < −0.05 − 0.8·|factor|, minRatingsNeeded 5,
  λᵢ 0.15 / λf 0.03), and three independent causal studies quantify the engagement effect
  of a displayed note: X's own A/B (25–34% fewer like/repost decisions), Chuai et al.
  Nature Communications (−61.2% subsequent reposts), Slaughter et al. PNAS (−46.1% reposts
  / −44.1% likes post-attach). Bangermeter now detects an attached note and applies a
  ×0.5 suppression (sourced range ≈0.4–0.55) to the prospective content score.
- **A Twitter-fitted engagement power law in a granted patent** (US11606323B2): expected
  interactions = **0.049 × followers^0.3677**, fitted on observed Twitter data — the only
  public engagement-vs-follower-count curve. Usable for account-size normalization
  (documented; not yet implemented since follower counts aren't visible in timeline DOM).
- **A complete deprecated Earlybird linear weight table** recoverable from git history
  (deleted in commit `138bb51997`): fav 30.0, retweet 20.0, reply 1.0, reputation 0.2,
  follow boosts 4.0/3.0, media boosts 2.0. Retrieval-stage dead code at release — kept as
  reference only, never mixed with the heavy-ranker table (note its *inverted* fav/reply
  ordering vs the heavy ranker).
- **Patent corroboration of the weight architecture**: US11516155B1 (filed Dec 2019)
  discloses the positive/negative/reciprocal three-head weighted sum and states the
  reciprocal weight exceeds the negative weight — consistent with 75.0 vs |−74.0|, filed
  three years before the release.
- **Restricted-reach interstitials are detectable**: FreedomOfSpeechNotReach.scala
  publishes the label-to-action taxonomy (no magnitudes); Bangermeter flags
  visibility-limited posts qualitatively instead of scoring them.

**Debunked for the record:** Grok "reveals" of ranking weights are confabulations by
construction (the weights are redacted from every release Grok could read, and xAI's own
grok-prompts repo shows Grok has no ranking-config access); the 2023 force-push scrubbed
only test-account IDs and employee names, never weights; the famous `author_is_elon` code
was metrics instrumentation, not a boost — though the reported **×1,000 "power user
multiplier"** on Musk's account (Platformer, Feb 2023; corroborated in *Character Limit*)
is credible grade-B history and explains why some accounts defy any weight model: it was
an account-level serving intervention, never part of the scorer.

## Key sources

- [xai-org/x-algorithm](https://github.com/xai-org/x-algorithm) (Jan 20 + May 15, 2026) — production structure
- [twitter/the-algorithm](https://github.com/twitter/the-algorithm) (Mar 2023 + Sep 2025) — formulas and the only published weights
- [ernests.github.io/the-algorithm](https://ernests.github.io/the-algorithm/) (Nov 2025) — file-line-cited explainer
- ppc.land (Jan 20/21, 2026) — Phoenix feed mechanics; link suppression via head omission
- Engadget (Feb 4, 2026) — researchers on weight unverifiability
- Buffer 18.8M-post Premium study (Oct 2025); Socialinsider ~850k-post benchmarks (2026)
- Social Media Today (Mar 18/19, 2026) — reply downvotes, reply-ranking overhaul
- Musk/Bier posts: Oct 17 2025, Jan 10 2026, Apr 8 2026, Jul 13 2026, Jul 28–29 2026
