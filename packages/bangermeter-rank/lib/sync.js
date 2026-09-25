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

// Remove // and /* */ comments but leave string literals alone, so a
// commented-out or "was:" param! line can never be read as a live value.
function stripComments(src) {
  return String(src).replace(/("(?:\\.|[^"\\])*")|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m, str) => str || " ");
}

function parse(src) {
  const stamp = /last sync (\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)/.exec(String(src));
  const params = {};
  const duplicates = [];
  for (const m of stripComments(src).matchAll(PARAM_RE)) {
    const raw = m[4].trim().replace(/_/g, "");
    const v = Number(raw);
    if (raw === "" || !isFinite(v)) continue;
    if (m[3] in params) duplicates.push(m[3]);
    params[m[3]] = v;
  }
  return { lastSync: stamp ? stamp[1] : null, params, duplicates };
}

// What the engine claims, keyed by feature-switch name, with the upstream
// file(s) that must declare it. As of the 2026-09-24 sync every head, both
// mutual-follow boosts and the video-duration gate are in BOTH files; the
// OON factors and author diversity are only in vm-ranker/params.rs.
const BOTH = ["paramRs", "vmParams"];
const VM = ["vmParams"];

function expected() {
  const out = {};
  const put = (param, value, what, files) => { out[param] = { value, what, files }; };
  for (const [name, h] of Object.entries(C.heads)) put(h.param, h.weight, "head " + name, BOTH);
  const r = C.rescorers;
  put(r.outOfNetwork.param, r.outOfNetwork.factor, "rescorer outOfNetwork", VM);
  put(r.topicOutOfNetwork.param, r.topicOutOfNetwork.factor, "rescorer topicOutOfNetwork", VM);
  // weights.js records this one from config.rs without a param name; X now
  // publishes it, so it is checked by its published name.
  put("rust_home_mixer_new_user_oon_weight_factor", r.newUserOutOfNetwork.factor, "rescorer newUserOutOfNetwork", VM);
  put(r.authorDiversity.param, r.authorDiversity.decay, "author diversity decay", VM);
  put(r.authorDiversity.floorParam, r.authorDiversity.floor, "author diversity floor", VM);
  put("rust_home_mixer_bidirectional_follow_reply_weight_boost", C.bidirectionalFollowReplyBoost, "mutual-follow reply boost", BOTH);
  put("rust_home_mixer_bidirectional_follow_dwell_weight_boost", C.bidirectionalFollowDwellBoost, "mutual-follow dwell boost", BOTH);
  put(C.sourcedFacts.minVideoDurationMs.param, C.sourcedFacts.minVideoDurationMs.value, "min video duration ms", BOTH);
  return out;
}

// A weight head, as X names them: rust_home_mixer_<action>_weight. Boost and
// factor parameters are not heads and are checked by name instead.
const isHeadParam = k => /^rust_home_mixer_.+_weight$/.test(k);

function check(files) {
  const problems = [];
  const add = p => problems.push(Object.assign({ critical: CRITICAL.has(p.param) }, p));
  const parsed = {};
  for (const [key, src] of Object.entries(files)) {
    const p = parse(src || "");
    parsed[key] = p;
    if (!Object.keys(p.params).some(isHeadParam)) {
      add({ kind: "unparseable", file: key, critical: true,
        message: key + ": no weight parameters found — fetch failed or the file moved" });
    }
    for (const d of p.duplicates) {
      add({ kind: "duplicate", file: key, param: d, critical: true,
        message: key + ": " + d + " is declared more than once — cannot tell which value is live" });
    }
  }
  if (parsed.paramRs && !parsed.paramRs.lastSync) {
    add({ kind: "nostamp", file: "paramRs", critical: true,
      message: "paramRs: no 'last sync' stamp — the file format changed or the fetch is not param.rs" });
  }

  const exp = expected();
  const live = {};
  let headsChecked = 0;
  for (const [param, e] of Object.entries(exp)) {
    if (isHeadParam(param) && e.files === BOTH) headsChecked++;
    const seen = [];
    for (const key of e.files) {
      const p = parsed[key];
      if (!p || !Object.keys(p.params).some(isHeadParam)) continue; // already reported unparseable
      if (!(param in p.params)) {
        add({ kind: "removed", file: key, param, repo: e.value,
          message: key + ": " + param + " (" + e.what + ") is missing — X deleted or moved it" });
        continue;
      }
      seen.push([key, p.params[param]]);
    }
    if (seen.length === 2 && seen[0][1] !== seen[1][1]) {
      add({ kind: "disagree", param,
        message: param + ": upstream files disagree (" + seen.map(([k, v]) => k + " " + v).join(" vs ") + ")" });
    }
    for (const [key, v] of seen) {
      live[param] = v;
      if (v !== e.value) {
        add({ kind: "value", file: key, param, repo: e.value, live: v,
          message: key + ": " + param + " (" + e.what + "): repo " + e.value + " ≠ live " + v });
      }
    }
  }
  for (const [key, p] of Object.entries(parsed)) {
    for (const param of Object.keys(p.params)) {
      if (isHeadParam(param) && !(param in exp)) {
        add({ kind: "added", file: key, param, critical: true, live: p.params[param],
          message: key + ": new weight head " + param + " (" + p.params[param] + ") — weights.js does not model it" });
      }
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

module.exports = { parse, check, fetchLive, stripComments, SOURCES, CRITICAL };
