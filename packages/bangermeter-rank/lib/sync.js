"use strict";
// Weight sync (handoff §4): compare X's live published parameters with the
// engine's weights.js and fail loudly on any drift.
//
// Since the 2026-09-23 upstream sync the weights are declared in TWO files —
// home-mixer/params/param.rs and vm-ranker/params.rs — and the OON factor and
// author-diversity parameters live only in the second. param.rs is
// authoritative wherever it declares a value (vm-ranker loads the same live
// config it mirrors; vm-ranker's own file lags), so weights.js must match it.
// vm-ranker/params.rs counts only for values param.rs does not declare, and a
// vm-ranker value that lags param.rs is reported as `lagging`, not drift.
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
// file(s) that must declare it. Heads default to BOTH files. A head X publishes
// in only one file sets `upstream` to "paramRs" or "vmParams" — same idea as
// the OON factors, which live only in vm-ranker/params.rs. A copy that also
// shows up in param.rs is compared there, since param.rs wins.
const BOTH = ["paramRs", "vmParams"];
const VM = ["vmParams"];
const PARAM = ["paramRs"];
const SOURCE_KEYS = ["paramRs", "vmParams"];

function filesFor(h) {
  if (h.upstream === "vmParams") return VM;
  if (h.upstream === "paramRs") return PARAM;
  return BOTH;
}

function expected() {
  const out = {};
  // `path` is where weights.js holds the value, so --write can find it.
  const put = (param, value, what, files, path) => { out[param] = { value, what, files, path }; };
  for (const [name, h] of Object.entries(C.heads)) put(h.param, h.weight, "head " + name, filesFor(h), ["heads", name, "weight"]);
  // Video-carousel weights: published in param.rs only, not ranking heads.
  for (const [name, w] of Object.entries(C.carouselWeights || {})) put(w.param, w.weight, "carousel " + name, filesFor(w), ["carouselWeights", name, "weight"]);
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
  const lagging = [];
  let headsChecked = 0;
  for (const [param, e] of Object.entries(exp)) {
    if (isHeadParam(param) && e.files === BOTH) headsChecked++;
    const seen = [];
    for (const key of SOURCE_KEYS) {
      const p = parsed[key];
      if (!p || !Object.keys(p.params).some(isHeadParam)) continue; // already reported unparseable
      if (!(param in p.params)) {
        if (e.files.indexOf(key) !== -1) {
          add({ kind: "removed", file: key, param, repo: e.value,
            message: key + ": " + param + " (" + e.what + ") is missing — X deleted or moved it" });
        }
        continue;
      }
      seen.push([key, p.params[param]]);
    }
    // param.rs is authoritative wherever it declares a value: vm-ranker loads
    // the same live config param.rs mirrors, and its own file lags. vm-ranker's
    // value counts only for a param param.rs does not declare. A lag is a note.
    const values = Object.fromEntries(seen);
    if (seen.length === 2 && seen[0][1] !== seen[1][1]) lagging.push({ param, what: e.what, path: e.path, values });
    const authKey = "paramRs" in values ? "paramRs" : (seen[0] || [])[0];
    if (authKey) {
      const v = values[authKey];
      live[param] = v;
      if (v !== e.value) {
        add({ kind: "value", file: authKey, param, repo: e.value, live: v, path: e.path,
          message: authKey + ": " + param + " (" + e.what + "): repo " + e.value + " ≠ live " + v });
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
    lagging,
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

module.exports = { parse, check, expected, isHeadParam, fetchLive, stripComments, SOURCES, CRITICAL };
