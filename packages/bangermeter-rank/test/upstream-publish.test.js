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
