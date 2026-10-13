# Upstream Sync Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the daily `weight-sync` CI job into `upstream-sync`. It reports everything X's published repo moved that Bangermeter depends on into one rolling GitHub issue, and opens a draft PR for the mechanical edits.

**Architecture:** `bangermeter-rank sync` gains `--history CLONE`, `--report`, and `--write`. They are backed by four new pure-ish modules: `upstream.js` (git history walk), `drift.js` (classify, date, cite-watch, hash), `render.js` (markdown), and `write.js` (number edits). Two more pieces sit on top: `publish.js`, a pure planner, and `bin/upstream-publish.js`, which runs gh/git. The workflow wires clone → report/write → userscript rebuild → publish.

**Tech Stack:** Node 22 in CI (package floor Node ≥18), `node:test`, `git`, `gh` CLI, GitHub Actions, `pwsh` on ubuntu-latest. No new dependencies; the package stays at zero.

**Spec:** `docs/superpowers/specs/2026-10-13-upstream-sync-automation-design.md`

## Global Constraints

- Zero npm dependencies. Only `node:` built-ins plus `git`/`gh` subprocesses.
- Tests run under `node --test` from `packages/bangermeter-rank` (`npm test`). They must pass on Windows, where the working tree is CRLF and there is no `pwsh`, and on ubuntu, where it is LF.
- Every date is UTC. "Published" means the upstream **committer** date (`%cI`). "Sync" means the `param.rs` line-1 `last sync` stamp at the same commit.
- The bot edits numbers in code and tests only. It never edits a `note:` string, `weightsSnapshot`, README.md, RESEARCH.md, `store-assets/store-description.txt`, or `packages/bangermeter-rank/README.md`.
- A param on which `param.rs` and `vm-ranker/params.rs` disagree is never written.
- `paramRsLastSync` is bumped only when no weight-file finding remains in needs-you.
- Write allowlist, exactly: `extension/weights.js`, `extension/test.html`, `extension/bangermeter.user.js`, `packages/bangermeter-rank/test/fixtures/param.rs`, `packages/bangermeter-rank/test/fixtures/vm-params.rs`, `packages/bangermeter-rank/test/sync.test.js`, `packages/bangermeter-rank/test/modes.test.js`, `packages/bangermeter-rank/test/report.test.js`.
- Every edit site must match exactly once, or nothing is written and the run is fatal.
- A red scheduled run means the automation is broken, never "X pushed".
- The bot never touches `main`, never merges, never bumps the manifest version, never tags.
- Prose is US English (`store-assets/check-versions.js` enforces it on tracked files).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **The repo setting that lets Actions open PRs is off.** `gh pr create` fails. Expected: a red run whose log names *Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests"*. Pinned in Task 8.
2. **Ryan closes the issue, or edits away the hash marker.** Closed with the same findings: the bot does nothing (he dismissed them). Marker gone: one update and one comment, then quiet. Never a daily re-alert. Pinned in Task 7.
3. **A long-unattended review list.** Bodies stay under GitHub's 65,536-character limit (truncated at 60,000 with a pointer to the run log), and each cited path shows at most 5 commits plus "and N earlier". Pinned in Task 4.
4. **A dated line crossing a year boundary.** A Dec 31 stamp published Jan 1 reads "Dec 31, 2026 sync, published Jan 1, 2027", with the year repeated only when it differs. Pinned in Task 4.
5. **Upstream writes a value as `1e-5` or `0.60`.** It is written back in weights.js style (`0.00001`, `0.6`), with integers keeping a `.0` where the old literal had one, still at exactly one site. Pinned in Task 5.

---

### Task 1: Key paths and disagreement values in `sync.check()`

**Files:**
- Modify: `packages/bangermeter-rank/lib/sync.js:47-70` (`expected()`), `:113-122` (problems), `:157` (exports)
- Test: `packages/bangermeter-rank/test/sync.test.js` (append)

**Interfaces:**
- Produces: `sync.expected() → { [param]: { value, what, files: string[], path: string[] } }`. A `value` problem gains `path`. A `disagree` problem gains `values: {paramRs, vmParams}`, `repo`, and `path`. `sync.isHeadParam(param) → boolean` is exported.

- [ ] **Step 1: Write the failing tests** (append to `test/sync.test.js`)

```js
test("expected() carries a weights.js key path that resolves to the value it checks", () => {
  const { C } = require("../lib/engine");
  const exp = sync.expected();
  assert.deepEqual(exp.rust_home_mixer_click_weight.path, ["heads", "click", "weight"]);
  assert.deepEqual(exp.rust_home_mixer_oon_weight_factor.path, ["rescorers", "outOfNetwork", "factor"]);
  assert.deepEqual(exp.rust_home_mixer_bidirectional_follow_reply_weight_boost.path, ["bidirectionalFollowReplyBoost"]);
  assert.deepEqual(exp.rust_home_mixer_min_video_duration_ms.path, ["sourcedFacts", "minVideoDurationMs", "value"]);
  for (const [param, e] of Object.entries(exp)) {
    assert.equal(e.path.reduce((o, k) => o[k], C), e.value, param);
  }
});

test("a disagreement carries both upstream values, the repo value and the key path", () => {
  const moved = paramRs.replace('"rust_home_mixer_favorite_weight", 0.5', '"rust_home_mixer_favorite_weight", 0.6');
  const r = sync.check({ paramRs: moved, vmParams });
  const d = r.problems.find(p => p.kind === "disagree" && p.param === "rust_home_mixer_favorite_weight");
  assert.deepEqual(d.values, { paramRs: 0.6, vmParams: 0.5 });
  assert.equal(d.repo, 0.5);
  assert.deepEqual(d.path, ["heads", "favorite", "weight"]);
  const v = r.problems.find(p => p.kind === "value" && p.param === "rust_home_mixer_favorite_weight");
  assert.deepEqual(v.path, ["heads", "favorite", "weight"]);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd packages/bangermeter-rank && node --test test/sync.test.js`
Expected: FAIL, with `sync.expected is not a function`.

- [ ] **Step 3: Implement.** In `lib/sync.js`, replace `expected()` with:

```js
function expected() {
  const out = {};
  const put = (param, value, what, files, path) => { out[param] = { value, what, files, path }; };
  for (const [name, h] of Object.entries(C.heads)) put(h.param, h.weight, "head " + name, BOTH, ["heads", name, "weight"]);
  const r = C.rescorers;
  put(r.outOfNetwork.param, r.outOfNetwork.factor, "rescorer outOfNetwork", VM, ["rescorers", "outOfNetwork", "factor"]);
  put(r.topicOutOfNetwork.param, r.topicOutOfNetwork.factor, "rescorer topicOutOfNetwork", VM, ["rescorers", "topicOutOfNetwork", "factor"]);
  // weights.js records this one from config.rs without a param name; X now
  // publishes it, so it is checked by its published name.
  put("rust_home_mixer_new_user_oon_weight_factor", r.newUserOutOfNetwork.factor, "rescorer newUserOutOfNetwork", VM, ["rescorers", "newUserOutOfNetwork", "factor"]);
  put(r.authorDiversity.param, r.authorDiversity.decay, "author diversity decay", VM, ["rescorers", "authorDiversity", "decay"]);
  put(r.authorDiversity.floorParam, r.authorDiversity.floor, "author diversity floor", VM, ["rescorers", "authorDiversity", "floor"]);
  put("rust_home_mixer_bidirectional_follow_reply_weight_boost", C.bidirectionalFollowReplyBoost, "mutual-follow reply boost", BOTH, ["bidirectionalFollowReplyBoost"]);
  put("rust_home_mixer_bidirectional_follow_dwell_weight_boost", C.bidirectionalFollowDwellBoost, "mutual-follow dwell boost", BOTH, ["bidirectionalFollowDwellBoost"]);
  put(C.sourcedFacts.minVideoDurationMs.param, C.sourcedFacts.minVideoDurationMs.value, "min video duration ms", BOTH, ["sourcedFacts", "minVideoDurationMs", "value"]);
  return out;
}
```

In `check()`, replace the disagree and value `add(...)` calls with:

```js
    if (seen.length === 2 && seen[0][1] !== seen[1][1]) {
      add({ kind: "disagree", param, repo: e.value, path: e.path, values: Object.fromEntries(seen),
        message: param + ": upstream files disagree (" + seen.map(([k, v]) => k + " " + v).join(" vs ") + ")" });
    }
    for (const [key, v] of seen) {
      live[param] = v;
      if (v !== e.value) {
        add({ kind: "value", file: key, param, repo: e.value, live: v, path: e.path,
          message: key + ": " + param + " (" + e.what + "): repo " + e.value + " ≠ live " + v });
      }
    }
```

Change the export line to:

```js
module.exports = { parse, check, expected, isHeadParam, fetchLive, stripComments, SOURCES, CRITICAL };
```

- [ ] **Step 4: Run the whole package suite**

Run: `cd packages/bangermeter-rank && npm test`
Expected: PASS, all tests including the two new ones.

- [ ] **Step 5: Commit**

```bash
git add packages/bangermeter-rank/lib/sync.js packages/bangermeter-rank/test/sync.test.js
git commit -m "Give each synced param its weights.js key path"
```

---

### Task 2: Upstream history walk (`upstream.js`)

**Files:**
- Create: `packages/bangermeter-rank/lib/upstream.js`
- Create: `packages/bangermeter-rank/test/git-fixture.js`
- Test: `packages/bangermeter-rank/test/upstream.test.js`

**Interfaces:**
- Consumes: `sync.parse(text) → { lastSync, params, duplicates }` (existing).
- Produces:
  - `FILES = { paramRs: "home-mixer/params/param.rs", vmParams: "vm-ranker/params.rs" }`
  - `headCommit(clone, ref = "HEAD") → { sha, date }`
  - `fileAt(clone, sha, file, cache?) → string | null`
  - `commitsTouching(clone, path, { since, head = "HEAD" } = {}) → [{ sha, date }]`, oldest first, `since` excluded
  - `findBaseline(clone, stamp, { head, cache } = {}) → { sha, date, stamp }`. Throws if the stamp is absent.
  - `arrival(clone, fileKey, param, baseline, { head, cache } = {}) → { sha, date, stamp, from, to } | null`
  - `existsAt(clone, sha, path) → boolean`
  - Test helpers: `makeRepo(commits) → { dir, sha(rev), cleanup() }`, `setStamp(text, stamp)`, `setValue(text, param, value)`, `fixture(name)` (LF-normalized).

- [ ] **Step 1: Write the test helper** `test/git-fixture.js`

```js
"use strict";
// Throwaway git repos with fixed committer dates, standing in for
// xai-org/x-algorithm so the history walk can be tested to the second.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

// commits: [{ date: ISO, files: { "relative/path": text | null } }] — null deletes.
function makeRepo(commits) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bmr-upstream-"));
  const git = (args, env) => execFileSync("git", args, {
    cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    env: Object.assign({}, process.env, env)
  });
  git(["init", "-q", "-b", "main"]);
  for (const [k, v] of [["user.email", "test@example.com"], ["user.name", "test"], ["commit.gpgsign", "false"], ["core.autocrlf", "false"]]) {
    git(["config", k, v]);
  }
  for (const c of commits) {
    for (const [rel, text] of Object.entries(c.files || {})) {
      const p = path.join(dir, rel);
      if (text === null) { fs.rmSync(p, { force: true }); continue; }
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, text);
    }
    git(["add", "-A"]);
    git(["commit", "-q", "--allow-empty", "-m", "Open-source X Recommendation Algorithm"],
      { GIT_AUTHOR_DATE: c.date, GIT_COMMITTER_DATE: c.date });
  }
  return {
    dir,
    sha: rev => git(["rev-parse", rev]).trim(),
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  };
}

const fixture = name => fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8").replace(/\r\n/g, "\n");
const setStamp = (text, stamp) => text.replace(/last sync \S+Z/, "last sync " + stamp);
const setValue = (text, param, value) =>
  text.replace(new RegExp('("' + param + '",\\s*)(-?[\\d_.]+)'), "$1" + value);

module.exports = { makeRepo, fixture, setStamp, setValue };
```

- [ ] **Step 2: Write the failing tests** `test/upstream.test.js`

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const upstream = require("../lib/upstream");
const { makeRepo, fixture, setStamp, setValue } = require("./git-fixture");

const P = upstream.FILES.paramRs, V = upstream.FILES.vmParams;
const FAV = "rust_home_mixer_favorite_weight", OON = "rust_home_mixer_oon_weight_factor";
const B = "2026-09-29T17:02:52Z";                       // the fixtures' stamp
const paramRs = fixture("param.rs"), vmParams = fixture("vm-params.rs");
const CLONE = path.join(__dirname, "..", "..", "..", "repo", "x-algorithm");

test("findBaseline returns the commit that introduced the pinned stamp", () => {
  const r = makeRepo([
    { date: "2026-09-26T03:39:02Z", files: { [P]: setStamp(paramRs, "2026-09-25T16:24:28Z"), [V]: vmParams } },
    { date: "2026-09-30T03:53:42Z", files: { [P]: paramRs } },
    { date: "2026-10-01T02:13:55Z", files: { [P]: setStamp(paramRs, "2026-09-30T16:00:40Z") } }
  ]);
  try {
    const b = upstream.findBaseline(r.dir, B);
    assert.equal(b.sha, r.sha("HEAD~1"));
    assert.equal(b.date, "2026-09-30T03:53:42Z");
    assert.equal(b.stamp, B);
  } finally { r.cleanup(); }
});

test("findBaseline throws, naming the stamp, when upstream never published it", () => {
  const r = makeRepo([{ date: "2026-09-30T03:53:42Z", files: { [P]: setStamp(paramRs, "2026-09-25T16:24:28Z"), [V]: vmParams } }]);
  try { assert.throws(() => upstream.findBaseline(r.dir, B), /2026-09-29T17:02:52Z/); }
  finally { r.cleanup(); }
});

test("arrival dates a change by its own file's commit, with param.rs's stamp", () => {
  const r = makeRepo([
    { date: "2026-09-30T03:53:42Z", files: { [P]: paramRs, [V]: vmParams } },
    { date: "2026-10-01T02:13:55Z", files: { [P]: setStamp(paramRs, "2026-09-30T16:00:40Z") } },
    { date: "2026-10-13T08:05:54Z", files: { [P]: setValue(setStamp(paramRs, "2026-10-12T16:00:33Z"), FAV, "0.6") } }
  ]);
  try {
    const a = upstream.arrival(r.dir, "paramRs", FAV, upstream.findBaseline(r.dir, B));
    assert.deepEqual(a, { sha: r.sha("HEAD"), date: "2026-10-13T08:05:54Z", stamp: "2026-10-12T16:00:33Z", from: 0.5, to: 0.6 });
    assert.equal(upstream.arrival(r.dir, "vmParams", FAV, upstream.findBaseline(r.dir, B)), null, "vm-ranker never moved");
  } finally { r.cleanup(); }
});

