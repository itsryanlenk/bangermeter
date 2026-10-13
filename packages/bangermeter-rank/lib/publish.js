"use strict";
// What the upstream-sync job should do on GitHub, as data. plan() is pure:
// bin/upstream-publish.js gathers `state` with gh and git and carries the
// actions out, so every branch of this logic is testable without GitHub.
//
// One rolling issue, keyed by the findings hash in its body. Same hash: say
// nothing, even if Ryan closed it (closed = dismissed). New hash: update the
// open issue and comment once, or open a new one. Fatal: never touch the PR,
// and fail the run every time — a broken alarm must stay loud. A PR that
// GitHub refused leaves the issue marked "pr-pending", so the next run
// retries the PR without commenting again.
const render = require("./render");

const LABEL = "upstream-drift";
const BRANCH = "bot/upstream-sync";
const BOT = "github-actions[bot]";
const HASH_RE = /<!-- findings-hash: ([0-9a-f]+)( pr-pending)? -->/;

const hashFromBody = body => { const m = HASH_RE.exec(body || ""); return m ? m[1] : null; };
const pendingFromBody = body => { const m = HASH_RE.exec(body || ""); return !!(m && m[2]); };
const count = r => r.fatal.length + r.auto.length + r.needsYou.length + r.review.length;

function plan(report, state, opts) {
  const o = opts || {};
  const issue = state.issue;
  const actions = [];
  // Someone else's commits only protect a branch with an open PR. Left over
  // after a merge or a close, they would otherwise stop the bot for good.
  const foreign = !!state.pr && state.foreignCommits;
  if (!count(report)) {
    if (issue && issue.open) actions.push({ type: "issue.close", number: issue.number, body: render.closingComment(report) });
    if (state.pr && !foreign) actions.push({ type: "pr.close", number: state.pr.number, body: render.prClosingComment(report) });
    return actions;
  }
  const changed = !issue || issue.hash !== report.hash;
  const fresh = changed || !!(issue && issue.open && issue.pending);
  // What the issue may say happened: "pushed", "held", "refused" or "none".
  let mechanical = o.prRefused ? "refused" : "none";
  if (fresh && !report.fatal.length && !o.prRefused) {
    const edits = report.auto.length && report.write && report.write.changed.length;
    if (edits && foreign) {
      mechanical = "held";
      actions.push({ type: "pr.comment", number: state.pr.number, body: render.prForeignComment(report) });
    } else if (edits) {
      mechanical = "pushed";
      actions.push({ type: "branch.push", branch: BRANCH, message: render.commitMessage(report) });
      const body = render.prBody(report, o);
      actions.push(state.pr ? { type: "pr.update", number: state.pr.number, body }
        : { type: "pr.create", branch: BRANCH, title: render.prTitle(report), body });
    } else if (state.pr && !foreign) {
      actions.push({ type: "pr.close", number: state.pr.number, body: render.prClosingComment(report) });
    }
  }
  if (fresh) {
    const body = render.issueBody(report, Object.assign({}, o, { mechanical, pending: !!o.prRefused }));
    if (issue && issue.open) {
      actions.push({ type: "issue.update", number: issue.number, body });
      // A retry of a pending PR is not news; only changed findings are.
      if (changed) actions.push({ type: "issue.comment", number: issue.number, body: render.issueComment(report, o) });
    } else {
      actions.push({ type: "issue.create", title: render.issueTitle(), label: LABEL, body });
    }
  }
  if (report.fatal.length) actions.push({ type: "fail", message: report.fatal.map(f => f.message).join("; ") });
  return actions;
}

module.exports = { plan, hashFromBody, pendingFromBody, LABEL, BRANCH, BOT };
