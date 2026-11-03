# Japanese Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bangermeter shows its badge tooltips, panel, draft meter, popup and welcome page in Japanese when X is in Japanese, and scores Japanese text with X's own length rule.

**Architecture:**
- **The string table.** One new content-and-page script, `extension/i18n.js`, holds a `t(english, params)` lookup, an English→Japanese table (`JA`), a table of drafts awaiting review (`JA_DRAFT`, never served), and a static-HTML translator.
- **Keys.** English stays in the code as the key, so missing Japanese falls back to English.
- **Language.** It follows X's `<html lang>`, with an override in the popup. `_locales` localizes only the manifest name and description.

**Tech Stack:** Chrome MV3, plain JavaScript (no build step, no dependencies), Node for tests and gates, Windows PowerShell 5.1 for the packaging scripts.

**Spec:** `docs/superpowers/specs/2026-11-03-japanese-localization-design.md`

## Global Constraints

- **American English** in all English copy, comments and identifiers. `check-versions.js` gates it.
- **No dependencies.** Nothing is added to `extension/`, and the repo root gets no `package.json`. Scripts are plain Node.
- **Every `.ps1` stays pure ASCII.** Windows PowerShell 5.1 reads a BOM-less .ps1 as ANSI. Japanese text lives only in UTF-8 `.js` / `.json` / `.txt` files.
- **No shipped file may start with a UTF-8 BOM.** `check-versions.js` enforces it.
- **A new shipped file goes in all three lists:** `store-assets/check-versions.js` `SHIPPED`, `store-assets/package-guard.js` `SHIPPED`, and `store-assets/make-package.ps1` `$items`. check-versions cross-checks them.
- **Never hand-edit `extension/bangermeter.user.js`.** Rerun `powershell -NoProfile -File store-assets/make-userscript.ps1` after any change to weights.js, scoring.js, i18n.js or content.js.
- **Recompute quoted test counts.** Counts in README.md and store-description.txt come from `node extension/run-tests.js --count`. check-versions fails on a stale count.
- **`t()` takes one string literal as its first argument**, so the coverage script can read it. It runs at display time only. A string that code compares (`r.reason === "…"`, `label.indexOf("Verified")`) stays English and is wrapped only where it is rendered.
- **Code names are not translated inside Japanese:** `param.rs`, file paths, `×0.75`, commit hashes, head names.
- **Glossary** (sysCat's `_glossary`): Content score 内容スコア, Engagement score 反応スコア, For You おすすめ, out-of-network フォロー外, in-network フォロー内, dwell 滞在. Use the rest of `_glossary` too.
- **Japanese from sysCat goes in `JA`.** Their dictionary is `https://raw.githubusercontent.com/sysCat64/bangermeter-ja/f989ddc/ja/dict.json`. Any Japanese written by Claude goes in `JA_DRAFT` and is never served.
- **Translation coverage never fails CI or the release gate.** Structural i18n bugs do fail the self-tests.
- **Long explanations stay English:** the weights.js `note` / `why` text, "About these scores" (`Weights: …`), and the Community Note study citations. List their patterns in `KEEP_ENGLISH`, so coverage doesn't report them as missing. Seed it from sysCat's `tierC`.
- **Displayed dates are ISO slices** (`paramRsLastSync.slice(0, 10)`). They stay ISO in Japanese, so no date helper is needed. This is a deliberate departure from the spec's "date helper" line.

## Review Focus

1. **English strings used as logic keys.** content.js tests `r.reason === "Out-of-network view assumed"` and `r.label.indexOf("Verified") === 0`. In Japanese mode those branches must still fire. Pinned in Task 5, step 6.
2. **Placeholder values containing `$&`, `$1` or `{x}`.** They must appear literally, with no `String.replace` special patterns and no re-expansion. Pinned in Task 1.
3. **Language tags that aren't plain `ja`:** `ja-JP`, `JA`, a missing `lang` attribute with `navigator.language` `ja-JP`, `lang=""`. All of them must resolve as expected. Pinned in Task 1.
4. **X in a third language** (`lang="es"`, `"hi"`). Auto must give English. Pinned in Task 1.
5. **A head label X adds in a future push.** It has no Japanese, so `t()` returns the English and nothing throws. Pinned in Task 1, and checked by coverage in Task 2.

---

### Task 0: Confirm X's `<html lang>` on a Japanese account (manual, blocking)

**Files:** none.

- [ ] **Step 1:** Ask Ryan (or sysCat) to set X's display language to Japanese. On x.com/home and in the composer (x.com/compose/post), run `document.documentElement.lang` in DevTools.
- [ ] **Step 2: Record the result** in the PR description.
  - **Expected:** `"ja"` on both. Continue with the plan.
  - **Otherwise:** stop and bring it back to Ryan. The fallback needs a new detector, which this plan doesn't cover.

### Task 1: `i18n.js` core

**Files:**
- Create: `extension/i18n.js`
- Modify: `extension/run-tests.js` (add `"i18n.js"` to the loaded files, after `scoring.js`)
- Modify: `extension/test.html` (add `<script src="i18n.js"></script>` after scoring.js, and the tests below)

**Interfaces:**
- Produces a global `var BANGERMETER_I18N`, an IIFE in the style of `BangermeterEngine` in scoring.js:
  - `t(english: string, params?: Object) -> string`
  - `setLanguage(lang: "en"|"ja") -> void` and `getLanguage() -> "en"|"ja"`. The default is `"en"`.
  - `resolveLanguage(override: "auto"|"en"|"ja", htmlLang: string|null, navLang: string|null) -> "en"|"ja"`
  - `translateStatic(root: Element) -> void`
  - `placeholdersOf(s: string) -> string[]`. Returns placeholder names, sorted and unique.
  - Tables: `JA: Object<string,string>`, `JA_DRAFT: Object<string,string>`, `KEEP_ENGLISH: RegExp[]`
- Nothing at top level may touch `document`, `chrome` or `navigator`, because run-tests.js loads the file under a bare shim.

- [ ] **Step 1: Write the failing tests** in test.html's suite, after the existing engine checks:

```js
var I = BANGERMETER_I18N;
I.JA["Show the math"] = I.JA["Show the math"] || "計算式を見る";
I.setLanguage("en");
check("i18n: English mode returns the key", I.t("Show the math") === "Show the math");
I.setLanguage("ja");
check("i18n: Japanese mode returns JA", I.t("Show the math") === "計算式を見る");
check("i18n: missing Japanese falls back to English", I.t("A label X added next week") === "A label X added next week");
check("i18n: drafts are never served", (function () {
  I.JA_DRAFT["Draft only line"] = "下書き"; return I.t("Draft only line") === "Draft only line"; })());
check("i18n: placeholders fill in both languages, literally",
  I.t("Raw: {x}", { x: "$&{y}$1" }) === "Raw: $&{y}$1");
check("i18n: unknown placeholder is left visible", I.t("Raw: {x}") === "Raw: {x}");
check("i18n: every JA and JA_DRAFT entry keeps its key's placeholders", Object.keys(I.JA).concat(Object.keys(I.JA_DRAFT)).every(function (k) {
  var v = I.JA[k] !== undefined ? I.JA[k] : I.JA_DRAFT[k];
  return I.placeholdersOf(k).join() === I.placeholdersOf(v).join(); }));
check("i18n: resolveLanguage", [
  ["auto", "ja", "en-US", "ja"], ["auto", "ja-JP", null, "ja"], ["auto", "JA", null, "ja"],
  ["auto", null, "ja-JP", "ja"], ["auto", "", "ja", "ja"], ["auto", "es", "ja-JP", "en"],
  ["auto", "hi", null, "en"], ["auto", null, null, "en"], ["en", "ja", "ja", "en"], ["ja", "en", "en", "ja"]
].every(function (c) { return I.resolveLanguage(c[0], c[1], c[2]) === c[3]; }));
I.setLanguage("en");
```

- **Note on the `es` + `ja-JP` row:** an explicit, non-Japanese `lang` attribute wins over `navigator.language`. `navigator.language` decides only when `lang` is missing or empty.
- **Reset:** the first two lines add a JA entry only if it is missing, so the suite runs before Task 5 seeds the table. Reset the language to `en` at the end so later tests see English.

- [ ] **Step 2: Run it and confirm it fails.** Run `node extension/run-tests.js`. Expected: SUITE THREW, because `BANGERMETER_I18N` is not defined.
- [ ] **Step 3: Implement `extension/i18n.js` to the interfaces above.**
  - **`t()`** looks up `JA[english]` only when the language is `ja`. It substitutes placeholders in one pass with a function replacer on `/\{(\w+)\}/g`, so substituted text is never rescanned and `$` patterns stay literal.
  - **`translateStatic(root)`** walks text nodes, plus the `title`, `aria-label` and `placeholder` attributes. It skips `<script>` and `<style>`. It collapses whitespace and trims before the lookup, and keeps the node's leading and trailing whitespace around the translation.
  - **The header comment** names the source: Japanese from sysCat (@sysCat64), sysCat64/bangermeter-ja at f989ddc, under this repo's MIT license.
  - **Seeding:** leave `JA` empty except for what Task 5 and Task 6 add. Seed `KEEP_ENGLISH` from sysCat's `tierC` regexes.
- [ ] **Step 4: Run `node extension/run-tests.js`.** Expected: all pass, with the count up by 8.
- [ ] **Step 5: Commit** extension/i18n.js, run-tests.js and test.html: "Add the i18n string table and t()".

### Task 2: Coverage report (informational) in CI and the release steps

**Files:**
- Create: `store-assets/i18n-coverage.js`
- Modify: `.github/workflows/bangermeter-rank.yml`: run `node store-assets/i18n-coverage.js` after `check-versions.js`
- Modify: `RELEASING.md` step 4: run the coverage report, and note that any MISSING or DRAFT line ships in English

**Interfaces:**
- Consumes `BANGERMETER_I18N.JA`, `.JA_DRAFT` and `.KEEP_ENGLISH`. Load weights.js, scoring.js and i18n.js in a `vm` context the way run-tests.js does.
- CLI: `node store-assets/i18n-coverage.js [--json]`. It exits 0 whenever it completes, and 2 only if it crashes.

- [ ] **Step 1: Implement source extraction.**
  - From `extension/content.js` and `extension/popup.js`, take every `t("…")` first argument with `/\bt\(\s*("(?:[^"\\]|\\.)*")/g`, decoded with `JSON.parse`.
  - Take every rendered data label: `label` of each entry in `BANGERMETER_CONFIG.heads` and `BANGERMETER_CONFIG.contentModifiers`.
  - From `extension/popup.html` and `extension/welcome.html`, take each text node's text and each `title` / `aria-label` / `placeholder` value. Strip `<script>` and `<style>` first, and collapse whitespace.
  - Also report any `t(` call whose first argument isn't a string literal, as UNCHECKED.
- [ ] **Step 2: Implement the report.**
  - Print one summary line: `i18n: N strings, J translated, D draft, M missing, X dead`.
  - Then list MISSING (not in `JA`, not in `JA_DRAFT`, not matched by `KEEP_ENGLISH`), DRAFT, DEAD (a `JA` key found in no source) and UNCHECKED.
  - Skip strings with no letters (numbers, `·`, `×`).
  - `--json` prints the same data as JSON.
- [ ] **Step 3: Verify.** Run `node store-assets/i18n-coverage.js`. Expected: exit 0, a summary line, and a long MISSING list (nothing is translated yet).
- [ ] **Step 4: Commit** the script, the workflow and RELEASING.md: "Report Japanese coverage in CI without failing it".

### Task 3: Ship and load `i18n.js` everywhere, plus `_locales`

**Files:**
- Modify: `extension/manifest.json`:
  - `content_scripts[0].js` becomes `["weights.js", "scoring.js", "i18n.js", "content.js"]`.
  - Add `"default_locale": "en"`.
  - `name` becomes `"__MSG_extName__"`, `description` becomes `"__MSG_extDescription__"`, and `action.default_title` becomes `"__MSG_actionTitle__"`.
- Create: `extension/_locales/en/messages.json`. It holds `extName`, `extDescription` and `actionTitle`, with the current English values copied exactly.
- Create: `extension/_locales/ja/messages.json`. It holds the same three keys, with English placeholders for now; Task 8 fills them after review.
- Create: `extension/welcome.js`. welcome.html has no script today, and MV3 forbids inline scripts in extension pages. It stays empty until Task 4 fills it.
- Modify:
  - `extension/popup.html`: add `<script src="i18n.js">` before popup.js.
  - `extension/welcome.html`: add `<script src="i18n.js"></script><script src="welcome.js"></script>` at the end of `<body>`.
  - `extension/fixture.html`, `fixture-compose.html`, `fixture-thread.html`: add an `i18n.js` tag before content.js. Before the scripts, add an inline `if (/[?&]lang=ja\b/.test(location.search)) document.documentElement.lang = "ja";`.
- Modify: `store-assets/check-versions.js`, `store-assets/package-guard.js` and `store-assets/make-package.ps1`. Add `i18n.js`, `welcome.js`, `_locales/en/messages.json` and `_locales/ja/messages.json`; make-package adds the `_locales` folder the way it adds `icons`.
- Modify: `store-assets/make-userscript.ps1`. Add `(Read-Src "i18n.js")` between scoring.js and content.js, and update the header comment's file list.
- Modify: check-versions.js. It reads the manifest's `name` and `description` today: grep for `manifest.name` and resolve `__MSG_` keys through `_locales/en/messages.json`.

- [ ] **Step 1: Make the changes above.**
- [ ] **Step 2: Run the gates.**
  - `node store-assets/check-versions.js` → `version check ok`
  - `node extension/run-tests.js` → all pass
  - `powershell -NoProfile -File store-assets/make-userscript.ps1` → `built … extension/bangermeter.user.js`
- [ ] **Step 3: Build a throwaway zip.** Run `powershell -NoProfile -File store-assets/make-package.ps1` with the dirty-tree refusal, then `node store-assets/package-guard.js --verify dist/bangermeter-0.10.5.zip`.
  - Expected: guard ok, and the zip lists `_locales/en/messages.json` and `_locales/ja/messages.json` with forward slashes.
  - If make-package refuses the dirty tree, commit first and build from the commit.
  - Delete that zip afterward: 0.10.5 is never shipped.
- [ ] **Step 4: Commit:** "Load i18n.js in every surface and localize the manifest through _locales".

### Task 4: Language selection

**Files:**
- Modify: `extension/weights.js`. Add `uiLanguage: "auto"` to `BANGERMETER_DEFAULT_SETTINGS`, with a comment saying Auto follows X's display language.
- Modify: `extension/content.js`. On load, and in the existing `storage.onChanged` listener before `fullRescan()`:
  - Call `BANGERMETER_I18N.setLanguage(BANGERMETER_I18N.resolveLanguage(settings.uiLanguage, document.documentElement.getAttribute("lang"), navigator.language))`.
  - Write `chrome.storage.local.set({ lastXLanguage: <resolveLanguage("auto", …)> })` when the value differs from the last one written. Wrap it in the same try/catch the file uses for storage.
  - Set the `lang` attribute on the badge, panel and meter roots to the current language. Task 5 uses it for CSS.
  - An open panel must close or re-render on a language change; pick whichever is simpler in the panel code.
- Modify: `extension/popup.html` and `extension/popup.js`. Add a `<select id="uiLanguage">` below the theme select, labeled "Language", with options `auto` "Auto (match X)", `en` "English" and `ja` "日本語". 日本語 stays as written in both languages.
  - The popup resolves its own language from the stored `uiLanguage`. On `auto` it uses `lastXLanguage` from `chrome.storage.local`, and with nothing recorded, `chrome.i18n.getUILanguage()`.
  - It calls `setLanguage` and then `translateStatic(document.body)`.
  - On change it saves the setting and calls `location.reload()`.
- Modify: `extension/welcome.js`. Resolve the language the same way as the popup, then call `translateStatic(document.body)` and set `document.documentElement.lang`.
- Modify: `extension/i18n.js`. Factor the shared logic into `resolvePageLanguage(callback: (lang: "en"|"ja") => void) -> void`.
  - **Order:** the stored override; on `auto`, the `chrome.storage.local` value `lastXLanguage`; then `chrome.i18n.getUILanguage()`.
  - **Without `chrome.storage`** (the fixture server and the preview harness), a `?lang=ja` / `?lang=en` query is the override, and with no query it is `"en"`.

- [ ] **Step 1: Write the failing test.**

```js
check("settings default to the Auto language", BANGERMETER_DEFAULT_SETTINGS.uiLanguage === "auto");
```

- [ ] **Step 2:** Run `node extension/run-tests.js`. Expected: one failure.
- [ ] **Step 3: Implement the changes above.**
- [ ] **Step 4: Check the fixture.**
  - Serve with `node extension/serve-fixtures.js`, or `preview_start` with `fixtures-visibility-locales`.
  - Open `fixture.html?lang=ja` and run `document.querySelector(".bangermeter-badge").getAttribute("lang")`. Expected: `"ja"`.
  - The same check on `fixture.html` gives `"en"`.
- [ ] **Step 5:** Run the tests, rebuild the userscript, run check-versions, then commit: "Follow X's language, with a popup override".

### Task 5: Translate the badge, panel and draft meter

**Files:**
- Modify: `extension/content.js`. Wrap every user-visible string in `t()`: `textContent`, `title`, `aria-label` and the `el()` text arguments.
- Modify: `extension/i18n.js`. Add `JA` entries.
- Modify: `extension/styles.css`. Add `[lang="ja"]` rules on the badge, panel and meter roots: `word-break: normal; overflow-wrap: anywhere; line-break: strict;`.

**Interfaces:**
- Consumes `BANGERMETER_I18N.t` from Task 1 and the language state from Task 4.

- [ ] **Step 1: Rewrite every sentence content.js builds from fragments as one template.**
  - **Example:** `"Weight " + w + " for a like (param.rs, " + date + " sync)"` becomes `t("Weight {w} for a like (param.rs, {date} sync)", { w: …, date: … })`.
  - **Where they are:** the full list is sysCat's `contextual` entries (lines ~730–810 and 880–890 of content.js, the draft meter's aria-label, and the variant chips), plus `plainRescorerText`.
  - **English output must stay byte-identical** except where step 2 fixes a stale figure.