test("a value that moves and moves back dates from its latest arrival, not its first", () => {
  const r = makeRepo([
    { date: "2026-09-30T03:00:00Z", files: { [P]: paramRs, [V]: vmParams } },
    { date: "2026-10-02T03:00:00Z", files: { [P]: setValue(paramRs, FAV, "0.6") } },
    { date: "2026-10-03T03:00:00Z", files: { [P]: setValue(paramRs, FAV, "0.5") } },
    { date: "2026-10-06T03:00:00Z", files: { [P]: setValue(paramRs, FAV, "0.6") } }
  ]);
  try {
    const a = upstream.arrival(r.dir, "paramRs", FAV, upstream.findBaseline(r.dir, B));
    assert.equal(a.date, "2026-10-06T03:00:00Z");
    assert.equal(a.from, 0.5);
  } finally { r.cleanup(); }
});

test("a vm-only change is dated by vm-ranker's commit, stamped with param.rs at that commit", () => {
  const r = makeRepo([
    { date: "2026-09-30T03:00:00Z", files: { [P]: paramRs, [V]: vmParams } },
    { date: "2026-10-07T03:05:56Z", files: { [P]: setStamp(paramRs, "2026-10-06T16:00:58Z"), [V]: setValue(vmParams, OON, "0.8") } }
  ]);
  try {
    const a = upstream.arrival(r.dir, "vmParams", OON, upstream.findBaseline(r.dir, B));
    assert.equal(a.stamp, "2026-10-06T16:00:58Z");
    assert.equal(a.to, 0.8);
  } finally { r.cleanup(); }
});

