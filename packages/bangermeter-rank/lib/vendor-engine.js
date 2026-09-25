"use strict";
// prepack: copy the extension engine into engine/ so a published tarball is
// self-contained. The repo copy stays the source of truth; engine/ is ignored.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "..", "..", "extension");
const dst = path.join(__dirname, "..", "engine");
fs.mkdirSync(dst, { recursive: true });
for (const f of ["weights.js", "scoring.js"]) {
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
}
console.log("vendored engine from " + src);
