// Japanese coverage report — which UI strings have reviewed Japanese, which
// are drafts awaiting review, which are missing, and which Japanese entries
// no longer match any English in the source.
//
//   node store-assets/i18n-coverage.js          summary line, then the lists
//   node store-assets/i18n-coverage.js --json   the same data as JSON
//
// Informational by design: it exits 0 whenever it completes, so an X push
// that adds an English label never turns CI or the release gate red. A
// missing line simply ships in English. It exits 2 only if it crashes.
// Structural mistakes (a Japanese entry that drops a placeholder) are bugs
// and fail the self-tests in extension/test.html instead.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ext = path.join(__dirname, "..", "extension");
const read = f => fs.readFileSync(path.join(ext, f), "utf8");
const exists = f => fs.existsSync(path.join(ext, f));

function loadTables() {
  const ctx = { console };
  vm.createContext(ctx);
  for (const f of ["weights.js", "scoring.js", "i18n.js"]) {
    vm.runInContext(read(f), ctx, { filename: f });
  }
  return {
    I: vm.runInContext("BANGERMETER_I18N", ctx),
    C: vm.runInContext("BANGERMETER_CONFIG", ctx)
  };
}

const collapse = s => s.replace(/\s+/g, " ").trim();

// t("…") first arguments. t() takes one string literal so this can read it;
// anything else is listed as unchecked.
function scriptStrings(file, found, unchecked) {
  const src = read(file);
  for (const m of src.matchAll(/\bt\(\s*("(?:[^"\\]|\\.)*")/g)) {
    found.set(JSON.parse(m[1]), file);
  }
  for (const m of src.matchAll(/\bt\(\s*(?!["\s)])([^,)]{0,60})/g)) {
    unchecked.push(file + ": t(" + m[1].trim());
  }
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"", "#39": "'", nbsp: "\u00a0",
  mdash: "—", ndash: "–", times: "×", rarr: "→", ldquo: "“", rdquo: "”" };
const decode = s => s.replace(/&([a-z]+|#\d+);/g, (all, name) =>
  ENTITIES[name] !== undefined ? ENTITIES[name] :
    name[0] === "#" ? String.fromCodePoint(Number(name.slice(1))) : all);

// Text nodes and title / aria-label / placeholder values of a static page,
// split the way translateStatic sees them.
function pageStrings(file, found) {
  const html = read(file)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  for (const m of html.matchAll(/\b(?:title|aria-label|placeholder)="([^"]*)"/g)) {
    found.set(collapse(decode(m[1])), file);
  }
  const body = html.replace(/<head[\s\S]*?<\/head>/i, m => (m.match(/<title>[\s\S]*?<\/title>/i) || [""])[0]);
  for (const m of body.matchAll(/>([^<]+)</g)) {
    const s = collapse(decode(m[1]));
    if (s) found.set(s, file);
  }
}

function main() {
  const { I, C } = loadTables();
  const found = new Map();
  const unchecked = [];
  for (const f of ["content.js", "popup.js", "welcome.js"]) if (exists(f)) scriptStrings(f, found, unchecked);
  for (const f of ["popup.html", "welcome.html"]) pageStrings(f, found);
  // Data content.js renders through tl() at display time.
  for (const h of Object.values(C.heads)) if (h.label) found.set(h.label, "weights.js heads");
  for (const m of C.contentModifiers) if (m.label) found.set(m.label, "weights.js contentModifiers");
  for (const r of Object.values(C.rescorers)) if (r.label) found.set(r.label, "weights.js rescorers");
  const SF = C.sourcedFacts;
  for (const s of [SF.visibilityLimited.panel, SF.visibilityLimited.panelDetail,
    SF.quotedVisibilityLimited.panel, C.weightsMeaningNote]) found.set(s, "weights.js panel text");

  const hasLetters = s => /\p{L}/u.test(s);
  const keepEnglish = s => I.KEEP_ENGLISH.some(re => re.test(s));
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  const strings = [...found.keys()].filter(hasLetters).sort();
  const report = { translated: [], draft: [], missing: [], keptEnglish: [], dead: [], unchecked };
  for (const s of strings) {
    if (own(I.JA, s)) report.translated.push(s);
    else if (own(I.JA_DRAFT, s)) report.draft.push(s);
    else if (keepEnglish(s)) report.keptEnglish.push(s);
    else report.missing.push(s + "  [" + found.get(s) + "]");
  }
  report.dead = Object.keys(I.JA).concat(Object.keys(I.JA_DRAFT)).filter(k => !found.has(k)).sort();

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 1));
    return;
  }
  console.log(`i18n: ${strings.length} strings, ${report.translated.length} translated, ` +
    `${report.draft.length} draft, ${report.missing.length} missing, ${report.dead.length} dead` +
    (unchecked.length ? `, ${unchecked.length} unchecked` : ""));
  for (const [name, list] of [["MISSING (ships in English)", report.missing],
    ["DRAFT (awaiting native review; ships in English)", report.draft],
    ["DEAD (Japanese for English that no longer exists)", report.dead],
    ["UNCHECKED (t() without a string literal)", report.unchecked]]) {
    if (!list.length) continue;
    console.log("\n" + name + ":");
    for (const s of list) console.log("  " + s);
  }
}

try {
  main();
} catch (e) {
  console.error("i18n-coverage crashed: " + (e && e.stack || e));
  process.exit(2);
}
