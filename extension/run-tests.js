// Headless runner for test.html — executes the SAME assertions the browser
// harness runs, under a minimal document shim. No duplicated test logic.
//
//   node extension/run-tests.js          human output
//   node extension/run-tests.js --count  just the number of assertions
//
// The suite is authored in test.html because it must be openable in a browser
// with zero tooling. This lets CI and the release gate run it too — and lets
// the gate check that any test count quoted in prose is the real one.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ext = __dirname;
const html = fs.readFileSync(path.join(ext, "test.html"), "utf8");

// The last inline <script> in test.html is the assertion suite.
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!blocks.length) { console.error("no inline <script> found in test.html"); process.exit(2); }
const suite = blocks[blocks.length - 1];

const lines = [];
function el() {
  return {
    _cls: "",
    set className(v) { this._cls = v; }, get className() { return this._cls; },
    set textContent(v) { lines.push([this._cls, v]); }, get textContent() { return ""; }
  };
}
const document = {
  getElementById: () => ({ appendChild() {}, set textContent(v) {}, get textContent() { return ""; } }),
  createElement: () => el(),
  title: ""
};

const ctx = { document, console, Math, Object, Array, JSON, String, Number, isNaN, parseFloat, parseInt };
vm.createContext(ctx);
for (const f of ["weights.js", "scoring.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ext, f), "utf8"), ctx, { filename: f });
}
try {
  vm.runInContext(suite, ctx, { filename: "test.html" });
} catch (e) {
  console.error("SUITE THREW: " + e.message + "\n" + e.stack);
  process.exit(2);
}

let pass = 0, fail = 0;
const failures = [];
for (const [cls, text] of lines) {
  if (cls === "pass") pass++;
  else if (cls === "fail") { fail++; failures.push(text); }
}

if (process.argv.includes("--count")) {
  console.log(pass + fail);
  process.exit(fail ? 1 : 0);
}

failures.forEach(f => console.log(f));
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
