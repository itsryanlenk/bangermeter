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
// GitHub refused the PR (the repo setting is off). main() still publishes the issue.
class PrRefused extends Error {}
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
  const issue = issues[0] ? { number: issues[0].number, open: issues[0].state === "OPEN", hash: publish.hashFromBody(issues[0].body), pending: publish.pendingFromBody(issues[0].body) } : null;
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
  try {
    let failed = null;
    for (const a of actions) failed = act(a, run, bodyFile) || failed;
    return failed;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// Carries out one action. Returns the message of a "fail" action, else null.
function act(a, run, bodyFile) {
  if (a.type === "branch.push") {
    must(run("git", ["switch", "-C", a.branch]), "git switch");
    must(run("git", ["add", "-A"]), "git add");
    must(run("git", ["-c", "user.name=" + publish.BOT, "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
      "commit", "-q", "-m", a.message]), "git commit");
    must(run("git", ["push", "--force", "origin", a.branch]), "git push");
  } else if (a.type === "pr.create") {
    const r = run("gh", ["pr", "create", "--draft", "--head", a.branch, "--base", "main", "--title", a.title, "--body-file", bodyFile(a.body)]);
    if (r.code !== 0 && /not permitted to create or approve pull requests/i.test(r.err)) throw new PrRefused("gh pr create refused. " + PR_SETTING_HINT);
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
  else if (a.type === "fail") return a.message;
  return null;
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
    const state = gather(deps.run);
    const opts = { owner: env.GITHUB_REPOSITORY_OWNER, runUrl, gates };
    const actions = publish.plan(report, state, opts);
    let failed;
    try { failed = execute(actions, deps.run); }
    catch (e) {
      if (!(e instanceof PrRefused)) throw e;
      // Publish the issue anyway, marked pr-pending so the next run retries the PR.
      const issueOnly = publish.plan(report, state, Object.assign({ prRefused: true }, opts)).filter(a => a.type.startsWith("issue."));
      execute(issueOnly, deps.run);
      throw new Broken(e.message);
    }
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