test("a removal is dated too (to: undefined)", () => {
  const r = makeRepo([
    { date: "2026-09-30T03:00:00Z", files: { [P]: paramRs, [V]: vmParams } },
    { date: "2026-10-08T05:09:20Z", files: { [P]: paramRs.replace(/param!\(DwellWeight[^;]*;/, "") } }
  ]);
  try {
    const a = upstream.arrival(r.dir, "paramRs", "rust_home_mixer_dwell_weight", upstream.findBaseline(r.dir, B));
    assert.equal(a.date, "2026-10-08T05:09:20Z");
    assert.equal(a.from, 0.05);
    assert.equal(a.to, undefined);
  } finally { r.cleanup(); }
});

test("commitsTouching a directory lists commits after the baseline, oldest first; existsAt checks paths", () => {
  const r = makeRepo([
    { date: "2026-09-30T03:00:00Z", files: { "grox/flows/reply_spam/task_filter.py": "x = 1\n" } },
    { date: "2026-10-02T03:00:00Z", files: { "README.md": "unrelated\n" } },
    { date: "2026-10-03T03:00:00Z", files: { "grox/flows/reply_spam/task_filter.py": "x = 2\n" } }
  ]);
  try {
    const base = r.sha("HEAD~2");
    const c = upstream.commitsTouching(r.dir, "grox/flows/reply_spam/", { since: base });
    assert.deepEqual(c, [{ sha: r.sha("HEAD"), date: "2026-10-03T03:00:00Z" }]);
    assert.equal(upstream.existsAt(r.dir, base, "grox/flows/reply_spam/"), true);
    assert.equal(upstream.existsAt(r.dir, base, "grox/flows/nope.py"), false);
    assert.equal(upstream.existsAt(r.dir, "deadbee", "grox/flows/reply_spam/"), false);
  } finally { r.cleanup(); }
});

// The dates weights.js already records, reproduced from real history.
test("real history: click 0.4 → 0.3 arrived in a707cc2 (Sept 28 sync, published Sept 29)",
  { skip: !fs.existsSync(path.join(CLONE, ".git")) && "no local clone at repo/x-algorithm" }, () => {
    const b = upstream.findBaseline(CLONE, "2026-09-18T16:21:20Z", { head: "77d431a" });
    assert.equal(b.sha.slice(0, 7), "8b25829");
    const a = upstream.arrival(CLONE, "paramRs", "rust_home_mixer_click_weight", b, { head: "77d431a" });
    assert.equal(a.sha.slice(0, 7), "a707cc2");
    assert.equal(a.stamp, "2026-09-28T16:00:35Z");
    assert.equal(a.date, "2026-09-29T03:06:30Z");
    assert.equal(a.from, 0.4);
    assert.equal(a.to, 0.3);
  });
```

- [ ] **Step 3: Run them and watch them fail**

Run: `cd packages/bangermeter-rank && node --test test/upstream.test.js`
Expected: FAIL, with `Cannot find module '../lib/upstream'`.

- [ ] **Step 4: Implement** `lib/upstream.js`

```js
"use strict";
// Upstream history for the sync job. Reads a local clone of
// xai-org/x-algorithm; a --filter=blob:none clone is enough, since git fetches
// each blob the first time it is shown. Every date is the COMMITTER date in
// UTC, the moment X published, which is what "published Sept 29" has always
// meant here. A sync date is param.rs's line-1 stamp at that same commit.
const { execFileSync } = require("child_process");
const { parse } = require("./sync");

const FILES = { paramRs: "home-mixer/params/param.rs", vmParams: "vm-ranker/params.rs" };

function git(clone, args) {
  return execFileSync("git", ["-C", clone, ...args], {
    encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"]
  });
}

const utc = iso => new Date(iso).toISOString().replace(/\.\d{3}Z$/, "Z");

function headCommit(clone, ref) {
  const [sha, date] = git(clone, ["log", "-1", "--format=%H%x09%cI", ref || "HEAD"]).trim().split("\t");
  return { sha, date: utc(date) };
}

// The file's text at a commit, or null when it does not exist there.
function fileAt(clone, sha, file, cache) {
  const key = sha + ":" + file;
  if (cache && cache.has(key)) return cache.get(key);
  let text;
  try { text = git(clone, ["show", key]); } catch (e) { text = null; }
  if (cache) cache.set(key, text);
  return text;
}

// Commits that touched `path` (a file, or a directory ending in "/"), oldest
// first. With `since`, only commits after it.
function commitsTouching(clone, path, opts) {
  const o = opts || {};
  const range = o.since ? o.since + ".." + (o.head || "HEAD") : (o.head || "HEAD");
  const out = git(clone, ["log", "--reverse", "--format=%H%x09%cI", range, "--", path]).trim();
  if (!out) return [];
  return out.split("\n").map(l => { const [sha, date] = l.split("\t"); return { sha, date: utc(date) }; });
}

function stampAt(clone, sha, cache) {
  const t = fileAt(clone, sha, FILES.paramRs, cache);
  return t == null ? null : parse(t).lastSync;
}

// The upstream commit that introduced weights.js's pinned stamp.
function findBaseline(clone, stamp, opts) {
  const o = opts || {};
  for (const c of commitsTouching(clone, FILES.paramRs, { head: o.head })) {
    if (stampAt(clone, c.sha, o.cache) === stamp) return { sha: c.sha, date: c.date, stamp };
  }
  throw new Error("baseline: stamp " + stamp + " is not in the history of " + FILES.paramRs +
    " — weights.js pins a sync upstream never published, or upstream rewrote its history");
}

// When did the HEAD value of `param` arrive in `fileKey`'s file? Walks only the
// commits that touched that file (sampling another file's commits is how the
// reply gate's history was once missed), and returns the first commit of the
// final unbroken run of the HEAD value. undefined means absent, so removals
// date too. Null when that run reaches back to the baseline: nothing moved.
function arrival(clone, fileKey, param, baseline, opts) {
  const o = opts || {};
  const file = FILES[fileKey];
  const valueAt = sha => { const t = fileAt(clone, sha, file, o.cache); return t == null ? undefined : parse(t).params[param]; };
  const walk = [{ sha: baseline.sha, date: baseline.date }]
    .concat(commitsTouching(clone, file, { since: baseline.sha, head: o.head }))
    .map(c => ({ sha: c.sha, date: c.date, value: valueAt(c.sha) }));
  const last = walk[walk.length - 1].value;
  let i = walk.length - 1;
  while (i > 0 && walk[i - 1].value === last) i--;
  if (i === 0) return null;
  return { sha: walk[i].sha, date: walk[i].date, stamp: stampAt(clone, walk[i].sha, o.cache), from: walk[i - 1].value, to: last };
}

function existsAt(clone, sha, path) {
  try { git(clone, ["cat-file", "-e", sha + ":" + path.replace(/\/$/, "")]); return true; }
  catch (e) { return false; }
}

module.exports = { FILES, headCommit, fileAt, commitsTouching, stampAt, findBaseline, arrival, existsAt };
```

- [ ] **Step 5: Run the tests**

Run: `cd packages/bangermeter-rank && node --test test/upstream.test.js`
Expected: PASS. On this machine the real-history test runs, because `repo/x-algorithm` exists. In CI it reports `skip`.

- [ ] **Step 6: Commit**

```bash
git add packages/bangermeter-rank/lib/upstream.js packages/bangermeter-rank/test/git-fixture.js packages/bangermeter-rank/test/upstream.test.js
git commit -m "Date upstream changes from each file's own history"
```

---

### Task 3: Classification, cited-file watch, report, hash (`drift.js`)

**Files:**
- Create: `packages/bangermeter-rank/lib/drift.js`
- Test: `packages/bangermeter-rank/test/drift.test.js`

**Interfaces:**
- Consumes: `sync.check`, `sync.expected` (Task 1); everything in `upstream` (Task 2); `engine.C`.
- Produces:
  - `classify(result, exp?, config?) → { fatal: [{kind, file, message}], auto: [Finding], needsYou: [Finding] }`
  - `Finding = { kind: "value"|"added"|"removed"|"disagree"|"badcitation", param, what, label, message, repo, live: {fileKey: number}, path?, files?, missingFrom?, severity?: "score-moving"|"inert", arrivals?: {fileKey: Arrival} }`
  - `parseCitation(string) → [{ path, sha|null }]`
  - `citedPaths(config, defaultBaseline) → [{ path, baseline, facts: string[] }]`
  - `buildReport({ clone, head?, config? }) → Report`
  - `Report = { version: 1, upstreamHead: {sha, date}, pinnedStamp, liveStamp, baseline: {sha, date, stamp}|null, fatal, auto, needsYou, review: [{path, baseline, facts, commits: [{sha, date}]}], stampBump: boolean, hash: string }`
  - `hash(report) → 16-hex string`, independent of array order

- [ ] **Step 1: Write the failing tests** `test/drift.test.js`

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const drift = require("../lib/drift");
const { sync, config: C } = require("..");
const upstream = require("../lib/upstream");
const { makeRepo, fixture, setStamp, setValue } = require("./git-fixture");

const P = upstream.FILES.paramRs, V = upstream.FILES.vmParams;
const FAV = "rust_home_mixer_favorite_weight";
const paramRs = fixture("param.rs"), vmParams = fixture("vm-params.rs");
const newHead = (text, value) => text + '\nparam!(ReactWithVideoWeight, f64, "rust_home_mixer_react_with_video_weight", ' + value + ");\n";
const cls = files => drift.classify(sync.check(files));

test("both files agreeing on a new value is auto", () => {
  const r = cls({ paramRs: setValue(paramRs, FAV, "0.6"), vmParams: setValue(vmParams, FAV, "0.6") });
  assert.equal(r.needsYou.length, 0);
  assert.equal(r.auto.length, 1);
  const f = r.auto[0];
  assert.equal(f.param, FAV);
  assert.equal(f.label, "Likes");
  assert.equal(f.repo, 0.5);
  assert.equal(f.live, 0.6);
  assert.deepEqual(f.path, ["heads", "favorite", "weight"]);
  assert.deepEqual(f.files, ["paramRs", "vmParams"]);
});

test("files that disagree are needs-you, score-moving, and never auto", () => {
  const r = cls({ paramRs: setValue(paramRs, FAV, "0.6"), vmParams });
  assert.equal(r.auto.length, 0);
  assert.equal(r.needsYou[0].kind, "disagree");
  assert.equal(r.needsYou[0].severity, "score-moving");
  assert.deepEqual(r.needsYou[0].live, { paramRs: 0.6, vmParams: 0.5 });
});

test("a new head at weight 0 is inert; at a real weight it is score-moving", () => {
  const zero = cls({ paramRs, vmParams: newHead(vmParams, "0.0") }).needsYou[0];
  assert.equal(zero.kind, "added");
  assert.equal(zero.severity, "inert");
  assert.deepEqual(zero.live, { vmParams: 0 });
  assert.equal(cls({ paramRs: newHead(paramRs, "1.5"), vmParams: newHead(vmParams, "1.5") }).needsYou[0].severity, "score-moving");
});

test("a removed head is needs-you and lists the files it left", () => {
  const strip = t => t.replace(/param!\(DwellWeight[^;]*;/, "");
  const f = cls({ paramRs: strip(paramRs), vmParams: strip(vmParams) }).needsYou[0];
  assert.equal(f.kind, "removed");
  assert.deepEqual(f.missingFrom.sort(), ["paramRs", "vmParams"]);
  assert.equal(f.severity, "score-moving");
});

test("an unstamped param.rs is fatal, not a finding", () => {
  const r = cls({ paramRs: paramRs.replace(/last sync \S+Z/, ""), vmParams });
  assert.equal(r.fatal[0].kind, "nostamp");
});

test("parseCitation handles a path, a dir with a file list, and path@sha with prose", () => {
  assert.deepEqual(drift.parseCitation("phoenix/reference/world.py"), [{ path: "phoenix/reference/world.py", sha: null }]);
  assert.deepEqual(drift.parseCitation("grox/flows/reply_spam/ (plan.py, task_filter.py)"),
    [{ path: "grox/flows/reply_spam/plan.py", sha: null }, { path: "grox/flows/reply_spam/task_filter.py", sha: null }]);
  assert.deepEqual(drift.parseCitation("home-mixer/f.rs@77d431a (lines 1-2: a (nested) note)"), [{ path: "home-mixer/f.rs", sha: "77d431a" }]);
  assert.deepEqual(drift.parseCitation("rust_home_mixer_min_video_duration_ms"), []);
  assert.deepEqual(drift.parseCitation("X's blog post, Sept 2026"), []);
});

test("citedPaths takes the citation's sha, else verifiedAt, else the default baseline", () => {
  const config = {
    weightsSourceUrl: "https://github.com/xai-org/x-algorithm/blob/main/vm-ranker/params.rs",
    sourcedFacts: {
      a: { source: "phoenix/reference/world.py" },
      b: { source: "grox/flows/reply_spam/ (task_filter.py)", verifiedAt: "abc1234" },
      c: { param: "home-mixer/filters/x.rs" },
      d: { param: "rust_home_mixer_min_video_duration_ms" },
      e: { sources: ["home-mixer/f.rs@77d431a (line 5)"], verifiedAt: "abc1234" }
    }
  };
  assert.deepEqual(drift.citedPaths(config, "BASE"), [
    { path: "grox/flows/reply_spam/task_filter.py", baseline: "abc1234", facts: ["b"] },
    { path: "home-mixer/f.rs", baseline: "77d431a", facts: ["e"] },
    { path: "home-mixer/filters/x.rs", baseline: "BASE", facts: ["c"] },
    { path: "phoenix/reference/world.py", baseline: "BASE", facts: ["a"] },
    { path: "vm-ranker/params.rs", baseline: "BASE", facts: ["weightsSourceUrl"] }
  ]);
});

test("the real weights.js cites the files the last catch-up had to re-check", () => {
  const paths = drift.citedPaths(C, "BASE").map(c => c.path);
  for (const p of ["grox/flows/reply_spam/task_filter.py", "home-mixer/scorers/author_cold_start.rs",
    "home-mixer/filters/brazil_2026_election_filter.rs", "home-mixer/filters/vf_filter.rs", "xai-value-model/scoring.rs"]) {
    assert.ok(paths.includes(p), p);
  }
});

const cfg = Object.assign({}, C, {
  weightsSourceUrl: undefined, scorerSourceUrl: undefined,
  sourcedFacts: { dwellMark: { source: "phoenix/reference/world.py" } }
});

test("buildReport dates a disagreement and lists a touched cited file", () => {
  const r = makeRepo([
    { date: "2026-09-30T03:53:42Z", files: { [P]: paramRs, [V]: vmParams, "phoenix/reference/world.py": "DWELL = 10\n" } },
    { date: "2026-10-13T08:05:54Z", files: { [P]: setValue(setStamp(paramRs, "2026-10-12T16:00:33Z"), FAV, "0.6"), "phoenix/reference/world.py": "DWELL = 12\n" } }
  ]);
  try {
    const rep = drift.buildReport({ clone: r.dir, config: cfg });
    assert.deepEqual(rep.fatal, []);
    assert.equal(rep.liveStamp, "2026-10-12T16:00:33Z");
    assert.equal(rep.baseline.sha, r.sha("HEAD~1"));
    const d = rep.needsYou.find(f => f.param === FAV);
    assert.equal(d.kind, "disagree");
    assert.equal(d.arrivals.paramRs.date, "2026-10-13T08:05:54Z");
    assert.equal(d.arrivals.vmParams, undefined);
    assert.deepEqual(rep.review.map(x => [x.path, x.commits.length]), [["phoenix/reference/world.py", 1]]);
    assert.equal(rep.stampBump, false, "a weight finding is still open");
    assert.match(rep.hash, /^[0-9a-f]{16}$/);
  } finally { r.cleanup(); }
});

test("buildReport: agreeing files are auto, dated in both files, and allow the stamp bump", () => {
  const r = makeRepo([
    { date: "2026-09-30T03:53:42Z", files: { [P]: paramRs, [V]: vmParams, "phoenix/reference/world.py": "x\n" } },
    { date: "2026-10-13T08:05:54Z", files: { [P]: setValue(setStamp(paramRs, "2026-10-12T16:00:33Z"), FAV, "0.6"), [V]: setValue(vmParams, FAV, "0.6") } }
  ]);
  try {
    const rep = drift.buildReport({ clone: r.dir, config: cfg });
    assert.equal(rep.auto.length, 1);
    assert.deepEqual(Object.keys(rep.auto[0].arrivals).sort(), ["paramRs", "vmParams"]);
    assert.equal(rep.stampBump, true);
  } finally { r.cleanup(); }
});

test("buildReport: a cited path missing at its baseline is a badcitation, not silence", () => {
  const r = makeRepo([{ date: "2026-09-30T03:53:42Z", files: { [P]: paramRs, [V]: vmParams } }]);
  try {
    const rep = drift.buildReport({ clone: r.dir, config: cfg });
    assert.equal(rep.needsYou[0].kind, "badcitation");
    assert.match(rep.needsYou[0].message, /phoenix\/reference\/world\.py/);
    assert.equal(rep.stampBump, true, "a bad citation does not block the stamp");
  } finally { r.cleanup(); }
});

test("buildReport: a pinned stamp upstream never published is fatal", () => {
  const r = makeRepo([{ date: "2026-09-30T03:53:42Z", files: { [P]: setStamp(paramRs, "2026-09-25T16:24:28Z"), [V]: vmParams } }]);
  try {
    const rep = drift.buildReport({ clone: r.dir, config: cfg });
    assert.equal(rep.fatal[0].kind, "baseline");
    assert.equal(rep.stampBump, false);
  } finally { r.cleanup(); }
});

test("hash ignores array order and changes when a finding changes", () => {
  const a = { fatal: [], auto: [], needsYou: [{ param: "a", severity: "inert" }, { param: "b", severity: "inert" }], review: [] };
  const b = { fatal: [], auto: [], needsYou: [a.needsYou[1], a.needsYou[0]], review: [] };
  assert.equal(drift.hash(a), drift.hash(b));
  const c = { fatal: [], auto: [], needsYou: a.needsYou, review: [{ path: "x", commits: [{ sha: "1" }] }] };
  assert.notEqual(drift.hash(a), drift.hash(c));
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd packages/bangermeter-rank && node --test test/drift.test.js`
Expected: FAIL, with `Cannot find module '../lib/drift'`.

- [ ] **Step 3: Implement** `lib/drift.js`

```js
"use strict";
// Turns sync.check() output into the upstream-sync report. Every finding lands
// in exactly one bucket. AUTO: every file declaring the param agrees on a new
// value. NEEDS-YOU: added, removed, the two files disagree, or a citation that
// does not resolve. REVIEW: a cited file touched since it was verified.
// FATAL: the check itself cannot be trusted. Findings are dated from upstream
// history and hashed, so unchanged drift never alerts twice.
const crypto = require("crypto");
const { C } = require("./engine");
const sync = require("./sync");
const upstream = require("./upstream");

const FATAL = new Set(["unparseable", "duplicate", "nostamp"]);
const PATH_RE = /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]*)+$/;
const GH_BLOB = /^https:\/\/github\.com\/xai-org\/x-algorithm\/blob\/[^/]+\/(.+)$/;
const SEVERITY_ORDER = { "score-moving": 0, inert: 1 };
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0); // locale-independent

function labelFor(e, config) {
  if (!e) return null;
  if (e.path[0] === "heads") { const h = config.heads[e.path[1]]; return (h && h.label) || e.path[1]; }
  return e.what;
}

// Inert = every value involved is zero (or absent): nothing it touches moves a score today.
const severity = values => values.every(v => v === 0 || v === undefined || v === null) ? "inert" : "score-moving";

function classify(result, exp, config) {
  exp = exp || sync.expected();
  config = config || C;
  const out = { fatal: [], auto: [], needsYou: [] };
  const byParam = new Map();
  for (const p of result.problems) {
    if (FATAL.has(p.kind)) { out.fatal.push({ kind: p.kind, file: p.file || null, message: p.message }); continue; }
    if (!byParam.has(p.param)) byParam.set(p.param, []);
    byParam.get(p.param).push(p);
  }
  for (const [param, ps] of byParam) {
    const e = exp[param];
    const of = k => ps.filter(p => p.kind === k);
    const base = { param, what: e ? e.what : "new head", label: labelFor(e, config), message: ps.map(p => p.message).join("; ") };
    if (of("added").length) {
      const live = {};
      for (const p of of("added")) live[p.file] = p.live;
      out.needsYou.push(Object.assign(base, { kind: "added", repo: null, live, severity: severity(Object.values(live)) }));
    } else if (of("removed").length) {
      out.needsYou.push(Object.assign(base, { kind: "removed", repo: e.value, live: {}, missingFrom: of("removed").map(p => p.file), severity: severity([e.value]) }));
    } else if (of("disagree").length) {
      const d = of("disagree")[0];
      out.needsYou.push(Object.assign(base, { kind: "disagree", repo: e.value, live: d.values, path: e.path, severity: severity([e.value, ...Object.values(d.values)]) }));
    } else {
      out.auto.push(Object.assign(base, { kind: "value", repo: e.value, live: of("value")[0].live, path: e.path, files: e.files }));
    }
  }
  return out;
}

// "path", "dir/ (a.py, b.py)", or "path@sha (lines …: prose)". Anything else
// (a param name, a sentence) is not a path and yields nothing.
function parseCitation(s) {
  const str = String(s).trim();
  const m = /^(\S+)/.exec(str);
  if (!m) return [];
  let token = m[1], sha = null;
  const at = token.lastIndexOf("@");
  if (at > 0 && /^[0-9a-f]{7,40}$/.test(token.slice(at + 1))) { sha = token.slice(at + 1); token = token.slice(0, at); }
  if (!PATH_RE.test(token)) return [];
  if (token.endsWith("/")) {
    const list = /^\S+\s*\(([^)]*)\)/.exec(str);
    const files = list ? list[1].split(",").map(f => f.trim()).filter(f => /^[\w.-]+$/.test(f)) : [];
    if (files.length) return files.map(f => ({ path: token + f, sha }));
  }
  return [{ path: token, sha }];
}

function citedPaths(config, defaultBaseline) {
  const out = new Map();
  const add = (fact, cites, factBaseline) => {
    for (const c of cites) {
      const baseline = c.sha || factBaseline || defaultBaseline;
      const key = c.path + "@" + baseline;
      if (!out.has(key)) out.set(key, { path: c.path, baseline, facts: [] });
      if (!out.get(key).facts.includes(fact)) out.get(key).facts.push(fact);
    }
  };
  for (const k of ["weightsSourceUrl", "scorerSourceUrl"]) {
    const m = GH_BLOB.exec(config[k] || "");
    if (m) add(k, [{ path: m[1], sha: null }], null);
  }
  for (const [name, f] of Object.entries(config.sourcedFacts || {})) {
    const cites = [];
    for (const k of ["source", "param"]) if (typeof f[k] === "string") cites.push(...parseCitation(f[k]));
    if (Array.isArray(f.sources)) for (const s of f.sources) cites.push(...parseCitation(s));
    add(name, cites, f.verifiedAt || null);
  }
  return [...out.values()].sort((a, b) => cmp(a.path + "@" + a.baseline, b.path + "@" + b.baseline));
}

function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    return Object.keys(v).sort().reduce((o, k) => { if (v[k] !== undefined) o[k] = canonical(v[k]); return o; }, {});
  }
  return v;
}

function hash(report) {
  const norm = arr => (arr || []).map(x => JSON.stringify(canonical(x))).sort();
  const body = JSON.stringify({ fatal: norm(report.fatal), auto: norm(report.auto), needsYou: norm(report.needsYou), review: norm(report.review) });
  return crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
}

function sortReport(r) {
  const key = f => f.param || f.path || "";
  r.auto.sort((a, b) => cmp(key(a), key(b)));
  r.needsYou.sort((a, b) => (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) || cmp(key(a), key(b)));
  r.review.sort((a, b) => cmp(a.path + "@" + a.baseline, b.path + "@" + b.baseline));
}

function buildReport(opts) {
  const clone = opts.clone;
  const head = opts.head || "HEAD";
  const config = opts.config || C;
  const cache = new Map();
  const files = {};
  for (const [key, file] of Object.entries(upstream.FILES)) files[key] = upstream.fileAt(clone, head, file, cache) || "";
  const result = sync.check(files);
  const cls = classify(result, sync.expected(), config);
  const report = {
    version: 1, upstreamHead: upstream.headCommit(clone, head),
    pinnedStamp: config.paramRsLastSync, liveStamp: result.lastSync, baseline: null,
    fatal: cls.fatal, auto: cls.auto, needsYou: cls.needsYou, review: [], stampBump: false, hash: null
  };
  try { report.baseline = upstream.findBaseline(clone, config.paramRsLastSync, { head, cache }); }
  catch (e) { report.fatal.push({ kind: "baseline", file: null, message: e.message }); }
  if (report.baseline) {
    for (const f of report.auto.concat(report.needsYou)) {
      f.arrivals = {};
      for (const key of Object.keys(f.live || {}).concat(f.missingFrom || [])) {
        const a = upstream.arrival(clone, key, f.param, report.baseline, { head, cache });
        if (a) f.arrivals[key] = a;
      }
    }
    for (const c of citedPaths(config, report.baseline.sha)) {
      if (!upstream.existsAt(clone, c.baseline, c.path)) {
        report.needsYou.push({ kind: "badcitation", param: null, path: c.path, facts: c.facts, severity: "inert",
          message: "`" + c.path + "` does not exist at `" + c.baseline.slice(0, 7) + "`, the commit " + c.facts.join(", ") + " cites, so it cannot be watched" });
        continue;
      }
      const commits = upstream.commitsTouching(clone, c.path, { since: c.baseline, head });
      if (commits.length) report.review.push(Object.assign({}, c, { commits }));
    }
  }
  report.stampBump = !report.fatal.length && !report.needsYou.some(f => f.kind !== "badcitation");
  sortReport(report);
  report.hash = hash(report);
  return report;
}

module.exports = { classify, parseCitation, citedPaths, buildReport, hash, canonical };
```

- [ ] **Step 4: Run the tests**

Run: `cd packages/bangermeter-rank && node --test test/drift.test.js`
Expected: PASS. If "the real weights.js cites…" fails, print `drift.citedPaths(C, "BASE")` and fix `parseCitation` against the actual `source`/`sources` strings in weights.js, never by editing weights.js.

- [ ] **Step 5: Commit**

```bash
git add packages/bangermeter-rank/lib/drift.js packages/bangermeter-rank/test/drift.test.js
git commit -m "Classify upstream drift, watch cited files, and hash the findings"
```

---

### Task 4: Markdown for the issue, comments and PR (`render.js`)

**Files:**
- Create: `packages/bangermeter-rank/lib/render.js`
- Test: `packages/bangermeter-rank/test/render.test.js`

**Interfaces:**
- Consumes: the `Report`/`Finding` shapes from Task 3; `report.write` from Task 5 (`{ changed, sums: {before, after}, sumsMoved, ceilingMoved, stamp, staleLines }`); `gates: [{ name, ok, tail }]` from Task 8.
- Produces: `day(iso, withYear)`, `when(arrival)`, `datedLine(f)`, `needsYouLine(f)`, `reviewLine(r)`, `issueTitle()`, `issueBody(report, {owner, runUrl})`, `issueComment(report, {owner})`, `closingComment(report)`, `prTitle(report)`, `prBody(report, {gates, runUrl})`, `prClosingComment(report)`, `prForeignComment(report)`, `commitMessage(report)`, `MAX_BODY = 60000`.

- [ ] **Step 1: Write the failing tests** `test/render.test.js`

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const render = require("../lib/render");

const arr = (date, stamp, sha) => ({ sha: sha || "e1a0375aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", date, stamp, from: 0.5, to: 0.6 });
const auto = { kind: "value", param: "rust_home_mixer_favorite_weight", label: "Likes", repo: 0.5, live: 0.6,
  arrivals: { paramRs: arr("2026-10-13T08:05:54Z", "2026-10-12T16:00:33Z") } };
const base = {
  hash: "0123456789abcdef", upstreamHead: { sha: "e1a0375aaaa", date: "2026-10-13T08:05:54Z" },
  liveStamp: "2026-10-12T16:00:33Z", pinnedStamp: "2026-09-29T17:02:52Z", baseline: { sha: "77d431abbbb" },
  fatal: [], auto: [], needsYou: [], review: []
};

test("datedLine gives both dates, the year once, and the commit", () => {
  assert.equal(render.datedLine(auto), "Likes: 0.5 → 0.6 in the Oct 12, 2026 sync, published Oct 13 (`e1a0375`)");
});

test("a dated line across a year boundary repeats the year on the publication date", () => {
  const f = Object.assign({}, auto, { arrivals: { paramRs: arr("2027-01-01T03:00:00Z", "2026-12-31T16:00:00Z") } });
  assert.equal(render.datedLine(f), "Likes: 0.5 → 0.6 in the Dec 31, 2026 sync, published Jan 1, 2027 (`e1a0375`)");
});

test("September is 'Sept', matching every date already in the repo", () => {
  assert.equal(render.day("2026-09-29T03:06:30Z", true), "Sept 29, 2026");
});

test("issueBody carries the hash marker, cc's the owner, and lists score-moving before inert", () => {
  const report = Object.assign({}, base, { needsYou: [
    { kind: "disagree", param: "rust_home_mixer_favorite_weight", label: "Likes", severity: "score-moving", repo: 0.5,
      live: { paramRs: 0.6, vmParams: 0.5 }, arrivals: { paramRs: auto.arrivals.paramRs } },
    { kind: "added", param: "rust_home_mixer_react_with_video_weight", label: null, severity: "inert", repo: null, live: { paramRs: 0, vmParams: 0 }, arrivals: {} }
  ] });
  const md = render.issueBody(report, { owner: "itsryanlenk" });
  assert.match(md, /^<!-- findings-hash: 0123456789abcdef -->/);
  assert.match(md, /cc @itsryanlenk/);
  assert.ok(md.indexOf("score-moving") < md.indexOf("inert"));
  assert.match(md, /upstream files disagree — param\.rs 0\.6 \(Oct 12, 2026 sync, published Oct 13, `e1a0375`\), vm-ranker\/params\.rs 0\.5\. weights\.js has 0\.5\./);
});

test("a long review list shows 5 commits per path and stays under GitHub's body limit", () => {
  const commits = Array.from({ length: 50 }, (_, i) => ({ sha: (i + "").padStart(7, "a"), date: "2026-10-0" + ((i % 9) + 1) + "T03:00:00Z" }));
  const line = render.reviewLine({ path: "home-mixer/filters/vf_filter.rs", baseline: "77d431a", facts: ["visibilityLimited"], commits });
  assert.match(line, /50 commits since `77d431a`/);
  assert.match(line, /and 45 earlier/);
  const review = Array.from({ length: 2000 }, (_, i) => ({ path: "p/" + i + ".rs", baseline: "77d431a", facts: ["f"], commits }));
  const md = render.issueBody(Object.assign({}, base, { review }), { runUrl: "https://example.test/run" });
  assert.ok(md.length <= render.MAX_BODY + 200, md.length);
  assert.match(md, /truncated/);
  assert.match(md, /^<!-- findings-hash: /, "the marker survives truncation");
});

test("issueComment @mentions the owner and counts what moved", () => {
  const report = Object.assign({}, base, { auto: [auto], needsYou: [{ severity: "score-moving" }, { severity: "inert" }] });
  assert.equal(render.issueComment(report, { owner: "itsryanlenk" }),
    "@itsryanlenk Upstream moved: 2 need you (1 score-moving), 1 mechanical, as of `e1a0375`. The issue body above is current.");
});

test("prBody flags red-on-purpose only when the ceiling moved, and reports gates", () => {
  const write = { changed: ["extension/weights.js"], staleLines: [{ file: "README.md", line: 98, figure: "0.000896", text: "rescaled into [0, 0.000896)" }],
    sums: { before: { positive: 43.24, negative: 371.54, total: 414.78, ceiling: "0.000896" }, after: { positive: 43.24, negative: 384.02, total: 427.26, ceiling: "0.000899" } },
    sumsMoved: true, ceilingMoved: true, stamp: null };
  const report = Object.assign({}, base, { auto: [auto], write });
  const md = render.prBody(report, { gates: [{ name: "Engine self-test", ok: false, tail: "1 failed" }, { name: "Package tests", ok: true, tail: "" }] });
  assert.match(md, /Red on purpose/);
  assert.match(md, /`README\.md:98` \(0\.000896\)/);
  assert.match(md, /\*\*Engine self-test\*\*: FAIL/);
  assert.match(md, /\*\*Package tests\*\*: pass/);
  assert.match(md, /`paramRsLastSync` not bumped/);
  const calm = render.prBody(Object.assign({}, report, { write: Object.assign({}, write, { ceilingMoved: false }) }), {});
  assert.doesNotMatch(calm, /Red on purpose/);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd packages/bangermeter-rank && node --test test/render.test.js`
Expected: FAIL, with `Cannot find module '../lib/render'`.

- [ ] **Step 3: Implement** `lib/render.js`

```js
"use strict";
// Markdown for the upstream-drift issue, its alert comments, and the draft PR.
// Everything here is derived from the report; it adds no claims of its own.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
const FILE_LABEL = { paramRs: "param.rs", vmParams: "vm-ranker/params.rs" };
const MAX_BODY = 60000; // GitHub rejects issue and PR bodies over 65,536 characters
const MAX_COMMITS = 5;

const short = sha => String(sha || "").slice(0, 7);
const fmt = v => (v === undefined || v === null ? "absent" : String(v));
const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");

function day(iso, withYear) {
  const d = new Date(iso);
  const s = MONTHS[d.getUTCMonth()] + " " + d.getUTCDate();
  return withYear ? s + ", " + d.getUTCFullYear() : s;
}

// "Oct 12, 2026 sync, published Oct 13". The year repeats only when it differs.
function when(a) {
  if (!a) return "date unknown";
  if (!a.stamp) return "published " + day(a.date, true);
  const differ = new Date(a.date).getUTCFullYear() !== new Date(a.stamp).getUTCFullYear();
  return day(a.stamp, true) + " sync, published " + day(a.date, differ);
}
const whenSha = a => when(a) + ", `" + short(a.sha) + "`";

function latest(arrivals) {
  return Object.values(arrivals || {}).sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0)).pop() || null;
}

function datedLine(f) {
  const head = f.label + ": " + fmt(f.repo) + " → " + fmt(f.live);
  const a = latest(f.arrivals);
  if (!a) return head + " (date unknown)";
  return head + (a.stamp ? " in the " : ", ") + when(a) + " (`" + short(a.sha) + "`)";
}

function needsYouLine(f) {
  const name = f.label ? "**" + f.label + "** (`" + f.param + "`)" : "`" + f.param + "`";
  const at = k => fmt(f.live[k]) + (f.arrivals && f.arrivals[k] ? " (" + whenSha(f.arrivals[k]) + ")" : "");
  if (f.kind === "disagree") {
    return name + ": upstream files disagree — " + Object.keys(FILE_LABEL).map(k => FILE_LABEL[k] + " " + at(k)).join(", ") + ". weights.js has " + fmt(f.repo) + ".";
  }
  if (f.kind === "added") {
    return "New head `" + f.param + "` — " + Object.keys(f.live).map(k => FILE_LABEL[k] + " " + at(k)).join(", ") + ". weights.js does not model it.";
  }
  if (f.kind === "removed") {
    return name + " is gone from " + f.missingFrom.map(k => FILE_LABEL[k] + (f.arrivals && f.arrivals[k] ? " (" + whenSha(f.arrivals[k]) + ")" : "")).join(", ") + ". weights.js has " + fmt(f.repo) + ".";
  }
  return f.message;
}

function reviewLine(r) {
  const shown = r.commits.slice(-MAX_COMMITS).map(c => "`" + short(c.sha) + "` " + day(c.date)).join(", ");
  const more = r.commits.length > MAX_COMMITS ? " and " + (r.commits.length - MAX_COMMITS) + " earlier" : "";
  return "`" + r.path + "` (cited by " + r.facts.join(", ") + ") — " + plural(r.commits.length, "commit") +
    " since `" + short(r.baseline) + "`: " + shown + more;
}

function cap(md, runUrl) {
  if (md.length <= MAX_BODY) return md;
  return md.slice(0, MAX_BODY) + "\n\n… truncated at " + MAX_BODY + " characters" +
    (runUrl ? "; the full report is in the [run log](" + runUrl + ")" : "") + ".";
}

function section(L, title, items) {
  if (!items.length) return;
  L.push("", "### " + title, "");
  for (const i of items) L.push("- " + i);
}

const issueTitle = () => "Upstream drift: xai-org/x-algorithm moved something Bangermeter depends on";

function issueBody(report, opts) {
  const o = opts || {};
  const L = ["<!-- findings-hash: " + report.hash + " -->"];
  if (o.owner) L.push("cc @" + o.owner);
  const h = report.upstreamHead;
  L.push("", "`xai-org/x-algorithm` at `" + short(h.sha) + "` (published " + day(h.date, true) + "). param.rs stamp `" +
    fmt(report.liveStamp) + "`; weights.js pins `" + fmt(report.pinnedStamp) + "`" +
    (report.baseline ? " (`" + short(report.baseline.sha) + "`)." : "."));
  section(L, "The alarm itself is broken", report.fatal.map(f => f.message));
  section(L, "Needs you — score-moving", report.needsYou.filter(f => f.severity === "score-moving").map(needsYouLine));
  section(L, "Needs you — inert (no score effect today)", report.needsYou.filter(f => f.severity !== "score-moving").map(needsYouLine));
  section(L, report.write ? "Mechanical — applied in the draft PR on `bot/upstream-sync`" : "Mechanical — not applied in this run",
    report.auto.map(datedLine));
  section(L, "Re-verify: cited files touched since they were checked", report.review.map(reviewLine));
  L.push("", "---", "Updated by the upstream-sync job" + (o.runUrl ? " ([run](" + o.runUrl + "))" : "") +
    ". It comments only when these findings change, and closes this issue once upstream and weights.js agree.");
  return cap(L.join("\n"), o.runUrl);
}

function issueComment(report, opts) {
  const o = opts || {};
  const moving = report.needsYou.filter(f => f.severity === "score-moving").length;
  const parts = [];
  if (report.fatal.length) parts.push(report.fatal.length + " broken");
  if (report.needsYou.length) parts.push(report.needsYou.length + " need you (" + moving + " score-moving)");
  if (report.auto.length) parts.push(report.auto.length + " mechanical");
  if (report.review.length) parts.push(plural(report.review.length, "cited file") + " to re-verify");
  return (o.owner ? "@" + o.owner + " " : "") + "Upstream moved: " + parts.join(", ") +
    ", as of `" + short(report.upstreamHead.sha) + "`. The issue body above is current.";
}

const closingComment = report => "Upstream (`" + short(report.upstreamHead.sha) +
  "`) and weights.js agree again, and no cited file has moved since it was checked. Closing.";

const prTitle = report => "Upstream sync: " + plural(report.auto.length, "value") + " from " + short(report.upstreamHead.sha);
const prClosingComment = report => "Nothing left to apply automatically as of `" + short(report.upstreamHead.sha) +
  "`. Closing; the `upstream-drift` issue has whatever remains.";
const prForeignComment = report => "Upstream moved again (`" + short(report.upstreamHead.sha) +
  "`), but this branch has commits from someone other than the bot, so I did not push. Mechanical values now:\n\n" +
  report.auto.map(f => "- " + datedLine(f)).join("\n");
const commitMessage = report => "Apply upstream values from " + short(report.upstreamHead.sha) + "\n\n" +
  report.auto.map(f => "- " + datedLine(f).replace(/`/g, "")).join("\n");

function prBody(report, opts) {
  const o = opts || {};
  const w = report.write || { changed: [], staleLines: [], sums: null, sumsMoved: false, ceilingMoved: false, stamp: null };
  const L = ["> Draft, opened by the upstream-sync job. It changes numbers in code and tests only; notes, `weightsSnapshot`, README, RESEARCH.md and store copy are yours. Anything it could not apply is in the open `upstream-drift` issue."];
  if (w.ceilingMoved) {
    L.push(">", "> **Red on purpose.** The negative-branch ceiling moved from " + w.sums.before.ceiling + " to " + w.sums.after.ceiling +
      ". `test.html` now expects the panel note (`sourcedFacts.negativeOffsetRule.note` in weights.js) to quote the new figure, and only a human edits that note.");
  }
  L.push("", "## Values", "", "| Head | Param | Was | Now | Sync | Published | Commit |", "|---|---|---|---|---|---|---|");
  for (const f of report.auto) {
    const a = latest(f.arrivals);
    L.push("| " + f.label + " | `" + f.param + "` | " + fmt(f.repo) + " | " + fmt(f.live) + " | " +
      (a && a.stamp ? "`" + a.stamp + "`" : "—") + " | " + (a ? "`" + a.date + "`" : "—") + " | " + (a ? "`" + short(a.sha) + "`" : "—") + " |");
  }
  if (w.sumsMoved) {
    L.push("", "Weight sums: " + ["positive", "negative", "total"].map(k => k + " " + w.sums.before[k] + " → " + w.sums.after[k]).join(", ") +
      "; ceiling " + w.sums.before.ceiling + " → " + w.sums.after.ceiling + ".");
  }
  L.push("", w.stamp ? "`paramRsLastSync` " + w.stamp.from + " → " + w.stamp.to + ": this PR resolves every weight finding."
    : "`paramRsLastSync` not bumped: the issue still has weight findings this PR does not resolve.");
  L.push("", "## Ready-to-paste dated lines", "");
  for (const f of report.auto) L.push("- " + datedLine(f));
  L.push("", "## Lines that quote an old figure", "");
  if (w.staleLines.length) for (const s of w.staleLines) L.push("- `" + s.file + ":" + s.line + "` (" + s.figure + "): " + s.text);
  else L.push("None found.");
  L.push("", "## Gates", "", "Run inside the job, because a PR opened by the bot does not trigger CI.", "");
  if (o.gates) {
    for (const g of o.gates) {
      L.push("- **" + g.name + "**: " + (g.ok ? "pass" : "FAIL"));
      if (!g.ok && g.tail) L.push("", "  ```", ...g.tail.split("\n").map(x => "  " + x), "  ```");
    }
  } else L.push("Not run.");
  if (o.runUrl) L.push("", "[Run log](" + o.runUrl + ")");
  return cap(L.join("\n"), o.runUrl);
}

module.exports = {
  MAX_BODY, day, when, datedLine, needsYouLine, reviewLine, issueTitle, issueBody, issueComment, closingComment,
  prTitle, prBody, prClosingComment, prForeignComment, commitMessage
};
```

- [ ] **Step 4: Run the tests**

Run: `cd packages/bangermeter-rank && node --test test/render.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/bangermeter-rank/lib/render.js packages/bangermeter-rank/test/render.test.js
git commit -m "Render the drift issue, its alerts, and the draft PR body"
```

---

### Task 5: Apply the auto bucket (`write.js`)

**Files:**
- Create: `packages/bangermeter-rank/lib/write.js`
- Create: `packages/bangermeter-rank/test/repo-fixture.js`
- Test: `packages/bangermeter-rank/test/write.test.js`

**Interfaces:**
- Consumes: `Report` (Task 3). Uses `auto[].{param, label, path, files, repo, live}`, `stampBump`, `pinnedStamp`, `liveStamp`.
- Produces:
  - `applyAuto({ root, report }) → { changed: string[], sums: { before, after }, sumsMoved, ceilingMoved, stamp: {from, to} | null, staleLines: [{ file, line, figure, text }] }`, where `sums.* = { positive, negative, total, ceiling }` and `ceiling` is a `toFixed(6)` string.
  - `WRITABLE: string[]` (the allowlist), `outsideAllowlist(paths) → string[]`, `formatLike(oldLiteral, n) → string`, `class WriteError`.
  - Test helper `makeRoot({ eol: "lf" | "crlf" }) → { dir, read(rel), write(rel, text), cleanup() }`.

- [ ] **Step 1: Write the test helper** `test/repo-fixture.js`

```js
"use strict";
// A throwaway copy of every file --write may read or touch, laid out like the repo.
const fs = require("fs");
const os = require("os");
const path = require("path");

const REPO = path.join(__dirname, "..", "..", "..");
const FILES = [
  "extension/weights.js", "extension/test.html", "extension/manifest.json",
  "packages/bangermeter-rank/package.json",
  "packages/bangermeter-rank/test/fixtures/param.rs", "packages/bangermeter-rank/test/fixtures/vm-params.rs",
  "packages/bangermeter-rank/test/sync.test.js", "packages/bangermeter-rank/test/modes.test.js", "packages/bangermeter-rank/test/report.test.js",
  "README.md", "RESEARCH.md", "store-assets/store-description.txt", "packages/bangermeter-rank/README.md"
];

function makeRoot(opts) {
  const eol = (opts && opts.eol) || "lf";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bmr-root-"));
  const write = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  };
  for (const rel of FILES) {
    const lf = fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");
    write(rel, eol === "crlf" ? lf.replace(/\n/g, "\r\n") : lf);
  }
  return {
    dir, write,
    read: rel => fs.readFileSync(path.join(dir, rel), "utf8"),
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  };
}

module.exports = { makeRoot, FILES };
```

- [ ] **Step 2: Write the failing tests** `test/write.test.js`

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const write = require("../lib/write");
const { sync, config: C } = require("..");
const { makeRoot } = require("./repo-fixture");

const W = "extension/weights.js", T = "extension/test.html";
const FXP = "packages/bangermeter-rank/test/fixtures/param.rs", FXV = "packages/bangermeter-rank/test/fixtures/vm-params.rs";
const NEW_STAMP = "2026-10-12T16:00:33Z";
const exp = sync.expected();
const finding = (param, live) => ({ kind: "value", param, label: "x", path: exp[param].path, files: exp[param].files, repo: exp[param].value, live });
const report = (auto, extra) => Object.assign({ auto, needsYou: [], stampBump: false, pinnedStamp: C.paramRsLastSync, liveStamp: NEW_STAMP }, extra);
const notes = text => text.split(/\r?\n/).filter(l => /note:/.test(l));

test("every synced param has exactly one write site in the real weights.js and fixtures", () => {
  const root = makeRoot();
  try {
    for (const [param, e] of Object.entries(exp)) {
      const r = write.applyAuto({ root: root.dir, report: report([finding(param, e.value)]) });
      assert.deepEqual(r.changed, [], param + " rewrote its own value");
    }
  } finally { root.cleanup(); }
});

test("a head change edits weights.js, the PARAM_RS table, the sums and both fixtures — nothing else", () => {
  const root = makeRoot();
  try {
    const before = { w: root.read(W), t: root.read(T) };
    const r = write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_favorite_weight", 0.6)]) });
    assert.deepEqual(r.changed.sort(), [T, W, FXP, FXV].sort());
    const w = root.read(W), t = root.read(T);
    assert.equal(w.replace("favorite: { weight: 0.6", "favorite: { weight: 0.5"), before.w, "only the one literal changed");
    assert.match(t, /favorite: 0\.6, reply: 5\.0/);
    assert.match(t, /check\("positive_sum = 43\.34", approx\(C\.weightSums\.positive, 43\.34, 1e-9\)/);
    assert.match(t, /check\("total_sum = 414\.88", approx\(C\.weightSums\.total, 414\.88, 1e-9\)/);
    assert.match(root.read(FXP), /"rust_home_mixer_favorite_weight",\s*0\.6/);
    assert.match(root.read(FXV), /"rust_home_mixer_favorite_weight",\s*0\.6/);
    assert.deepEqual(notes(w), notes(before.w), "no note string touched");
    assert.equal(r.sumsMoved, true);
    assert.equal(r.ceilingMoved, false, "0.000896 still rounds the same");
    assert.equal(r.stamp, null);
  } finally { root.cleanup(); }
});

test("running it twice changes nothing the second time", () => {
  const root = makeRoot();
  try {
    const rep = report([finding("rust_home_mixer_favorite_weight", 0.6)]);
    write.applyAuto({ root: root.dir, report: rep });
    assert.deepEqual(write.applyAuto({ root: root.dir, report: rep }).changed, []);
  } finally { root.cleanup(); }
});

test("a moved ceiling updates the test's expected figure, so the stale note goes red", () => {
  const root = makeRoot();
  try {
    const r = write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_not_interested_weight", -60.0)]) });
    assert.equal(r.ceilingMoved, true);
    assert.equal(r.sums.after.ceiling, "0.000899");
    const t = root.read(T);
    assert.match(t, /note quotes the current ceiling \(0\.000899\)/);
    assert.match(t, /\/0\\\.000899\/\.test\(SF\.negativeOffsetRule\.note\)/);
    assert.match(root.read(W), /0\.000896/, "the note itself is left for a human");
    assert.ok(r.staleLines.some(s => s.file === "README.md" && s.figure === "0.000896"));
    assert.ok(r.staleLines.some(s => s.file === "RESEARCH.md" && s.figure === "371.54"));
  } finally { root.cleanup(); }
});

test("a vm-only param edits weights.js and the vm fixture only, and moves no sum", () => {
  const root = makeRoot();
  try {
    const r = write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_oon_weight_factor", 0.8)]) });
    assert.deepEqual(r.changed.sort(), [W, FXV].sort());
    assert.equal(r.sumsMoved, false);
  } finally { root.cleanup(); }
});

test("the stamp moves in code and test pins only when the report allows it — never in prose or comments", () => {
  const root = makeRoot();
  try {
    const old = C.paramRsLastSync;
    const r = write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_favorite_weight", 0.6)], { stampBump: true }) });
    assert.deepEqual(r.stamp, { from: old, to: NEW_STAMP });
    const w = root.read(W);
    assert.match(w, new RegExp('paramRsLastSync: "' + NEW_STAMP + '"'));
    assert.match(w, new RegExp("weightsSnapshot: .*" + old), "the snapshot prose keeps its stamp");
    const t = root.read(T);
    assert.match(t, new RegExp('C\\.paramRsLastSync === "' + NEW_STAMP + '"'));
    assert.match(t, new RegExp("// home-mixer/params/param\\.rs \\(sync " + old + "\\)"), "comments untouched");
    assert.match(root.read(FXP), new RegExp("last sync " + NEW_STAMP));
    assert.doesNotMatch(root.read("packages/bangermeter-rank/test/sync.test.js"), new RegExp(old));
    assert.doesNotMatch(root.read("packages/bangermeter-rank/test/modes.test.js"), new RegExp(old));
  } finally { root.cleanup(); }
});

test("CRLF stays CRLF and test.html keeps its BOM", () => {
  const root = makeRoot({ eol: "crlf" });
  try {
    root.write(T, "\uFEFF" + root.read(T).replace(/^\uFEFF/, ""));
    write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_favorite_weight", 0.6)]) });
    for (const rel of [W, T, FXP]) assert.doesNotMatch(root.read(rel), /[^\r]\n/, rel + " gained a bare LF");
    assert.equal(root.read(T).charCodeAt(0), 0xFEFF);
  } finally { root.cleanup(); }
});

test("zero or several edit sites throw, and nothing is written", () => {
  const root = makeRoot();
  try {
    const before = root.read(W);
    const bad = Object.assign(finding("rust_home_mixer_favorite_weight", 0.6), { path: ["heads", "nosuch", "weight"] });
    assert.throws(() => write.applyAuto({ root: root.dir, report: report([bad]) }), write.WriteError);
    root.write(W, before.replace(/(\n\s*favorite: \{ weight: 0\.5[^\n]*)/, "$1$1"));
    assert.throws(() => write.applyAuto({ root: root.dir, report: report([finding("rust_home_mixer_favorite_weight", 0.6)]) }), /found 2/);
    assert.equal(root.read(FXP).includes('"rust_home_mixer_favorite_weight", 0.6'), false, "fixtures untouched");
  } finally { root.cleanup(); }
});

test("odd upstream literals are written in weights.js style", () => {
  assert.equal(write.formatLike("0.5", 0.6), "0.6");
  assert.equal(write.formatLike("5.0", 6), "6.0");
  assert.equal(write.formatLike("-234.0", -250), "-250.0");
  assert.equal(write.formatLike("10000", 15000), "15000");
  assert.equal(write.formatLike("0.00001", 1e-5), "0.00001");
});

test("refuses to run outside the repo; the allowlist is exact", () => {
  assert.throws(() => write.applyAuto({ root: require("os").tmpdir(), report: report([]) }), /inside the Bangermeter repo/);
  assert.deepEqual(write.outsideAllowlist(["extension/weights.js", "README.md", "extension\\test.html"]), ["README.md"]);
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `cd packages/bangermeter-rank && node --test test/write.test.js`
Expected: FAIL, with `Cannot find module '../lib/write'`.

- [ ] **Step 4: Implement** `lib/write.js`

```js
"use strict";
// --write: apply the report's AUTO bucket to the repo. Numbers in code and
// tests only. A note, weightsSnapshot, README, RESEARCH.md or store copy is
// never touched; the PR body lists the lines that quote an old figure
// instead. Every edit site must match exactly once, and nothing is written
// until all of them have.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const F = {
  weights: "extension/weights.js",
  testHtml: "extension/test.html",
  fxParam: "packages/bangermeter-rank/test/fixtures/param.rs",
  fxVm: "packages/bangermeter-rank/test/fixtures/vm-params.rs",
  userscript: "extension/bangermeter.user.js",
  stampTests: ["packages/bangermeter-rank/test/sync.test.js", "packages/bangermeter-rank/test/modes.test.js", "packages/bangermeter-rank/test/report.test.js"]
};
const WRITABLE = [F.weights, F.testHtml, F.userscript, F.fxParam, F.fxVm, ...F.stampTests];
const FIXTURE_FOR = { paramRs: F.fxParam, vmParams: F.fxVm };
const PROSE = ["README.md", "RESEARCH.md", "store-assets/store-description.txt", "packages/bangermeter-rank/README.md", F.weights];
const SUMS = ["positive", "negative", "total"];

const NUM = "-?\\d[\\d_]*(?:\\.\\d+)?(?:[eE][-+]?\\d+)?";
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class WriteError extends Error {}

// Write n the way the old literal was written: weights.js keeps ".0" on round numbers.
function formatLike(old, n) {
  return Number.isInteger(n) && /\./.test(old) ? n.toFixed(1) : String(n);
}

// Replace capture group 2 of the single match of `re` (group 1 is the prefix).
function replaceOnce(text, re, fn, where) {
  const hits = [...text.matchAll(re)];
  if (hits.length !== 1) throw new WriteError(where + ": expected exactly one edit site, found " + hits.length);
  const m = hits[0];
  const start = m.index + m[1].length;
  return text.slice(0, start) + fn(m[2]) + text.slice(start + m[2].length);
}

function replaceInBlock(text, open, close, re, fn, where) {
  const s = text.indexOf(open);
  if (s < 0) throw new WriteError(where + ": block `" + open + "` not found");
  const e = text.indexOf(close, s);
  return text.slice(0, s) + replaceOnce(text.slice(s, e), re, fn, where) + text.slice(e);
}

// The weights.js literal for a key path: `key: <num>` at top level, or the
// first `field:` inside the `obj: { … }` object (never crossing a brace).
function weightsSite(p) {
  if (p.length === 1) return new RegExp("^(\\s*" + esc(p[0]) + ":\\s*)(" + NUM + ")(?=\\s*,)", "gm");
  const [obj, field] = p.slice(-2);
  return new RegExp("^(\\s*" + esc(obj) + ":\\s*\\{[^{}]*?\\b" + esc(field) + ":\\s*)(" + NUM + ")", "gm");
}
const fixtureSite = param =>
  new RegExp("(param!\\(\\s*\\w+\\s*,\\s*[\\w:<>]+\\s*,\\s*\"" + esc(param) + "\"\\s*,\\s*)(" + NUM + ")", "g");
const tableSite = name => new RegExp("(\\b" + esc(name) + ":\\s*)(" + NUM + ")", "g");

function loadConfig(text) {
  const ctx = { Math, Object, Array, JSON, String, Number, isNaN, isFinite, parseFloat, parseInt, console };
  vm.createContext(ctx);
  vm.runInContext(text, ctx, { filename: "weights.js" });
  return ctx.BANGERMETER_CONFIG;
}

const round = n => +n.toFixed(10);
function sums(C) {
  const w = C.weightSums;
  return { positive: round(w.positive), negative: round(w.negative), total: round(w.total),
    ceiling: (w.negative / w.total * C.negativeScoresOffset).toFixed(6) };
}

function assertRepo(root) {
  const ok = fs.existsSync(path.join(root, "extension", "manifest.json")) &&
    fs.existsSync(path.join(root, "packages", "bangermeter-rank", "package.json"));
  if (!ok) throw new WriteError("--write only runs inside the Bangermeter repo (no extension/manifest.json under " + root + ")");
}

function figureRe(fig) {
  const variants = new Set([fig]);
  if (fig.startsWith("-")) variants.add("\u2212" + fig.slice(1));
  const n = Number(fig);
  if (Number.isInteger(n)) for (const v of [...variants]) variants.add(v + ".0");
  return new RegExp("(?<![\\d.])(?:" + [...variants].map(esc).join("|") + ")(?!\\d)");
}

// Lines in prose that quote a figure this write made stale. Weight values
// count only on a line that also names the head; sums and the ceiling are
// distinctive enough to count anywhere. Over-reporting is the safe direction.
function findStale(get, root, report, before, after, ceilingMoved) {
  const needles = report.auto.map(f => ({
    figure: String(f.repo), re: figureRe(String(f.repo)),
    names: [f.param, f.label, f.path.length > 1 ? f.path[f.path.length - 2] : f.path[0]].filter(Boolean).map(s => s.toLowerCase())
  }));
  for (const k of SUMS) if (before[k] !== after[k]) needles.push({ figure: String(before[k]), re: figureRe(String(before[k])), names: null });
  if (ceilingMoved) needles.push({ figure: before.ceiling, re: figureRe(before.ceiling), names: null });
  const out = [];
  for (const rel of PROSE) {
    if (!fs.existsSync(path.join(root, rel))) continue;
    get(rel).split(/\r?\n/).forEach((line, i) => {
      const lower = line.toLowerCase();
      const hit = needles.find(n => n.re.test(line) && (!n.names || n.names.some(x => lower.includes(x))));
      if (hit) out.push({ file: rel, line: i + 1, figure: hit.figure, text: line.trim().slice(0, 160) });
    });
  }
  return out;
}

function applyAuto({ root, report }) {
  assertRepo(root);
  const disk = rel => fs.readFileSync(path.join(root, rel), "utf8");
  const files = new Map();
  const get = rel => (files.has(rel) ? files.get(rel) : disk(rel));
  const set = (rel, text) => files.set(rel, text);
  // An unchanged value keeps its literal exactly (the fixtures write 10_000).
  const num = v => old => (Number(old.replace(/_/g, "")) === v ? old : formatLike(old, v));

  const before = sums(loadConfig(get(F.weights)));
  for (const f of report.auto) {
    set(F.weights, replaceOnce(get(F.weights), weightsSite(f.path), num(f.live), F.weights + " " + f.path.join(".")));
    if (f.path[0] === "heads") {
      set(F.testHtml, replaceInBlock(get(F.testHtml), "var PARAM_RS = {", "};", tableSite(f.path[1]), num(f.live), F.testHtml + " PARAM_RS." + f.path[1]));
    }
    for (const key of f.files) {
      set(FIXTURE_FOR[key], replaceOnce(get(FIXTURE_FOR[key]), fixtureSite(f.param), num(f.live), FIXTURE_FOR[key] + " " + f.param));
    }
  }
  const after = sums(loadConfig(get(F.weights)));
  const sumsMoved = SUMS.some(k => before[k] !== after[k]);
  const ceilingMoved = before.ceiling !== after.ceiling;
  if (sumsMoved) {
    for (const k of SUMS) {
      set(F.testHtml, replaceOnce(get(F.testHtml), new RegExp('(check\\("' + k + '_sum = )(' + NUM + ")", "g"), num(after[k]), F.testHtml + " " + k + "_sum name"));
      set(F.testHtml, replaceOnce(get(F.testHtml), new RegExp("(approx\\(C\\.weightSums\\." + k + ", )(" + NUM + ")", "g"), num(after[k]), F.testHtml + " " + k + "_sum value"));
    }
  }
  if (ceilingMoved) {
    // The test that pins the panel note to the ceiling must expect the NEW
    // figure; otherwise it stays green while the note is stale.
    set(F.testHtml, replaceOnce(get(F.testHtml), /(note quotes the current ceiling \()(0\.\d+)/g, () => after.ceiling, F.testHtml + " ceiling name"));
    set(F.testHtml, replaceOnce(get(F.testHtml), /(\/)(0\\\.\d+)(?=\/\.test\(SF\.negativeOffsetRule\.note\))/g, () => after.ceiling.replace(".", "\\."), F.testHtml + " ceiling regex"));
  }
  let stamp = null;
  if (report.stampBump && report.liveStamp && report.liveStamp !== report.pinnedStamp) {
    stamp = { from: report.pinnedStamp, to: report.liveStamp };
    set(F.weights, replaceOnce(get(F.weights), /(paramRsLastSync:\s*")([^"]+)(?=")/g, () => stamp.to, F.weights + " paramRsLastSync"));
    set(F.testHtml, replaceOnce(get(F.testHtml), /(C\.paramRsLastSync === ")([^"]+)(?=")/g, () => stamp.to, F.testHtml + " stamp check"));
    set(F.fxParam, replaceOnce(get(F.fxParam), /(last sync )(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)/g, () => stamp.to, F.fxParam + " stamp"));
    for (const rel of F.stampTests) set(rel, get(rel).split(stamp.from).join(stamp.to));
  }
  const staleLines = findStale(get, root, report, before, after, ceilingMoved);
  const changed = [];
  for (const [rel, text] of files) {
    if (text !== disk(rel)) { fs.writeFileSync(path.join(root, rel), text, "utf8"); changed.push(rel); }
  }
  return { changed, sums: { before, after }, sumsMoved, ceilingMoved, stamp, staleLines };
}

const outsideAllowlist = paths => paths.map(p => p.replace(/\\/g, "/")).filter(p => !WRITABLE.includes(p));

module.exports = { applyAuto, formatLike, outsideAllowlist, WRITABLE, WriteError };
```

- [ ] **Step 5: Run the tests**

Run: `cd packages/bangermeter-rank && node --test test/write.test.js`
Expected: PASS. If "every synced param has exactly one write site" fails, the message names the param and the count. Adjust `weightsSite`/`fixtureSite` to the real layout. Never change weights.js to suit the regex.

- [ ] **Step 6: Run the whole package suite, then commit**

Run: `cd packages/bangermeter-rank && npm test`
Expected: PASS.

```bash
git add packages/bangermeter-rank/lib/write.js packages/bangermeter-rank/test/repo-fixture.js packages/bangermeter-rank/test/write.test.js
git commit -m "Apply mechanical upstream values to code and tests, never prose"
```

---

### Task 6: CLI — `sync --history/--report/--write`

**Files:**
- Modify: `packages/bangermeter-rank/bin/bangermeter-rank.js` (USAGE at `:9-19`, `BOOLEAN` at `:22`, `sync` branch at `:149-165`)
- Modify: `packages/bangermeter-rank/lib/index.js` (exports)
- Test: `packages/bangermeter-rank/test/cli.test.js` (append)

**Interfaces:**
- Consumes: `drift.buildReport`, `drift.hash`, `write.applyAuto`, `render.datedLine/needsYouLine/reviewLine`.
- Produces: `bangermeter-rank sync --history CLONE [--head REF] [--report OUT.json] [--write [--root DIR]] [--json]`. Exit 0 when drift is reported, 1 on fatal, 2 on usage. `report.write` is set when `--write` applied anything. `index.js` exports `upstream`, `drift`, `render`, `write`, `publish`; `publish` itself arrives in Task 7, so add it there.

- [ ] **Step 1: Write the failing tests** (append to `test/cli.test.js`)

```js
const upstream = require("../lib/upstream");
const { makeRepo, fixture, setStamp, setValue } = require("./git-fixture");
const { makeRoot } = require("./repo-fixture");
const FAVP = "rust_home_mixer_favorite_weight";
const upstreamWith = (paramRsText, vmText) => makeRepo([
  { date: "2026-09-30T03:53:42Z", files: { [upstream.FILES.paramRs]: fixture("param.rs"), [upstream.FILES.vmParams]: fixture("vm-params.rs") } },
  { date: "2026-10-13T08:05:54Z", files: { [upstream.FILES.paramRs]: setStamp(paramRsText, "2026-10-12T16:00:33Z"), [upstream.FILES.vmParams]: vmText } }
]);

test("sync --history --report: drift is reported with exit 0, not a failure", () => {
  const up = upstreamWith(setValue(fixture("param.rs"), FAVP, "0.6"), fixture("vm-params.rs"));
  const out = path.join(dir, "drift.json");
  try {
    const r = run("sync", "--history", up.dir, "--report", out);
    assert.equal(r.status, 0, r.stderr);
    const rep = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.equal(rep.needsYou.find(f => f.param === FAVP).kind, "disagree");
    assert.equal(rep.write, undefined);
    assert.match(r.stdout, /NEEDS YOU/);
  } finally { up.cleanup(); }
});

test("sync --write applies auto findings under --root and records them in the report", () => {
  const up = upstreamWith(setValue(fixture("param.rs"), FAVP, "0.6"), setValue(fixture("vm-params.rs"), FAVP, "0.6"));
  const root = makeRoot();
  const out = path.join(dir, "drift-w.json");
  try {
    const r = run("sync", "--history", up.dir, "--report", out, "--write", "--root", root.dir);
    assert.equal(r.status, 0, r.stderr);
    const rep = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.ok(rep.write.changed.includes("extension/weights.js"));
    assert.match(root.read("extension/weights.js"), /favorite: \{ weight: 0\.6/);
  } finally { up.cleanup(); root.cleanup(); }
});

test("sync --history exits 1 when weights.js pins a stamp upstream never published", () => {
  const up = makeRepo([{ date: "2026-09-30T03:53:42Z", files: {
    [upstream.FILES.paramRs]: setStamp(fixture("param.rs"), "2026-09-25T16:24:28Z"), [upstream.FILES.vmParams]: fixture("vm-params.rs") } }]);
  try {
    const r = run("sync", "--history", up.dir);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /FATAL/);
  } finally { up.cleanup(); }
});

test("sync --write without --history or --report is a usage error", () => {
  assert.equal(run("sync", "--write").status, 2);
  assert.equal(run("sync", "--history", dir, "--write").status, 2);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd packages/bangermeter-rank && node --test test/cli.test.js`
Expected: the new tests FAIL. `sync --history` is currently treated as plain `sync`, which fetches live or exits 1.

- [ ] **Step 3: Implement.** In `lib/index.js`, add these to the exported object:

```js
  upstream: require("./upstream"),
  drift: require("./drift"),
  render: require("./render"),
  write: require("./write"),
```

In `bin/bangermeter-rank.js`, update USAGE's sync lines and the exit-code line:

```
  sync [--param-rs FILE --vm-params FILE] [--json]
  sync --history CLONE [--head REF] [--report OUT.json] [--write [--root DIR]] [--json]
```

```
Exit codes: 0 ok · 1 drift / gate failure · 2 usage or I/O error.
With --history, drift is reported (exit 0); 1 means the check itself is broken.
```

Change `BOOLEAN` to `new Set(["json", "help", "write"])`. At the top of the `if (cmd === "sync") {` branch, add:

```js
    if (a.history || a.report || a.write) return syncHistory(a);
```

Add these functions above `main()`:

```js
function syncHistory(a) {
  if (typeof a.history !== "string") die("--report and --write need --history CLONE (a clone of xai-org/x-algorithm)");
  if (a["param-rs"] || a["vm-params"]) die("--history reads both files from the clone; drop --param-rs/--vm-params");
  if (a.write && typeof a.report !== "string") die("--write needs --report OUT.json, so the job can publish what it wrote");
  let report;
  try { report = bmr.drift.buildReport({ clone: path.resolve(a.history), head: a.head }); }
  catch (e) { die("sync: " + e.message); }
  if (a.write && report.auto.length && !report.fatal.length) {
    const root = path.resolve(a.root || path.join(__dirname, "..", "..", ".."));
    try { report.write = bmr.write.applyAuto({ root, report }); }
    catch (e) { report.fatal.push({ kind: "write", file: null, message: e.message }); }
    report.hash = bmr.drift.hash(report);
  }
  if (typeof a.report === "string") fs.writeFileSync(a.report, JSON.stringify(report, null, 2) + "\n");
  if (a.json) console.log(JSON.stringify(report, null, 2)); else printDrift(report);
  return report.fatal.length ? 1 : 0;
}

function printDrift(r) {
  const plain = s => s.replace(/\*\*|`/g, "");
  console.log("upstream " + r.upstreamHead.sha.slice(0, 7) + " (" + r.upstreamHead.date + ") · stamp " + r.liveStamp +
    " · weights.js pins " + r.pinnedStamp + (r.baseline ? " (" + r.baseline.sha.slice(0, 7) + ")" : ""));
  r.fatal.forEach(f => console.error("FATAL      " + f.message));
  r.needsYou.forEach(f => console.log("NEEDS YOU  [" + f.severity + "] " + plain(bmr.render.needsYouLine(f))));
  r.auto.forEach(f => console.log("AUTO       " + plain(bmr.render.datedLine(f))));
  r.review.forEach(x => console.log("RE-VERIFY  " + plain(bmr.render.reviewLine(x))));
  if (r.write) console.log("wrote " + (r.write.changed.join(", ") || "nothing"));
  if (!r.fatal.length && !r.needsYou.length && !r.auto.length && !r.review.length) console.log("upstream sync ok: nothing moved");
}
```

- [ ] **Step 4: Run the whole package suite**

Run: `cd packages/bangermeter-rank && npm test`
Expected: PASS. The existing `sync` tests, which use no flags, are unchanged.

- [ ] **Step 5: Try it against the real clone** (read-only: no `--write`)

Run: `node packages/bangermeter-rank/bin/bangermeter-rank.js sync --history repo/x-algorithm --head origin/main`
Expected:
- exit 0
- 4 `NEEDS YOU [score-moving]` disagreements (`favorite`, `video_open`, `post_unexplored`, `cont_dwell_time`)
- 4 `NEEDS YOU [inert]` new heads, plus any inert bad citations (each names a weights.js citation to fix)
- no `AUTO`
- some `RE-VERIFY` lines

Save the output for Task 9's comparison.

- [ ] **Step 6: Commit**

```bash
git add packages/bangermeter-rank/bin/bangermeter-rank.js packages/bangermeter-rank/lib/index.js packages/bangermeter-rank/test/cli.test.js
git commit -m "Add sync --history, --report and --write to the CLI"
```

---

### Task 7: Publish planner (`publish.js`)

**Files:**
- Create: `packages/bangermeter-rank/lib/publish.js`
- Modify: `packages/bangermeter-rank/lib/index.js` (add `publish: require("./publish")`)
- Test: `packages/bangermeter-rank/test/publish.test.js`

**Interfaces:**
- Consumes: `render.*` (Task 4); the `Report` with optional `write` (Tasks 3, 5).
- Produces:
  - `plan(report, state, opts) → Action[]`, where `state = { issue: {number, open, hash} | null, pr: {number} | null, foreignCommits: boolean }` and `opts = { owner, runUrl, gates }`.
  - `Action` is one of:
    - `{type: "branch.push", branch, message}`
    - `{type: "pr.create", branch, title, body}`
    - `{type: "pr.update"|"pr.comment"|"pr.close", number, body}`
    - `{type: "issue.create", title, label, body}`
    - `{type: "issue.update"|"issue.comment"|"issue.close", number, body}`
    - `{type: "fail", message}`
  - Also exported: `hashFromBody(body) → string | null`, `LABEL = "upstream-drift"`, `BRANCH = "bot/upstream-sync"`, `BOT = "github-actions[bot]"`.

- [ ] **Step 1: Write the failing tests** `test/publish.test.js`

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { plan, hashFromBody, BRANCH } = require("../lib/publish");

const head = { sha: "e1a0375aaaa", date: "2026-10-13T08:05:54Z" };
const R = extra => Object.assign({ hash: "h1", upstreamHead: head, liveStamp: "s", pinnedStamp: "p", baseline: null,
  fatal: [], auto: [], needsYou: [{ kind: "added", param: "x", severity: "inert", live: { vmParams: 0 }, arrivals: {} }], review: [] }, extra);
const auto = [{ kind: "value", param: "p", label: "Likes", repo: 0.5, live: 0.6, arrivals: {} }];
const wrote = { changed: ["extension/weights.js"], staleLines: [], sums: null, sumsMoved: false, ceilingMoved: false, stamp: null };
const S = extra => Object.assign({ issue: null, pr: null, foreignCommits: false }, extra);
const types = actions => actions.map(a => a.type);
const O = { owner: "itsryanlenk" };

test("first sighting opens the issue, cc'ing the owner", () => {
  const a = plan(R(), S(), O);
  assert.deepEqual(types(a), ["issue.create"]);
  assert.match(a[0].body, /cc @itsryanlenk/);
  assert.equal(a[0].label, "upstream-drift");
});

test("the same findings again do nothing — open or closed (closed means dismissed)", () => {
  assert.deepEqual(plan(R(), S({ issue: { number: 7, open: true, hash: "h1" } }), O), []);
  assert.deepEqual(plan(R(), S({ issue: { number: 7, open: false, hash: "h1" } }), O), []);
});

test("new findings update the open issue and @mention once", () => {
  const a = plan(R(), S({ issue: { number: 7, open: true, hash: "old" } }), O);
  assert.deepEqual(types(a), ["issue.update", "issue.comment"]);
  assert.match(a[1].body, /^@itsryanlenk /);
});

test("a hand-edited body without the marker gets one update and comment, not a daily one", () => {
  assert.deepEqual(types(plan(R(), S({ issue: { number: 7, open: true, hash: null } }), O)), ["issue.update", "issue.comment"]);
});

test("new findings after the issue was closed open a new issue", () => {
  assert.deepEqual(types(plan(R(), S({ issue: { number: 7, open: false, hash: "old" } }), O)), ["issue.create"]);
});

test("nothing left closes the open issue, and a bot-only PR", () => {
  const clean = R({ needsYou: [] });
  assert.deepEqual(types(plan(clean, S({ issue: { number: 7, open: true, hash: "h1" }, pr: { number: 9 } }), O)), ["issue.close", "pr.close"]);
  assert.deepEqual(types(plan(clean, S({ issue: { number: 7, open: false, hash: "h1" } }), O)), []);
  assert.deepEqual(types(plan(clean, S({ pr: { number: 9 }, foreignCommits: true }), O)), [], "a branch with your commits stays open");
});

test("mechanical edits push the bot branch and open a draft PR before the issue", () => {
  const a = plan(R({ auto, write: wrote }), S(), O);
  assert.deepEqual(types(a), ["branch.push", "pr.create", "issue.create"]);
  assert.equal(a[0].branch, BRANCH);
  assert.match(a[0].message, /^Apply upstream values from e1a0375/);
});

test("an existing bot PR is force-updated when findings change", () => {
  assert.deepEqual(types(plan(R({ auto, write: wrote }), S({ issue: { number: 7, open: true, hash: "old" }, pr: { number: 9 } }), O)),
    ["branch.push", "pr.update", "issue.update", "issue.comment"]);
});

test("a branch carrying someone else's commits is never pushed; the PR gets a comment", () => {
  const a = plan(R({ auto, write: wrote }), S({ issue: { number: 7, open: true, hash: "old" }, pr: { number: 9 }, foreignCommits: true }), O);
  assert.deepEqual(types(a), ["pr.comment", "issue.update", "issue.comment"]);
});

test("auto now empty closes a bot-only PR", () => {
  assert.deepEqual(types(plan(R(), S({ issue: { number: 7, open: true, hash: "old" }, pr: { number: 9 } }), O)),
    ["pr.close", "issue.update", "issue.comment"]);
});

test("fatal findings never touch the PR, and fail the run every time", () => {
  const broken = R({ fatal: [{ kind: "baseline", message: "baseline: stamp gone" }], auto, write: wrote });
  assert.deepEqual(types(plan(broken, S({ issue: { number: 7, open: true, hash: "old" }, pr: { number: 9 } }), O)), ["issue.update", "issue.comment", "fail"]);
  assert.deepEqual(types(plan(broken, S({ issue: { number: 7, open: true, hash: "h1" }, pr: { number: 9 } }), O)), ["fail"]);
});

test("hashFromBody reads the marker", () => {
  assert.equal(hashFromBody("<!-- findings-hash: 0123456789abcdef -->\ncc"), "0123456789abcdef");
  assert.equal(hashFromBody("edited by hand"), null);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd packages/bangermeter-rank && node --test test/publish.test.js`
Expected: FAIL, with `Cannot find module '../lib/publish'`.

- [ ] **Step 3: Implement** `lib/publish.js`

```js
"use strict";
// What the upstream-sync job should do on GitHub, as data. plan() is pure:
// bin/upstream-publish.js gathers `state` with gh and git and carries the
// actions out, so every branch of this logic is testable without GitHub.
//
// One rolling issue, keyed by the findings hash in its body. Same hash: say
// nothing, even if Ryan closed it (closed = dismissed). New hash: update the
// open issue and comment once, or open a new one. Fatal: never touch the PR,
// and fail the run every time — a broken alarm must stay loud.
const render = require("./render");

const LABEL = "upstream-drift";
const BRANCH = "bot/upstream-sync";
const BOT = "github-actions[bot]";
const HASH_RE = /<!-- findings-hash: ([0-9a-f]+) -->/;

const hashFromBody = body => { const m = HASH_RE.exec(body || ""); return m ? m[1] : null; };
const count = r => r.fatal.length + r.auto.length + r.needsYou.length + r.review.length;

function plan(report, state, opts) {
  const o = opts || {};
  const issue = state.issue;
  const actions = [];
  if (!count(report)) {
    if (issue && issue.open) actions.push({ type: "issue.close", number: issue.number, body: render.closingComment(report) });
    if (state.pr && !state.foreignCommits) actions.push({ type: "pr.close", number: state.pr.number, body: render.prClosingComment(report) });
    return actions;
  }
  const fresh = !issue || issue.hash !== report.hash;
  if (fresh && !report.fatal.length) {
    const edits = report.auto.length && report.write && report.write.changed.length;
    if (edits && state.foreignCommits) {
      if (state.pr) actions.push({ type: "pr.comment", number: state.pr.number, body: render.prForeignComment(report) });
    } else if (edits) {
      actions.push({ type: "branch.push", branch: BRANCH, message: render.commitMessage(report) });
      const body = render.prBody(report, o);
      actions.push(state.pr ? { type: "pr.update", number: state.pr.number, body }
        : { type: "pr.create", branch: BRANCH, title: render.prTitle(report), body });
    } else if (state.pr && !state.foreignCommits) {
      actions.push({ type: "pr.close", number: state.pr.number, body: render.prClosingComment(report) });
    }
  }
  if (fresh) {
    const body = render.issueBody(report, o);
    if (issue && issue.open) {
      actions.push({ type: "issue.update", number: issue.number, body });
      actions.push({ type: "issue.comment", number: issue.number, body: render.issueComment(report, o) });
    } else {
      actions.push({ type: "issue.create", title: render.issueTitle(), label: LABEL, body });
    }
  }
  if (report.fatal.length) actions.push({ type: "fail", message: report.fatal.map(f => f.message).join("; ") });
  return actions;
}

module.exports = { plan, hashFromBody, LABEL, BRANCH, BOT };
```

Add `publish: require("./publish"),` to the object in `lib/index.js`.

- [ ] **Step 4: Run the whole package suite**

Run: `cd packages/bangermeter-rank && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/bangermeter-rank/lib/publish.js packages/bangermeter-rank/lib/index.js packages/bangermeter-rank/test/publish.test.js
git commit -m "Plan the issue and draft-PR updates as pure data"
```

---

### Task 8: Executor (`bin/upstream-publish.js`)

**Files:**
- Create: `packages/bangermeter-rank/bin/upstream-publish.js`
- Test: `packages/bangermeter-rank/test/upstream-publish.test.js`

**Interfaces:**
- Consumes: `publish.plan/hashFromBody/LABEL/BRANCH/BOT` (Task 7), `write.outsideAllowlist` (Task 5).
- Produces: `main(argv, deps) → exit code`. `deps = { run(cmd, args, opts) → {code, out, err}, env, readFile(path), log(msg) }`. The script runs `main` only when `require.main === module`.

- [ ] **Step 1: Write the failing tests** `test/upstream-publish.test.js`

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const pub = require("../bin/upstream-publish.js");

const head = { sha: "e1a0375aaaa", date: "2026-10-13T08:05:54Z" };
const R = extra => Object.assign({ hash: "h1", upstreamHead: head, liveStamp: "s", pinnedStamp: "p", baseline: null,
  fatal: [], auto: [], needsYou: [{ kind: "added", param: "x", severity: "inert", live: { vmParams: 0 }, arrivals: {} }], review: [] }, extra);
const AUTO = { auto: [{ kind: "value", param: "p", label: "Likes", repo: 0.5, live: 0.6, arrivals: {} }],
  write: { changed: ["extension/weights.js"], staleLines: [], sums: null, sumsMoved: false, ceilingMoved: false, stamp: null } };

function harness(report, responses) {
  const calls = [], logs = [];
  const run = (cmd, args) => {
    const key = [path.basename(cmd).replace(/\.exe$/i, ""), ...args].join(" ");
    calls.push(key);
    for (const [re, res] of responses || []) if (re.test(key)) return Object.assign({ code: 0, out: "", err: "" }, res);
    return { code: 0, out: "", err: "" };
  };
  const deps = { run, env: { GITHUB_REPOSITORY_OWNER: "itsryanlenk" }, readFile: () => JSON.stringify(report), log: m => logs.push(m) };
  return { calls, logs, code: () => pub.main(["--report", "drift.json"], deps) };
}
const NO_GH_STATE = [[/^gh issue list/, { out: "[]" }], [/^gh pr list/, { out: "[]" }], [/^git fetch/, { code: 1 }]];

test("a change outside the allowlist stops everything before GitHub is touched", () => {
  const h = harness(R(), [[/^git status/, { out: " M extension/weights.js\n M README.md" }]].concat(NO_GH_STATE));
  assert.equal(h.code(), 1);
  assert.ok(h.logs.join("\n").includes("README.md"));
  assert.equal(h.calls.filter(c => c.startsWith("gh ")).length, 0);
});

test("needs-you only: creates the label and the issue, pushes nothing, runs no gates", () => {
  const h = harness(R(), NO_GH_STATE);
  assert.equal(h.code(), 0);
  const label = h.calls.findIndex(c => c.startsWith("gh label create upstream-drift"));
  const issue = h.calls.findIndex(c => c.startsWith("gh issue create"));
  assert.ok(label >= 0 && issue > label);
  assert.ok(!h.calls.some(c => c.startsWith("git push")));
  assert.ok(!h.calls.some(c => c.includes("run-tests.js")));
});

test("mechanical edits: gates run, the bot branch is force-pushed as the bot, a draft PR opens", () => {
  const h = harness(R(AUTO), [[/^git status/, { out: " M extension/weights.js" }]].concat(NO_GH_STATE));
  assert.equal(h.code(), 0);
  const i = s => h.calls.findIndex(c => c.startsWith(s));
  assert.ok(i("node extension/run-tests.js") >= 0, "engine self-test ran");
  assert.ok(i("git switch -C bot/upstream-sync") < i("git push --force origin bot/upstream-sync"));
  assert.ok(h.calls.some(c => c.includes("user.name=github-actions[bot]")));
  assert.ok(i("gh pr create --draft --head bot/upstream-sync --base main") > i("git push"));
});

test("someone else's commits on the bot branch: comment, never push", () => {
  const h = harness(R(AUTO), [
    [/^git status/, { out: " M extension/weights.js" }],
    [/^gh issue list/, { out: JSON.stringify([{ number: 7, state: "OPEN", body: "<!-- findings-hash: old -->" }]) }],
    [/^gh pr list/, { out: JSON.stringify([{ number: 9 }]) }],
    [/^git log/, { out: "github-actions[bot]\nRyan Lenk" }]
  ]);
  assert.equal(h.code(), 0);
  assert.ok(h.calls.some(c => c.startsWith("gh pr comment 9")));
  assert.ok(!h.calls.some(c => c.startsWith("git push")));
});

test("a fatal report is published, then fails the run", () => {
  const h = harness(R({ fatal: [{ kind: "baseline", message: "baseline: stamp gone" }] }), [
    [/^gh issue list/, { out: JSON.stringify([{ number: 7, state: "OPEN", body: "<!-- findings-hash: old -->" }]) }],
    [/^gh pr list/, { out: "[]" }], [/^git fetch/, { code: 1 }]
  ]);
  assert.equal(h.code(), 1);
  assert.ok(h.calls.some(c => c.startsWith("gh issue edit 7")));
  assert.ok(h.logs.join("\n").includes("baseline: stamp gone"));
});

test("PR creation refused by the repo setting fails red, naming the setting", () => {
  const h = harness(R(AUTO), [[/^git status/, { out: " M extension/weights.js" }],
    [/^gh pr create/, { code: 1, err: "GraphQL: GitHub Actions is not permitted to create or approve pull requests" }]].concat(NO_GH_STATE));
  assert.equal(h.code(), 1);
  assert.match(h.logs.join("\n"), /Allow GitHub Actions to create and approve pull requests/);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd packages/bangermeter-rank && node --test test/upstream-publish.test.js`
Expected: FAIL, with `Cannot find module '../bin/upstream-publish.js'`.

- [ ] **Step 3: Implement** `bin/upstream-publish.js`

```js
#!/usr/bin/env node
"use strict";
// Runs in the upstream-sync job after `sync --history … --report … --write`.
// Guards the diff against the write allowlist, runs the gates a bot-opened PR
// would never get, reads GitHub state, and carries out publish.plan().
// Exit 1 means the automation itself is broken. Drift alone exits 0.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { publish, write } = require("../lib");

const ROOT = path.join(__dirname, "..", "..", "..");
const GATES = [
  { name: "Engine self-test", args: ["extension/run-tests.js"] },
  { name: "Version and test-count claims", args: ["store-assets/check-versions.js"] },
  { name: "Package tests", args: ["--test", "test/*.test.js"], cwd: "packages/bangermeter-rank" },
  { name: "Copy + Numbers gates", args: ["packages/bangermeter-rank/bin/bangermeter-rank.js", "gate"] }
];
const PR_SETTING_HINT = "Enable Settings → Actions → General → \"Allow GitHub Actions to create and approve pull requests\" on the repo.";

function realRun(cmd, args, opts) {
  const r = spawnSync(cmd, args, { cwd: path.join(ROOT, (opts && opts.cwd) || ""), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status === null ? 1 : r.status, out: (r.stdout || "").trim(), err: (r.stderr || r.error && r.error.message || "").trim() };
}

class Broken extends Error {}
function must(r, what) {
  if (r.code !== 0) throw new Broken(what + " failed: " + (r.err || r.out || "exit " + r.code));
  return r;
}

function changedFiles(run) {
  return must(run("git", ["status", "--porcelain", "--untracked-files=all"]), "git status").out
    .split("\n").filter(Boolean).map(l => l.slice(3).replace(/^"|"$/g, ""));
}

function gather(run) {
  const issues = JSON.parse(must(run("gh", ["issue", "list", "--label", publish.LABEL, "--state", "all", "--limit", "1", "--json", "number,state,body"]), "gh issue list").out || "[]");
  const issue = issues[0] ? { number: issues[0].number, open: issues[0].state === "OPEN", hash: publish.hashFromBody(issues[0].body) } : null;
  const prs = JSON.parse(must(run("gh", ["pr", "list", "--head", publish.BRANCH, "--state", "open", "--limit", "1", "--json", "number"]), "gh pr list").out || "[]");
  let foreignCommits = false;
  if (run("git", ["fetch", "--quiet", "origin", publish.BRANCH]).code === 0) {
    const authors = run("git", ["log", "--format=%an", "HEAD..FETCH_HEAD"]).out.split("\n").filter(Boolean);
    foreignCommits = authors.some(a => a !== publish.BOT);
  }
  return { issue, pr: prs[0] ? { number: prs[0].number } : null, foreignCommits };
}

function runGates(run) {
  return GATES.map(g => {
    const r = run(process.execPath, g.args, { cwd: g.cwd });
    return { name: g.name, ok: r.code === 0, tail: (r.out + "\n" + r.err).trim().split("\n").slice(-15).join("\n") };
  });
}

function execute(actions, run) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bmr-publish-"));
  let n = 0;
  const bodyFile = body => { const f = path.join(tmp, (n++) + ".md"); fs.writeFileSync(f, body); return f; };
  let failed = null;
  try {
  for (const a of actions) {
    if (a.type === "branch.push") {
      must(run("git", ["switch", "-C", a.branch]), "git switch");
      must(run("git", ["add", "-A"]), "git add");
      must(run("git", ["-c", "user.name=" + publish.BOT, "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
        "commit", "-q", "-m", a.message]), "git commit");
      must(run("git", ["push", "--force", "origin", a.branch]), "git push");
    } else if (a.type === "pr.create") {
      const r = run("gh", ["pr", "create", "--draft", "--head", a.branch, "--base", "main", "--title", a.title, "--body-file", bodyFile(a.body)]);
      if (r.code !== 0 && /not permitted to create or approve pull requests/i.test(r.err)) throw new Broken("gh pr create refused. " + PR_SETTING_HINT);
      must(r, "gh pr create");
    } else if (a.type === "pr.update") must(run("gh", ["pr", "edit", String(a.number), "--body-file", bodyFile(a.body)]), "gh pr edit");
    else if (a.type === "pr.comment") must(run("gh", ["pr", "comment", String(a.number), "--body-file", bodyFile(a.body)]), "gh pr comment");
    else if (a.type === "pr.close") must(run("gh", ["pr", "close", String(a.number), "--comment", a.body]), "gh pr close");
    else if (a.type === "issue.create") {
      run("gh", ["label", "create", a.label, "--color", "B60205", "--force",
        "--description", "X's published algorithm moved something Bangermeter depends on"]);
      must(run("gh", ["issue", "create", "--title", a.title, "--label", a.label, "--body-file", bodyFile(a.body)]), "gh issue create");
    } else if (a.type === "issue.update") must(run("gh", ["issue", "edit", String(a.number), "--body-file", bodyFile(a.body)]), "gh issue edit");
    else if (a.type === "issue.comment") must(run("gh", ["issue", "comment", String(a.number), "--body-file", bodyFile(a.body)]), "gh issue comment");
    else if (a.type === "issue.close") must(run("gh", ["issue", "close", String(a.number), "--comment", a.body]), "gh issue close");
    else if (a.type === "fail") failed = a.message;
  }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  return failed;
}

function main(argv, deps) {
  const i = argv.indexOf("--report");
  if (i < 0 || !argv[i + 1]) { deps.log("usage: upstream-publish.js --report drift.json"); return 2; }
  try {
    const report = JSON.parse(deps.readFile(argv[i + 1]));
    const files = changedFiles(deps.run);
    const outside = write.outsideAllowlist(files);
    if (outside.length) throw new Broken("refusing to publish: changes outside the write allowlist: " + outside.join(", "));
    const gates = files.length ? runGates(deps.run) : null;
    const env = deps.env;
    const runUrl = env.GITHUB_RUN_ID ? (env.GITHUB_SERVER_URL || "https://github.com") + "/" + env.GITHUB_REPOSITORY + "/actions/runs/" + env.GITHUB_RUN_ID : null;
    const actions = publish.plan(report, gather(deps.run), { owner: env.GITHUB_REPOSITORY_OWNER, runUrl, gates });
    const failed = execute(actions, deps.run);
    deps.log("upstream-publish: " + (actions.map(a => a.type).join(", ") || "nothing to do"));
    if (failed) { deps.log("upstream-sync is broken: " + failed); return 1; }
    return 0;
  } catch (e) {
    deps.log("upstream-publish: " + e.message);
    return 1;
  }
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2), {
    run: realRun, env: process.env, readFile: f => fs.readFileSync(f, "utf8"), log: m => console.error(m)
  }));
}

module.exports = { main, gather, execute, changedFiles, runGates };
```

- [ ] **Step 4: Run the whole package suite**

Run: `cd packages/bangermeter-rank && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/bangermeter-rank/bin/upstream-publish.js packages/bangermeter-rank/test/upstream-publish.test.js
git commit -m "Publish drift to the issue and the bot's draft PR"
```

---

### Task 9: Workflow, docs, and the Linux userscript check

**Files:**
- Modify: `.github/workflows/bangermeter-rank.yml` (whole file)
- Modify: `packages/bangermeter-rank/README.md` (the `sync` section)

**Interfaces:**
- Consumes: the CLI from Task 6 and the executor from Task 8.

- [ ] **Step 1: Replace the workflow.** Write `.github/workflows/bangermeter-rank.yml` as follows:

```yaml
name: bangermeter-rank

# Tests and ship gates on every push and PR. Once a day, upstream-sync checks
# xai-org/x-algorithm for anything Bangermeter depends on: drift goes to one
# rolling `upstream-drift` issue, mechanical edits to a draft PR on
# bot/upstream-sync. A red scheduled run means the automation itself broke.
on:
  push:
  pull_request:
  schedule:
    # X stamps param.rs at 16:00 UTC and publishes the next day, 01:00-08:00 UTC.
    - cron: "30 9 * * *"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  test:
    if: github.event_name != 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Engine self-test
        run: node extension/run-tests.js
      - name: Version and test-count claims
        run: node store-assets/check-versions.js
      - name: Package tests
        working-directory: packages/bangermeter-rank
        run: npm test
      - name: Copy + Numbers gates
        run: node packages/bangermeter-rank/bin/bangermeter-rank.js gate
      - name: Userscript is rebuilt from current sources
        run: |
          pwsh -NoProfile -File store-assets/make-userscript.ps1
          git diff --exit-code -- extension/bangermeter.user.js

  # Only on the schedule or by hand: a PR should not go red because X moved
  # something overnight.
  upstream-sync:
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
    concurrency:
      group: upstream-sync
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Clone xai-org/x-algorithm (blobless, full history)
        run: git clone --quiet --filter=blob:none https://github.com/xai-org/x-algorithm.git "$RUNNER_TEMP/x-algorithm"
      - name: Report drift and apply the mechanical edits
        continue-on-error: true
        run: node packages/bangermeter-rank/bin/bangermeter-rank.js sync --history "$RUNNER_TEMP/x-algorithm" --report "$RUNNER_TEMP/drift.json" --write
      - name: Rebuild the userscript
        run: pwsh -NoProfile -File store-assets/make-userscript.ps1
      - name: Publish to the upstream-drift issue and the draft PR
        env:
          GH_TOKEN: ${{ github.token }}
        run: node packages/bangermeter-rank/bin/upstream-publish.js --report "$RUNNER_TEMP/drift.json"
```

- [ ] **Step 2: Document the flags.** In `packages/bangermeter-rank/README.md`, edit the `## Weight sync` section (lines 69–87):
- Replace the last sentence pair ("The `weight-sync` job in … moved a weight overnight.") with: "Plain `sync` is the quick check; the daily CI job uses `--history`, below."
- Then insert this subsection immediately before `## Gates`:

```markdown
### Upstream history (`sync --history`)

`sync --history CLONE` reads both param files from a local clone of
`xai-org/x-algorithm` and sorts every finding into one bucket:

- **auto**: both upstream files agree on a new value.
- **needs you**: a head was added or removed, the two files disagree, or a citation does not resolve.
- **re-verify**: a file weights.js cites has been touched since it was checked.

Each value is dated from the history of its own file. The publication date
is the commit, and the sync date is the `param.rs` stamp at that commit.

- `--report OUT.json` writes the findings.
- `--write` applies only the auto bucket: numbers in code and tests, never
  prose. Run it from the repo.

With `--history`, drift exits 0, because it is reported rather than failed.
1 means the check itself is broken. The daily `upstream-sync` CI job runs
this, then `bin/upstream-publish.js`, which keeps one `upstream-drift` issue
and one draft PR on `bot/upstream-sync` current.
```

- [ ] **Step 3: Run every local gate**

Run (from repo root):

```bash
node extension/run-tests.js
node store-assets/check-versions.js
node packages/bangermeter-rank/bin/bangermeter-rank.js gate
cd packages/bangermeter-rank && npm test
```

Expected: all pass. If `gate` flags a figure in the new README section, reword the section without the figure. Never add receipts to make the gate pass.

- [ ] **Step 4: Commit and push the branch** (pushing is pre-approved by this plan; the branch is not `main`)

```bash
git add .github/workflows/bangermeter-rank.yml packages/bangermeter-rank/README.md
git commit -m "Run upstream-sync daily at 09:30 UTC and publish what it finds"
git push -u origin feat/upstream-sync-automation
```

- [ ] **Step 5: Read the push run.** This is the Linux userscript-parity spike.

Run: `gh run list --branch feat/upstream-sync-automation --limit 1`. When it completes, run `gh run view <id> --log-failed`.

Expected: `test` is green, including "Userscript is rebuilt from current sources".

If **only** that step is red, Linux `pwsh` output differs from the Windows build. Fall back as follows:
- Remove the "Userscript is rebuilt…" step from `test`.
- Remove the "Rebuild the userscript" step from `upstream-sync`.
- Remove `extension/bangermeter.user.js` from `WRITABLE` in `lib/write.js` (update the `outsideAllowlist` test accordingly).
- In `render.prBody`, add the line `"- Rebuild the userscript on Windows: \`store-assets/make-userscript.ps1\`."` under a `## Still to do by hand` heading.
- Commit as "Leave the userscript rebuild to Windows" and push.

---

### Task 10: End-to-end acceptance against live upstream

**Files:** none changed unless a defect is found. If one is, fix it with a failing test first, in the task that owns the code.

- [ ] **Step 1: Ask Ryan before dispatching.** The run creates a public issue on `itsryanlenk/bangermeter` that @mentions him. Wait for a clear yes.

- [ ] **Step 2: Dispatch from the feature branch**

Run: `gh workflow run bangermeter-rank.yml --ref feat/upstream-sync-automation`, then `gh run watch <id>`.
Expected:
- The `upstream-sync` job is green.
- `gh issue list --label upstream-drift` shows one open issue.
- Its body has the hash marker, `cc @itsryanlenk`, 4 score-moving disagreements, 4 inert new heads, a re-verify list, and no mechanical section.
- `gh pr list --head bot/upstream-sync` is empty.
- The findings match Task 6 Step 5's local output.

- [ ] **Step 3: Dispatch again**

Expected: green, and the issue has **no** new comment and an unchanged body (`gh issue view <n> --comments`). The log ends `upstream-publish: nothing to do`.

- [ ] **Step 4: Record the outcome** in the PR description written later (the issue number and both run URLs). Do not edit the issue by hand.
