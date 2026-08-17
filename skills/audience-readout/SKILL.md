---
name: audience-readout
description: >-
  Use when someone asks what is working on an X/Twitter account — theirs or a
  creator they follow — and wants an answer grounded in that account's actual
  posts rather than general advice. Drives a logged-in browser to collect a real
  post sample, scores it, finds what separates the winners from the rest, and
  produces a plain-language read-out with a "so what" on every finding. Also use
  when asked to calibrate Bangermeter's baseline against a live feed.
---

# Audience read-out

Turn one account's real post history into a short list of things to keep doing
and things to stop.

## Install

This lives in the repo at `skills/audience-readout/` so it is browsable, but
Claude Code discovers skills from `.claude/skills/` (this project) or
`~/.claude/skills/` (everywhere). Copy it to whichever you want:

```bash
mkdir -p ~/.claude/skills && cp -r skills/audience-readout ~/.claude/skills/
```

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null
Copy-Item -Recurse -Force "skills\audience-readout" "$env:USERPROFILE\.claude\skills\"
```

`scripts/analyze.js` finds Bangermeter's engine by walking up from its own
location, so it keeps working from either place when run inside a clone. Run
from anywhere else and it degrades to rates only, which is fine — it says so in
its header line.

The value is **not** the scraping. It is refusing to let a pattern become advice
until it survives a confound check, and saying plainly which findings are strong
and which are six posts and a hunch.

---

## Rules that override everything else

**1. Never commit an account archive.** A collected archive identifies a real
person's posting history. Keep it out of the repo — `calibration/*.tsv` is
already gitignored for this reason. If a sample must be shared, coarsen it first
(round the denominator, round timestamps) and say so.

**2. Read-only. No interactions.** Scroll and parse. Never like, follow, repost,
reply, or DM from an automated session. The account belongs to a person.

**3. Back off when throttled, and prefer several small sessions to one long
one.** Rate limiting is the platform asking you to stop. `__arSweep` enforces
this rather than trusting you to notice: it stops on the first unclearing
spinner, on a per-session budget (250 posts / 12 minutes by default), and it
jitters every delay so the cadence is not machine-regular.

A sample gathered over four short sessions is worth exactly as much as one
gathered in a single long sitting, and looks far less like automation. The
collector persists to `localStorage` specifically so this is easy — see
**Collecting across sessions** below.

**4. Everything is a rate.** Raw counts mostly measure how much reach a post
happened to get — which is the thing you are trying to explain. Divide by views,
always.

---

## Procedure

### 1. Collect

Load `scripts/collect.js` into the page (paste into the console, or eval it
through browser automation). It defines:

- `__arCollect()` — scrapes every rendered post, dedupes by post ID, skips
  anything without a view count, returns `{ added, total }`
- `__arSweep(n)` — scrolls `n` times, collecting twice per position
- `__arSave()` / `__arLoad()` — persist to `localStorage` so a reload or crash
  does not lose the sample
- `__arExport()` — triggers a TSV download

**Collect twice per scroll position.** X renders after the scroll settles, so a
single collect call immediately after `scrollBy` misses most of what appears.
This is the single most common reason a sweep "stalls" at a low count.

**When the profile timeline stops serving** — usually a few hundred posts, no
spinner, not at the bottom — switch to date-bounded search:

```
x.com/search?q=from%3AHANDLE%20-filter%3Areplies%20since%3AYYYY-MM-DD%20until%3AYYYY-MM-DD&f=live
```

The cap is on **pagination depth per query**, not on history. Walk weekly or
fortnightly windows. Prefer several narrow windows spread across the period over
one wide window — a wide window returns only its most recent slice, which is a
biased sample of itself. Say "stratified across N windows", never "all posts".

### 1b. Collecting across sessions

The sample lives in `localStorage`, so a run can be spread over days without
losing anything. This is the recommended shape, not a fallback.

```js
// every session, first thing:
__arLoad();            // restores everything collected so far
__arStats();           // n, date range, median rate — see what you still need

// then one budgeted sweep, and stop:
await __arSweep();     // ends on budget, stall, or throttle — reports which

// when the sample is big enough:
__arExport("sample.tsv");
```

Between sessions, leave real time — hours, not minutes — and vary what you do.
Different day, different window, different entry point (profile one session,
a date-bounded search the next).

**Aim for coverage, not volume.** Four sessions of ~60 posts spread across
different weeks beats one session of 240 from a single window, because the
stratification is what makes the sample defensible. Note in the deliverable how
many sessions and windows it came from.

To widen the budget deliberately for one run:

```js
__AR_BUDGET = { posts: 400, minutes: 20 };
```

Raise it because the sample needs it, not because a sweep ended early.

### 2. Export and analyze

`__arExport()` downloads a TSV. Then:

```bash
node scripts/analyze.js path/to/sample.tsv
```

It prints the distribution, the top-vs-bottom quartile profile, length bands,
feature contrasts, and the best and worst posts by rate. If Bangermeter's engine
is present it also scores each post; if not, it falls back to rates alone.

### 3. Check the confound before believing anything

A contrast is not a finding until you have asked what else could produce it.
The two that matter most here:

- **Timing.** "Quote-tweets underperform" might just mean he quoted more during
  a slow month. `analyze.js` re-runs every contrast *within each month*. If the
  effect survives inside each stratum, it is real.
- **Reach.** Engagement rate falls as reach rises. A "high-performing" format may
  simply be one he uses on low-reach posts. Check the median views alongside the
  median rate — if they move in opposite directions, reach is doing the work.

### 4. Write the read-out

Follow `references/readout-template.md`. Non-negotiables:

- **A "so what" under every finding.** A number with no action is trivia. If you
  cannot write the action, the finding is not ready.
- **Lead with the constraint, not the compliment.** "Your floor is elite, your
  reach is the ceiling" tells someone where to spend effort. "Great engagement!"
  does not.
- **A confidence section that names the weak findings.** Mark anything under
  ~10 posts as directional only. If someone rebuilds their format around an n=6
  result and it does not hold, every other finding loses credibility with it.
- **Compare against a real baseline**, not a vibe. Bangermeter's
  `observedRates` carries measured medians from a real feed sample — use those
  as the "typical post" reference and say where they came from.

---

## Failure modes seen in the field

| Symptom | Cause | Fix |
|---|---|---|
| Sweep ends at "post budget" / "time budget" | Working as designed | Save, come back later, `__arLoad()` |
| Sweep ends at "throttled" | Spinner would not clear | Stop for the day. Do not retry immediately |
| Sweep stalls at 5–15 posts | Collecting before the render settles | Collect twice per scroll, 700ms apart |
| Search returns the same posts repeatedly | Not deduping by post ID | `__arCollect` dedupes; do not bypass it |
| Profile stops loading, no spinner, not at bottom | Pagination depth cap | Switch to date-bounded search windows |
| Every post scores 100 | Account far above baseline; the score saturates | Rank by rate instead, and say the score saturated |
| A contrast vanishes when you look again | It was a timing artifact | This is the confound check working — report the null |
| Counts look 10× off | Parser split a thousands separator | X aria-labels have no separators; check before "fixing" |

## Scoring caveat

Bangermeter's E score is calibrated so a typical **feed** post lands near 50. An
account running several times baseline will pin at 100 on most posts, and the
score stops discriminating. When that happens, rank by like rate and say the
score saturated — do not present a wall of 100s as a finding.
