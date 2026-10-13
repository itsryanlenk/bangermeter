"use strict";
// A throwaway copy of every file --write may read or touch, laid out like the repo.
const fs = require("fs");
const os = require("os");
const path = require("path");

const REPO = path.join(__dirname, "..", "..", "..");
const FILES = [
  "extension/weights.js", "extension/test.html", "extension/manifest.json",
  "packages/bangermeter-rank/package.json",
  "packages/bangermeter-rank/test/fixtures/param.rs", "packages/bangermeter-rank/test/fixtures/vm-params.rs",
  "packages/bangermeter-rank/test/sync.test.js", "packages/bangermeter-rank/test/modes.test.js", "packages/bangermeter-rank/test/report.test.js",
  "README.md", "RESEARCH.md", "store-assets/store-description.txt", "packages/bangermeter-rank/README.md"
];

function makeRoot(opts) {
  const eol = (opts && opts.eol) || "lf";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bmr-root-"));
  const write = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  };
  for (const rel of FILES) {
    const lf = fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");
    write(rel, eol === "crlf" ? lf.replace(/\n/g, "\r\n") : lf);
  }
  return {
    dir, write,
    read: rel => fs.readFileSync(path.join(dir, rel), "utf8"),
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  };
}

module.exports = { makeRoot, FILES };