- [ ] **Step 2: Turn `PLAIN_SIGNALS` figures into placeholders filled from `BANGERMETER_CONFIG.heads`.**
  - `external_link`: `t("Contains a link — opening it pays {openLink}, small but not zero", { openLink: heads.open_link.weight })`
  - `has_video`: the current text, "watches barely count (0.05, and nothing under 10 seconds)", has been wrong since X zeroed vqv on Aug 25, 2026. Replace it with two keys:
    - when `heads.vqv.weight === 0`: `"Has video — opening it pays {videoOpen}; a full watch earns nothing extra (vqv is 0)"`
    - otherwise: `"Has video — opening it pays {videoOpen}; a watch over {seconds} seconds pays {vqv}"`, where `seconds = sourcedFacts.minVideoDurationMs.value / 1000`
- [ ] **Step 3: Render data labels through `t()`.** That covers `m.label` / `PLAIN_SIGNALS[m.id] || m.label`, head labels, the `r.label` and `r.reason` text, and the `scoring.js` `label` strings. Apply `t()` only at render time. Every comparison against an English string stays as it is.
- [ ] **Step 4: Seed `JA`.**
  - **Exact entries:** port every sysCat `exact` entry whose key is now a `t()` literal or a data label.
  - **Templates:** convert each sysCat `patterns` entry into the template key from step 1, turning `$1`… into named placeholders.
  - **Their `pending` items and the two new `has_video` keys** get Claude's Japanese in `JA_DRAFT`.
  - **The `conversation_length` and `link_no_context` labels:** don't use sysCat's "（100文字以上）". Task 7 changes the rule, so their Japanese goes in `JA_DRAFT` in Task 7.
