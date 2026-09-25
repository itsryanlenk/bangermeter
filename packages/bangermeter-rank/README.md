# bangermeter-rank

The ranking half of Bangermeter. It uses the extension's own `weights.js` and
`scoring.js`, so every weight comes from X's published `param.rs` and none is
typed twice. On top of that it adds four ranking modes, a score card, a weight-sync
check, a customer account-audit report, and two ship gates.

Zero dependencies. Node 18+.

```bash
node examples/make-sample.js examples/sample.jsonl
node bin/bangermeter-rank.js rank examples/sample.jsonl
node bin/bangermeter-rank.js report examples/sample.jsonl --out audit.html --pdf
node bin/bangermeter-rank.js sync
node bin/bangermeter-rank.js gate
npm test
```

`make-sample.js` writes synthetic posts, each marked `"synthetic": true`. They show
the output shape and measure nothing. The sample is generated, not committed,
because the repo refuses to track anything shaped like a real account archive.

## The four modes

Every result carries its mode's headline and subhead, so no screen can render
without its hedge.

| Mode | Sorts by | What it is not |
|---|---|---|
| `audit` (default) | like rate ÷ the median like rate of posts in the same view band (200–999, 1k–2k, 2k–10k, 10k+). Posts are at least 48h old. | Not a ranking by C, and not by raw views. |
| `checklist` (C) | Nothing. Posts stay in your order. | C does not forecast reach or likes. It shows which published weight heads a draft is aiming at. |
| `engagement` (E) | E, but only for posts with at least 2,000 views. | Not retrospective proof of anything under 2,000 views. Those posts are listed as `lowSample` and never ranked or badged. |
| `stealability` | Bookmarks, and formats by median bookmarks. | Bookmarks are not a Phoenix ranking head. This is a human lens. |

Every audit shows misses beside winners. A winner beat its band's median and a miss
fell below it. A post at the median is neither. No post is forced into either list
to fill it, and the report says so when a list is empty. A post that is alone in its band, or has under 200 views, goes in a
"not ranked" list with the reason.

Cleaning runs before any ranked mode. It drops posts under 48h old, reposts, replies
to other people (self-replies are kept), cold posts that open with an @-mention, and
posts with no views.

## Score card

```json
{ "id": "…", "mode": "audit", "weightsVersion": "0.10.2", "paramRsSync": "2026-09-24T16:24:49Z",
  "lowSample": false, "band": "2k–10k",
  "rates": { "like": 0.0813, "bookmark": 0.0125, "saveToLike": 0.154 },
  "C": { "kind": "checklist", "score": 71, "modifiers": [{ "id": "question", "provenance": "estimate" }] },
  "E": { "score": 92, "lowSample": false, "usableForRanking": true } }
```

`paramRsSync` is `BANGERMETER_CONFIG.paramRsLastSync`. Every card pins it.

## Input

JSONL, or a JSON array, with one post per row:

```json
{ "id": "…", "url": "…", "text": "…", "createdAt": "2026-09-01T14:00:00Z",
  "views": 5200, "likes": 140, "replies": 9, "reposts": 4, "bookmarks": 22,
  "media": "text|photo|video|gif|link", "format": "hard_way",
  "isRepost": false, "isReply": false, "replyToSelf": false }
```

`format` is optional. Stealability groups by it and falls back to `media`.

## Weight sync

`sync` fetches `home-mixer/params/param.rs` and `vm-ranker/params.rs` from
`xai-org/x-algorithm` and compares them with `weights.js`. X split the weights
across both files in the 2026-09-23 upstream sync. The OON factor and author
diversity live only in the second file. `sync` exits 1 in any of these cases:

- a weight or rescorer value changed
- a head was removed or added upstream
- the two upstream files disagree
- a file can't be parsed

Favorite, Reply, Report, OON, VideoOpen, Vqv and Dwell are flagged `CRITICAL`. If the
upstream stamp moves but no value changed, the check passes and says so.
Each file is checked on its own, and comments are stripped before parsing, so
a commented-out `param!` line never counts as live. A duplicate declaration or a
missing `last sync` stamp also fails. The `weight-sync` job in
`.github/workflows/bangermeter-rank.yml` runs daily and on demand. It does not run
on PRs, so a PR never goes red because X moved a weight overnight.

## Gates

- **Copy gate** fails on the three claims marketing may never make, in any wording,
  across line breaks and markup (handoff §8 test 7; the patterns are in
  `lib/gates.js` `FORBIDDEN`). It allows the negations the product has to say. It
  scans the README, the store description, the extension's UI files, and this
  package. The same scan fails any present-tense head count ("all N ranking
  heads") that differs from the engine's roster.
- **Numbers Gate** fails any research figure in this package's client-facing copy
  that does not resolve to `receipts/2026-09-23.json`. The report pulls research
  figures through `receipts.fmt(id)`, which throws on an unknown id. A customer's
  own measurements are data, not claims, and the gate does not police them.
  Fenced code blocks in Markdown are skipped too, because they show shapes, not
  claims. An unclosed fence fails. Prose is always checked.
  - The sign is part of a figure, so a negative correlation cannot be quoted as a positive one.
  - A published weight passes only right after its head's name (reply 5.0).
  - A method constant passes only next to what it measures (2,000 views).
  - **Scope:** this package's client-facing copy and the report's research
    sections. The extension's README and store listing cite weights and sourced
    facts that `extension/test.html` asserts. They predate the receipts, so the
    Numbers Gate does not cover them.

`receipts/2026-09-23.json` is transcribed from the 2026-09-23 build handoff (§5–§7).
The raw artifacts are on the build box. Change a figure only from those files.

## What the evidence supports

- E vs like rate, at 2,000 views and up: Spearman 0.7463 (n=655). This is expected,
  because E is built from those rates.
- C vs like rate: Spearman 0.0809 (n=918), and −0.187 in the viral sample (n=662).
  **C is a checklist, not a forecast.**
- In the viral sample, median like rate was 1.22% past 10k views and 3.86% at
  2k–10k. That is why the audit compares within bands. The sample has no non-viral
  control, so it shows associations only.

## Publishing

`npm pack` runs `lib/vendor-engine.js`, which copies the engine into `engine/`, so
the tarball is self-contained. Inside the repo the package reads `../../extension`
directly.
