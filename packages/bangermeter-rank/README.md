# bangermeter-rank

The ranking half of Bangermeter. It uses the extension's own `weights.js` and
`scoring.js`, so every weight comes from X's published `param.rs` and none is
typed twice. On top of that it adds four ranking modes, a score card, a weight-sync
check, a customer account-audit report, and two ship gates.

Zero dependencies. Node 18+.

```bash
node bin/bangermeter-rank.js rank examples/sample-posts.jsonl
node bin/bangermeter-rank.js report examples/sample-posts.jsonl --out audit.html --pdf
node bin/bangermeter-rank.js sync
node bin/bangermeter-rank.js gate
npm test
```

`examples/sample-posts.jsonl` is synthetic. It exists to show the output shape and
measures nothing.

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
fell below it. A post that is alone in its band, or has under 200 views, goes in a
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
`.github/workflows/weight-sync.yml` runs it daily.

## Gates

- **Copy gate** fails on the three claims marketing may never make (handoff §8 test
  7; the phrases are in `lib/gates.js` `FORBIDDEN`). It scans the README, the store
  description, the extension's UI files, and this package.
- **Numbers Gate** fails any research figure in this package's client-facing copy
  that does not resolve to `receipts/2026-09-23.json`. The report pulls research
  figures through `receipts.fmt(id)`, which throws on an unknown id. A customer's
  own measurements are data, not claims, and the gate does not police them.
  Fenced code blocks in Markdown are skipped too, because they show shapes, not
  claims. Prose is always checked.

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
