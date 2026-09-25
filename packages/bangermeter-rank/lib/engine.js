"use strict";
// Loads the extension's own weights.js + scoring.js — the single source of truth
// for every weight and every scoring rule. Nothing here re-types a weight.
//
// Inside the repo it reads ../../extension directly. A packed tarball carries a
// copy in engine/ (written by `npm pack` via lib/vendor-engine.js).
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const FILES = ["weights.js", "scoring.js"];
const REPO_ROOT = path.join(__dirname, "..", "..", "..");
const REPO_ENGINE = path.join(REPO_ROOT, "extension");
const VENDORED = path.join(__dirname, "..", "engine");

// Only trust ../../../extension when this package is sitting inside the
// Bangermeter repo; installed under node_modules that path is someone else's.
function inRepo() {
  return fs.existsSync(path.join(REPO_ROOT, "packages", "bangermeter-rank", "package.json")) &&
    fs.existsSync(path.join(REPO_ENGINE, "manifest.json"));
}

function findEngineDir() {
  const dir = inRepo() ? REPO_ENGINE : VENDORED;
  if (FILES.every(f => fs.existsSync(path.join(dir, f)))) return dir;
  throw new Error("bangermeter-rank: engine not found in " + dir);
}

function load() {
  const dir = findEngineDir();
  const ctx = { Math, Object, Array, JSON, String, Number, isNaN, isFinite, parseFloat, parseInt, console };
  vm.createContext(ctx);
  for (const f of FILES) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: f });
  }
  if (!ctx.BangermeterEngine || !ctx.BANGERMETER_CONFIG) {
    throw new Error("bangermeter-rank: engine files loaded but did not define BangermeterEngine/BANGERMETER_CONFIG");
  }
  if (!ctx.BANGERMETER_CONFIG.paramRsLastSync) {
    throw new Error("bangermeter-rank: weights.js has no paramRsLastSync — score cards cannot pin a sync");
  }
  return { E: ctx.BangermeterEngine, C: ctx.BANGERMETER_CONFIG, dir, FILES };
}

module.exports = load();
