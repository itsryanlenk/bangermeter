# Upstream sync automation — design

Date: 2026-10-13 · Status: draft for review · Branch: `feat/upstream-sync-automation`

## Problem

`xai-org/x-algorithm` pushes most weekdays. Bangermeter mirrors its weights and
cites about a dozen of its files as the source for dated facts, so every push can
make something we ship wrong.

Detection already exists but does not reach anyone. The `weight-sync` job in
`.github/workflows/bangermeter-rank.yml` runs `bangermeter-rank sync` daily. It
failed on every scheduled run from Oct 6 to Oct 13 (seven in a row) and nobody
noticed. On Oct 13 it reported 13 problems against upstream `e1a0375`.

It also watches too little. It checks the weights in `home-mixer/params/param.rs`
and `vm-ranker/params.rs` and nothing else. The last manual catch-up (PR #3) also
changed the Grok reply gate, the Brazil filter count, author cold start and the
Under the Hood link, all sourced from files the job never looks at.

The catch-up itself is manual, and the error-prone part is mechanical: tracing
which commit a value changed in, and reading the sync date and the publication
date correctly. Past adversary passes caught several wrong dates and figures that
had already shipped.

## Goals

1. When upstream moves something we depend on, Ryan finds out within a day,
   through a channel he actually reads.
2. The mechanical part of a catch-up arrives as a draft PR: values, test
   assertions, fixtures, userscript, and both dates already computed.
3. Anything that needs judgment is stated as a question, never guessed.
4. A red run means the automation itself is broken, not that X pushed.

## Non-goals

- No LLM anywhere in the pipeline.
- No user-facing prose is written: notes, `weightsSnapshot`, README,
  RESEARCH.md and store copy stay with Ryan and the adversary pass.
- No parsing of values out of cited files; only "this file changed since we
  verified it".
- No release steps: no manifest version bump, no package build, no tag, no merge.
- No modeling of new heads (label, provenance, estimator).
- No notification channel beyond GitHub's own issue and PR notifications.
- Not the Oct 13 catch-up itself. That is separate work; this pipeline will
  produce its first issue.

## Decisions taken during brainstorming

| Question | Decision |
|---|---|
| How much to automate | An alert plus a draft PR for the mechanical part |
| What drafts the PR | A deterministic script in GitHub Actions, no LLM |
| Structure | Extend `bangermeter-rank sync` and the existing `weight-sync` job |
| `param.rs` and `vm-ranker/params.rs` disagree | Write nothing for that param; report it as needs-you |
| Stamp `paramRsLastSync` | Bumped only when the PR resolves every weight finding |

## Architecture

The existing daily job becomes `upstream-sync`. Its cron moves from 18:30 to
**09:30 UTC**. The current YAML comment says it runs "after X's usual ~16:30
UTC sync", but 16:00 is the stamp time. X *publishes* the next day between
01:00 and 08:00 UTC (every push from Sept 14 to Oct 13). At 18:30 every alert
waits about ten extra hours. `workflow_dispatch` stays.

1. **Fetch.** Check out bangermeter. Run `git clone --filter=blob:none` on
   `xai-org/x-algorithm` (full history, blobs fetched on demand).
2. **Baseline.** Find the upstream commit whose `param.rs` line-1 stamp equals
   `paramRsLastSync` in weights.js. No new state is stored.
3. **Report.** `sync --history <clone> --report drift.json` reads both param
   files from the clone's HEAD, runs the existing `check()`, classifies every
   finding (below), dates it, and scans cited files.
4. **Write.** If the auto bucket is non-empty: `sync --history <clone> --write`
   applies it. The job then runs every gate (engine self-test, check-versions,
   package tests, gate), rebuilds the userscript with `pwsh`, and checks the
   diff against an allowlist.
5. **Publish.** It upserts one issue labeled `upstream-drift`, and, if there
   were auto edits, force-pushes `bot/upstream-sync` and upserts one draft PR.

The push/PR `test` job is unchanged.

## Classification

Every finding lands in one bucket.

| Bucket | Finding kinds (from `check()`) | Effect |
|---|---|---|
| **auto** | `value`, where every upstream file that declares the param agrees on the new value | `--write` applies it |
| **needs-you** | `disagree`; `added`; `removed`; a head declared in only one of the two files | Listed in the issue, never written |
| **review** | A cited file touched since its baseline | Listed in the issue with commits and dates |
| **fatal** | `unparseable`; `duplicate`; `nostamp`; baseline stamp not in history | Run goes red |

Each needs-you finding carries a **severity**. It is **inert** when every value
involved is 0 (for example a new head added at weight 0, which moves no score
today). Otherwise it is **score-moving**. The issue lists score-moving findings
first.

Against `e1a0375` this yields: auto empty; needs-you holds four score-moving
disagreements (`favorite`, `video_open`, `post_unexplored`, `cont_dwell_time`;
`param.rs` moved, `vm-ranker/params.rs` did not) and four new heads, all inert.
So the first real run opens an issue and no PR.

## Dates

For an auto or needs-you value finding, walk the commits that touched that
param's own file (`git log --format=%H%x09%cI -- <file>`), oldest first from the
baseline, reading the value at each commit with `git show <sha>:<file>`.

- **Publication date**: the committer date (UTC) of the first commit in the
  final unbroken run of the current value. A value that moves and moves back
  is dated from its latest arrival, not its first.
- **Sync date**: the `param.rs` line-1 stamp at that same commit.
  `vm-ranker/params.rs` has no stamp, so a vm-only param uses `param.rs`'s
  stamp at the same commit, labeled as such.
- Walking only the param's own file is deliberate. Sampling `param.rs` commits
  missed five of the reply gate's nine values.

Acceptance check on real history: walking from the Sept 18 stamp
(`2026-09-18T16:21:20Z`, upstream `8b25829`) must report `click` 0.4 → 0.3 with
sync stamp `2026-09-28T16:00:35Z` and publication `2026-09-29T03:06:30Z`
(`a707cc2`), matching what weights.js already records. Verified by hand on
2026-10-13.

## Cited-file watch (the review bucket)

Paths come from `sourcedFacts` in weights.js:

- `source: "path"` and `param: "path"` (when the value is a path, not a
  `rust_home_mixer_*` name).
- `source: "dir/ (a.py, b.py)"` expands to `dir/a.py`, `dir/b.py`.
- `sources: ["path@sha (lines …)", …]` uses `sha` as that citation's own
  baseline.

The baseline is the citation's `@sha`, else the fact's `verifiedAt`, else the
stamp baseline. The output for each path is the list of commits (sha, date) that
touched it since its baseline. No claim is made about what changed.

## `--write`

The principle: **the bot edits numbers in code and tests; anything a user reads
stays with the human.**

Writes (each edit site must match exactly once, or the run is fatal):

| File | Edit |
|---|---|
| `extension/weights.js` | The literal at the param's key path (`heads.<name>.weight`, `rescorers.outOfNetwork.factor`, `sourcedFacts.minVideoDurationMs.value`, and the rest of `expected()`'s mapping) |
| `extension/test.html` | The head's entry in the `PARAM_RS` table, and the `positive_sum`/`negative_sum`/`total_sum` assertions, recomputed by loading the edited weights.js in a fresh `vm` context |
| `packages/bangermeter-rank/test/fixtures/{param,vm-params}.rs` | The `param!(…)` value literal; declarations can span several lines (`param!(\n    ProfileClickWeight, …`), so the site is located with the same regex `sync.parse()` uses |
| `extension/weights.js` + both fixtures | `paramRsLastSync` and the fixtures' stamp line, **only if** no weight-file finding remains in needs-you |
| `extension/bangermeter.user.js` | Rebuilt by `make-userscript.ps1` under `pwsh`, not by the writer |