- [ ] **Step 5: Verify.** Run `node extension/run-tests.js` (all pass), then `node store-assets/i18n-coverage.js`. Expected: MISSING lists only strings matched by neither sysCat's dictionary nor `KEEP_ENGLISH`. Move each of those to `JA_DRAFT` with Claude's Japanese, or to `KEEP_ENGLISH` if it falls in the spec's long-explanations scope. MISSING should then be empty and UNCHECKED zero.
- [ ] **Step 6: Run the fixture check in the browser pane** (Review Focus 1).
  - **In Japanese,** open `fixture.html?lang=ja` and click a badge. Expected:
    - The panel title row and section headings are Japanese.
    - A post scored with "Assume out-of-network view" on shows `フォロー外として表示される想定 — 75%で評価`, which proves the `r.reason` branch fired.
    - The reply fixture shows `これはリプライ — …`.
  - **In English,** check that `fixture.html` (no lang) shows the same panel as before. Compare with `git stash` or a screenshot.
  - **Layout:** no horizontal overflow in the panel, and no Japanese line broken mid-word in an odd place. Take screenshots of both.
  - **Draft meter:** in `fixture-compose.html?lang=ja`, type a draft with `？` and check that the meter's labels are Japanese.
- [ ] **Step 7:** Rebuild the userscript, run check-versions, then commit: "Translate the badge, panel and draft meter into Japanese".

