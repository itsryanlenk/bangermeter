# Japanese localization (0.11.0): design

Status: draft for Ryan's approval, 2026-11-03.

## Why

sysCat ([@sysCat64](https://x.com/sysCat64)) is a Japanese user who found the English panel hard
to read. They built a personal fork, [sysCat64/bangermeter-ja](https://github.com/sysCat64/bangermeter-ja)
(6 commits on top of our `2e75686`, ending at `f989ddc`). The fork leaves `extension/` untouched
and translates our rendered DOM after the fact with a dictionary: 167 exact strings, 49 regex
patterns, and a 34-term glossary. Along the way they found that `hasQuestion` misses the
full-width ？.

Their overlay was the right call for a fork that assumed we would never merge i18n. It is the
wrong mechanism for us. Regex over our own English sentences breaks every time we reword one,
and we reword them most weeks to follow X's pushes. What we want from the fork is the
translations, the glossary and the tone decisions. The mechanism we build ourselves.

**Success:** someone who uses X in Japanese installs Bangermeter from the store and finds it
in Japanese. They find the store listing in Japanese. The badge tooltips, panel, draft meter,
popup and welcome page read as natural Japanese. Japanese posts are scored on fair terms for
length, hashtags and question marks.

## Goals

1. Show the UI in Japanese when X's display language is Japanese. That covers the badge
   tooltips, the breakdown panel, the draft meter, the popup and the welcome page. The scope is
   what sysCat translated: their tier A, plus the tier B items listed in their README
   (published-weights bullets, reply scoring, the verified note, draft-meter tooltips).
2. Add a language switch to the popup: Auto / English / 日本語.
3. Localize the extension's name and description through `_locales`.
4. Write a Japanese store listing.
5. Score Japanese text fairly:
   - Count length the way X does, where a CJK character counts as 2.
   - Count full-width ＃ hashtags in the draft meter.
6. Credit sysCat in the README. They agreed on X on 2026-11-03.
7. Ship it all as 0.11.0, together with the issue #18 catch-up, plus a post in English and
   Japanese.

## Non-goals

- **Long explanations stay English.** This covers the `weights.js` `note` / `why` text, the
  "About these scores" history (`Weights: <date> — …`), and the Community Note study citations.
  That is about two-thirds of all the words, and X changes them almost every week. sysCat made
  the same call (their tier C).
- **Japanese bait phrases.** Bait detection can't match Japanese today: `EDGE_BEFORE` /
  `EDGE_AFTER` expect spaces or ASCII punctuation, and Japanese has neither. The phrases need
  a native speaker to supply and test them, the way the Hindi ones were. That is a later release.
- **UI in other languages.** The mechanism must not rule them out, but only `en` and `ja` ship.
- **The ？ fix itself.** sysCat is sending it as a PR (see below).

## Anti-goals (what would make this a failure even if it works)

- **A translation that is silently stale.** If someone rewords an English sentence after it was
  translated, the user must get the new English, not the old Japanese. A test catches it.
- **Japanese a native speaker wouldn't write.** Every Japanese string either comes from sysCat's
  dictionary or is marked as needing native review. Nothing unreviewed ships.
- **Breaking the weekly sync work.** An X push that adds a weight head with an English label must
  still render: missing Japanese falls back to English. The upstream-sync bot must keep working.
- **Touching X's own DOM text.** We translate only what Bangermeter renders.
- **Changing English users' scores.** The length rule is the one exception, and it is bounded:
  only characters X counts as 2 (CJK, emoji, and so on) move it, and tests pin the English cases.

## Decided by Ryan (2026-11-03)

- **Language:** follow X's display language. The popup can override it.
- **Scope:** panel, badge and meter; popup and welcome page; store listing and name. Long
  explanations stay English.
- **？:** wait for sysCat's PR and review and merge it. Then widen it to the question marks of
  the other locales we support (Arabic ؟, for one). If the PR hasn't arrived by release time,
  Ryan decides then whether to wait.
- **Length and hashtags:** use X's counting rule and accept full-width ＃. Japanese bait waits.
- **Release:** one release, 0.11.0, that also includes the issue #18 catch-up. Ryan submits it to
  the store. Tag it `v0.11.0`. Write a post with an English part and a Japanese part.
- **Credit:** sysCat goes in the README Credits. They agreed on X, 2026-11-03.

## How (Claude's calls; correct any of them)

### Strings: English stays in the code as the key

- **The table.** A new `extension/i18n.js` exposes `t(english, params)`. It holds one table,
  `JA`, that maps each English string to its Japanese.
  - The English call sites stay readable: `t("Show the math")`.
  - A missing entry returns the English unchanged.
- **Templates.** Strings with values use named placeholders:
  `t("How the algorithm values what this post actually earned, from {views} views. …", { views })`.
  Each of sysCat's regex patterns becomes one template entry.
- **Sentences built from fragments get rewritten as one template each.** content.js currently
  builds some sentences in pieces, for example `"Weight " + w + " for a like (param.rs, " + date + " sync)"`.
  Fragments can't be translated, because Japanese word order is different.
- **Data labels.** Labels in `weights.js` and `scoring.js` stay English in the data. They go
  through `t()` at render time, so the bot keeps editing English data and nothing else.
- **Dates and numbers.** A date helper renders "Oct 28" as "10月28日". Numbers keep using
  `toLocaleString`.
- **Sources stay as written.** `param.rs`, file paths, `×0.75`, commit hashes and code names
  stay as-is inside the Japanese. That is sysCat's rule too.
- **Provenance.** The Japanese comes from sysCat's `ja/dict.json` at `f989ddc`. Their README
  says the fork stays under our MIT license. The header of `i18n.js` names that source.
- **New strings.** Any string sysCat didn't translate is drafted by Claude using their glossary:
  the language switch, anything the issue #18 work adds, the store listing, the `_locales` text.
  Each one is marked `// needs native review`. Release waits on that review: ask sysCat.

### Which language is shown

- **On x.com:** the stored override (`uiLanguage` = `auto` | `en` | `ja`, in
  `chrome.storage.sync`) wins. `auto` means `ja` when `document.documentElement.lang` starts
  with `ja`, and `en` otherwise.
  - **Verify against a logged-in Japanese X account first.** If X doesn't set `<html lang>` from
    the account language, fall back to the locale that `scoring.js` already detects from X's
    aria-labels.
- **The content script records X's language** in storage, so the popup's Auto can follow it.
- **Popup and welcome page:** Auto uses the last X language recorded. With nothing recorded,
  which is the case at install time, it uses `chrome.i18n.getUILanguage()`.
- **Changing the switch** applies to badges and panels drawn from then on. Whether open panels
  re-render immediately is the builder's call.

### Manifest and store

- Add `default_locale: "en"`, `_locales/en/messages.json` and `_locales/ja/messages.json` for the
  name, description and action title. Chrome uses these for the localized store name.
  Chrome's limits apply: 75 characters for the name, 132 for the description.
- **New files mean three lists.** `_locales/*` and `i18n.js` go in the `check-versions.js` BOM
  list, `package-guard.js` `SHIPPED`, and `make-package.ps1` `$items`. `check-versions.js`
  cross-checks the three lists against each other.
- Add `store-assets/store-description.ja.txt` for the Japanese listing. Ryan pastes it into the
  dashboard's Japanese listing. It is new text, so it needs native review.

### Userscript

`make-userscript.ps1` must include `i18n.js`. It already reads with `-Encoding UTF8`, and the
.ps1 must stay pure ASCII. The userscript follows X's language with no override, since it has
no storage.

### Scoring changes

- **Weighted length.**
  - **The rule:** X's own counting rule, from twitter-text's `config/v3.json`. Cite the file and
    the date it was fetched. Code points in the configured ranges (0–4351, 8192–8205,
    8208–8223, 8242–8247) count 1. Everything else, including CJK and emoji, counts 2.
  - **What uses it:** the `conversation_length` modifier compares that weighted count to 100.
    The threshold stays an `estimate`, and the counting rule gets its own citation.
  - **Labels:** English keeps "Substantive text (≥100 chars)", which is still true for Latin
    text. The Japanese label must state the rule a Japanese user meets: about 50 full-width
    characters.
  - **Tests:** pin 100 Latin characters (fires), 50 Japanese characters (fires), 49 (doesn't),
    and the emoji edge case.
  - **URLs:** whether to model the 23-character URL transform is the builder's call, but the
    recommendation is no, because timeline text and draft text show URLs differently.
- **Full-width ＃.** The draft meter's `/#[\wÀ-￿]+/` becomes a pattern that also
  accepts ＃ (U+FF03), with a test. Timeline posts already count hashtag links from the DOM.

### Tests and gates

- **Self-tests in `test.html`:** English fallback, placeholder substitution, a matching
  placeholder set between each key and its Japanese, the date helper, and language resolution.
- **A coverage gate in CI and the release gate:**
  - It extracts every `t("…")` literal and every data label rendered through `t()`.
  - It fails when a string has no Japanese entry, unless the string is on an allowlist of things
    that stay English on purpose.
  - It fails when a Japanese key no longer appears in the source, which is the stale case.
  - A new weight label from an X push therefore fails CI until someone translates it. That is
    the same "needs you" moment the drift issue already raises.
- **Fixture check:** render the fixture pages with `<html lang="ja">`, plus the popup and welcome
  page set to Japanese. Confirm that no English is left beyond the allowlist, that the Japanese
  text fits the panel's fixed width, and that CJK lines break cleanly. Take screenshots.
- **Live check:** confirm on x.com with a Japanese account. Ryan's account, or sysCat's if they
  will try a build.
- **The US English gate** must still pass. Japanese strings must not trip it.

### Credit

- **README Credits:** add a sysCat entry in house style, naming the specific findings. Those are
  the Japanese translation and glossary, the tone ("everyday Japanese, not developer Japanese"),
  and the ？ bug.
- **Link:** their fork.
- **Wording:** Ryan approves it before commit.

### Release, in order

1. sysCat's ？ PR (when it arrives), then widen it.
2. Issue #18 catch-up: model the three inert head changes and re-verify the 9 cited files, as its
   own PR.
3. This localization, as its own PR. Ask sysCat to review the Japanese.
4. Bump to 0.11.0. The userscript `@version` derives to 1.9.0. Add `WHAT'S NEW IN 0.11.0` in
   English and Japanese, rebuild, run `package-guard --verify`, and tag `v0.11.0` when Ryan
   submits.
5. The post in English and Japanese, through publish-gates and an adversary pass.

## Left to the builder

- **Code layout:** file layout inside `i18n.js`, how the coverage gate extracts strings, and
  where the allowlist lives.
- **Panel re-render:** whether open panels re-render when the switch changes.
- **URL weighting:** whether the weighted count models it (recommendation: no).
- **Fixture approach:** how the Japanese fixtures are produced (a `lang` toggle or copies).

## Risks

- **X's `<html lang>` behavior is unverified** for logged-in accounts. The fallback above covers
  it.
- **Native review depends on sysCat's time.** Fewer new strings means less to review.
- **Layout:** Japanese text runs longer in some rows and shorter in others, and the panel is
  fixed-width.
