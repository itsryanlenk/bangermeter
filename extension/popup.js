// Bangermeter — popup: settings + active weight table

// Everything renders once the language is known (i18n.js resolvePageLanguage),
// so dynamic text and the static markup come out in the same language.
BANGERMETER_I18N.resolvePageLanguage(function () {
  var t = BANGERMETER_I18N.t;
  // Same lookup for weights.js labels; i18n-coverage reads those from the config.
  var tl = BANGERMETER_I18N.t;
  var ids = ["showBadges", "scoreDrafts", "assumeOutOfNetwork", "assumeMutualFollow",
    "applyVerifiedBoost2023", "keepHistory"];

  try {
    chrome.storage.sync.get(BANGERMETER_DEFAULT_SETTINGS, function (stored) {
      ids.forEach(function (id) {
        var box = document.getElementById(id);
        if (!box) return;
        box.checked = !!stored[id];
        box.addEventListener("change", function () {
          var patch = {};
          patch[id] = box.checked;
          chrome.storage.sync.set(patch);
        });
      });
      var themeSel = document.getElementById("theme");
      themeSel.value = stored.theme || "auto";
      themeSel.addEventListener("change", function () {
        chrome.storage.sync.set({ theme: themeSel.value });
      });
      // The popup was drawn in the old language; redraw it in the new one.
      var langSel = document.getElementById("uiLanguage");
      langSel.value = stored.uiLanguage || "auto";
      langSel.addEventListener("change", function () {
        chrome.storage.sync.set({ uiLanguage: langSel.value }, function () { location.reload(); });
      });
    });
  } catch (e) { /* storage unavailable (preview harness) — table still renders below */ }

  // ── Quick-start strip ──────────────────────────────────────────────────
  // The welcome page opens itself once, on install. This is the way back to it
  // for anyone who closed that tab, or who comes back a week later having
  // forgotten what the two numbers mean. Hidden by default in the markup so it
  // never flashes on for a user who has already dismissed it.
  (function () {
    var strip = document.getElementById("quickStart");
    var link = document.getElementById("quickStartLink");
    var dismiss = document.getElementById("quickStartDismiss");
    if (!strip || !link || !dismiss) return;

    function seen() {
      strip.hidden = true;
      try { chrome.storage.sync.set({ quickStartSeen: true }); } catch (e) { /* preview harness */ }
    }

    // Opening it counts as having seen it; so does dismissing it. Both leave the
    // page reachable — the strip is the only affordance that goes away.
    link.addEventListener("click", seen);
    dismiss.addEventListener("click", seen);

    try {
      chrome.storage.sync.get({ quickStartSeen: false }, function (stored) {
        strip.hidden = !!stored.quickStartSeen;
      });
    } catch (e) { /* preview harness — leave it hidden rather than guess */ }
  })();

  // ── Local score history ────────────────────────────────────────────────
  // Read-only view over the log content.js writes on panel opens. Lives in
  // chrome.storage.local; the Clear button deletes it outright.
  function agoText(ts) {
    var mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (mins < 60) return t("{n}m", { n: mins });
    if (mins < 1440) return t("{n}h", { n: Math.round(mins / 60) });
    return t("{n}d", { n: Math.round(mins / 1440) });
  }

  function renderHistory(list) {
    var section = document.getElementById("historySection");
    var box = document.getElementById("historyList");
    if (!section || !box) return;
    box.textContent = "";
    if (!list || !list.length) { section.hidden = true; return; }
    section.hidden = false;
    list.slice(0, 12).forEach(function (h) {
      var row = document.createElement("div");
      row.className = "hist-row";

      var scores = document.createElement("span");
      scores.className = "hist-scores";
      var c = document.createElement("span");
      c.className = "c";
      c.textContent = "C" + (h.c == null ? "–" : h.c);
      scores.appendChild(c);
      scores.appendChild(document.createTextNode(" "));
      var e = document.createElement("span");
      e.className = "e";
      e.textContent = h.e == null ? "E–" : "E" + h.e;
      scores.appendChild(e);
      row.appendChild(scores);

      if (h.r) {
        var tag = document.createElement("span");
        tag.className = "hist-reply";
        tag.textContent = t("reply");
        row.appendChild(tag);
      }

      var snip = document.createElement("span");
      snip.className = "hist-snippet";
      // Snippet text always via textContent — history entries carry post text.
      if (h.id) {
        var a = document.createElement("a");
        a.href = "https://x.com/i/status/" + encodeURIComponent(h.id);
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = h.s || t("(no text)");
        snip.appendChild(a);
      } else {
        snip.textContent = h.s || t("(no text)");
      }
      row.appendChild(snip);

      var when = document.createElement("span");
      when.className = "hist-when";
      when.textContent = agoText(h.t);
      row.appendChild(when);

      box.appendChild(row);
    });
  }

  try {
    chrome.storage.local.get({ bmHistory: [] }, function (data) {
      renderHistory(data.bmHistory || []);
    });
    var clearBtn = document.getElementById("clearHistory");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        chrome.storage.local.remove("bmHistory");
        renderHistory([]);
      });
    }
  } catch (e) { /* storage unavailable (preview harness) — section stays hidden */ }

  // ── Under the Hood report import ───────────────────────────────────────
  // The pilot's report is a JSON file the user downloads themselves from
  // x.com/i/jf/under_the_hood — it is never fetched, and the parsed summary
  // lives in chrome.storage.local only. Rendering is textContent-only:
  // every string here came out of a user-supplied file.
  (function () {
    var UTH = BANGERMETER_CONFIG.sourcedFacts.underTheHood;
    var intro = document.getElementById("uthIntro");
    var summary = document.getElementById("uthSummary");
    var importBtn = document.getElementById("uthImport");
    var clearBtn = document.getElementById("uthClear");
    var fileInput = document.getElementById("uthFile");
    if (!intro || !summary || !importBtn || !fileInput) return;

    var INTRO_EMPTY = t("In the pilot? Download your visibility report from {path} and import it here. Parsed locally, stored only in this browser. At X's published defaults the report is monthly per-label totals — it can say how many posts carried a label, not which ones.",
      { path: UTH.path });
    function percent(p) { return p != null ? " (" + p + "%)" : ""; }

    function note(text, cls) {
      var d = document.createElement("div");
      d.className = cls;
      d.textContent = text;
      summary.appendChild(d);
    }

    // Label names and X's about/effect text come from the file and stay as written.
    function labelRow(row, isPostLabel) {
      var div = document.createElement("div");
      div.className = "uth-row";
      var name = document.createElement("span");
      name.className = "uth-label";
      var known = UTH.postLabelAllowlist.indexOf(row.label) !== -1 ||
        UTH.accountLabelAllowlist.indexOf(row.label) !== -1;
      name.textContent = known ? row.label : t("{label} (not in the public allowlist)", { label: row.label });
      if (row.about) div.title = row.about;
      div.appendChild(name);
      var countText = null;
      if (row.posts != null) {
        countText = isPostLabel ? t("{n} posts", { n: row.posts }) + percent(row.percentageOfPosts) : String(row.posts);
      } else if (row.days != null) {
        countText = (row.days === 1 ? t("{n} day", { n: row.days }) : t("{n} days", { n: row.days })) +
          percent(row.percentageOfDays);
      }
      if (countText != null) {
        var count = document.createElement("span");
        count.className = "uth-count";
        count.textContent = countText;
        div.appendChild(count);
      }
      var effect = document.createElement("span");
      effect.className = "uth-effect";
      effect.textContent = row.effect || "";
      div.appendChild(effect);
      summary.appendChild(div);
    }

    function render(report) {
      summary.textContent = "";
      if (!report) {
        intro.textContent = INTRO_EMPTY;
        clearBtn.hidden = true;
        importBtn.hidden = false;
        return;
      }
      clearBtn.hidden = false;
      importBtn.hidden = true;
      var periodText = report.period && report.period.startDate
        ? report.period.startDate + " → " + (report.period.endDate || "")
        : t("period unknown");
      intro.textContent = report.postCount != null
        ? t("Your imported report ({period}, {posts} posts). These are X's OWN labels on your account — not estimates.",
          { period: periodText, posts: report.postCount })
        : t("Your imported report ({period}). These are X's OWN labels on your account — not estimates.",
          { period: periodText });
      if (!report.postLabels.length && !report.accountLabels.length) {
        note(t("No visibility-impacting labels in this report period. Clean month."), "uth-ok");
        return;
      }
      report.accountLabels.forEach(function (row) { labelRow(row, false); });
      report.postLabels.forEach(function (row) { labelRow(row, true); });
    }

    importBtn.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      var f = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!f) return;
      summary.textContent = "";
      if (f.size > 2 * 1024 * 1024) {
        note(t("That file is over 2 MB — an Under the Hood report is a few KB. Not imported."), "uth-error");
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var report = BangermeterEngine.parseUnderTheHoodReport(String(reader.result));
        if (!report) {
          note(t("That file does not look like an Under the Hood report (expected the JSON downloaded from {path}). Nothing was imported.",
            { path: UTH.path }), "uth-error");
          return;
        }
        try {
          chrome.storage.local.set({ bmUthReport: report });
        } catch (e) { /* storage unavailable — render anyway, just not persisted */ }
        render(report);
      };
      reader.readAsText(f);
    });
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        try { chrome.storage.local.remove("bmUthReport"); } catch (e) { /* already gone */ }
        render(null);
      });
    }

    render(null);
    try {
      chrome.storage.local.get({ bmUthReport: null }, function (data) {
        if (data && data.bmUthReport) {
          // Re-validate on READ, not just on import — storage contents are
          // not trusted to still match what the sanitizer wrote.
          var revalidated = null;
          try {
            revalidated = BangermeterEngine.parseUnderTheHoodReport(JSON.stringify(data.bmUthReport));
          } catch (e2) { /* malformed stored value — treat as no report */ }
          if (revalidated) render(revalidated);
        }
      });
    } catch (e) { /* storage unavailable (preview harness) — import-only mode */ }
  })();

  var C = BANGERMETER_CONFIG;
  var heads = C.heads;

  // How this tool treats each published head. The weights are all X's; what
  // differs is whether a browser can put a number against them.
  var OBSERVED = ["favorite", "reply", "retweet"];
  // "dwell" joined this list when X turned the head on (0.0 -> 0.05) in Aug 2026,
  // and "cont_click_dwell_time" when X turned it on (0.0 -> 0.4) in Sept 2026 —
  // without the entry a live head falls through to "viewer-specific".
  // "vqv" stays listed even though it is now zeroed: role() checks the weight
  // first, so it reports "zeroed by X", and the entry is what makes it say
  // "estimated" again the day X moves that number back.
  var ESTIMATED = ["quote", "share", "share_via_dm", "share_via_copy_link", "follow_author",
    "click", "open_link", "photo_expand", "video_open", "vqv", "quoted_click",
    "cont_dwell_time", "cont_click_dwell_time", "dwell", "not_dwelled", "not_interested",
    "block_author", "mute_author", "report"];

  function role(name) {
    // "zeroed by X" and "we can't score it" are different facts and must not look
    // the same: the first is X's decision, the second is our limitation.
    if (heads[name].weight === 0) return { text: t("zeroed by X"), cls: "zero" };
    if (OBSERVED.indexOf(name) !== -1) return { text: t("from counts"), cls: "obs" };
    if (ESTIMATED.indexOf(name) !== -1) return { text: t("estimated"), cls: "est" };
    return { text: t("viewer-specific"), cls: "est" };
  }

  var table = document.getElementById("weightTable");
  Object.keys(heads)
    .sort(function (a, b) { return Math.abs(heads[b].weight) - Math.abs(heads[a].weight); })
    .forEach(function (name) {
      var h = heads[name];
      var tr = document.createElement("tr");
      tr.title = (h.note ? h.note + "\n\n" : "") + h.param;

      var tdLabel = document.createElement("td");
      tdLabel.textContent = tl(h.label);
      tr.appendChild(tdLabel);

      var tdW = document.createElement("td");
      tdW.className = "w " + (h.weight > 0 ? "pos" : h.weight < 0 ? "neg" : "zero");
      tdW.textContent = String(h.weight);
      tr.appendChild(tdW);

      var r = role(name);
      var tdProv = document.createElement("td");
      tdProv.className = "prov " + r.cls;
      tdProv.textContent = r.text;
      tr.appendChild(tdProv);

      table.appendChild(tr);
    });

  var snap = document.getElementById("weightSnapshot");
  if (snap) {
    // weightsSnapshot is X's changelog and stays English inside either language.
    snap.textContent = t("Every value below is transcribed from {snapshot}. Replies rise to {mutual} on an original post from a mutual follow.",
      { snapshot: C.weightsSnapshot, mutual: heads.reply.weight + C.bidirectionalFollowReplyBoost });
  }

  var footer = document.getElementById("footerNote");
  if (footer) {
    footer.textContent = t("Score = Σ(weight × P(action)) per xai-value-model/scoring.rs.") + " " +
      tl(C.weightsMeaningNote) + " " +
      t("Bangermeter estimates the probabilities; only likes, replies and reposts come from real counts. Relative score, not predicted reach.");
  }
});
