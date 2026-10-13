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
