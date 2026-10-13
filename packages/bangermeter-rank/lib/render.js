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
