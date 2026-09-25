"use strict";
// Client-facing copy, verbatim from AGENT-HANDOFF-2026-09-23 §2–§3. Every mode
// result carries its headline and subhead so no screen can render without them.
// Figures in this file must resolve in receipts/ — the Numbers Gate checks it.

const MODES = {
  checklist: {
    label: "C — Content checklist",
    headline: "Draft checklist against published weights",
    subhead: "C does not forecast reach or likes. Use it to see which weight heads your draft is aiming at."
  },
  engagement: {
    label: "E — Engagement score (retrospective)",
    headline: "How this matured post’s rates compare",
    subhead: "E uses observed engagement. Strong correlation with like rate when views ≥ 2,000 is expected because E is built from those rates."
  },
  stealability: {
    label: "Stealability — template ranking",
    headline: "What people save to reuse",
    subhead: "Bookmarks are not a Phoenix ranking head. This is a human stealability lens."
  },
  audit: {
    label: "Account audit — best posts on this account",
    headline: "Best and worst posts, by like rate inside matched view bands",
    subhead: "Posts at least 48 hours old, compared only with posts that reached a similar number of people. Misses are shown beside winners. C is a checklist, not a forecast, and never caused an outcome."
  }
};

const HONESTY = [
  "Weights multiply predicted P(action), not raw counts. X rejects “1 report = 468 likes” style readings.",
  "Public views are not Creator Studio qualified Premium Home Timeline / OCR impressions.",
  "E is ignored for decisions under 2,000 views.",
  "Bookmarks are not a For You weight.",
  "C is a checklist, not a forecast (validation Spearman C vs like rate 0.0809 on n=918; viral-sample Spearman −0.187 on n=662).",
  "No causal “this format makes you viral” claim without a designed control. The viral sample has no non-viral control — associations only inside the viral gate."
];

const LOW_SAMPLE_NOTE = "Under 2,000 views — E is shown for context only and is not used for ranking or badges.";

function allText() {
  const parts = [];
  for (const m of Object.values(MODES)) parts.push(m.label, m.headline, m.subhead);
  return parts.concat(HONESTY, [LOW_SAMPLE_NOTE]).join("\n");
}

module.exports = { MODES, HONESTY, LOW_SAMPLE_NOTE, allText };