### Task 6: Translate the popup and welcome page

**Files:**
- Modify: `extension/popup.js`. Wrap its dynamic strings in `t()`. INTRO_EMPTY and the history and import messages are built from fragments, so make them templates.
- Modify: `extension/i18n.js`. Add `JA` entries for the popup and welcome text nodes and attributes. They come from sysCat's `exact`, plus their `welcome-ja.css` fix (below).
- Modify: `extension/welcome.html`. sysCat found that the heading and the "Open x.com" button force uppercase, which mangles `x.com`. Add `[lang="ja"] .<those classes> { text-transform: none; }` to its `<style>`. welcome.js already sets the `lang`.

- [ ] **Step 1: Make the changes above,** using sysCat's entries where they exist and `JA_DRAFT` for the rest.
- [ ] **Step 2: Verify.** Run `node store-assets/i18n-coverage.js`. Expected: no MISSING from popup.html, popup.js or welcome.html.
- [ ] **Step 3: Check it in the browser pane.**
  - **In Japanese:** open `popup.html` and `welcome.html` from the fixture server with `uiLanguage` forced to `ja` (`resolvePageLanguage` treats a `?lang=ja` query as the override in the preview harness). Expected: Japanese throughout, except `KEEP_ENGLISH`.
  - **In English:** without the query, the pages are English and unchanged.
