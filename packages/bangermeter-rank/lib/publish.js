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
