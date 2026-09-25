"use strict";
// Weight sync (handoff §4): compare X's live published parameters with the
// engine's weights.js and fail loudly on any drift.
//
// Since the 2026-09-23 upstream sync the weights are declared in TWO files —
// home-mixer/params/param.rs and vm-ranker/params.rs — and the OON factor and
// author-diversity parameters live only in the second. Both are checked, and
// the two disagreeing with each other is itself drift.
const { C } = require("./engine");

const RAW = "https://raw.githubusercontent.com/xai-org/x-algorithm/main/";
const SOURCES = {
  paramRs: RAW + "home-mixer/params/param.rs",
  vmParams: RAW + "vm-ranker/params.rs"
};

// Handoff §4: fail loudly on these. Every other head still fails the check;
// these are flagged critical so the message says which ones move scores most.
const CRITICAL = new Set([
  "rust_home_mixer_favorite_weight", "rust_home_mixer_reply_weight", "rust_home_mixer_report_weight",
  "rust_home_mixer_oon_weight_factor", "rust_home_mixer_video_open_weight",
  "rust_home_mixer_vqv_weight", "rust_home_mixer_dwell_weight"
]);

const PARAM_RE = /param!\(\s*(\w+)\s*,\s*([\w:<>]+)\s*,\s*"([^"]+)"\s*,\s*([\s\S]*?)\s*,?\s*\)\s*;/g;

function parse(src) {
  const stamp = /last sync (\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)/.exec(src);
  const params = {};
  for (const m of String(src).matchAll(PARAM_RE)) {
    const raw = m[4].trim().replace(/_/g, "");
    const v = Number(raw);
    if (raw !== "" && isFinite(v)) params[m[3]] = v;
  }
  return { lastSync: stamp ? stamp[1] : null, params };
}

// What the engine claims, keyed by feature-switch name.
function expected() {
  const heads = {};
  for (const [name, h] of Object.entries(C.heads)) heads[h.param] = { value: h.weight, what: "head " + name };
  const other = {};
  const r = C.rescorers;
  other[r.outOfNetwork.param] = { value: r.outOfNetwork.factor, what: "rescorer outOfNetwork" };
  other[r.topicOutOfNetwork.param] = { value: r.topicOutOfNetwork.factor, what: "rescorer topicOutOfNetwork" };
  other[r.authorDiversity.param] = { value: r.authorDiversity.decay, what: "author diversity decay" };
  other[r.authorDiversity.floorParam] = { value: r.authorDiversity.floor, what: "author diversity floor" };
  other.rust_home_mixer_bidirectional_follow_reply_weight_boost = { value: C.bidirectionalFollowReplyBoost, what: "mutual-follow reply boost" };
  other.rust_home_mixer_bidirectional_follow_dwell_weight_boost = { value: C.bidirectionalFollowDwellBoost, what: "mutual-follow dwell boost" };
  other[C.sourcedFacts.minVideoDurationMs.param] = { value: C.sourcedFacts.minVideoDurationMs.value, what: "min video duration ms" };
  return { heads, other };
}

// A weight head, as X names them: rust_home_mixer_<action>_weight. Boost and
// factor parameters are not heads and are checked by name instead.
const isHeadParam = k => /^rust_home_mixer_.+_weight$/.test(k);

function check(files) {
  const problems = [];
  const parsed = {};
  for (const [key, src] of Object.entries(files)) {
    const p = parse(src || "");
    if (!Object.keys(p.params).some(isHeadParam)) {
      problems.push({ kind: "unparseable", file: key, critical: true,
        message: key + ": no weight parameters found — fetch failed or the file moved" });
    }
    parsed[key] = p;
  }

  // Union of both files; disagreement between them is drift.
  const live = {};
  for (const [key, p] of Object.entries(parsed)) {
    for (const [name, v] of Object.entries(p.params)) {
      if (name in live && live[name] !== v) {
        problems.push({ kind: "disagree", param: name, critical: CRITICAL.has(name),
          message: name + ": upstream files disagree (" + live[name] + " vs " + v + " in " + key + ")" });
      } else live[name] = v;
    }
  }

  const exp = expected();
  const allUnparseable = problems.some(p => p.kind === "unparseable");
  let headsChecked = 0;
  for (const [param, e] of Object.entries(exp.heads)) {
    headsChecked++;
    if (!(param in live)) {
      if (!allUnparseable) problems.push({ kind: "removed", param, critical: CRITICAL.has(param), repo: e.value,
        message: param + " (" + e.what + "): gone from live param files — X deleted this head" });
    } else if (live[param] !== e.value) {
      problems.push({ kind: "value", param, critical: CRITICAL.has(param), repo: e.value, live: live[param],
        message: param + " (" + e.what + "): repo " + e.value + " ≠ live " + live[param] });
    }
  }
  for (const [param, e] of Object.entries(exp.other)) {
    if (!(param in live)) {
      if (!allUnparseable) problems.push({ kind: "removed", param, critical: CRITICAL.has(param), repo: e.value,
        message: param + " (" + e.what + "): gone from live param files" });
    } else if (live[param] !== e.value) {
      problems.push({ kind: "value", param, critical: CRITICAL.has(param), repo: e.value, live: live[param],
        message: param + " (" + e.what + "): repo " + e.value + " ≠ live " + live[param] });
    }
  }
  for (const param of Object.keys(live)) {
    if (isHeadParam(param) && !(param in exp.heads)) {
      problems.push({ kind: "added", param, critical: true, live: live[param],
        message: param + ": new weight head upstream (" + live[param] + ") — weights.js does not model it" });
    }
  }

  const lastSync = (parsed.paramRs && parsed.paramRs.lastSync) || null;
  return {
    ok: problems.length === 0,
    problems,
    headsChecked,
    live,
    lastSync,
    pinnedSync: C.paramRsLastSync,
    stampMatchesPin: lastSync === C.paramRsLastSync
  };
}

async function fetchLive(fetchImpl) {
  const f = fetchImpl || globalThis.fetch;
  const out = {};
  for (const [key, url] of Object.entries(SOURCES)) {
    const res = await f(url);
    if (!res.ok) throw new Error("GET " + url + " → HTTP " + res.status);
    out[key] = await res.text();
  }
  return out;
}

module.exports = { parse, check, fetchLive, SOURCES, CRITICAL };