- [ ] **Step 4:** Commit: "Translate the popup and welcome page into Japanese".

### Task 7: Score Japanese text with X's counting rule

**Files:**
- Modify: `extension/weights.js`.
  - Add top-level config `textWeighting`:
    - `{ source: "https://github.com/twitter/twitter-text/blob/9537bdf15f935b40fed0ea3ea44cee860fbb8880/config/v3.json", fetchedAt: "2026-11-03", ranges: [[0, 4351], [8192, 8205], [8208, 8223], [8242, 8247]], rangeWeight: 1, defaultWeight: 2, emojiWeight: 2 }`
    - Put it outside `sourcedFacts`, so the upstream-sync job doesn't try to watch a twitter-text path.
  - The `conversation_length` and `link_no_context` `why` text says the count is X's weighted length, where CJK counts 2.
- Modify: `extension/scoring.js`.
  - Add `weightedLength(s: string) -> number`.
  - `analyzeText` returns `weightedLength`, and both length checks use it.
  - Add `countDraftHashtags(text: string) -> number` using `/[#＃][\wÀ-￿]+/g`.
  - Export both on `BangermeterEngine`.
- Modify: `extension/content.js:1050`. The draft path calls `BangermeterEngine.countDraftHashtags(text)`.
- Modify: `extension/i18n.js`. `JA_DRAFT` gets the two labels: `"Substantive text (≥100 chars)"` → `"しっかりした文章量（全角50文字以上）"`, and the bare-link label with the matching rule.