Properties:
- Preserves BOM and line endings (test.html has a BOM; working trees are CRLF
  on Windows and LF in CI).
- Idempotent: a second run yields no diff.
- Never edits a `note:` string, `weightsSnapshot`, or any prose file.
- Refuses to run outside the repo (same `inRepo()` rule as the engine loader).

The PR body gets, for every changed figure (weights, sums, and the
negative-branch ceiling `negative_sum / total_sum × 0.001`):
- every line in README.md, RESEARCH.md, `store-assets/store-description.txt`,
  `packages/bangermeter-rank/README.md` and weights.js notes that contains the
  old figure, as file:line, to over-report rather than miss;
- a ready-to-paste dated line, e.g. "Likes: 0.5 → 0.6 in the Oct 12, 2026 sync,
  published Oct 13 (`e1a0375`)".

When sums or the ceiling move, the draft PR is **red on purpose**:
`test.html:326` asserts that the panel note quotes the current ceiling, and only
a human edits that note. The PR body says so at the top.

Allowlist guard: after writing and rebuilding, `git diff --name-only` must be a
subset of the five files above; otherwise the run is fatal.

## Publishing

`lib/publish.js` exports a pure planner:
`plan(report, state) → actions[]`, where `state` holds the open issue (number
and stored findings hash), the open PR (number, draft flag), and whether
`bot/upstream-sync` carries commits not authored by `github-actions[bot]`.
A thin executor in `bin/` runs the actions through `gh`.