- [ ] **Step 1: Write the failing tests.**

```js
var WL = BangermeterEngine.weightedLength;
check("weighted length: Latin counts 1, CJK 2, emoji clusters 2",
  WL("a".repeat(100)) === 100 && WL("あ".repeat(50)) === 100 && WL("あ".repeat(49)) === 98 &&
  WL("漢字") === 4 && WL("👍") === 2 && WL("👍🏽") === 2 && WL("👨‍👩‍👧") === 2 &&
  WL("—") === 1 && WL("…") === 2);
check("Substantive text fires at 50 Japanese characters, not 49", (function () {
  function has(t) { return BangermeterEngine.contentScore({ text: t }, {}).modifiers.some(function (m) { return m.id === "conversation_length"; }); }
  return has("あ".repeat(50)) && !has("あ".repeat(49)) && has("a".repeat(100)) && !has("a".repeat(99)); })());
check("Bare link uses the same count", (function () {
  function bare(t) { return BangermeterEngine.contentScore({ text: t, hasExternalLink: true }, {}).modifiers.some(function (m) { return m.id === "link_no_context"; }); }
  return bare("あ".repeat(24)) && !bare("あ".repeat(25)); })());
check("draft hashtags count full-width ＃", BangermeterEngine.countDraftHashtags("#a ＃タグ ＃日本 ＃") === 3);
```