- **Findings hash**: sha256 of canonical JSON of the sorted findings, with no
  timestamps or run IDs. Stored in the issue body as
  `<!-- findings-hash: … -->`.
- **Issue**: one open issue labeled `upstream-drift`. Body = current findings.
  A new comment, @mentioning the repo owner, is posted only when the hash
  changes; this makes the alert reach Ryan even if he watches the repo as
  "Participating". Closed with a comment once there are zero findings.
- **PR**: created as a draft from `bot/upstream-sync` only when auto is
  non-empty. Updated (force-push and body) on later runs. If the branch carries
  foreign commits, the bot does not push; it comments the new findings on the
  PR instead. If auto becomes empty while the PR is open and the branch has no
  foreign commits, the PR is closed with a comment.
- Gate results run inside the job are written into the PR body, because
  PRs opened with `GITHUB_TOKEN` do not trigger `pull_request` workflows.

## CLI

```
sync [--param-rs FILE --vm-params FILE] [--history CLONE] [--report OUT.json] [--write] [--json]
```

- No new flags: behavior unchanged (exit 1 on drift).
- `--history CLONE`: read both files from the clone's HEAD, and enable dates,
  baseline and the cited-file watch. Without it, dates read "unknown".
- `--report OUT.json`: exit 0 when drift is found and reported, 1 on fatal,
  2 on usage error.
- `--write`: requires `--history`; applies auto only.

New modules in `packages/bangermeter-rank/lib/`: `upstream.js` (git walk:
`findBaseline`, `paramTimeline`, `touchedSince`), `drift.js` (classify, date,
hash, render issue and PR markdown), `write.js`, `publish.js`. `sync.js` gains a
key path on each `expected()` entry. They ship with the package, but `--write`
and publishing refuse outside the repo, as `gate` already assumes the repo.

## Workflow

```yaml
upstream-sync:            # replaces weight-sync
  if: schedule || workflow_dispatch
  permissions: { contents: write, issues: write, pull-requests: write }
  concurrency: { group: upstream-sync, cancel-in-progress: false }
```

Steps: checkout (`fetch-depth: 0`), setup-node 22, blobless clone of upstream,
report, then, if auto is non-empty, write, run gates with `continue-on-error`
and capture their results, `pwsh store-assets/make-userscript.ps1`, the
allowlist guard, and a commit as `github-actions[bot]`. Last, publish.

The `test` job keeps `contents: read`.

**One-time setup (Ryan):** Settings → Actions → General → "Allow GitHub Actions
to create and approve pull requests".

## Failure handling

The run goes red on: clone failure, baseline not found, unparseable, duplicate
or stampless file, a write site matching zero or several times, an allowlist
violation, or a failed `gh` call. Where GitHub is reachable, a fatal finding is
also written to the issue.

## Testing

TDD in `packages/bangermeter-rank/test/`, `node --test`:

- **Classification:** agree → auto; disagree → needs-you; head in one file
  only → needs-you; added at 0 → inert; stampless or unparseable → fatal.
- **Dates:** a throwaway git repo built in the test with fixed
  `GIT_COMMITTER_DATE`s: a single change; a change and revert; a vm-only
  param; a baseline stamp missing from history.
- **Real-history check:** the `click` acceptance above, run against
  `repo/x-algorithm` and skipped when the clone is absent.
- **Write:** edits only target sites; idempotent; never touches `note:`;
  stamp bumped only when weight findings are fully resolved; BOM and CRLF
  preserved; zero or multiple matches → fatal.
- **Cited-file parsing:** all three `source`/`sources`/`param` shapes.
- **Publish planner:** every row of: no issue / issue with same hash / issue
  with new hash / zero findings with open issue; no PR / PR clean / PR with
  foreign commits / auto now empty.
- **Userscript parity (implementation spike):** on ubuntu, `pwsh
  make-userscript.ps1` on unchanged main must yield no `git diff`. If it does
  not, the bot skips the rebuild and lists it as a manual step.

**End to end:** `workflow_dispatch` against live upstream should open the issue
described under Classification, stay green, and open no PR. A second dispatch
must post no new comment.

## Open questions

- Is GitHub's issue notification enough, or does Ryan want a push to his phone
  as well? This is out of scope here, but the planner's "hash changed" action is
  where it would hook in.