- [ ] **Step 2:** Run `node extension/run-tests.js`. Expected: 4 failures.
- [ ] **Step 3: Implement.**
  - **`weightedLength`:** iterate with `/\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}]|‍\p{Extended_Pictographic}️?)*|[\s\S]/gu`.
  - **Weights:** an emoji match counts `emojiWeight`. Any other code point counts `rangeWeight` if it falls inside a range, else `defaultWeight`.
  - **Config:** read the values from `BANGERMETER_CONFIG.textWeighting`.
- [ ] **Step 4:** Run `node extension/run-tests.js`. Expected: all pass. Check that every existing content-score test still passes unchanged: English posts without emoji must not move.
- [ ] **Step 5:** Rebuild the userscript, run check-versions and `bangermeter-rank gate`, then commit: "Count text length the way X does, so Japanese posts score fairly".

### Task 8: Store listing, Japanese screenshot, README credit

**Files:**
- Create: `store-assets/store-description.ja.txt`. The Japanese listing, translated from store-description.txt minus the WHAT'S NEW history, in sysCat's glossary and tone ("everyday Japanese, not developer Japanese"). Its first line says it awaits native review until sysCat approves it.
- Modify: `extension/_locales/ja/messages.json`.
  - `extName`: `"Bangermeter — Xアルゴリズム採点"`. Keep it within Chrome's 75-character limit.
  - `extDescription`: Japanese, 132 characters or fewer.
  - These ship only after review; until then they repeat the English values.
- Create: `store-assets/screenshot-captions.ja.json`. Japanese captions for the store screenshot. The .ps1 must stay ASCII, so it reads them from this file.
- Modify: `store-assets/make-screenshot.ps1`.
  - Add a `-Lang ja` switch. It reads its captions from that JSON with `Get-Content -Encoding UTF8`, uses a Japanese-capable font (`Yu Gothic UI`, falling back to `Meiryo`), and writes `store-assets/screenshot-1280x800.ja.png`.
  - The raw capture is a browser-pane screenshot of `fixture.html?lang=ja` with a panel open, saved as `store-assets/clip-raw.ja.png`.
- Modify: `README.md` Credits.
  - Add a sysCat entry in house style, naming the specific findings: the Japanese translation and glossary, the everyday-Japanese tone, and the full-width ？ that wasn't detected as a question.
  - Link `https://x.com/sysCat64` and the fork.
  - **Ryan approves the wording before commit.**
- Modify: `store-assets/check-versions.js`. If it scans `store-assets/*.txt` prose with the US English gate, exclude `store-description.ja.txt` from the English-spelling rules. It must still be checked for a BOM.

- [ ] **Step 1: Write the files above.**
- [ ] **Step 2: Verify.**
  - `node store-assets/check-versions.js` → ok.
  - `powershell -NoProfile -File store-assets/make-screenshot.ps1 -Lang ja` writes the PNG. Open it and check the captions render as Japanese glyphs, not boxes.
- [ ] **Step 3: Commit:** "Add the Japanese store listing, screenshot and sysCat's credit". This happens after Ryan approves the credit wording.

### Task 9: Pull request and native review

- [ ] **Step 1: Run every gate.**
  - `node extension/run-tests.js`
  - `node store-assets/check-versions.js`
  - `cd packages/bangermeter-rank && npm test`
  - `node packages/bangermeter-rank/bin/bangermeter-rank.js gate`
  - `node store-assets/i18n-coverage.js` (paste its summary into the PR)
- [ ] **Step 2: Open the PR** with `gh pr create`.
  - Rebase onto main first, after PR #19 merges.
  - List the `JA_DRAFT` count and the screenshots.
  - Ask Ryan to request sysCat's review of `JA_DRAFT`, `store-description.ja.txt` and `_locales/ja`.
- [ ] **Step 3: Apply the review.** When sysCat approves, move the approved drafts from `JA_DRAFT` to `JA` and fill `_locales/ja` with the reviewed Japanese. Rerun the gates and commit: "Ship sysCat's reviewed Japanese".
